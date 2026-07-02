import { initSmoothScroll } from "./modules/smoothScroll";
import { initNav } from "./modules/nav";
import { initForm } from "./modules/form";
import { initHeroScene } from "./modules/heroScene";
import { initBlobField } from "./modules/blobField";
import { initAnimations } from "./modules/animations";

const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

initSmoothScroll({ reduceMotion });
initNav();
initForm();
initHeroScene({ reduceMotion });
// liquido monocolore di ogni card = colore NEGATIVO rispetto allo sfondo card
initBlobField({
  reduceMotion,
  canvas: "#liquid-stampa",
  media: ".chapter--stampa .chapter__media",
  colors: [0xff7a5e, 0xed4f36, 0xff9a80, 0xffd9cc, 0xf26a4d, 0xd63a20], // neg. ciano
});
initBlobField({
  reduceMotion,
  canvas: "#liquid-decorazioni",
  media: ".chapter--decorazioni .chapter__media",
  colors: [0x5cf0a2, 0x1aff81, 0x86f5bd, 0xd6ffe8, 0x30e07f, 0x12cc66], // neg. magenta
});
initBlobField({
  reduceMotion,
  canvas: "#liquid-strutture",
  media: ".chapter--strutture .chapter__media",
  colors: [0x5c78ff, 0x2b4dff, 0x8aa0ff, 0xcdd6ff, 0x3a5cff, 0x1f3ce0], // neg. giallo
});
initBlobField({
  reduceMotion,
  canvas: "#liquid-gadget",
  media: ".chapter--gadget .chapter__media",
  colors: [0xffffff, 0xe4e4e4, 0xf4f4f4, 0xfafafa, 0xececec, 0xdadada], // neg. nero
});
initAnimations({ reduceMotion });
