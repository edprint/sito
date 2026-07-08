import type { RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { splitChars } from "../../lib/splitChars";
import { reduceMotion } from "../../lib/reduceMotion";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Animazioni delle pagine di catalogo (categoria e sottocategoria): intro del
 * titolo hero, reveal dei testi, cascata di lettere sui titoli di sezione e
 * reveal "a tendina" delle gallerie (prima cala la tendina di colore, poi si
 * scopre l'immagine). Porting di initStampaSections (le sezioni ora sono JSX,
 * il carosello vive in GalleryFigure e il TOC in Toc). useGSAP fa il revert
 * all'unmount.
 */
export function useCatalogAnimations(root: RefObject<HTMLElement | null>): void {
  useGSAP(
    () => {
      const pheroTitle = document.querySelector<HTMLElement>(".phero__title");

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
    },
    { scope: root }
  );
}
