import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { scrollToTarget, scrollToTop } from "../lib/smoothScroll";

/**
 * Gestione dello scroll al cambio di route:
 * - con hash (#contatti, #settori, …) scrolla all'elemento, se esiste;
 * - altrimenti torna in cima e ricalcola i trigger della nuova pagina.
 */
export function ScrollManager(): null {
  const { pathname, hash } = useLocation();

  useLayoutEffect(() => {
    if (hash) {
      const el = document.querySelector<HTMLElement>(hash);
      if (el) {
        // aspetta un frame: la pagina appena montata deve avere il layout
        requestAnimationFrame(() => scrollToTarget(el, -80));
        return;
      }
    }
    scrollToTop();
    requestAnimationFrame(() => ScrollTrigger.refresh());
  }, [pathname, hash]);

  return null;
}
