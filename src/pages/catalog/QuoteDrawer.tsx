import { useEffect, useId, useRef, useState, type FormEvent, type ReactElement } from "react";
import gsap from "gsap";
import { lockScroll } from "../../lib/smoothScroll";
import { reduceMotion } from "../../lib/reduceMotion";

/**
 * "Richiedi un preventivo": il form si apre a TUTTO SCHERMO. Il pannello
 * (nero, testo bianco) copre il viewport ma viene rivelato via clip-path
 * partendo dal rettangolo della barra-bottone, così sembra crescere da lì.
 * Chiudendo, si ritrae nella barra. Uno scrim dietro scurisce la pagina.
 *
 * Assenza di backend: l'invio compone una email (mailto) verso EDPRINT con
 * i dati del form. Sostituire EMAIL_PREVENTIVI con l'indirizzo reale.
 */
const EMAIL_PREVENTIVI = "info@edprint.it"; // TODO: indirizzo reale dell'azienda

export function QuoteDrawer({
  productName,
  originRect,
  onClose,
}: {
  productName: string | null;
  /** Rettangolo della barra-bottone: il pannello si espande dal suo bordo alto. */
  originRect: DOMRect | null;
  onClose: () => void;
}): ReactElement {
  const open = productName !== null;
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const rectRef = useRef<DOMRect | null>(null);
  const wasOpen = useRef(false);
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const [sent, setSent] = useState(false);
  const titleId = useId();

  if (open && originRect) rectRef.current = originRect; // ultima origine valida

  /** pannello del tutto invisibile (nessun rettangolo residuo a riposo) */
  const hide = (panel: HTMLDivElement): void => {
    panel.style.clipPath = "inset(100% 0% 0% 0%)";
  };

  // clip-path sul pannello full-screen: t=0 → una fessura ad altezza zero sul
  // bordo alto della barra-bottone (larga come la barra), t=1 → viewport intero.
  // L'origine deve avere AREA NULLA: un rettangolo pieno resterebbe dipinto di
  // nero sulla barra a fine chiusura. Senza origine nota, si apre dal fondo.
  const reveal = (panel: HTMLDivElement, t: number): void => {
    const r = rectRef.current;
    const e = 1 - t;
    if (!r) {
      panel.style.clipPath = `inset(${e * 100}% 0% 0% 0%)`;
      return;
    }
    const top = r.top * e;
    const right = (window.innerWidth - r.right) * e;
    const bottom = (window.innerHeight - r.top) * e; // e=1 → bottom = vh - top: altezza 0
    const left = r.left * e;
    panel.style.clipPath = `inset(${top}px ${right}px ${bottom}px ${left}px)`;
  };

  useEffect(() => {
    const root = rootRef.current;
    const panel = panelRef.current;
    const content = contentRef.current;
    if (!root || !panel || !content) return;
    root.inert = !open;
    tweenRef.current?.kill();

    if (open) {
      setSent(false);
      lockScroll(true);
      if (reduceMotion) {
        reveal(panel, 1);
        gsap.set(content, { opacity: 1, y: 0 });
        firstFieldRef.current?.focus();
      } else {
        reveal(panel, 0);
        gsap.set(content, { opacity: 0, y: 14 });
        const s = { t: 0 };
        tweenRef.current = gsap.to(s, {
          t: 1,
          duration: 0.7,
          ease: "power3.inOut",
          onUpdate: () => reveal(panel, s.t),
          onComplete: () => {
            gsap.to(content, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" });
            firstFieldRef.current?.focus();
          },
        });
      }
    } else if (wasOpen.current) {
      // lo scroll resta bloccato fino a fine chiusura (retrazione nel bottone)
      if (reduceMotion) {
        hide(panel);
        lockScroll(false);
      } else {
        gsap.to(content, { opacity: 0, y: 10, duration: 0.18, ease: "power2.in" });
        const s = { t: 1 };
        tweenRef.current = gsap.to(s, {
          t: 0,
          duration: 0.55,
          ease: "power3.inOut",
          delay: 0.04,
          onUpdate: () => reveal(panel, s.t),
          onComplete: () => {
            hide(panel); // niente residui da arrotondamenti sub-pixel
            lockScroll(false);
          },
        });
      }
    }
    wasOpen.current = open;
  }, [open]);

  // chiudi con Esc
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const onSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (k: string): string => String(fd.get(k) ?? "").trim();
    const corpo = [
      `Prodotto: ${get("prodotto")}`,
      `Nome: ${get("nome")}`,
      `Azienda: ${get("azienda")}`,
      `Email: ${get("email")}`,
      `Telefono: ${get("telefono")}`,
      `Quantità indicativa: ${get("quantita")}`,
      "",
      get("messaggio"),
    ].join("\n");
    const mailto =
      `mailto:${EMAIL_PREVENTIVI}` +
      `?subject=${encodeURIComponent(`Richiesta preventivo — ${get("prodotto")}`)}` +
      `&body=${encodeURIComponent(corpo)}`;
    window.location.href = mailto;
    setSent(true);
  };

  return (
    <div className={`qmodal${open ? " is-open" : ""}`} aria-hidden={!open} ref={rootRef}>
      <button
        type="button"
        className="qmodal__scrim"
        aria-label="Chiudi il modulo preventivo"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
      />
      <div
        className="qmodal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={panelRef}
      >
        <div className="qmodal__inner" ref={contentRef} data-lenis-prevent>
          <div className="qmodal__head">
            <span className="mono qmodal__eyebrow">Preventivo</span>
            <button type="button" className="qmodal__close" aria-label="Chiudi" onClick={onClose}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 5l14 14M19 5L5 19" />
              </svg>
            </button>
          </div>

          <div className="qmodal__body">
            <h2 className="qmodal__title" id={titleId}>
              Richiedi un preventivo
            </h2>
            <p className="qmodal__sub">
              {productName ? (
                <>
                  per <b>{productName}</b>
                </>
              ) : (
                "Raccontaci cosa ti serve."
              )}
            </p>

            {sent ? (
              <div className="qmodal__done" role="status">
                <p>
                  Grazie! Abbiamo aperto la tua email con la richiesta già
                  compilata: <b>inviala</b> e ti rispondiamo al più presto.
                </p>
                <p className="qmodal__doneNote">
                  Non si è aperto nulla? Scrivici a{" "}
                  <a href={`mailto:${EMAIL_PREVENTIVI}`}>{EMAIL_PREVENTIVI}</a>.
                </p>
                <button type="button" className="qmodal__submit" onClick={onClose}>
                  Chiudi
                </button>
              </div>
            ) : (
              <form className="qmodal__form" onSubmit={onSubmit}>
                <label className="qfield">
                  <span className="qfield__label">Prodotto</span>
                  <input
                    className="qfield__input"
                    name="prodotto"
                    type="text"
                    defaultValue={productName ?? ""}
                    key={productName}
                  />
                </label>
                <label className="qfield">
                  <span className="qfield__label">Nome e cognome *</span>
                  <input
                    className="qfield__input"
                    name="nome"
                    type="text"
                    required
                    ref={firstFieldRef}
                  />
                </label>
                <label className="qfield">
                  <span className="qfield__label">Azienda</span>
                  <input className="qfield__input" name="azienda" type="text" />
                </label>
                <div className="qfield-row">
                  <label className="qfield">
                    <span className="qfield__label">Email *</span>
                    <input className="qfield__input" name="email" type="email" required />
                  </label>
                  <label className="qfield">
                    <span className="qfield__label">Telefono</span>
                    <input className="qfield__input" name="telefono" type="tel" />
                  </label>
                </div>
                <label className="qfield">
                  <span className="qfield__label">Quantità indicativa</span>
                  <input
                    className="qfield__input"
                    name="quantita"
                    type="text"
                    placeholder="es. 500 pezzi"
                  />
                </label>
                <label className="qfield">
                  <span className="qfield__label">Messaggio</span>
                  <textarea
                    className="qfield__input qfield__area"
                    name="messaggio"
                    rows={4}
                    placeholder="Formato, carta, finiture, tempi…"
                  />
                </label>
                <button type="submit" className="qmodal__submit">
                  Invia richiesta
                </button>
                <p className="qmodal__privacy">I dati servono solo a risponderti. Nessuno spam.</p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
