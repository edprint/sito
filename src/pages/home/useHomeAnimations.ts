import type { RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { splitChars } from "../../lib/splitChars";
import { reduceMotion } from "../../lib/reduceMotion";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Animazioni GSAP della home: intro dell'hero, reveal in scroll, statement
 * (entrata lettera per lettera + riempimento nero con pin/scrub), settori,
 * footer line-art. Porting di src/modules/animations.ts; useGSAP fa il
 * revert automatico (tween + ScrollTrigger) all'unmount della route.
 */
export function useHomeAnimations(root: RefObject<HTMLElement | null>): void {
  useGSAP(
    () => {
      const reveals = gsap.utils.toArray<HTMLElement>(".reveal");

      if (reduceMotion) {
        gsap.set(reveals, { opacity: 1, y: 0 });
        return;
      }

      // stato iniziale dei reveal (l'opacità 0 è già impostata da .js .reveal in CSS)
      gsap.set(reveals, { y: 28 });
      reveals.forEach((el) => {
        gsap.to(el, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        });
      });

      // intro hero
      const introTargets = document.querySelector(".hero__title");
      if (introTargets) {
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        tl.from(".hero__title", { yPercent: 14, opacity: 0, duration: 0.9 })
          .from(".hero__desc", { y: 20, opacity: 0, duration: 0.7 }, "-=0.55")
          .from(
            ".hero__meta .btn",
            { y: 16, opacity: 0, stagger: 0.1, duration: 0.5 },
            "-=0.4"
          )
          .from(
            ".hero__bottom > *",
            { opacity: 0, y: 10, stagger: 0.08, duration: 0.5 },
            "-=0.3"
          );
      }

      // STATEMENT: lettere che entrano, poi si riempiono di nero mentre lo
      // statement è bloccato (CSS sticky). La card che sale è scroll nativo.
      const printReveal = document.querySelector<HTMLElement>(".print-reveal");
      const stText = document.querySelector<HTMLElement>(".statement__text");
      if (printReveal && stText) {
        const chars = splitChars(stText);
        gsap.set(chars, { opacity: 0, yPercent: 60 });

        // le lettere entrano una a una quando la sezione arriva in vista
        gsap.to(chars, {
          opacity: 1,
          yPercent: 0,
          duration: 0.5,
          ease: "power3.out",
          stagger: { amount: 1.0, from: "start" },
          scrollTrigger: { trigger: printReveal, start: "top 70%", once: true },
        });

        // riempimento nero scrubbato: parte quando lo statement si blocca
        // (top top) e finisce dentro lo spacer, prima che la card salga
        gsap.to(chars, {
          color: "#111111",
          ease: "none",
          stagger: { amount: 1 },
          scrollTrigger: {
            trigger: printReveal,
            start: "top top",
            end: "+=90%",
            scrub: true,
          },
        });
      }

      // SETTORI: statement animato lettera per lettera + fade del resto
      const pillars = document.querySelector<HTMLElement>(".pillars");
      const pillarsStatement = document.querySelector<HTMLElement>(".pillars__statement");
      if (pillars && pillarsStatement) {
        const pchars = splitChars(pillarsStatement);
        gsap.set(pchars, { opacity: 0, yPercent: 60 });
        gsap.to(pchars, {
          opacity: 1,
          yPercent: 0,
          duration: 0.5,
          ease: "power3.out",
          stagger: { amount: 0.7, from: "start" },
          scrollTrigger: { trigger: pillars, start: "top 72%", once: true },
        });
        gsap.from(".pillars__note, .pillars__contact, .pillars__label", {
          opacity: 0,
          y: 18,
          duration: 0.6,
          ease: "power3.out",
          stagger: 0.08,
          scrollTrigger: { trigger: pillars, start: "top 66%", once: true },
        });
      }

      // FOOTER: righe che si disegnano, line-art draw-on, testi in reveal
      const footer = document.querySelector<HTMLElement>(".footer");
      if (footer) {
        // segmenti di riga bianchi: si disegnano da sinistra
        gsap.utils.toArray<HTMLElement>(".footer__seg").forEach((seg) => {
          gsap.fromTo(
            seg,
            { scaleX: 0 },
            {
              scaleX: 1,
              transformOrigin: "left center",
              duration: 1,
              ease: "power3.out",
              scrollTrigger: { trigger: seg, start: "top 96%", once: true },
            }
          );
        });
        // line-art (illustrazioni + bottiglione): disegno progressivo
        const artEls = footer.querySelectorAll<SVGGeometryElement>(
          ".footer__art path, .footer__art line, .footer__art rect, .footer__art circle, .footer__art ellipse, .footer__bottle path, .footer__bottle rect"
        );
        artEls.forEach((el) => {
          const len = el.getTotalLength();
          gsap.set(el, { strokeDasharray: len, strokeDashoffset: len });
          gsap.to(el, {
            strokeDashoffset: 0,
            duration: 1.6,
            ease: "power2.out",
            scrollTrigger: { trigger: footer, start: "top 82%", once: true },
          });
        });
        // testi
        gsap.from(".footer__reveal", {
          opacity: 0,
          y: 22,
          duration: 0.7,
          ease: "power3.out",
          stagger: 0.08,
          scrollTrigger: { trigger: footer, start: "top 78%", once: true },
        });
      }

      // i font Typekit cambiano l'altezza del testo -> ricalcola pin/trigger
      if (document.fonts && "ready" in document.fonts) {
        document.fonts.ready.then(() => ScrollTrigger.refresh());
      }
    },
    { scope: root }
  );
}
