import { useRef, type RefObject } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { reduceMotion } from "../../lib/reduceMotion";
import { scrollToY } from "../../lib/smoothScroll";
import {
  ABOUT_SECTIONS,
  INTRO_BG,
  METHOD_SCALE,
  METHOD_STEPS,
  type HeroObjectState,
} from "./aboutSections";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Rig di scroll della pagina About: capitoli INTRO (colore→carta) e METODO
 * (pin orbitale con snap) + un ScrollTrigger per sezione servizi/settori/CTA.
 *
 * METODO: la goccia RESTA una goccia. Niente trasformazioni scrubbate lungo
 * la sezione: al tocco di ogni checkpoint (snap/click/tastiera) parte un
 * micro-gesto time-based (pulsazione, assestamento, scatto minimo) e un
 * cambio di superficie (liquido/retino). L'anello resta guidato dallo
 * scroll, sincrono al progresso del pin.
 *
 * SNAP: affidato a LENIS (scrollToY) — lo snap nativo di ScrollTrigger
 * tweena lo scroll mentre Lenis lo lerpa, e i due si strappano a vicenda.
 *
 * I testi entrano con i reveal GSAP standard del sito (stesso pattern di
 * initAnimations della home: fade + translate, once).
 */
export function useScrollScenes({
  rootRef,
  stateRef,
  onDebug,
}: {
  rootRef: RefObject<HTMLElement | null>;
  stateRef: RefObject<HeroObjectState>;
  onDebug?: (sectionLabel: string, progress: number) => void;
}): void {
  const onDebugRef = useRef(onDebug);
  onDebugRef.current = onDebug;

  useGSAP(
    () => {
      const root = rootRef.current;
      const state = stateRef.current;
      if (!root || !state) return;

      onDebugRef.current?.("Intro", 0);

      // reveal standard del sito su tutti i testi della pagina
      const reveals = [
        ...gsap.utils.toArray<HTMLElement>(".axv .reveal"),
        ...gsap.utils.toArray<HTMLElement>(".axv__text > p"),
      ];

      // reduced-motion: intro già su carta, goccia statica a lato dei testi,
      // Metodo in variante statica (nessun pin, nessuno snap), testi visibili
      if (reduceMotion) {
        gsap.set(document.documentElement, { "--axv-bg": "#ffffff", "--axv-ink": "#111111" });
        gsap.set(reveals, { opacity: 1, y: 0 });
        state.idle = 0;
        state.bgMix = 0;
        state.scale = 0.9;
        state.x = 0.35;
        state.y = 0;
        state.bottle = 1; // statica: direttamente la bottiglia del logo
        state.color.set("#1b1b1b");
        return;
      }

      reveals.forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 26 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
          }
        );
      });

      const aborter = new AbortController();
      const { signal } = aborter;
      const ink = new THREE.Color("#1b1b1b");
      const arancio = new THREE.Color(INTRO_BG);

      // ================= INTRO: il colore defluisce nella goccia ==========
      const intro = root.querySelector<HTMLElement>('[data-about-chapter="intro"]');
      if (intro) {
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: intro,
            start: "top top",
            end: "bottom 80%",
            scrub: 1,
            onUpdate: (self) => onDebugRef.current?.("Intro", self.progress),
          },
        });
        // sfondo → bianco carta; il testo passa a scuro solo quando lo
        // sfondo è già chiaro (mai illeggibile negli stati intermedi).
        tl.to(document.documentElement, { "--axv-bg": "#ffffff", duration: 0.8 }, 0.1)
          .to(document.documentElement, { "--axv-ink": "#111111", duration: 0.28 }, 0.58)
          // la goccia si satura, si compatta (-15%), prende peso e scivola a
          // destra per lasciare il testo di presentazione a sinistra
          .to(state, { bgMix: 0, scale: 1.35, y: 0, x: 0.28, duration: 0.85 }, 0.08)
          .to(state.color, { r: ink.r, g: ink.g, b: ink.b, duration: 0.55 }, 0.3)
          // …e nella seconda schermata la goccia DIVENTA la bottiglia del
          // logo: morph FLUIDO di forma (pennellata dal basso) e, a profilo
          // raggiunto, dissolvenza sul GLB reale (stessa silhouette)
          .to(state, { bottle: 1, duration: 0.45, ease: "power1.inOut" }, 0.55);
      }

      // ================= METODO: pin orbitale con snap ====================
      const metodo = root.querySelector<HTMLElement>('[data-about-chapter="metodo"]');
      if (metodo) {
        const ring = metodo.querySelector<SVGCircleElement>("[data-axm-ring]");
        const counter = metodo.querySelector<HTMLElement>("[data-axm-count]");
        const cps = Array.from(metodo.querySelectorAll<HTMLButtonElement>("[data-axm-cp]"));
        const steps = Array.from(metodo.querySelectorAll<HTMLButtonElement>("[data-axm-step]"));
        const descs = Array.from(metodo.querySelectorAll<HTMLElement>("[data-axm-desc]"));

        // avvicinamento FLUIDO: la bottiglia si ricentra lungo tutto il
        // tratto che precede il pin (dopo la fine dell'intro, per non
        // sovrapporsi alla sua timeline), scrubbata e senza scatti.
        // Qui — e solo qui — la RIVOLUZIONE attorno alla verticale: un giro
        // completo che accelera e si posa (inOut), legato allo scroll.
        // L'anello 3D appare sotto di lei e la bottiglia si solleva appena
        // per poi SCENDERE dentro l'anello.
        gsap
          .timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: metodo,
              start: "top 75%",
              end: "top top",
              scrub: 1,
            },
          })
          .to(state, { x: 0, scale: METHOD_SCALE, liquid: 1 }, 0)
          .to(state, { turn: "+=1", duration: 1, ease: "power2.inOut" }, 0)
          .to(state, { ring: 1, duration: 0.5, ease: "power2.out" }, 0)
          .to(state, { y: 0.5, duration: 0.45, ease: "power2.out" }, 0)
          .to(state, { y: 0, duration: 0.55, ease: "power2.inOut" }, 0.45);

        // --- micro-gesti al TOCCO del checkpoint (time-based, non scrub):
        // la forma resta una goccia, cambiano superficie e "vita" ----------
        const applyStep = (i: number): void => {
          const surface = [
            { liquid: 1, halftone: 0 }, // Consulenza: inchiostro vivo
            { liquid: 0.14, halftone: 0.85 }, // Realizzazione: stampata, retino
            { liquid: 0.6, halftone: 0 }, // Consegna: reattiva, pronta
          ][i];
          if (!surface) return;
          gsap.to(state, { ...surface, duration: 0.7, ease: "power2.out" });

          // gesto della bottiglia al tocco: una rivoluzione piena attorno
          // alla verticale + giri extra sul proprio asse — partenza decisa,
          // atterraggio morbido (i valori interi lasciano l'orientamento
          // neutro: i gesti si accumulano senza derive)
          gsap.to(state, { turn: "+=1", duration: 1.25, ease: "power3.out", overwrite: "auto" });
          gsap.to(state, { spin: "+=1.5", duration: 1.05, ease: "power4.out", overwrite: "auto" });
          // …e DURANTE la rotazione il vetro assume la tinta del checkpoint
          const tinta = new THREE.Color(METHOD_STEPS[i]!.bottiglia);
          gsap.to(state.glassColor, {
            r: tinta.r,
            g: tinta.g,
            b: tinta.b,
            duration: 1.15,
            ease: "power3.out",
            overwrite: "auto",
          });

          const g = gsap.timeline({ defaults: { ease: "power2.out" } });
          if (i === 0) {
            // piccola pulsazione
            g.to(state, { scale: 1.34, duration: 0.16, ease: "power2.in" }).to(state, {
              scale: 1.26,
              duration: 0.35,
            });
          } else if (i === 1) {
            // si assesta: micro-affondo e ritorno
            g.to(state, { y: -0.07, scale: 1.2, duration: 0.15, ease: "power2.in" }).to(
              state,
              { y: 0, duration: 0.32 }
            );
          } else {
            // micro-scatto laterale e rientro
            g.to(state, { x: 0.05, duration: 0.14, ease: "power2.in" }).to(state, {
              x: 0,
              scale: 1.24,
              duration: 0.32,
            });
          }
        };

        // UI (elenco/medaglioni/contatore) segue le zone; il GESTO della
        // goccia parte SOLO al tocco del checkpoint (prossimità), non
        // mentre ci si arriva
        let activeStep = -1;
        const setActive = (i: number): void => {
          if (i === activeStep) return;
          activeStep = i;
          cps.forEach((el, k) => el.classList.toggle("is-active", k === i));
          steps.forEach((el, k) => el.classList.toggle("is-active", k === i));
          descs.forEach((el, k) => el.classList.toggle("is-active", k === i));
          if (counter) counter.textContent = String(i + 1).padStart(2, "0");
        };

        let lastGesture = -1;
        const gestureAt = (p: number): void => {
          const near = METHOD_STEPS.findIndex((s) => Math.abs(p - s.at) < 0.035);
          if (near !== -1) {
            if (near !== lastGesture) {
              lastGesture = near;
              applyStep(near);
            }
          } else if (
            lastGesture !== -1 &&
            METHOD_STEPS.every((s) => Math.abs(p - s.at) > 0.09)
          ) {
            lastGesture = -1; // lontano da tutti: ri-toccare ri-attiva
          }
        };

        // snap morbido, affidato a Lenis (vedi nota in testa)
        const SNAPS = [0, ...METHOD_STEPS.map((s) => s.at), 1];
        const snapDelay = gsap.delayedCall(0.2, () => {
          if (!st) return;
          if (Math.abs(st.getVelocity()) > 60) {
            snapDelay.restart(true);
            return;
          }
          const p = st.progress;
          if (p <= 0.002 || p >= 0.998) return;
          const target = SNAPS.reduce((a, b) =>
            Math.abs(b - p) < Math.abs(a - p) ? b : a
          );
          if (Math.abs(target - p) < 0.006) return;
          scrollToY(st.start + target * (st.end - st.start), 0.7);
        }).pause();

        // pin: l'anello segue lo scroll; la goccia si muove solo al tocco
        // dei checkpoint (setActive → applyStep)
        const st = ScrollTrigger.create({
          trigger: metodo,
          start: "top top",
          end: "+=300%",
          pin: true,
          anticipatePin: 1,
          // risalendo verso l'intro il vetro torna arancio brand
          onLeaveBack: () => {
            gsap.to(state.glassColor, {
              r: arancio.r,
              g: arancio.g,
              b: arancio.b,
              duration: 0.6,
              ease: "power2.out",
              overwrite: "auto",
            });
          },
          onUpdate: (self) => {
            const p = self.progress;
            // anello 3D: l'arco si riempie sincrono allo scroll
            state.ringProgress = p;
            // (l'SVG resta nel DOM come fallback, nascosto via CSS)
            if (ring) ring.style.strokeDashoffset = String(1 - p);
            setActive(p < 0.33 ? 0 : p < 0.67 ? 1 : 2);
            gestureAt(p);
            onDebugRef.current?.("Metodo", p);
            snapDelay.restart(true);
          },
        });
        setActive(0);

        // --- click e tastiera: medaglioni + elenco step -------------------
        const goTo = (i: number): void => {
          const step = METHOD_STEPS[i];
          if (!st || !step) return;
          scrollToY(st.start + step.at * (st.end - st.start), 0.9);
        };
        cps.forEach((el) =>
          el.addEventListener("click", () => goTo(Number(el.dataset.axmCp)), { signal })
        );
        steps.forEach((el, i) => {
          el.addEventListener("click", () => goTo(i), { signal });
          // accessibilità: il focus da tastiera attiva lo step
          el.addEventListener(
            "focus",
            () => {
              if (el.matches(":focus-visible")) goTo(i);
            },
            { signal }
          );
        });
      }

      // ================= SERVIZI / SETTORI / CTA (invariati) ==============
      ABOUT_SECTIONS.forEach((section) => {
        const el = root.querySelector<HTMLElement>(
          `[data-about-section="${section.id}"]`
        );
        if (!el) return;

        const target = section.state;
        const color = new THREE.Color(target.color);

        const tl = gsap.timeline({
          defaults: { ease: "none", duration: 1 },
          scrollTrigger: {
            trigger: el,
            start: "top bottom",
            end: "top top",
            scrub: 1,
            onUpdate: (self) => onDebugRef.current?.(section.label, self.progress),
          },
        });

        tl.to(
          state,
          {
            x: target.x,
            y: target.y,
            scale: target.scale,
            rotationY: target.rotationY,
            idle: target.idle,
            liquid: target.liquid,
            plane: target.plane,
            curl: target.curl,
            fold: target.fold,
            wrap: target.wrap,
          },
          0
        )
          .to(state.color, { r: color.r, g: color.g, b: color.b }, 0)
          // subito: ogni residuo del Metodo si azzera (un'uscita veloce dal
          // pin può aver saltato il gesto che normalizzerebbe retino/scia)
          .to(state, { halftone: 0, trail: 0, bgMix: 0, duration: 0.35 }, 0)
          // POI la bottiglia rifluisce nella pennellata e l'anello — rimasto
          // fermo mentre lei lo attraversava — sfuma; il vetro torna arancio
          .to(state, { bottle: target.bottle, duration: 0.4 }, 0.3)
          .to(state, { ring: 0, duration: 0.45 }, 0.3)
          .to(state.glassColor, { r: arancio.r, g: arancio.g, b: arancio.b, duration: 0.4 }, 0.3);

        // Stampa: uscita dal Metodo — la bottiglia scivola GIÙ attraverso
        // l'anello (che resta fermo) e ESCE DA SOTTO, poi riemerge come
        // pennellata verso il foglio (inserito dopo il tween generico:
        // sull'asse y vince questo)
        if (section.id === "stampa") {
          tl.to(state, { y: -1.2, duration: 0.35, ease: "power2.in" }, 0)
            .to(state, { y: target.y, duration: 0.5, ease: "power2.out" }, 0.35)
            // il fuori registro CMYK sale mentre la pennellata stende il
            // foglio, poi le lastre convergono a registro entro fine sezione
            .to(state, { register: 1, duration: 0.45 }, 0)
            .to(state, { register: 0, duration: 0.55 }, 0.45);
        }
      });

      // i font Typekit cambiano l'altezza delle sezioni -> ricalcola i trigger
      if (document.fonts && "ready" in document.fonts) {
        document.fonts.ready.then(() => ScrollTrigger.refresh());
      }

      return () => aborter.abort();
    },
    { scope: rootRef }
  );
}
