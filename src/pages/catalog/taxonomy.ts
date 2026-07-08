/* ============================================================
   TASSONOMIA DEL CATALOGO (struttura di pagina, non gestita dal CMS)
   Quattro categorie di servizio = quattro pagine (/stampa, /decorazioni,
   /strutture, /gadget). Ogni categoria ha le sue sottocategorie: ognuna è
   una sezione della pagina categoria E una pagina a sé
   (/{categoria}/{sottocategoria}).

   Ogni prodotto (content/products/*.json) dichiara la sua sottocategoria:
   da lì compare in entrambe le pagine, senza altro lavoro.

   Per aggiungere una sottocategoria: una riga qui + l'opzione corrispondente
   in public/admin/config.yml (campo "sottocategoria").
   ============================================================ */
import type { SixColors } from "../../components/LiquidCanvas";

export interface Subcategory {
  slug: string;
  /** numero gerarchico mostrato in pagina, es. "1.1" */
  numero: string;
  title: string;
  /** primo paragrafo: sezione nella pagina categoria e intro nella sua pagina */
  intro: string;
  /** claim a sinistra dell'intro, nella pagina della sottocategoria */
  claim: string;
}

export interface Category {
  slug: string;
  /** numero mostrato in pagina, es. "01" */
  numero: string;
  title: string;
  /** riga in basso a destra nell'hero */
  meta: string;
  /** colori dello shader liquido nella metà bassa dell'hero */
  liquid: SixColors;
  subcategories: Subcategory[];
}

/* I colori "di riferimento" (banda hero, nav, segnaposti) vivono in styles.css
   come `body.theme-<slug>`: qui restano solo quelli del canvas WebGL. */

export const CATEGORIES: Category[] = [
  {
    slug: "stampa",
    numero: "01",
    title: "Stampa",
    meta: "Commerciale · grande formato · packaging",
    liquid: [0xff9e85, 0xffb6a0, 0xffc9b8, 0xffd6c9, 0xffab94, 0xf7a086], // corallo
    subcategories: [
      {
        slug: "stampati-commerciali",
        numero: "1.1",
        title: "Stampati commerciali",
        claim: "Tutto ciò che rappresenta la tua attività, stampato come si deve",
        intro:
          "Tutto ciò che rappresenta la tua attività su carta: dalla corrispondenza " +
          "quotidiana agli strumenti di vendita. Scegliamo carte, finiture e " +
          "nobilitazioni per stampati coerenti con la tua immagine — tirature " +
          "flessibili, colori fedeli, tempi rapidi.",
      },
      {
        slug: "brochure-cataloghi-libri",
        numero: "1.2",
        title: "Brochure, cataloghi, libri",
        claim: "Più pagine per raccontare bene quello che fai",
        intro:
          "Strumenti di presentazione a più pagine: cataloghi prodotto, brochure " +
          "istituzionali, libri e volumi rilegati. Carte, rilegature e finiture " +
          "scelte per raccontare bene ciò che fai.",
      },
      {
        slug: "stampe-promozionali",
        numero: "1.3",
        title: "Stampe promozionali",
        claim: "Materiali pensati per cogliere il momento giusto",
        intro:
          "Materiali pensati per farsi notare: volantini, flyer e stampe per " +
          "campagne, lanci ed eventi. Tempi rapidi e tirature flessibili per " +
          "cogliere il momento giusto.",
      },
      {
        slug: "packaging-etichette-sticker",
        numero: "1.4",
        title: "Packaging, etichette, sticker",
        claim: "Dal confezionamento allo scaffale, il prodotto si riconosce",
        intro:
          "Packaging su misura, etichette e adesivi per proteggere, riconoscere e " +
          "valorizzare il prodotto — dal confezionamento allo scaffale.",
      },
      {
        slug: "manifesti-poster-striscioni",
        numero: "1.5",
        title: "Manifesti, poster, striscioni",
        claim: "Grande formato per farsi vedere da lontano",
        intro:
          "Grande formato per farsi vedere da lontano: manifesti, poster e " +
          "striscioni per vetrine, eventi e affissioni, con colori stabili anche " +
          "all'aperto.",
      },
      {
        slug: "adesivi-materiali-rigidi",
        numero: "1.6",
        title: "Adesivi e materiali rigidi",
        claim: "Supporti che devono durare nel tempo",
        intro:
          "Adesivi murali e supporti rigidi — forex, dibond, plexiglass — per " +
          "insegne, allestimenti e segnaletica che deve durare nel tempo.",
      },
    ],
  },
  {
    slug: "decorazioni",
    numero: "02",
    title: "Decorazioni ed allestimenti",
    meta: "Vetrine · automezzi · interni · insegne",
    liquid: [0xbcf0d5, 0x9ee7bf, 0xd2f4e3, 0xe9fbf1, 0xaaecc8, 0x8ce0b3], // menta
    subcategories: [
      {
        slug: "decorazione-vetrine",
        numero: "2.1",
        title: "Decorazione vetrine",
        claim: "La prima cosa che il cliente vede di te",
        intro:
          "Vetrofanie, pellicole e lettering per vetrine che comunicano anche a " +
          "serranda abbassata. Applicazioni removibili per le stagionalità e " +
          "soluzioni permanenti per l'immagine di sempre.",
      },
      {
        slug: "decorazione-automezzi",
        numero: "2.2",
        title: "Decorazione automezzi",
        claim: "Il tuo brand che gira per la città",
        intro:
          "Car wrapping, scritte adesive e grafiche integrali per furgoni, auto e " +
          "mezzi da lavoro. Pellicole certificate, posa a regola d'arte, rimozione " +
          "senza danni al termine del ciclo di vita.",
      },
      {
        slug: "interior-design",
        numero: "2.3",
        title: "Interior design",
        claim: "Superfici che diventano comunicazione",
        intro:
          "Pareti, vetrate e superfici interne trattate come spazi narrativi: " +
          "carte da parati su misura, pellicole decorative e satinate, grafiche " +
          "ambientali per uffici, negozi e spazi pubblici.",
      },
      {
        slug: "insegne-totem",
        numero: "2.4",
        title: "Insegne e totem",
        claim: "Farsi trovare, di giorno e di notte",
        intro:
          "Insegne luminose e non, targhe, totem e segnaletica esterna. " +
          "Progettazione, produzione e posa in opera, con materiali scelti per " +
          "resistere agli agenti atmosferici.",
      },
    ],
  },
  {
    slug: "strutture",
    numero: "03",
    title: "Strutture espositive",
    meta: "Fiere · eventi · punto vendita",
    liquid: [0xb9c2f6, 0x9fabf1, 0xcdd3f9, 0xe3e7fc, 0xabb5f4, 0x909dec], // pervinca
    subcategories: [
      {
        slug: "fondali-rollup-totem",
        numero: "3.1",
        title: "Fondali, rollup, totem",
        claim: "Presenza che si monta in un attimo",
        intro:
          "Sistemi leggeri e riutilizzabili per fiere ed eventi: fondali tessili, " +
          "rollup, totem e pareti modulari. Si montano senza attrezzi e si " +
          "trasportano in una custodia.",
      },
      {
        slug: "desk-postazioni",
        numero: "3.2",
        title: "Desk e postazioni",
        claim: "Un punto di contatto, ovunque ti serva",
        intro:
          "Banchi reception, desk promozionali e postazioni informative " +
          "personalizzate. Struttura modulare, grafica intercambiabile: la stessa " +
          "postazione cambia campagna senza cambiare struttura.",
      },
      {
        slug: "punto-vendita-showroom",
        numero: "3.3",
        title: "Strutture per punto vendita e showroom",
        claim: "Lo spazio di vendita, progettato per vendere",
        intro:
          "Espositori, display e allestimenti su misura per negozi e showroom. " +
          "Dal singolo espositore da banco al riallestimento completo, con " +
          "materiali coerenti con l'immagine del punto vendita.",
      },
    ],
  },
  {
    slug: "gadget",
    numero: "04",
    title: "Gadget e merchandising",
    meta: "Eventi · kit · premiazioni",
    liquid: [0xffffff, 0xededed, 0xf6f6f6, 0xfbfbfb, 0xf1f1f1, 0xe6e6e6], // chiaro
    subcategories: [
      {
        slug: "gadget-eventi-fiere",
        numero: "4.1",
        title: "Gadget per eventi e fiere",
        claim: "Quello che resta in tasca dopo l'evento",
        intro:
          "Oggetti utili e personalizzati da distribuire a fiere, congressi ed " +
          "eventi. Selezione, personalizzazione e consegna nei tempi dell'evento, " +
          "dalla piccola tiratura alla fornitura completa.",
      },
      {
        slug: "kit-personalizzati",
        numero: "4.2",
        title: "Kit personalizzati",
        claim: "Un pacchetto coordinato, non oggetti sparsi",
        intro:
          "Welcome kit per nuovi assunti, kit stampa, corporate gift: oggetti, " +
          "stampati e packaging pensati insieme e consegnati come un unico " +
          "pacchetto coerente.",
      },
      {
        slug: "premiazioni",
        numero: "4.3",
        title: "Premiazioni",
        claim: "Un riconoscimento che si tiene in vista",
        intro:
          "Targhe, trofei e riconoscimenti personalizzati per gare, anniversari e " +
          "premiazioni aziendali. Incisione laser, stampa diretta e materiali " +
          "nobili, dal singolo pezzo alla serie.",
      },
    ],
  },
];

/* ---- lookup ---- */

const BY_SLUG = new Map(CATEGORIES.map((c) => [c.slug, c]));

/** sottocategoria → categoria che la contiene (gli slug sono unici nel sito) */
const CATEGORY_OF_SUB = new Map<string, Category>();
CATEGORIES.forEach((c) => c.subcategories.forEach((s) => CATEGORY_OF_SUB.set(s.slug, c)));

export function findCategory(slug: string | undefined): Category | undefined {
  return slug ? BY_SLUG.get(slug) : undefined;
}

/**
 * Categoria a cui appartiene una sottocategoria. È l'unica fonte di verità per
 * lo smistamento dei prodotti: il campo "categoria" del CMS serve solo come
 * ripiego quando la sottocategoria manca o non è (più) in tassonomia.
 */
export function findCategoryOfSubcategory(slug: string | undefined): Category | undefined {
  return slug ? CATEGORY_OF_SUB.get(slug) : undefined;
}

export function findSubcategory(
  categorySlug: string | undefined,
  subSlug: string | undefined
): Subcategory | undefined {
  return findCategory(categorySlug)?.subcategories.find((s) => s.slug === subSlug);
}
