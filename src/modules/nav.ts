import gsap from "gsap";
import { lockScroll } from "./smoothScroll";

/**
 * Navigazione: drawer "Servizi" / "Settori" (1/3 pagina) animati con GSAP,
 * overlay, chiusura con ESC / click esterno, e menu mobile.
 */
export function initNav(): void {
  const overlay = document.querySelector<HTMLElement>("#overlay");
  const triggers = gsap.utils.toArray<HTMLButtonElement>(".nav__trigger");
  const drawers = gsap.utils.toArray<HTMLElement>(".drawer");
  const closeButtons = gsap.utils.toArray<HTMLElement>("[data-close]");
  if (!overlay || drawers.length === 0) return;

  // stato iniziale (chiuso: rettangolo a dimensione zero nell'angolo in alto a destra)
  gsap.set(drawers, { "--cl": 100, "--cb": 100 });
  gsap.set(overlay, { autoAlpha: 0 });

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
      // ...ma l'espansione verso sinistra è più lenta (prima era troppo veloce)
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
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const name = trigger.dataset.menu;
      if (!name) return;
      if (current === name) closeAll();
      else openDrawer(name);
    });
  });

  overlay.addEventListener("click", closeAll);
  closeButtons.forEach((b) => b.addEventListener("click", closeAll));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAll();
  });
  drawers.forEach((d) =>
    d.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeAll))
  );

  // menu mobile
  const nav = document.querySelector<HTMLElement>("#nav");
  const burger = document.querySelector<HTMLButtonElement>("#burger");
  if (nav && burger) {
    burger.addEventListener("click", () => {
      const open = nav.classList.toggle("is-mobile-open");
      burger.setAttribute("aria-expanded", String(open));
    });
    nav.querySelectorAll(".nav__right a").forEach((a) =>
      a.addEventListener("click", () => {
        nav.classList.remove("is-mobile-open");
        burger.setAttribute("aria-expanded", "false");
      })
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
    { passive: true }
  );
}
