import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { scrollToTarget } from "./smoothScroll";

gsap.registerPlugin(ScrollTrigger);

/* ============================================================
   SOTTOCATEGORIE (struttura di pagina, non gestita dal CMS)
   Ogni prodotto (content/products/*.json) appartiene a una di queste
   sottocategorie tramite il campo "sottocategoria".
   ============================================================ */
interface Subcategory {
  slug: string;
  numero: string;
  title: string;
  intro: string;
}

const SUBCATEGORIES: Subcategory[] = [
  {
    slug: "stampati-commerciali",
    numero: "1.1",
    title: "Stampati commerciali",
    intro:
      "Tutto ciò che rappresenta la tua attività su carta: dalla corrispondenza " +
      "quotidiana agli strumenti di vendita. Scegliamo carte, finiture e " +
      "nobilitazioni per stampati coerenti con la tua immagine — tirature " +
      "flessibili, colori fedeli, tempi rapidi.",
  },
  {
    slug: "brochure-cataloghi-libri",
    numero: "1.2",
    title: "Brochure, cataloghi, libri",
    intro:
      "Strumenti di presentazione a più pagine: cataloghi prodotto, brochure " +
      "istituzionali, libri e volumi rilegati. Carte, rilegature e finiture " +
      "scelte per raccontare bene ciò che fai.",
  },
  {
    slug: "stampe-promozionali",
    numero: "1.3",
    title: "Stampe promozionali",
    intro:
      "Materiali pensati per farsi notare: volantini, flyer e stampe per " +
      "campagne, lanci ed eventi. Tempi rapidi e tirature flessibili per " +
      "cogliere il momento giusto.",
  },
  {
    slug: "packaging-etichette-sticker",
    numero: "1.4",
    title: "Packaging, etichette, sticker",
    intro:
      "Packaging su misura, etichette e adesivi per proteggere, riconoscere e " +
      "valorizzare il prodotto — dal confezionamento allo scaffale.",
  },
  {
    slug: "manifesti-poster-striscioni",
    numero: "1.5",
    title: "Manifesti, poster, striscioni",
    intro:
      "Grande formato per farsi vedere da lontano: manifesti, poster e " +
      "striscioni per vetrine, eventi e affissioni, con colori stabili anche " +
      "all'aperto.",
  },
  {
    slug: "adesivi-materiali-rigidi",
    numero: "1.6",
    title: "Adesivi e materiali rigidi",
    intro:
      "Adesivi murali e supporti rigidi — forex, dibond, plexiglass — per " +
      "insegne, allestimenti e segnaletica che deve durare nel tempo.",
  },
];

/* ============================================================
   PRODOTTI DATA-DRIVEN
   I contenuti vivono in content/products/*.json (gestiti dal CMS).
   Qui vengono importati a build-time e le sezioni sono generate dal DOM.
   ============================================================ */
interface GalleryImage {
  src: string;
  alt?: string;
}
interface Product {
  title: string;
  order: number;
  categoria?: string;
  sottocategoria?: string;
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Markup delle figure-carosello della galleria per un gruppo di prodotti. */
function buildGalleryGrid(products: Product[]): string {
  const prev = `<button class="ga__arrow ga__prev" type="button" aria-label="Immagine precedente" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4 7 12l8 8" /></svg></button>`;
  const next = `<button class="ga__arrow ga__next" type="button" aria-label="Immagine successiva"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4l8 8-8 8" /></svg></button>`;

  return products
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

/** Markup dell'elenco testuale dei prodotti (blocco "Prodotti"). */
function buildProductList(products: Product[]): string {
  return products
    .map((p, i) => {
      const nn = String(i + 1).padStart(2, "0");
      return `<li><span class="n">${nn}</span> ${escapeHtml(p.title)}</li>`;
    })
    .join("");
}

/**
 * Genera, per ogni sottocategoria, il blocco testo (titolo, intro, elenco
 * prodotti) + la galleria a caroselli, a partire dai file dei prodotti.
 * Ritorna gli elementi .subcat creati (in ordine), per il menu TOC.
 */
function renderSubcategories(): HTMLElement[] {
  const root = document.querySelector<HTMLElement>("[data-subcats]");
  if (!root) return [];

  const products = Object.values(productModules).filter(
    (p): p is Product => !!p && typeof p.title === "string"
  );

  const bySubcat = new Map<string, Product[]>();
  products
    .filter((p) => (p.categoria ?? PAGE_CATEGORY) === PAGE_CATEGORY)
    .forEach((p) => {
      const slug = p.sottocategoria ?? SUBCATEGORIES[0].slug;
      const list = bySubcat.get(slug) ?? [];
      list.push(p);
      bySubcat.set(slug, list);
    });
  bySubcat.forEach((list) => list.sort((a, b) => (a.order ?? 99) - (b.order ?? 99)));

  root.innerHTML = SUBCATEGORIES.map((sc) => {
    const items = bySubcat.get(sc.slug) ?? [];
    return `
      <section class="subcat" id="subcat-${sc.slug}" data-subcat="${sc.slug}">
        <div class="svc">
          <div class="svc__aside">
            <span class="mono svc__tag reveal">${sc.numero}</span>
          </div>
          <div class="svc__main">
            <h2 class="svc__title">${escapeHtml(sc.title)}</h2>
            <p class="svc__lead reveal">${escapeHtml(sc.intro)}</p>
            <div class="svc__block">
              <h3 class="mono svc__h reveal">Prodotti</h3>
              <ul class="svc__prods">${buildProductList(items)}</ul>
            </div>
          </div>
        </div>
        <div class="gallery">
          <div class="gallery__aside">
            <span class="mono gallery__tag reveal">Galleria</span>
          </div>
          <div class="gallery__main">
            <h2 class="gallery__title reveal">Alcuni lavori usciti dalle nostre macchine.</h2>
            <div class="gallery__grid">${buildGalleryGrid(items)}</div>
          </div>
        </div>
      </section>`;
  }).join("");

  return Array.from(root.querySelectorAll<HTMLElement>(".subcat"));
}

/**
 * Menu TOC a sinistra: appare quando la prima sottosezione occupa lo schermo,
 * evidenzia la sezione attiva durante lo scroll, e scrolla alla sezione al click.
 */
function initToc(subcatEls: HTMLElement[]): void {
  const toc = document.querySelector<HTMLElement>("[data-toc]");
  if (!toc || !subcatEls.length) return;

  toc.innerHTML = SUBCATEGORIES.map(
    (sc) =>
      `<button class="toc__item" type="button" data-toc-target="subcat-${sc.slug}">
         <span class="toc__dash" aria-hidden="true"></span>${escapeHtml(sc.title)}
       </button>`
  ).join("");

  const items = Array.from(toc.querySelectorAll<HTMLButtonElement>(".toc__item"));

  items.forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.tocTarget;
      const target = id ? document.getElementById(id) : null;
      if (target) scrollToTarget(target, -80); // lascia spazio sotto la nav fissa
    });
  });

  // sezione attiva durante lo scroll
  subcatEls.forEach((el, i) => {
    ScrollTrigger.create({
      trigger: el,
      start: "top center",
      end: "bottom center",
      onToggle: (self) => {
        if (self.isActive) {
          items.forEach((it) => it.classList.remove("is-active"));
          items[i]?.classList.add("is-active");
        }
      },
    });
  });

  // il menu appare quando la prima sezione riempie lo schermo, sparisce dopo l'ultima
  ScrollTrigger.create({
    trigger: subcatEls[0],
    start: "top 30%",
    endTrigger: subcatEls[subcatEls.length - 1],
    end: "bottom 20%",
    onToggle: (self) => toc.classList.toggle("is-visible", self.isActive),
  });
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
 * cascata di lettere sui titoli di sezione, menu TOC con scroll-spy e reveal
 * "a tendina" delle gallerie (prima cala la tendina di colore, poi si scopre
 * l'immagine).
 */
export function initStampaSections({ reduceMotion }: { reduceMotion: boolean }): void {
  const pheroTitle = document.querySelector<HTMLElement>(".phero__title");

  // genera le sottosezioni dai dati PRIMA di collegare caroselli e animazioni
  const subcatEls = renderSubcategories();

  // caroselli e TOC funzionano sempre, a prescindere dalle animazioni decorative
  initGalleryCarousels(reduceMotion);
  initToc(subcatEls);

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

  // --- TITOLI SEZIONE: cascata di lettere in scroll (una per sottocategoria) ---
  gsap.utils.toArray<HTMLElement>(".svc__title").forEach((svcTitle) => {
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
  });

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

  // --- LISTE PRODOTTI: entrata in stagger (una per sottocategoria) ---
  gsap.utils.toArray<HTMLElement>(".svc__prods").forEach((list) => {
    const li = list.querySelectorAll<HTMLElement>("li");
    if (!li.length) return;
    gsap.from(li, {
      opacity: 0,
      y: 18,
      duration: 0.6,
      ease: "power3.out",
      stagger: 0.05,
      scrollTrigger: { trigger: list, start: "top 85%", once: true },
    });
  });

  // --- GALLERIE: reveal a tendina (colore poi immagine) ---
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
