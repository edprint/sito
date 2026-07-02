import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/* ============================================================
   GALLERIA DATA-DRIVEN
   I contenuti vivono in content/products/*.json (gestiti dal CMS).
   Qui vengono importati a build-time e la griglia è generata dal DOM.
   ============================================================ */
interface GalleryImage {
  src: string;
  alt?: string;
}
interface Product {
  title: string;
  order: number;
  categoria?: string;
  settori?: string[];
  formato?: "verticale" | "orizzontale" | "quadrato" | "panoramico";
  hue?: number;
  descrizione?: string;
  images?: GalleryImage[];
}

// questa pagina mostra i prodotti della categoria "stampa"
const PAGE_CATEGORY = "stampa";

// etichette leggibili dei tag settore (i JSON salvano gli slug)
const SETTORE_LABEL: Record<string, string> = {
  aziende: "Aziende, PMI",
  pa: "PA, Scuole, Associazioni",
  horeca: "Horeca, Negozi",
  studi: "Studi professionali",
};

// import.meta.glob li impacchetta nel bundle: ogni modifica dei JSON (via CMS)
// viene ricompilata al deploy successivo.
const productModules = import.meta.glob<Product>("/content/products/*.json", {
  eager: true,
  import: "default",
});

const FORMATO_CLASS: Record<string, string> = {
  orizzontale: "ga--wide",
  quadrato: "ga--square",
  panoramico: "ga--pano",
  // "verticale" = default, nessun modificatore
};

/** Costruisce le figure della galleria a partire dai file dei prodotti. */
function renderGallery(): void {
  const grid = document.querySelector<HTMLElement>("[data-gallery-grid]");
  if (!grid) return;

  const products = Object.values(productModules)
    .filter((p): p is Product => !!p && typeof p.title === "string")
    .filter((p) => (p.categoria ?? PAGE_CATEGORY) === PAGE_CATEGORY)
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));

  const prev = `<button class="ga__arrow ga__prev" type="button" aria-label="Immagine precedente" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4 7 12l8 8" /></svg></button>`;
  const next = `<button class="ga__arrow ga__next" type="button" aria-label="Immagine successiva"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4l8 8-8 8" /></svg></button>`;

  grid.innerHTML = products
    .map((p, i) => {
      const mod = FORMATO_CLASS[p.formato ?? "verticale"] ?? "";
      const nn = String(i + 1).padStart(2, "0");
      const imgs = (p.images ?? []).filter((im) => im && im.src);

      // slide reali se ci sono immagini, altrimenti 3 placeholder numerati
      const slides = imgs.length
        ? imgs
            .map(
              (im) =>
                `<div class="ga__slide"><img src="${im.src}" alt="${escapeHtml(
                  im.alt ?? p.title
                )}" loading="lazy" /></div>`
            )
            .join("")
        : [1, 2, 3]
            .map((n) => `<div class="ga__slide"><span class="ga__num">${n}</span></div>`)
            .join("");

      const single = imgs.length === 1 ? " ga--single" : "";

      const tags = (p.settori ?? [])
        .map((s) => `<li>${escapeHtml(SETTORE_LABEL[s] ?? s)}</li>`)
        .join("");
      const desc = p.descrizione
        ? `<p class="ga__descText">${escapeHtml(p.descrizione)}</p>`
        : "";
      const tagList = tags ? `<ul class="ga__tags">${tags}</ul>` : "";
      // accordion: nome sempre visibile, descrizione + tag rivelati in hover
      const accordion =
        desc || tagList
          ? `<div class="ga__desc"><div class="ga__descIn">${desc}${tagList}</div></div>`
          : "";

      return `
        <figure class="ga ${mod}${single}" style="--h: ${p.hue ?? 12}" data-gallery>
          <div class="ga__frame">
            <div class="ga__track">${slides}</div>
            ${prev}
            ${next}
            <span class="ga__cover" aria-hidden="true"></span>
          </div>
          <figcaption class="ga__cap" tabindex="0">
            <div class="ga__caphead"><span class="n">${nn}</span> <b>${escapeHtml(
        p.title
      )}</b></div>
            ${accordion}
          </figcaption>
        </figure>`;
    })
    .join("");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Avvolge ogni parola in <span class="word"> e ogni lettera in <span class="char">.
 * L'a-capo può avvenire solo tra le parole (agli spazi), mai dentro una parola.
 */
function splitChars(el: HTMLElement): HTMLElement[] {
  const words = (el.textContent ?? "").split(" ");
  const frag = document.createDocumentFragment();
  const chars: HTMLElement[] = [];
  words.forEach((word, wi) => {
    const wordSpan = document.createElement("span");
    wordSpan.className = "word";
    for (const ch of word) {
      const span = document.createElement("span");
      span.className = "char";
      span.textContent = ch;
      wordSpan.appendChild(span);
      chars.push(span);
    }
    frag.appendChild(wordSpan);
    if (wi < words.length - 1) frag.appendChild(document.createTextNode(" "));
  });
  el.textContent = "";
  el.appendChild(frag);
  return chars;
}

/**
 * Animazioni della pagina Stampa: intro del titolo hero, reveal dei testi,
 * cascata di lettere sul titolo di sezione e reveal "a tendina" della galleria
 * (prima cala la tendina di colore, poi si scopre l'immagine).
 */
export function initStampaSections({ reduceMotion }: { reduceMotion: boolean }): void {
  const pheroTitle = document.querySelector<HTMLElement>(".phero__title");

  // genera la galleria dai dati PRIMA di collegare caroselli e animazioni
  renderGallery();

  // i caroselli funzionano sempre, a prescindere dalle animazioni
  initGalleryCarousels(reduceMotion);

  if (reduceMotion) {
    gsap.set(".phero__title", { clipPath: "inset(0 0 0% 0)" });
    gsap.set(".ga__cover", { scaleY: 0 });
    gsap.set(".ga__track", { opacity: 1, scale: 1 });
    gsap.set(".reveal", { opacity: 1, y: 0 });
    return;
  }

  // --- INTRO: titolo hero che si scopre dall'alto (clip) al caricamento ---
  if (pheroTitle) {
    gsap.set(pheroTitle, { clipPath: "inset(0 0 100% 0)", yPercent: 8 });
    const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
    tl.to(pheroTitle, {
      clipPath: "inset(0 0 0% 0)",
      yPercent: 0,
      duration: 1.1,
    })
      .from(".phero__idx", { opacity: 0, y: -10, duration: 0.6 }, "-=0.7")
      .from(".phero__meta", { opacity: 0, y: 10, duration: 0.6 }, "<");
  }

  // --- TITOLO SEZIONE: cascata di lettere in scroll ---
  const svcTitle = document.querySelector<HTMLElement>(".svc__title");
  if (svcTitle) {
    const chars = splitChars(svcTitle);
    gsap.set(chars, { yPercent: 110, opacity: 0 });
    gsap.to(chars, {
      yPercent: 0,
      opacity: 1,
      duration: 0.7,
      ease: "power4.out",
      stagger: { amount: 0.5 },
      scrollTrigger: { trigger: svcTitle, start: "top 82%", once: true },
    });
  }

  // --- REVEAL generici (tag, lead, heading, titoli galleria) ---
  gsap.utils.toArray<HTMLElement>(".reveal").forEach((el) => {
    gsap.fromTo(
      el,
      { opacity: 0, y: 24 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 88%", once: true },
      }
    );
  });

  // --- LISTA PRODOTTI: entrata in stagger ---
  const prods = gsap.utils.toArray<HTMLElement>(".svc__prods li");
  if (prods.length) {
    gsap.from(prods, {
      opacity: 0,
      y: 18,
      duration: 0.6,
      ease: "power3.out",
      stagger: 0.05,
      scrollTrigger: { trigger: ".svc__prods", start: "top 85%", once: true },
    });
  }

  // --- GALLERIA: reveal a tendina (colore poi immagine) ---
  gsap.utils.toArray<HTMLElement>(".ga").forEach((fig) => {
    const cover = fig.querySelector<HTMLElement>(".ga__cover");
    const track = fig.querySelector<HTMLElement>(".ga__track");
    const cap = fig.querySelector<HTMLElement>(".ga__cap");
    if (!cover || !track) return;

    gsap.set(cover, { scaleY: 0, transformOrigin: "top center" });
    gsap.set(track, { opacity: 0, scale: 1.16 });

    const tl = gsap.timeline({
      scrollTrigger: { trigger: fig, start: "top 84%", once: true },
    });
    // 1) cala la tendina di colore dall'alto
    tl.to(cover, { scaleY: 1, duration: 0.55, ease: "power4.inOut" })
      // 2) l'immagine è pronta dietro la tendina...
      .set(track, { opacity: 1 })
      .set(cover, { transformOrigin: "bottom center" })
      // ...e la tendina si ritira verso il basso scoprendola dall'alto
      .to(cover, { scaleY: 0, duration: 0.75, ease: "power4.inOut" }, ">-0.01")
      .to(track, { scale: 1, duration: 1.2, ease: "power3.out" }, "<");
    if (cap) {
      tl.from(cap, { opacity: 0, y: 12, duration: 0.5, ease: "power3.out" }, "-=0.5");
    }
  });

  // i font Typekit cambiano l'altezza del testo -> ricalcola trigger
  if (document.fonts && "ready" in document.fonts) {
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  }
}

/**
 * Ogni tile è un carosello dedicato al prodotto: freccia avanti in basso a
 * destra, freccia indietro in basso a sinistra che compare dopo la prima
 * immagine. Le frecce si nascondono ai due estremi.
 */
function initGalleryCarousels(reduceMotion: boolean): void {
  gsap.utils.toArray<HTMLElement>("[data-gallery]").forEach((fig) => {
    const track = fig.querySelector<HTMLElement>(".ga__track");
    const slides = fig.querySelectorAll<HTMLElement>(".ga__slide");
    const prev = fig.querySelector<HTMLButtonElement>(".ga__prev");
    const next = fig.querySelector<HTMLButtonElement>(".ga__next");
    if (!track || !prev || !next || slides.length < 2) return;

    let i = 0;
    const last = slides.length - 1;

    const update = () => {
      gsap.to(track, {
        xPercent: -100 * i,
        duration: reduceMotion ? 0 : 0.7,
        ease: "power3.inOut",
      });
      prev.hidden = i === 0; // la freccia "indietro" compare dopo la prima
      next.hidden = i === last;
    };

    prev.addEventListener("click", () => {
      if (i > 0) { i--; update(); }
    });
    next.addEventListener("click", () => {
      if (i < last) { i++; update(); }
    });

    update();
  });
}
