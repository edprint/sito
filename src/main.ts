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
  colors: [0xffc4b0, 0xffad97, 0xffd6c9, 0xffe8de, 0xffb6a0, 0xf7a086], // corallo pastello
});
initBlobField({
  reduceMotion,
  canvas: "#liquid-decorazioni",
  media: ".chapter--decorazioni .chapter__media",
  colors: [0xbcf0d5, 0x9ee7bf, 0xd2f4e3, 0xe9fbf1, 0xaaecc8, 0x8ce0b3], // menta pastello
});
initBlobField({
  reduceMotion,
  canvas: "#liquid-strutture",
  media: ".chapter--strutture .chapter__media",
  colors: [0xb9c2f6, 0x9fabf1, 0xcdd3f9, 0xe3e7fc, 0xabb5f4, 0x909dec], // pervinca pastello
});
initBlobField({
  reduceMotion,
  canvas: "#liquid-gadget",
  media: ".chapter--gadget .chapter__media",
  colors: [0xffffff, 0xededed, 0xf6f6f6, 0xfbfbfb, 0xf1f1f1, 0xe6e6e6], // chiaro pastello
});
initAnimations({ reduceMotion });
