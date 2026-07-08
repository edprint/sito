import { useRef, type ReactElement } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { scrollToTarget } from "../../lib/smoothScroll";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export interface TocItem {
  /** id dell'elemento a cui scrollare (deve esistere nel DOM) */
  id: string;
  title: string;
}

/**
 * Menu indice a sinistra: appare quando la prima sezione occupa lo schermo,
 * evidenzia la sezione attiva durante lo scroll, e scrolla alla sezione al
 * click. Lo scroll-spy resta imperativo (classList) per non ri-renderizzare a
 * ogni toggle. Le voci arrivano dalla pagina: sottocategorie (Stampa) o
 * prodotti (Stampati commerciali).
 */
export function Toc({
  items,
  label = "Indice sezioni",
}: {
  /** memoizzare: cambiare identità all'array ricrea gli ScrollTrigger */
  items: TocItem[];
  label?: string;
}): ReactElement {
  const tocRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const toc = tocRef.current;
      if (!toc) return;
      const buttons = Array.from(toc.querySelectorAll<HTMLButtonElement>(".toc__item"));

      // accoppia ogni voce alla sua sezione, saltando le sezioni assenti
      const pairs = items
        .map((it, i) => ({ el: document.getElementById(it.id), button: buttons[i] }))
        .filter((p): p is { el: HTMLElement; button: HTMLButtonElement } => !!p.el && !!p.button);
      if (!pairs.length) return;

      // sezione attiva durante lo scroll
      pairs.forEach(({ el, button }) => {
        ScrollTrigger.create({
          trigger: el,
          start: "top center",
          end: "bottom center",
          onToggle: (self) => {
            if (self.isActive) {
              buttons.forEach((b) => b.classList.remove("is-active"));
              button.classList.add("is-active");
            }
          },
        });
      });

      // il menu appare quando la prima sezione riempie lo schermo, sparisce dopo l'ultima
      ScrollTrigger.create({
        trigger: pairs[0].el,
        start: "top 30%",
        endTrigger: pairs[pairs.length - 1].el,
        end: "bottom 20%",
        onToggle: (self) => toc.classList.toggle("is-visible", self.isActive),
      });
    },
    { dependencies: [items], revertOnUpdate: true }
  );

  return (
    <nav className="toc" ref={tocRef} aria-label={label}>
      {items.map((it) => (
        <button
          key={it.id}
          className="toc__item"
          type="button"
          onClick={() => {
            const target = document.getElementById(it.id);
            if (target) scrollToTarget(target, -80); // spazio sotto la nav fissa
          }}
        >
          <span className="toc__dash" aria-hidden="true"></span>
          {it.title}
        </button>
      ))}
    </nav>
  );
}
