/** Preferenza utente per il movimento ridotto, valutata una volta all'avvio. */
export const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;
