import { initSmoothScroll } from "./modules/smoothScroll";
import { initNav } from "./modules/nav";
import { initHeroScene } from "./modules/heroScene";
import { initStampaSections } from "./modules/stampaSections";

const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

initSmoothScroll({ reduceMotion });
initNav();
initStampaSections({ reduceMotion });

// hero liquido della pagina Stampa: corallo pastello (= negativo del ciano
// della card), con l'interazione hover come l'hero della home.
initHeroScene({
  reduceMotion,
  canvas: "#stampa-liquid",
  media: ".phero__media",
  colors: [0xff9e85, 0xffb6a0, 0xffc9b8, 0xffd6c9, 0xffab94, 0xf7a086],
});
