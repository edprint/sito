import gsap from "gsap";

/**
 * Titolo "slot machine": le parole scorrono in verticale e si fermano.
 * A riposo mostra "passione" (Times New Roman italic); in hover una parola
 * random (Helvetica); all'uscita torna sempre a "passione".
 *
 * Area-hit (.slot) di larghezza fissa = ingombro di "passione": non cambia
 * mai dimensione, così muovendo il mouse fuori NON si ri-triggera l'hover.
 * La finestra (.slot__win) è assoluta: mostra le parole (anche più lunghe,
 * sporgendo a destra) senza toccare l'area sensibile.
 */

const CYCLE = [
  "aziende",
  "pmi",
  "scuole",
  "associazioni",
  "negozi",
  "studi",
  "professori",
  "studenti",
  "piacere",
  "soldi",
  "lavoro",
];
const REST = "passione";

export function initSlot({ reduceMotion }: { reduceMotion: boolean }): void {
  const slot = document.querySelector<HTMLElement>("#slot");
  if (!slot) return;

  const rand = (): string => CYCLE[Math.floor(Math.random() * CYCLE.length)]!;

  const makeWord = (text: string, serif: boolean): HTMLElement => {
    const el = document.createElement("span");
    el.className = "slot__word" + (serif ? " is-serif" : "");
    el.textContent = text;
    return el;
  };

  const win = document.createElement("span");
  win.className = "slot__win";
  slot.appendChild(win);

  // misura ingombro di una parola (fuori flusso, non sposta nulla)
  const sizeOf = (text: string, serif: boolean): { w: number; h: number } => {
    const p = makeWord(text, serif);
    p.style.cssText = "visibility:hidden;position:absolute;white-space:nowrap";
    slot.appendChild(p);
    const r = p.getBoundingClientRect();
    p.remove();
    return { w: r.width, h: r.height };
  };

  let lineH = 16;

  // area-hit fissa = ingombro di "passione"
  const layout = (): void => {
    const s = sizeOf(REST, true);
    lineH = s.h || lineH;
    slot.style.height = lineH + "px";
    slot.style.width = Math.ceil(s.w) + "px";
    win.style.height = lineH + "px";
  };

  const showStatic = (word: string, serif: boolean): void => {
    win.style.width = Math.ceil(sizeOf(word, serif).w) + "px";
    const reel = document.createElement("span");
    reel.className = "slot__reel";
    reel.appendChild(makeWord(word, serif));
    win.replaceChildren(reel);
    gsap.set(reel, { y: 0 });
  };

  layout();
  showStatic(REST, true);

  if (reduceMotion) return;

  let tl: gsap.core.Timeline | null = null;
  let hovering = false;

  const spinTo = (target: string, serif: boolean): void => {
    if (tl) tl.kill();

    const seq: string[] = [];
    for (let i = 0; i < 16; i++) seq.push(rand());
    seq.push(target);

    // finestra larga quanto la parola più larga del rullo: niente taglio orizzontale
    let maxW = 0;
    const reel = document.createElement("span");
    reel.className = "slot__reel";
    seq.forEach((w, i) => {
      const serifThis = i === seq.length - 1 && serif;
      maxW = Math.max(maxW, sizeOf(w, serifThis).w);
      reel.appendChild(makeWord(w, serifThis));
    });
    win.style.width = Math.ceil(maxW) + "px";
    win.replaceChildren(reel);

    const travel = (seq.length - 1) * lineH;
    gsap.set(reel, { y: 0 });
    tl = gsap.timeline({ onComplete: () => showStatic(target, serif) });
    tl.to(reel, { y: -travel, duration: 0.9, ease: "power4.out" }); // scorrimento
  };

  const enter = (): void => {
    if (hovering) return;
    hovering = true;
    spinTo(rand(), false);
  };
  const leave = (): void => {
    if (!hovering) return;
    hovering = false;
    spinTo(REST, true); // uscendo torna sempre a "passione"
  };

  // apparizione al caricamento -> si ferma su "passione"
  const startLoad = (): void => {
    layout();
    spinTo(REST, true);
  };
  if (document.fonts && "ready" in document.fonts) {
    document.fonts.ready.then(startLoad);
  } else {
    startLoad();
  }

  slot.addEventListener("pointerenter", enter);
  slot.addEventListener("pointerleave", leave);
  slot.addEventListener("focus", enter);
  slot.addEventListener("blur", leave);

  let raf = 0;
  window.addEventListener("resize", () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      layout();
      if (!hovering && !(tl && tl.isActive())) showStatic(REST, true);
    });
  });
}
