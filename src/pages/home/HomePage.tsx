import { useEffect, useRef, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { LiquidCanvas } from "../../components/LiquidCanvas";
import { BlobCanvas, } from "../../components/BlobCanvas";
import type { SixColors } from "../../components/LiquidCanvas";
import { Footer } from "./Footer";
import { useHomeAnimations } from "./useHomeAnimations";

/** Capitoli servizio: card che salgono e si impilano sopra lo statement. */
interface Chapter {
  key: string;
  title: string;
  subtitle: string;
  para: string;
  items: string[];
  ctaText: string;
  /** route interna (Link) oppure ancora della pagina (a) */
  ctaTo: string;
  /** liquido monocolore = colore NEGATIVO rispetto allo sfondo card */
  colors: SixColors;
}

const CHAPTERS: Chapter[] = [
  {
    key: "stampa",
    title: "Stampa",
    subtitle: "Qualità di stampa, su misura.",
    para:
      "Dalla piccola tiratura al grande formato gestiamo colore, supporti e " +
      "finiture con controllo costante. Prove colore, nobilitazioni e tempi " +
      "certi: ogni stampato esce pronto, coerente con il tuo progetto e con " +
      "la tua immagine.",
    items: [
      "Stampati commerciali",
      "Brochure, Cataloghi e libri",
      "Stampe promozionali",
      "Packaging, Etichette e sticker",
      "Manifesti, Poster e striscioni",
      "Adesivi e materiali rigidi",
    ],
    ctaText: "Esplora i prodotti stampati",
    ctaTo: "/stampa",
    colors: [0xffc4b0, 0xffad97, 0xffd6c9, 0xffe8de, 0xffb6a0, 0xf7a086], // corallo pastello
  },
  {
    key: "decorazioni",
    title: "Decorazioni",
    subtitle: "Spazi che parlano del tuo brand.",
    para:
      "Vetrine, mezzi, interni e insegne: trasformiamo superfici e ambienti " +
      "in comunicazione. Progettazione, produzione e posa in opera, per un " +
      "risultato coerente dentro e fuori dallo spazio.",
    items: [
      "Decorazione vetrine",
      "Decorazione automezzi",
      "Interior design",
      "Insegne e totem",
    ],
    ctaText: "Esplora decorazioni e allestimenti",
    ctaTo: "/decorazioni",
    colors: [0xbcf0d5, 0x9ee7bf, 0xd2f4e3, 0xe9fbf1, 0xaaecc8, 0x8ce0b3], // menta pastello
  },
  {
    key: "strutture",
    title: "Strutture",
    subtitle: "Presenza che si monta in un attimo.",
    para:
      "Fondali, desk, totem e allestimenti per fiere, eventi e punto " +
      "vendita. Sistemi modulari, leggeri e riutilizzabili, pronti a " +
      "rappresentarti ovunque con il massimo impatto.",
    items: [
      "Fondali, rollup e totem",
      "Desk e postazioni",
      "Strutture per punto vendita e showroom",
    ],
    ctaText: "Esplora le strutture espositive",
    ctaTo: "/strutture",
    colors: [0xb9c2f6, 0x9fabf1, 0xcdd3f9, 0xe3e7fc, 0xabb5f4, 0x909dec], // pervinca pastello
  },
  {
    key: "gadget",
    title: "Gadget",
    subtitle: "Il tuo brand, tra le mani giuste.",
    para:
      "Gadget, kit personalizzati e premiazioni pensati per farsi ricordare. " +
      "Selezione, personalizzazione e produzione, dal singolo omaggio alla " +
      "fornitura completa per l'evento.",
    items: ["Gadget per eventi e fiere", "Kit personalizzati", "Premiazioni"],
    ctaText: "Esplora gadget e merchandising",
    ctaTo: "/gadget",
    colors: [0xffffff, 0xededed, 0xf6f6f6, 0xfbfbfb, 0xf1f1f1, 0xe6e6e6], // chiaro pastello
  },
];

/** Settori (pillar della sezione omonima). */
const PILLARS = [
  {
    seed: "edprint-aziende",
    title: "Aziende, PMI",
    desc: "Immagine coordinata e materiali per uffici e forza vendita.",
    q: "Come possiamo aiutarti a rafforzare la tua immagine aziendale?",
  },
  {
    seed: "edprint-pa",
    title: "PA, Scuole, Associazioni",
    desc: "Segnaletica e materiali per la collettività e gli eventi pubblici.",
    q: "Come possiamo aiutarti a comunicare meglio con la collettività?",
  },
  {
    seed: "edprint-horeca",
    title: "Horeca, Negozi, Attività locali",
    desc: "Menu, insegne e vetrine che accolgono i tuoi clienti.",
    q: "Come possiamo aiutarti a farti scegliere dai clienti?",
  },
  {
    seed: "edprint-studi",
    title: "Studi professionali, specialistici",
    desc: "Targhe, segnaletica e stampati per studi e professionisti.",
    q: "Come possiamo aiutarti a valorizzare il tuo studio?",
  },
];

export function HomePage(): ReactElement {
  const rootRef = useRef<HTMLElement>(null);
  useHomeAnimations(rootRef);

  useEffect(() => {
    document.title = "EDPRINT — Stampa, decorazioni e allestimenti";
  }, []);

  return (
    <main id="top" ref={rootRef}>
      {/* ===================== HERO ===================== */}
      <section className="hero">
        {/* banda media: liquido CMYK (Three.js) */}
        <div className="hero__media">
          <LiquidCanvas className="hero__canvas" id="hero-canvas" />
          <div className="halftone" aria-hidden="true"></div>
        </div>

        {/* metà inferiore bianca: testo */}
        <div className="hero__lower">
          {/* riga testo: descrizione in alto a sinistra, titolone in basso a destra */}
          <div className="hero__row">
            <div className="hero__left">
              <p className="hero__desc">
                Come diamo forma alla tua comunicazione: stampa, decorazioni,
                allestimenti e gadget.
              </p>
              <div className="hero__meta">
                <a href="#preventivo" className="btn btn--dark">Richiedi preventivo</a>
                <a href="#cataloghi" className="btn btn--ghost">Sfoglia i cataloghi</a>
              </div>
            </div>
            <h1 className="hero__title">
              Stampiamo per<br /><em>passione</em>
            </h1>
          </div>

          {/* barra inferiore */}
          <div className="hero__bottom">
            <span className="mono">Stampa · Decorazioni · Allestimenti · Gadget</span>
            <span className="mono hero__scroll">Scorri per esplorare</span>
            <span className="mono hero__arrow" aria-hidden="true">↓</span>
          </div>
        </div>
      </section>

      {/* ============ STATEMENT + CARD (rise on scroll) ============ */}
      <div className="print-reveal">
        <section className="statement">
          <p className="statement__text">
            EDPRINT è il partner unico per la comunicazione visiva: progettiamo,
            stampiamo e allestiamo. Dal biglietto da visita al grande formato,
            dalla vetrina allo stand fieristico, seguiamo ogni progetto dal file
            finito al montaggio.
          </p>
        </section>

        {/* spazio di scroll: lo statement resta bloccato e le lettere si riempiono */}
        <div className="print-reveal__spacer" aria-hidden="true"></div>

        {/* schede che salgono e si impilano sopra lo statement sticky */}
        {CHAPTERS.map((ch) => (
          <section
            key={ch.key}
            className={`chapter chapter--${ch.key}`}
            aria-label={`Servizio: ${ch.title}`}
          >
            <h2 className="chapter__title">{ch.title}</h2>
            <div className="chapter__intro">
              <h3 className="chapter__subtitle">{ch.subtitle}</h3>
              <p className="chapter__para">{ch.para}</p>
            </div>
            <div className="chapter__media">
              <BlobCanvas
                className="chapter__canvas"
                id={`liquid-${ch.key}`}
                colors={ch.colors}
              />
            </div>
            <div className="chapter__right">
              <p className="mono chapter__eyebrow">In questo servizio</p>
              <ul className="chapter__list">
                {ch.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              {ch.ctaTo.startsWith("/") ? (
                <Link className="chapter__cta" to={ch.ctaTo}>
                  <span className="chapter__cta-txt" data-text={ch.ctaText}>{ch.ctaText}</span>
                  <span className="chapter__arrow" aria-hidden="true">→</span>
                </Link>
              ) : (
                <a className="chapter__cta" href={ch.ctaTo}>
                  <span className="chapter__cta-txt" data-text={ch.ctaText}>{ch.ctaText}</span>
                  <span className="chapter__arrow" aria-hidden="true">→</span>
                </a>
              )}
            </div>
          </section>
        ))}
      </div>

      {/* ===================== SETTORI ===================== */}
      <section className="pillars" id="settori">
        <div className="pillars__intro">
          <div className="pillars__lead">
            <p className="pillars__statement">
              Lavoriamo con realtà molto diverse: dall'azienda strutturata alla
              piccola attività di quartiere, dalla scuola all'ente pubblico.
              Adattiamo materiali, formati e tempi a ogni contesto.
            </p>
            <p className="pillars__note">
              Un unico interlocutore per la comunicazione visiva di ogni
              settore, dal file finito al montaggio.
            </p>
          </div>
          <a className="pillars__contact" href="#preventivo">Richiedi un preventivo →</a>
        </div>

        <p className="pillars__label">I nostri settori ↓</p>

        <div className="pillars__grid">
          {PILLARS.map((p) => (
            <article key={p.seed} className="pillar reveal">
              <div className="pillar__img">
                <img
                  src={`https://picsum.photos/seed/${p.seed}/720/900`}
                  alt={p.title}
                  loading="lazy"
                />
              </div>
              <div className="pillar__foot">
                <h3 className="pillar__title">{p.title}</h3>
                <p className="pillar__desc">{p.desc}</p>
                <div className="pillar__explore">
                  <p className="pillar__q">{p.q}</p>
                  <a className="pillar__link" href="#preventivo">
                    <span>Esplora</span>
                    <span className="pillar__arrow" aria-hidden="true">→</span>
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ===================== CHI SIAMO ===================== */}
      <section className="about" id="chi-siamo">
        <p className="mono about__kicker reveal">Chi siamo</p>
        <div className="about__body">
          <figure className="about__media reveal">
            <img
              src="https://picsum.photos/seed/edprint-team/1280/720"
              alt="Il team EDPRINT al lavoro"
              loading="lazy"
            />
            <span className="about__play" aria-hidden="true"></span>
          </figure>
          <h2 className="about__title reveal">
            Un service di stampa che allestisce, non solo che stampa.
          </h2>
          <p className="about__text reveal">
            EDPRINT nasce dall'idea che un progetto di comunicazione non finisca
            con il file esportato. Uniamo reparto grafico, stampa e squadra di
            allestimento per seguire ogni lavoro dall'inizio alla posa: un solo
            interlocutore, meno passaggi e un risultato coerente, dal colore
            stampato al montaggio in cantiere.
          </p>
          <a className="about__cta reveal" href="#preventivo">
            <span className="about__cta-txt" data-text="Lavoriamo insieme">Lavoriamo insieme</span>
            <span className="about__cta-arrow" aria-hidden="true">→</span>
          </a>
        </div>
      </section>

      <Footer />
    </main>
  );
}
