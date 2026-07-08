import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { reduceMotion } from "./reduceMotion";

gsap.registerPlugin(ScrollTrigger);

/**
 * Smooth scroll (inerzia) con Lenis, sincronizzato con GSAP ScrollTrigger.
 * Usa lo scroll reale della finestra: compatibile con position:sticky e con
 * lo scrub delle animazioni. Disattivato con prefers-reduced-motion.
 *
 * Nella SPA c'è UNA sola istanza Lenis per volta: le pagine che vogliono un
 * comportamento diverso (About: lerp 0.09 come da brief) la ricreano con
 * startSmoothScroll(opzioni) al mount e ripristinano il default all'unmount.
 */

type LenisOptions = ConstructorParameters<typeof Lenis>[0];

const DEFAULT_OPTIONS: LenisOptions = { duration: 1.1, smoothWheel: true };

let lenis: Lenis | null = null;
let tick: ((time: number) => void) | null = null;

/** (Ri)crea l'istanza Lenis; senza argomenti usa l'inerzia default del sito. */
export function startSmoothScroll(options: LenisOptions = DEFAULT_OPTIONS): void {
  stopSmoothScroll();
  if (reduceMotion) return;

  lenis = new Lenis(options);
  lenis.on("scroll", ScrollTrigger.update);
  tick = (time: number): void => {
    lenis?.raf(time * 1000);
  };
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
}

export function stopSmoothScroll(): void {
  if (tick) {
    gsap.ticker.remove(tick);
    tick = null;
  }
  lenis?.destroy();
  lenis = null;
}

/** Blocca/sblocca lo scroll (es. quando si apre un drawer). */
export function lockScroll(locked: boolean): void {
  if (!lenis) return;
  if (locked) lenis.stop();
  else lenis.start();
}

/** Scrolla in modo fluido a un elemento (menu TOC, ancore delle route). */
export function scrollToTarget(target: HTMLElement, offset = 0): void {
  if (lenis) {
    lenis.scrollTo(target, { offset });
  } else {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

/** Torna in cima (cambio di route). */
export function scrollToTop(): void {
  if (lenis) lenis.scrollTo(0, { immediate: true });
  window.scrollTo(0, 0);
}

/**
 * Scrolla a una posizione Y assoluta con l'inerzia di Lenis (usato da snap e
 * navigazione dei checkpoint del capitolo Metodo: passare da Lenis evita i
 * conflitti tra tween di scroll esterni e il raf di Lenis).
 */
export function scrollToY(y: number, duration = 0.8): void {
  if (lenis) {
    lenis.scrollTo(y, { duration, easing: (t) => 1 - Math.pow(1 - t, 3) });
  } else {
    window.scrollTo({ top: y, behavior: "smooth" });
  }
}
