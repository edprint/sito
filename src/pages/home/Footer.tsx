import { Component, type ErrorInfo, type ReactElement, type ReactNode } from "react";
import { Link } from "react-router-dom";
import FooterBottleCanvas from "./FooterBottleCanvas";

/**
 * Se il contesto WebGL non si crea (driver, GPU esaurite, WebGL disattivato),
 * il Canvas lancia in fase di render: senza confine l'errore si porterebbe via
 * l'intera home. Qui si spegne il vetro e resta la silhouette a tratto.
 */
class BottleBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.warn("Bottiglione 3D non disponibile, ripiego sulla silhouette:", error, info);
  }
  render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * Silhouette della bottiglia del logo (public/assets/Loghi edprint.png).
 * Non è disegnata a occhio: è generata dal profilo MISURATO sul logo, la
 * stessa tabella (z, r) di src/lib/bottleProfile.ts che genera il GLB —
 * spline monotona campionata e convertita in cubiche. Rapporto
 * altezza/diametro 2.127, raggio massimo 100 a z=0.275 (corpo basso e pieno).
 *
 * Serve SOLO da ripiego del bottiglione in vetro (FooterBottleCanvas), quando
 * il WebGL non parte. Stesso profilo, stessa silhouette.
 */
const BOTTLE_PATH =
  "M117.3 435 C120 434.6 127.1 433.4 133.5 432.5 C140 431.5 148.7 430.8 155.9 429.1 " +
  "C163.1 427.4 171.6 425.5 176.9 422.3 C182.2 419 184.6 414.5 187.6 409.5 " +
  "C190.6 404.5 192.4 399.6 195.1 392.5 C197.7 385.4 201.2 376.6 203.6 367 " +
  "C205.9 357.4 208.2 343.3 209.3 335.1 C210.3 327 210 324.1 210 318.1 " +
  "C210 312.1 210.2 307.9 209.1 299 C207.9 290.1 205.8 276.3 203.1 265 " +
  "C200.4 253.7 196.8 242.3 193.2 231 C189.5 219.7 185.2 208.3 181.3 197 " +
  "C177.5 185.7 173.4 174.3 170 163 C166.7 151.7 163.6 140.3 161.3 129 " +
  "C159 117.7 157.2 103.2 156.2 95 C155.2 86.8 155.3 82.9 155.2 79.7 " +
  "C155.1 76.5 154.9 77.4 155.5 75.9 C156 74.3 157.2 74.2 158.3 70.4 " +
  "C159.4 66.5 160.7 58.3 161.8 52.5 C162.9 46.7 164.3 39.4 164.7 35.5 " +
  "C165.1 31.6 164.9 31.4 164 29.1 C163.2 26.9 162.2 24.2 159.5 21.9 " +
  "C156.8 19.6 152.2 16.8 148.1 15.1 C144 13.4 141 12.6 134.7 11.7 " +
  "C128.4 10.9 114.1 10.3 110 10 C105.9 10.3 91.6 10.9 85.3 11.7 " +
  "C79 12.6 76 13.4 71.9 15.1 C67.8 16.8 63.2 19.6 60.5 21.9 " +
  "C57.8 24.2 56.8 26.9 56 29.1 C55.1 31.4 54.9 31.6 55.3 35.5 " +
  "C55.7 39.4 57.1 46.7 58.2 52.5 C59.3 58.3 60.6 66.5 61.7 70.4 " +
  "C62.8 74.2 64 74.3 64.5 75.9 C65.1 77.4 64.9 76.5 64.8 79.7 " +
  "C64.7 82.9 64.8 86.8 63.8 95 C62.8 103.2 61 117.7 58.7 129 " +
  "C56.4 140.3 53.3 151.7 50 163 C46.6 174.3 42.5 185.7 38.7 197 " +
  "C34.8 208.3 30.5 219.7 26.8 231 C23.2 242.3 19.6 253.7 16.9 265 " +
  "C14.2 276.3 12.1 290.1 10.9 299 C9.8 307.9 10 312.1 10 318.1 " +
  "C10 324.1 9.7 327 10.7 335.1 C11.8 343.3 14.1 357.4 16.4 367 " +
  "C18.8 376.6 22.3 385.4 24.9 392.5 C27.6 399.6 29.4 404.5 32.4 409.5 " +
  "C35.4 414.5 37.8 419 43.1 422.3 C48.4 425.5 56.9 427.4 64.1 429.1 " +
  "C71.3 430.8 80 431.5 86.5 432.5 C92.9 433.4 100 434.6 102.7 435 Z";

/** Silhouette a tratto: si vede solo se il vetro 3D non può essere disegnato. */
const BottleFallback = (
  <svg
    className="footer__bottle"
    viewBox="0 0 220 445"
    fill="none"
    stroke="currentColor"
    strokeWidth="7"
    strokeLinejoin="round"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d={BOTTLE_PATH} />
    {/* tappo: bordo anteriore e base dell'ellisse in prospettiva, bocca al
        centro della faccia superiore (ellisse concentrica) */}
    <g strokeWidth="5">
      <path d="M55.3 32.1 A 54.7 22.1 0 0 0 164.7 32.1" />
      <path d="M61.7 70.4 A 48.3 19.5 0 0 0 158.3 70.4" />
      <ellipse cx="110" cy="32.1" rx="30" ry="12.1" />
    </g>
  </svg>
);

/** Footer della home: bottiglione in vetro, bande disegnate, contatti. */
export function Footer(): ReactElement {
  return (
    <footer className="footer" id="contatti">
      {/* il vetro c'è dal primo frame: nessun lazy, nessuna entrata in scena */}
      <BottleBoundary fallback={BottleFallback}>
        <FooterBottleCanvas />
      </BottleBoundary>

      <div className="footer__stage">
        {/* BANDA 1: linea con illustrazioni appoggiate (centro + destra) */}
        <div className="footer__band">
          <span className="footer__seg" style={{ flexGrow: 3 }}></span>
          <svg
            className="footer__art footer__art--md"
            viewBox="0 0 260 210"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="34" y="16" width="192" height="26" rx="13" />
            <line x1="46" y1="42" x2="46" y2="52" />
            <line x1="214" y1="42" x2="214" y2="52" />
            <rect x="26" y="52" width="208" height="72" rx="8" />
            <rect x="182" y="66" width="40" height="26" rx="4" />
            <line x1="190" y1="76" x2="214" y2="76" />
            <line x1="190" y1="84" x2="206" y2="84" />
            <line x1="42" y1="112" x2="150" y2="112" />
            <path d="M60 124 C 58 150, 78 168, 120 180" />
            <path d="M96 124 C 96 150, 108 166, 140 178" />
            <line x1="56" y1="124" x2="56" y2="196" />
            <line x1="204" y1="124" x2="204" y2="196" />
            <line x1="42" y1="196" x2="70" y2="196" />
            <line x1="190" y1="196" x2="218" y2="196" />
          </svg>
          <span className="footer__seg" style={{ flexGrow: 4 }}></span>
          <svg
            className="footer__art footer__art--tall"
            viewBox="0 0 120 300"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="28" y="18" width="64" height="250" rx="6" />
            <rect x="42" y="32" width="36" height="26" rx="3" />
            <line x1="42" y1="78" x2="78" y2="78" />
            <circle cx="60" cy="106" r="9" />
            <line x1="28" y1="152" x2="92" y2="152" />
            <line x1="28" y1="210" x2="92" y2="210" />
            <line x1="46" y1="268" x2="46" y2="292" />
            <line x1="74" y1="268" x2="74" y2="292" />
            <line x1="38" y1="292" x2="54" y2="292" />
            <line x1="66" y1="292" x2="82" y2="292" />
          </svg>
          <span className="footer__seg" style={{ flexGrow: 0.3 }}></span>
        </div>

        {/* indirizzi tra le due linee */}
        <div className="footer__cols">
          <div className="footer__block footer__reveal">
            <h3 className="footer__h">Sede</h3>
            <p>
              Via della Stampa 12<br />00000 Città (IT)<br />+39 000 000 0000<br />info@edprint.it
            </p>
          </div>
          <div className="footer__block footer__reveal">
            <h3 className="footer__h">Produzione</h3>
            <p>
              Zona Industriale, Lotto 8<br />00000 Città (IT)<br />produzione@edprint.it
            </p>
          </div>
          <div className="footer__block footer__reveal">
            <h3 className="footer__h">Commerciale</h3>
            <p>
              Preventivi e progetti<br />commerciale@edprint.it<br />+39 000 000 0001
            </p>
          </div>
        </div>

        {/* BANDA 2: linea con illustrazioni appoggiate (sinistra + destra) */}
        <div className="footer__band">
          <span className="footer__seg" style={{ flexGrow: 0.4 }}></span>
          <svg
            className="footer__art footer__art--md"
            viewBox="0 0 240 210"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="24" y="30" width="192" height="120" rx="10" />
            <circle cx="78" cy="78" r="26" />
            <circle cx="150" cy="78" r="26" />
            <circle cx="114" cy="126" r="18" />
            <circle cx="78" cy="78" r="3" />
            <circle cx="150" cy="78" r="3" />
            <circle cx="114" cy="126" r="3" />
            <path d="M24 56 C 54 56, 52 96, 114 108 C 176 96, 174 56, 216 56" />
            <line x1="60" y1="150" x2="60" y2="196" />
            <line x1="180" y1="150" x2="180" y2="196" />
            <line x1="46" y1="196" x2="74" y2="196" />
            <line x1="166" y1="196" x2="194" y2="196" />
          </svg>
          <span className="footer__seg" style={{ flexGrow: 7 }}></span>
          <svg
            className="footer__art footer__art--md"
            viewBox="0 0 220 190"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="24" y="92" width="172" height="58" rx="6" />
            <line x1="44" y1="150" x2="44" y2="176" />
            <line x1="176" y1="150" x2="176" y2="176" />
            <rect x="46" y="98" width="118" height="14" />
            <line x1="34" y1="92" x2="34" y2="34" />
            <line x1="34" y1="34" x2="150" y2="62" />
            <line x1="150" y1="62" x2="172" y2="54" />
          </svg>
          <span className="footer__seg" style={{ flexGrow: 0.5 }}></span>
        </div>

        {/* nav sotto la seconda linea */}
        <nav className="footer__nav footer__reveal" aria-label="Link footer">
          <a href="#top">Servizi</a>
          <a href="#settori">Settori</a>
          <a href="#chi-siamo">Chi siamo</a>
          <a href="#top">Cataloghi</a>
          <span className="footer__nav-sec">
            <Link to="/about">Il nostro percorso</Link>
            <a href="#top">Lavora con noi</a>
            <a href="#top">Note legali</a>
            <a href="#top">Privacy Policy</a>
          </span>
        </nav>

        {/* base: social a sinistra, Made by a destra */}
        <div className="footer__base">
          <div className="footer__social footer__reveal">
            <a href="#" aria-label="LinkedIn">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M4.98 3.5a2.5 2.5 0 11-.02 5 2.5 2.5 0 01.02-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.4c0-1.3-.02-2.97-1.8-2.97-1.8 0-2.08 1.4-2.08 2.87V21H9z" />
              </svg>
            </a>
            <a href="#" aria-label="Facebook">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.53-1.5H17V3.64c-.28-.04-1.25-.12-2.37-.12-2.35 0-3.96 1.43-3.96 4.07v2.21H8v3.1h2.67V21z" />
              </svg>
            </a>
            <a href="#" aria-label="Instagram">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
              </svg>
            </a>
          </div>
          <span className="footer__made footer__reveal">Made by Erma Studio</span>
        </div>
      </div>
    </footer>
  );
}
