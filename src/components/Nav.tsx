import { useEffect, type ReactElement } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { lockScroll } from "../lib/smoothScroll";

/**
 * Navigazione: drawer "Servizi" / "Settori" (1/3 pagina) animati con GSAP,
 * overlay, chiusura con ESC / click esterno, menu mobile e auto-hide in
 * scroll. Porting del vecchio src/modules/nav.ts: il markup è JSX, la
 * coreografia resta imperativa dentro un unico effect (il componente vive
 * nel layout e monta una sola volta).
 */

interface DrawerItem {
  label: string;
  idx: string;
  to: string;
}

// una voce per categoria del catalogo (src/pages/catalog/taxonomy.ts)
const SERVIZI: DrawerItem[] = [
  { label: "Stampa", idx: "01", to: "/stampa" },
  { label: "Decorazioni ed allestimenti", idx: "02", to: "/decorazioni" },
  { label: "Strutture espositive", idx: "03", to: "/strutture" },
  { label: "Gadget e merchandising", idx: "04", to: "/gadget" },
];

const SETTORI: DrawerItem[] = [
  { label: "Aziende, PMI", idx: "01", to: "/#settori" },
  { label: "PA, Scuole, Associazioni", idx: "02", to: "/#settori" },
  { label: "Horeca, Negozi, Attività locali", idx: "03", to: "/#settori" },
  { label: "Studi professionali, specialistici", idx: "04", to: "/#settori" },
];

function Drawer({ name, title, items }: { name: string; title: string; items: DrawerItem[] }): ReactElement {
  return (
    <aside className="drawer" id={`panel-${name}`} data-panel={name} aria-hidden="true">
      <div className="drawer__bar">
        <span className="drawer__title">{title}</span>
        <button className="drawer__x" data-close aria-label="Chiudi">
          <span className="nav__plus" aria-hidden="true"></span>
        </button>
      </div>
      <ul className="drawer__list">
        {items.map((item) => (
          <li key={item.idx}>
            <Link to={item.to}>
              <span className="drawer__label" data-text={item.label}>
                {item.label}
              </span>
              <span className="drawer__idx">{item.idx}</span>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export function Nav(): ReactElement {
  useEffect(() => {
    const aborter = new AbortController();
    const { signal } = aborter;

    const overlay = document.querySelector<HTMLElement>("#overlay");
    const triggers = gsap.utils.toArray<HTMLButtonElement>(".nav__trigger");
    const drawers = gsap.utils.toArray<HTMLElement>(".drawer");
    const closeButtons = gsap.utils.toArray<HTMLElement>("[data-close]");
    if (!overlay || drawers.length === 0) return;

    const ctx = gsap.context(() => {
      // stato iniziale (chiuso: rettangolo a dimensione zero in alto a destra)
      gsap.set(drawers, { "--cl": 100, "--cb": 100 });
      gsap.set(overlay, { autoAlpha: 0 });
    });

    let current: string | null = null;

    const drawerByName = (name: string): HTMLElement | undefined =>
      drawers.find((d) => d.dataset.panel === name);

    function hide(d: HTMLElement): void {
      d.classList.remove("is-open");
      d.setAttribute("aria-hidden", "true");
      gsap.to(d, { "--cl": 100, "--cb": 100, duration: 0.4, ease: "power3.in" });
    }

    function openDrawer(name: string): void {
      const target = drawerByName(name);
      if (!target || !overlay) return;

      drawers.forEach((d) => {
        if (d !== target && d.classList.contains("is-open")) hide(d);
      });

      current = name;
      overlay.hidden = false;
      gsap.to(overlay, { autoAlpha: 1, duration: 0.3 });
      document.body.style.overflow = "hidden";
      lockScroll(true);

      target.classList.add("is-open");
      target.setAttribute("aria-hidden", "false");

      const title = target.querySelector(".drawer__title");
      const items = target.querySelectorAll(".drawer__list li");
      gsap
        .timeline()
        // giù nella pagina e verso sinistra: partono insieme...
        .to(target, { "--cb": 0, duration: 0.6, ease: "power3.out" }, 0)
        // ...ma l'espansione verso sinistra è più lenta
        .to(target, { "--cl": 0, duration: 1.0, ease: "power2.out" }, 0)
        // il titolo scivola a sinistra in sincrono, fino a sopra il logo
        .from(title, { x: 240, autoAlpha: 0, duration: 0.9, ease: "power2.out" }, 0.05)
        // le voci compaiono dal basso
        .from(
          items,
          { y: 26, autoAlpha: 0, stagger: 0.06, duration: 0.4, ease: "power3.out" },
          0.55
        );

      triggers.forEach((t) =>
        t.setAttribute("aria-expanded", String(t.dataset.menu === name))
      );
    }

    function closeAll(): void {
      if (!overlay) return;
      drawers.forEach((d) => {
        if (d.classList.contains("is-open")) hide(d);
      });
      current = null;
      triggers.forEach((t) => t.setAttribute("aria-expanded", "false"));
      gsap.to(overlay, {
        autoAlpha: 0,
        duration: 0.3,
        onComplete: () => {
          overlay.hidden = true;
        },
      });
      document.body.style.overflow = "";
      lockScroll(false);
    }

    triggers.forEach((trigger) => {
      trigger.addEventListener(
        "click",
        (e) => {
          e.stopPropagation();
          const name = trigger.dataset.menu;
          if (!name) return;
          if (current === name) closeAll();
          else openDrawer(name);
        },
        { signal }
      );
    });

    overlay.addEventListener("click", closeAll, { signal });
    closeButtons.forEach((b) => b.addEventListener("click", closeAll, { signal }));
    document.addEventListener(
      "keydown",
      (e) => {
        if (e.key === "Escape") closeAll();
      },
      { signal }
    );
    drawers.forEach((d) =>
      d
        .querySelectorAll("a")
        .forEach((a) => a.addEventListener("click", closeAll, { signal }))
    );

    // menu mobile
    const nav = document.querySelector<HTMLElement>("#nav");
    const burger = document.querySelector<HTMLButtonElement>("#burger");
    if (nav && burger) {
      burger.addEventListener(
        "click",
        () => {
          const open = nav.classList.toggle("is-mobile-open");
          burger.setAttribute("aria-expanded", String(open));
        },
        { signal }
      );
      nav.querySelectorAll(".nav__right a").forEach((a) =>
        a.addEventListener(
          "click",
          () => {
            nav.classList.remove("is-mobile-open");
            burger.setAttribute("aria-expanded", "false");
          },
          { signal }
        )
      );
    }

    // auto-hide del menu: nascondi scrollando giù, mostra scrollando su
    let lastY = window.scrollY;
    let ticking = false;
    const onScroll = (): void => {
      const y = window.scrollY;
      // resta sempre visibile in cima e quando un drawer è aperto
      const drawerOpen = drawers.some((d) => d.classList.contains("is-open"));
      if (drawerOpen || y <= 80) {
        document.body.classList.remove("nav-hidden");
      } else if (y > lastY + 4) {
        document.body.classList.add("nav-hidden"); // scroll giù
      } else if (y < lastY - 4) {
        document.body.classList.remove("nav-hidden"); // scroll su
      }
      lastY = y;
      ticking = false;
    };
    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(onScroll);
        }
      },
      { passive: true, signal }
    );

    return () => {
      aborter.abort();
      ctx.revert();
      document.body.style.overflow = "";
      document.body.classList.remove("nav-hidden");
    };
  }, []);

  return (
    <>
      <header className="nav" id="nav">
        <div className="nav__inner">
          {/* Fascia arancione con i trigger: dal bordo sinistro fino a --drawer-w */}
          <nav className="nav__menu" aria-label="Menu principale">
            <button
              className="nav__link nav__trigger"
              data-menu="servizi"
              aria-expanded="false"
              aria-controls="panel-servizi"
            >
              <span className="nav__label" data-text="Servizi">Servizi</span>
              <span className="nav__plus" aria-hidden="true"></span>
            </button>
            <button
              className="nav__link nav__trigger"
              data-menu="settori"
              aria-expanded="false"
              aria-controls="panel-settori"
            >
              <span className="nav__label" data-text="Settori">Settori</span>
              <span className="nav__plus" aria-hidden="true"></span>
            </button>
          </nav>

          {/* Voci di destra */}
          <nav className="nav__right" aria-label="Menu secondario">
            <Link className="nav__link" to="/#cataloghi">
              <span className="nav__label" data-text="Cataloghi">Cataloghi</span>
            </Link>
            <Link className="nav__link" to="/#contatti">
              <span className="nav__label" data-text="Contatti">Contatti</span>
            </Link>
            <Link className="nav__link" to="/#chi-siamo">
              <span className="nav__label" data-text="Chi siamo">Chi siamo</span>
            </Link>
            <Link className="nav__link nav__cta" to="/#preventivo">
              <span className="nav__label" data-text="Richiedi preventivo">Richiedi preventivo</span>
            </Link>
          </nav>

          {/* Mobile toggle */}
          <button className="nav__burger" id="burger" aria-label="Apri menu" aria-expanded="false">
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </header>

      {/* Overlay dietro i drawer aperti */}
      <div className="overlay" id="overlay" hidden></div>

      <Drawer name="servizi" title="Servizi" items={SERVIZI} />
      <Drawer name="settori" title="Settori" items={SETTORI} />
    </>
  );
}
