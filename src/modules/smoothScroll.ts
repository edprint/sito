import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Smooth scroll (inerzia) con Lenis, sincronizzato con GSAP ScrollTrigger.
 * Usa lo scroll reale della finestra: compatibile con position:sticky e con
 * lo scrub delle animazioni. Disattivato con prefers-reduced-motion.
 */

let lenis: Lenis | null = null;

export function initSmoothScroll({ reduceMotion }: { reduceMotion: boolean }): void {
  if (reduceMotion) return;

  gsap.registerPlugin(ScrollTrigger);

  lenis = new Lenis({
    duration: 1.1,
    smoothWheel: true,
  });

  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => {
    lenis?.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);
}

/** Blocca/sblocca lo scroll (es. quando si apre un drawer). */
export function lockScroll(locked: boolean): void {
  if (!lenis) return;
  if (locked) lenis.stop();
  else lenis.start();
}

/** Scrolla in modo fluido a un elemento (usato dal menu TOC delle pagine servizio). */
export function scrollToTarget(target: HTMLElement, offset = 0): void {
  if (lenis) {
    lenis.scrollTo(target, { offset });
  } else {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}
