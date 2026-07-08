import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  type ReactElement,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import { reduceMotion } from "../../lib/reduceMotion";
import { createHeroObjectState, METHOD_STEPS, type HeroObjectState } from "./aboutSections";
import { useScrollScenes } from "./useScrollScenes";

// lazy-load del canvas (brief): la pagina rende i contenuti anche prima/senza il 3D
const AboutCanvas = lazy(() => import("./AboutCanvas"));

/** Se il canvas non carica (rete, WebGL assente), la pagina resta fruibile. */
class CanvasBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }
  override render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}

/** Visual del medaglione di uno step del Metodo. */
function MedallionFace({ step }: { step: number }): ReactElement {
  if (step === 0) return <span className="axm__face axm__face--solid" aria-hidden="true" />;
  if (step === 1) return <span className="axm__face axm__face--halftone" aria-hidden="true" />;
  return (
    <span className="axm__face axm__face--pack" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 8.5 12 5l8 3.5v7L12 19l-8-3.5z" />
        <path d="M4 8.5 12 12l8-3.5M12 12v7" />
        <path d="M15 2.5h5v5" />
      </svg>
    </span>
  );
}

/** Capitolo METODO — versione statica per prefers-reduced-motion. */
function MetodoStatic(): ReactElement {
  return (
    <section className="axm axm--static" aria-label="Il nostro metodo">
      <div className="axv__text axm__intro">
        <span className="mono axv__num reveal">Il metodo</span>
        <h2 className="axv__h2 reveal">Tre passaggi, un interlocutore.</h2>
      </div>
      {METHOD_STEPS.map((step, i) => (
        <article key={step.id} className="axm__staticBlock">
          <span className="axm__cp is-active" aria-hidden="true">
            <MedallionFace step={i} />
          </span>
          <div>
            <h3 className="axm__staticTitle">{step.title}</h3>
            <p className="axm__staticDesc">{step.description}</p>
          </div>
        </article>
      ))}
    </section>
  );
}

/** Capitolo METODO — layout orbitale pinnato (anello + medaglioni + angoli). */
function Metodo(): ReactElement {
  return (
    <section className="axm" data-about-chapter="metodo" aria-label="Il nostro metodo">
      <div className="axm__stage">
        {/* anello di progresso centrato sulla goccia */}
        <div className="axm__orbit" data-axm-orbit>
          <svg className="axm__ring" viewBox="0 0 100 100" aria-hidden="true">
            <circle className="axm__ringTrack" cx="50" cy="50" r="48" pathLength={1} />
            <circle
              className="axm__ringFill"
              cx="50"
              cy="50"
              r="48"
              pathLength={1}
              data-axm-ring
              transform="rotate(-90 50 50)"
            />
          </svg>
          {/* medaglioni a 120°: ore 12, 4, 8 */}
          {METHOD_STEPS.map((step, i) => (
            <button
              key={step.id}
              type="button"
              className={`axm__cp axm__cp--${i}`}
              data-axm-cp={i}
              aria-label={`Vai allo step: ${step.title}`}
            >
              <MedallionFace step={i} />
            </button>
          ))}
        </div>

        {/* alto sinistra: elenco step */}
        <nav className="axm__list" aria-label="Step del metodo">
          {METHOD_STEPS.map((step, i) => (
            <button key={step.id} type="button" className="axm__listItem" data-axm-step={i}>
              {step.title}
            </button>
          ))}
        </nav>

        {/* basso sinistra: descrizione dello step attivo (cross-fade) */}
        <div className="axm__desc" aria-live="polite">
          {METHOD_STEPS.map((step, i) => (
            <p key={step.id} className="axm__descItem" data-axm-desc={i}>
              {step.description}
            </p>
          ))}
        </div>

        {/* lato destro: contatore */}
        <div className="axm__counter mono" aria-hidden="true">
          <span data-axm-count>01</span> / 03
        </div>
      </div>
    </section>
  );
}

export function AboutPage(): ReactElement {
  const rootRef = useRef<HTMLElement>(null);
  const stateRef = useRef<HeroObjectState>(createHeroObjectState());

  // overlay di DEBUG: aggiornato via ref, senza re-render a ogni tick
  const debugSectionRef = useRef<HTMLSpanElement>(null);
  const debugProgressRef = useRef<HTMLSpanElement>(null);
  const lastDebug = useRef("");
  const handleDebug = useCallback((label: string, progress: number) => {
    const text = `${label}|${Math.round(progress * 100)}`;
    if (text === lastDebug.current) return;
    lastDebug.current = text;
    if (debugSectionRef.current) debugSectionRef.current.textContent = label;
    if (debugProgressRef.current) {
      debugProgressRef.current.textContent = `${Math.round(progress * 100)}%`;
    }
  }, []);

  useScrollScenes({ rootRef, stateRef, onDebug: handleDebug });

  useEffect(() => {
    document.title = "Chi siamo — EDPRINT";
    // colore di apertura anche a livello di documento (vedi index.html):
    // copre navigazioni client-side e viene rimosso lasciando la pagina
    document.documentElement.classList.add("route-about");
    return () => document.documentElement.classList.remove("route-about");
  }, []);

  return (
    <>
      {/* canvas fisso dietro ai contenuti (pointer-events: none) */}
      <CanvasBoundary>
        <Suspense fallback={null}>
          <AboutCanvas stateRef={stateRef} />
        </Suspense>
      </CanvasBoundary>

      {/* overlay di DEBUG (rimovibile: eliminare questo blocco e handleDebug) */}
      <div className="axv__debug mono" data-axv-debug aria-hidden="true">
        <span ref={debugSectionRef}>Intro</span>
        <span ref={debugProgressRef}>0%</span>
      </div>

      <main id="top" ref={rootRef} className="axv">
        {/* ============ INTRO AZIENDA — immersione nel colore ============ */}
        <section className="axv__sec axv__sec--center axv__intro" data-about-chapter="intro">
          <div className="axv__box axv__introBox">
            <p className="mono axv__kicker reveal">Chi siamo</p>
            <h1 className="axv__h1 reveal">
              Tutto inizia da un segno<em>.</em>
            </h1>
            <p className="axv__lead reveal">
              Un tratto d'inchiostro diventa carta, telo, spazio, oggetto.
            </p>
            <span className="mono axv__hint reveal">Scorri per esplorare ↓</span>
          </div>
          <div className="axv__box axv__introBox axv__introBody">
            <p className="axv__lead reveal">
              EDPRINT è un service di stampa che allestisce, non solo che
              stampa: reparto grafico, produzione e squadra di montaggio sotto
              lo stesso tetto. Dal biglietto da visita allo stand fieristico,
              seguiamo ogni progetto dal file finito alla posa in opera — un
              solo interlocutore, meno passaggi, un risultato coerente.
            </p>
          </div>
        </section>

        {/* ============ METODO — layout orbitale pinnato ============ */}
        {reduceMotion ? <MetodoStatic /> : <Metodo />}

        {/* ============ SERVIZI (invariati) ============ */}
        <section className="axv__sec axv__sec--text-left" data-about-section="stampa">
          <div className="axv__text">
            <span className="mono axv__num reveal">01 — Stampa</span>
            <h2 className="axv__h2 reveal">Dal file al foglio, senza sorprese.</h2>
            <p>
              Il segno prende corpo in quadricromia: piccole tirature e grande
              formato, prove colore e finiture seguite da vicino. Quando i
              quattro colori vanno a registro, l'idea è già uno stampato — e
              può crescere fino alle proporzioni di un telo.
            </p>
          </div>
        </section>

        <section className="axv__sec axv__sec--text-right" data-about-section="decorazione">
          <div className="axv__text">
            <span className="mono axv__num reveal">02 — Decorazione e allestimento</span>
            <h2 className="axv__h2 reveal">Superfici che diventano comunicazione.</h2>
            <p>
              Lo stesso segno lascia il piano e si adagia sugli spazi: vetrine,
              pareti, automezzi. Progettazione, produzione e posa in opera, per
              ambienti coerenti dentro e fuori.
            </p>
          </div>
        </section>

        <section className="axv__sec axv__sec--text-left" data-about-section="strutture">
          <div className="axv__text">
            <span className="mono axv__num reveal">03 — Strutture espositive</span>
            <h2 className="axv__h2 reveal">Presenza che si monta in un attimo.</h2>
            <p>
              I pannelli si alzano e si incastrano: fondali, desk, totem e
              stand per fiere ed eventi. Sistemi modulari, leggeri e
              riutilizzabili, pronti a rappresentarti ovunque.
            </p>
          </div>
        </section>

        <section className="axv__sec axv__sec--text-right" data-about-section="gadget">
          <div className="axv__text">
            <span className="mono axv__num reveal">04 — Gadget e merchandising</span>
            <h2 className="axv__h2 reveal">Il tuo brand, tra le mani giuste.</h2>
            <p>
              Alla fine del viaggio il segno si avvolge su un oggetto da
              portare con sé: gadget, kit personalizzati e premiazioni pensati
              per farsi ricordare.
            </p>
          </div>
        </section>

        {/* ============ SETTORI — segnaposto ============ */}
        <section className="axv__sec axv__sec--text-left" data-about-section="settori">
          <div className="axv__text">
            <span className="mono axv__num reveal">I nostri settori</span>
            <h2 className="axv__h2 reveal">Realtà diverse, stessa cura.</h2>
            <p>
              Aziende e PMI, PA e scuole, horeca e negozi, studi professionali:
              adattiamo materiali, formati e tempi a ogni contesto.
              (Segnaposto: il capitolo settori arriverà in una fase dedicata.)
            </p>
            <ul className="axv__chips reveal" aria-hidden="true">
              <li>Aziende, PMI</li>
              <li>PA, Scuole</li>
              <li>Horeca, Negozi</li>
              <li>Studi professionali</li>
            </ul>
          </div>
        </section>

        {/* ============ CTA — oggetto al centro, moto quasi a zero ============ */}
        <section className="axv__sec axv__sec--center axv__sec--cta" data-about-section="cta">
          <div className="axv__box">
            <h2 className="axv__h1 reveal">
              Dal segno all'oggetto. E ritorno<em>.</em>
            </h2>
            <p className="axv__lead reveal">
              Un solo interlocutore dal file finito al montaggio: raccontaci il
              tuo progetto e diamogli forma insieme.
            </p>
            <div className="axv__ctaRow reveal">
              <Link className="btn btn--dark" to="/#contatti">Lavoriamo insieme</Link>
              <Link className="btn btn--ghost" to="/stampa">Esplora i prodotti</Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
