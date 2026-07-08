import { findCategory, findCategoryOfSubcategory } from "./taxonomy";

/* ============================================================
   PRODOTTI DATA-DRIVEN
   I contenuti vivono in content/products/*.json (gestiti dal CMS).
   Qui vengono importati a build-time (import.meta.glob) e smistati nella
   loro sottocategoria: da lì compaiono sia nella pagina della categoria
   (nome nell'elenco + tile in galleria) sia nella pagina della
   sottocategoria (una sezione dedicata).
   ============================================================ */
export interface GalleryImage {
  src: string;
  alt?: string;
}

export interface Product {
  title: string;
  order: number;
  categoria?: string;
  sottocategoria?: string;
  settori?: string[];
  formato?: "verticale" | "orizzontale" | "quadrato" | "panoramico";
  hue?: number;
  descrizione?: string;
  /** secondo paragrafo della scheda prodotto (colonna di destra) */
  descrizione2?: string;
  images?: GalleryImage[];
}

// etichette leggibili dei tag settore (i JSON salvano gli slug)
export const SETTORE_LABEL: Record<string, string> = {
  aziende: "Aziende, PMI",
  pa: "PA, Scuole, Associazioni",
  horeca: "Horeca, Negozi",
  studi: "Studi professionali",
};

export const FORMATO_CLASS: Record<string, string> = {
  orizzontale: "ga--wide",
  quadrato: "ga--square",
  panoramico: "ga--pano",
  // "verticale" = default, nessun modificatore
};

// import.meta.glob li impacchetta nel bundle: ogni modifica dei JSON (via CMS)
// viene ricompilata al deploy successivo.
const productModules = import.meta.glob<Product>("/content/products/*.json", {
  eager: true,
  import: "default",
});

const ALL: Product[] = Object.values(productModules).filter(
  (p): p is Product => !!p && typeof p.title === "string"
);

/**
 * Dove finisce un prodotto. La sottocategoria è più specifica della categoria,
 * quindi comanda lei: se è in tassonomia, il prodotto va nella categoria che la
 * contiene anche se il campo "categoria" del CMS dice altro (succede quando il
 * cliente cambia categoria e dimentica la sottocategoria). Se la sottocategoria
 * manca o è sconosciuta, si ripiega sulla categoria e sulla sua prima sezione.
 */
function destinazione(p: Product): { categoria: string; sottocategoria: string } | null {
  const owner = findCategoryOfSubcategory(p.sottocategoria);
  if (owner && p.sottocategoria) {
    return { categoria: owner.slug, sottocategoria: p.sottocategoria };
  }
  const fallback = findCategory(p.categoria);
  if (!fallback) return null; // categoria sconosciuta: il prodotto non compare
  return { categoria: fallback.slug, sottocategoria: fallback.subcategories[0].slug };
}

const byOrder = (a: Product, b: Product): number => (a.order ?? 99) - (b.order ?? 99);

/** Prodotti di una categoria, raggruppati per sottocategoria e ordinati per "order". */
export function productsOfCategory(categorySlug: string): Map<string, Product[]> {
  const bySubcat = new Map<string, Product[]>();
  ALL.forEach((p) => {
    const dest = destinazione(p);
    if (!dest || dest.categoria !== categorySlug) return;
    const list = bySubcat.get(dest.sottocategoria) ?? [];
    list.push(p);
    bySubcat.set(dest.sottocategoria, list);
  });
  bySubcat.forEach((list) => list.sort(byOrder));
  return bySubcat;
}

/** Prodotti di una singola sottocategoria, ordinati per "order". */
export function productsOfSubcategory(subcategorySlug: string): Product[] {
  return ALL.filter((p) => destinazione(p)?.sottocategoria === subcategorySlug).sort(byOrder);
}
