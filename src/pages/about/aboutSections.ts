import * as THREE from "three";

/**
 * Regia della pagina About v2 (brief docs/animazione-about-brief.md):
 * un unico oggetto 3D "compagno di viaggio" — una goccia d'inchiostro che
 * si trasforma a pennellate — con uno STATO per sezione e una transizione
 * scrubbata tra sezioni consecutive.
 *
 * L'oggetto espone un'API di stato e NON anima da solo: le timeline di
 * useScrollScenes animano solo questi valori; HeroObject li copia in
 * uniform/transform a ogni frame. Uniche eccezioni ammesse dal brief:
 * uTime (noise idle) e il micro-idle pesato da state.idle (→ ~0 alla CTA).
 */

/** API di stato dell'oggetto guida. */
export interface HeroObjectState {
  /** Posizione laterale in frazione viewport: 0 = centro, ±1 = bordo. */
  x: number;
  /** Quota: nelle sezioni centrate l'oggetto scende sotto il blocco testo. */
  y: number;
  scale: number;
  rotationY: number;
  /** Ampiezza delle micro-animazioni idle (≈0 = moto quasi a zero, CTA). */
  idle: number;
  /** Tinta accento della sezione (uniform uAccent, r/g/b animabili). */
  color: THREE.Color;
  /** Vita liquida dell'inchiostro (uLiquid): 1 goccia viva → ~0.1 materia
   *  stampata. Il residuo minimo è garantito nello shader. */
  liquid: number;
  /** Morph a pennellata 0→1 (il fronte è il valore stesso, ritardato
   *  per-vertice nello shader): goccia→foglio, →curva, →falde, →tazza. */
  plane: number;
  curl: number;
  fold: number;
  wrap: number;
  /** Fuori registro CMYK (1 = lastre sfalsate, 0 = a registro). */
  register: number;
  /** Intro: mescola il colore della goccia verso lo sfondo pagina (uBgMix):
   *  1 = goccia quasi invisibile (solo fresnel), 0 = satura e definita. */
  bgMix: number;
  /** Metodo CP2: retino da stampa in superficie (0→1). */
  halftone: number;
  /** Metodo CP3: scia d'inchiostro durante lo scatto laterale (0→1). */
  trail: number;
  /** Rivoluzione della bottiglia attorno alla VERTICALE, in GIRI interi
   *  (canale additivo dei gesti: 1 = un giro completo, orientamento neutro).
   *  Non è continua: scrubbata nel passaggio intro→Metodo e a scatti
   *  eleganti al tocco dei checkpoint. */
  turn: number;
  /** Giri EXTRA attorno al proprio asse inclinato (si sommano alla rotazione
   *  lenta continua): burst al tocco dei checkpoint. */
  spin: number;
  /** Tinta del VETRO della bottiglia (GLB): arancio brand di base, cambia
   *  al tocco dei checkpoint del Metodo durante il gesto di rotazione. */
  glassColor: THREE.Color;
  /** Presenza dell'ANELLO 3D del Metodo (0→1): appare nell'avvicinamento
   *  al pin, attorno alla bottiglia, e sfuma uscendo verso i servizi. */
  ring: number;
  /** Progresso del pin del Metodo (0..1): riempie l'arco dell'anello 3D
   *  e decide il checkpoint attivo. Scritto direttamente dall'onUpdate. */
  ringProgress: number;
  /** Presenza della BOTTIGLIA del logo (0→1): la goccia MORPHA fluidamente
   *  verso il profilo misurato (0→BOTTLE_SWAP), poi il GLB reale subentra in
   *  dissolvenza sulla stessa silhouette (BOTTLE_SWAP→1). Simmetrico al
   *  ritorno. 1 dalla presentazione dell'intro a tutto il Metodo; 0 nei
   *  servizi (dove la forma rifluisce nelle pennellate). */
  bottle: number;
}

/** I tre step del capitolo Metodo (checkpoint sull'anello orbitale). */
export interface MethodStep {
  id: string;
  title: string;
  description: string;
  /** Progresso della sezione pinnata (0..1) del checkpoint. */
  at: number;
  /** Colore del checkpoint (mini-bottiglia sull'anello): terna C/M/Y. */
  colore: string;
  /** Tinta che il VETRO della bottiglia assume al tocco del checkpoint,
   *  durante il gesto di rotazione (a Consulenza: gialla, come richiesto). */
  bottiglia: string;
}

export const METHOD_STEPS: MethodStep[] = [
  {
    id: "consulenza",
    title: "Consulenza",
    at: 0.15,
    colore: "#12b0c9",    // ciano
    bottiglia: "#ffd400", // la bottiglia diventa GIALLA
    description:
      "La nostra vera forza viene prima della stampa. Valutiamo insieme la " +
      "vostra immagine, sistemiamo i file, scegliamo carte, formati e " +
      "finiture giuste per il progetto. Poi vi proponiamo la nostra " +
      "migliore offerta.",
  },
  {
    id: "realizzazione",
    title: "Realizzazione",
    at: 0.5,
    colore: "#e5007e",    // magenta
    bottiglia: "#e5007e", // vetro magenta (il colore del checkpoint)
    description:
      "Piccolo o grande formato, in produzione ogni progetto riceve la " +
      "stessa cura: colori fedeli, materiali giusti, controllo a ogni " +
      "passaggio.",
  },
  {
    id: "consegna",
    title: "Consegna veloce",
    at: 0.85,
    colore: "#ffd400",    // giallo
    bottiglia: "#12b0c9", // vetro ciano (completa la terna CMY)
    description:
      "Tempi chiari e rispettati. Il vostro progetto arriva dove serve, " +
      "quando serve.",
  },
];

/** Colore di apertura della pagina (l'arancio degli hero liquidi). */
export const INTRO_BG = "#ff5b2e";

/**
 * Consegna goccia ↔ bottiglia (morph FLUIDO, non sostituzione):
 * state.bottle 0→BOTTLE_SWAP guida il morph di forma della goccia verso il
 * profilo misurato della bottiglia; da BOTTLE_SWAP→1 il GLB reale (solchi e
 * grana) entra in dissolvenza incrociata sulla stessa identica silhouette.
 * Al ritorno (bottle→0) il percorso è simmetrico: il GLB sfuma, la forma
 * bottiglia del morph riprende vita e fluisce nella pennellata successiva.
 */
export const BOTTLE_SWAP = 0.82;
/** Altezza della bottiglia = viewport.height * BOTTLE_FILL * state.scale
 *  (con lo scale 1.35 della presentazione intro ≈ 92% dello schermo). */
export const BOTTLE_FILL = 0.68;
/** Inclinazione fissa verso destra, come la bottiglia nel logo (gradi). */
export const BOTTLE_TILT_DEG = 10;
/** Scala della bottiglia nel pin del Metodo: fissa anche la taglia/quota
 *  dell'anello 3D, che resta FERMO in scena (è la bottiglia a entrarci). */
export const METHOD_SCALE = 1.26;

/** Stato-bersaglio di una sezione (i campi animati dalle timeline). */
export interface SectionState {
  x: number;
  y: number;
  scale: number;
  rotationY: number;
  idle: number;
  color: string;
  liquid: number;
  plane: number;
  curl: number;
  fold: number;
  wrap: number;
  /** 0 nei servizi/CTA: la bottiglia torna goccia entrando in Stampa. */
  bottle: number;
}

export interface AboutSection {
  id: string;
  /** Nome mostrato nell'overlay di debug. */
  label: string;
  /** Lato dell'OGGETTO: "left" | "right" | "center" (layout zig-zag). */
  side: "left" | "right" | "center";
  state: SectionState;
}

/**
 * Le sei sezioni della pagina, nell'ordine del brief. x in frazione
 * viewport (±0.5 = 25% della larghezza dal centro); il testo occupa il lato
 * opposto. Il liquido decade lungo la pagina e risale alla CTA.
 */
export const ABOUT_SECTIONS: AboutSection[] = [
  {
    id: "stampa",
    label: "Stampa",
    side: "right",
    // pennellata goccia→foglio; il liquido scende molto; scala da telo
    state: { x: 0.5, y: 0, scale: 1.9, rotationY: -0.35, idle: 1, color: "#12b0c9", liquid: 0.15, plane: 1, curl: 0, fold: 0, wrap: 0, bottle: 0 },
  },
  {
    id: "decorazione",
    label: "Decorazione e allestimento",
    side: "left",
    // il foglio si adagia curvandosi (pennellata verso uMorphCurl)
    state: { x: -0.5, y: 0, scale: 1.4, rotationY: 0.35, idle: 1, color: "#e5007e", liquid: 0.12, plane: 1, curl: 1, fold: 0, wrap: 0, bottle: 0 },
  },
  {
    id: "strutture",
    label: "Strutture espositive",
    side: "right",
    // il piano si ripiega in 3 falde (pannello/totem)
    state: { x: 0.5, y: 0, scale: 1.55, rotationY: -0.35, idle: 1, color: "#ffd400", liquid: 0.08, plane: 1, curl: 0, fold: 1, wrap: 0, bottle: 0 },
  },
  {
    id: "gadget",
    label: "Gadget e merchandising",
    side: "left",
    // avvolgimento sulla tazza + idle rotation
    state: { x: -0.5, y: 0, scale: 0.9, rotationY: 0.35, idle: 1, color: "#ff5b2e", liquid: 0.12, plane: 1, curl: 0, fold: 0, wrap: 1, bottle: 0 },
  },
  {
    id: "settori",
    label: "Settori",
    side: "right",
    // segnaposto: la goccia torna liquida e accompagna quieta a lato
    state: { x: 0.4, y: 0, scale: 0.8, rotationY: 0, idle: 1, color: "#1b1b1b", liquid: 0.7, plane: 0, curl: 0, fold: 0, wrap: 0, bottle: 0 },
  },
  {
    id: "cta",
    label: "Dal segno all'oggetto",
    side: "center",
    // ritorno a goccia: morph inversi, il liquido risale, moto quasi a zero
    state: { x: 0, y: -2.2, scale: 1.05, rotationY: 0, idle: 0.12, color: "#1b1b1b", liquid: 0.9, plane: 0, curl: 0, fold: 0, wrap: 0, bottle: 0 },
  },
];

/** Stato iniziale = apertura dell'INTRO: goccia grande al centro, molto
 *  liquida, cromaticamente immersa nello sfondo colorato (bgMix 1). */
export function createHeroObjectState(): HeroObjectState {
  return {
    x: 0,
    y: -0.2,
    scale: 1.6,
    rotationY: 0,
    idle: 1,
    color: new THREE.Color(INTRO_BG),
    liquid: 1,
    plane: 0,
    curl: 0,
    fold: 0,
    wrap: 0,
    register: 0,
    bgMix: 1,
    halftone: 0,
    trail: 0,
    turn: 0,
    spin: 0,
    glassColor: new THREE.Color(INTRO_BG),
    ring: 0,
    ringProgress: 0,
    bottle: 0,
  };
}
