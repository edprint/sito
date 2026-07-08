import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { LiquidCanvas } from "../../components/LiquidCanvas";
import { GalleryFigure } from "./GalleryFigure";
import { Toc } from "./Toc";
import { QuoteDrawer } from "./QuoteDrawer";
import { SETTORE_LABEL, productsOfSubcategory } from "./products";
import { findCategory, findSubcategory, type Category, type Subcategory } from "./taxonomy";
import { useCatalogAnimations } from "./useCatalogAnimations";

/**
 * Pagina di una sottocategoria (/stampa/stampati-commerciali, …): stesso
 * impianto della pagina categoria — hero liquido col nome della
 * sottocategoria, intro con i numeri, menu indice a sinistra — e poi una
 * sezione per prodotto (descrizione su due colonne, galleria sotto). Il
 * bottone in fondo a ogni scheda apre il form preventivo a tutto schermo.
 *
 * Contenuti data-driven dal CMS (content/products/*.json): aggiungere o
 * riordinare prodotti dal pannello GitHub si riflette qui — e nella pagina
 * della categoria — al deploy successivo.
 */

/** Tempo di risposta a un preventivo, mostrato nell'intro. */
const TEMPO_PREVENTIVO = "48h"; // TODO: confermare il dato con EDPRINT

/**
 * Ripiego del secondo paragrafo della scheda prodotto: si vede solo finché il
 * campo "Dettagli" (descrizione2) è vuoto nel CMS. Tiene in piedi le due
 * colonne, e dice a chiaro che è un segnaposto.
 */
const DESCRIZIONE_PLACEHOLDER =
  "Testo segnaposto — qui vanno i dettagli del prodotto: materiali e finiture " +
  "disponibili, formati standard e su misura, tirature minime e tempi di " +
  "consegna. Un paragrafo di due o tre righe, così da bilanciare la colonna " +
  "a fianco.";

export function SubcategoryPage(): ReactElement {
  const { categoria, sottocategoria } = useParams();
  const cat = findCategory(categoria);
  const sub = findSubcategory(categoria, sottocategoria);
  if (!cat || !sub) return <Navigate to={cat ? `/${cat.slug}` : "/"} replace />;
  // key: cambiando sottocategoria la pagina si rimonta (contesti GSAP puliti)
  return <SubcategoryView key={sub.slug} category={cat} subcategory={sub} />;
}

function SubcategoryView({
  category,
  subcategory,
}: {
  category: Category;
  subcategory: Subcategory;
}): ReactElement {
  const rootRef = useRef<HTMLElement>(null);
  useCatalogAnimations(rootRef);

  const products = useMemo(() => productsOfSubcategory(subcategory.slug), [subcategory]);
  const tocItems = useMemo(
    () => products.map((p, i) => ({ id: `prod-${i}`, title: p.title })),
    [products]
  );

  // numeri dell'intro: i primi due si aggiornano da soli quando il CMS cambia
  const stats = useMemo(() => {
    const settori = [...new Set(products.flatMap((p) => p.settori ?? []))];
    return [
      {
        value: String(products.length),
        label: "prodotti a catalogo",
        note: `nella sezione ${subcategory.numero}`,
      },
      {
        value: String(settori.length),
        label: "settori serviti",
        note: settori.map((s) => SETTORE_LABEL[s] ?? s).join(" · "),
      },
      {
        value: TEMPO_PREVENTIVO,
        label: "per il preventivo",
        note: "tempo medio di risposta",
      },
    ];
  }, [products, subcategory]);

  // preventivo aperto: nome prodotto + rettangolo della barra da cui il
  // form si espande (null = chiuso)
  const [quote, setQuote] = useState<{ name: string; rect: DOMRect } | null>(null);

  useEffect(() => {
    document.title = `${subcategory.title} — EDPRINT`;
    document.body.classList.add("theme-cat", `theme-${category.slug}`);
    return () => document.body.classList.remove("theme-cat", `theme-${category.slug}`);
  }, [category, subcategory]);

  return (
    <>
      {/* menu indice dei prodotti: appare quando la prima sezione è a schermo */}
      <Toc items={tocItems} label={`Indice prodotti ${subcategory.title}`} />

      <main id="top" className="subpage" ref={rootRef}>
        {/* ===================== HERO (nome sottocategoria) ===================== */}
        <section className="phero">
          <div className="phero__top">
            <Link to={`/${category.slug}`} className="mono phero__idx phero__back">
              ← {category.numero} · {category.title}
            </Link>
            <h1 className="phero__title phero__title--long">{subcategory.title}</h1>
            <span className="mono phero__meta">
              {subcategory.numero} · {products.length} prodotti · Preventivo su misura
            </span>
          </div>
          <div className="phero__media">
            <LiquidCanvas
              className="phero__canvas"
              id={`${subcategory.slug}-liquid`}
              colors={category.liquid}
            />
            <div className="halftone" aria-hidden="true"></div>
          </div>
        </section>

        {/* ============ INTRO: claim, numeri, testo su due colonne ============ */}
        <section className="pintro">
          <div className="pintro__aside">
            <h2 className="pintro__title reveal">{subcategory.claim}</h2>
          </div>
          <div className="pintro__main">
            <ul className="pintro__stats">
              {stats.map((s) => (
                <li className="pintro__stat reveal" key={s.label}>
                  <span className="pintro__num">{s.value}</span>
                  <span className="pintro__label">{s.label}</span>
                  <span className="pintro__note">{s.note}</span>
                </li>
              ))}
            </ul>
            <div className="pintro__cols cols">
              <p className="cols__text reveal">{subcategory.intro}</p>
              <p className="cols__text reveal">
                Ogni prodotto ha la sua scheda: formato, materiali, finiture e i settori per
                cui lo produciamo più spesso. Da lì puoi chiedere un preventivo su misura —
                ti rispondiamo con materiali e tempi realistici, non con un listino. Vuoi
                sapere come lavoriamo? <Link to="/about">Scopri il metodo</Link>.
              </p>
            </div>
          </div>
        </section>

        {/* ====== UNA SEZIONE PER PRODOTTO: testo, poi galleria sotto ====== */}
        {products.map((p, i) => {
          const nn = String(i + 1).padStart(2, "0");
          const tags = (p.settori ?? []).map((s) => SETTORE_LABEL[s] ?? s);
          return (
            <section key={p.title} className="subcat" id={`prod-${i}`}>
              <div className="svc">
                <div className="svc__aside">
                  <span className="mono svc__tag reveal">{nn}</span>
                </div>
                <div className="svc__main">
                  <h2 className="svc__title">{p.title}</h2>
                  {/* due colonne, entrambe dal CMS: "Breve descrizione" e
                      "Dettagli". Finché i Dettagli sono vuoti resta il
                      segnaposto, così la colonna non collassa */}
                  <div className="svc__cols cols">
                    <p className="cols__text reveal">{p.descrizione}</p>
                    <p className="cols__text reveal">
                      {p.descrizione2?.trim() || DESCRIZIONE_PLACEHOLDER}
                    </p>
                  </div>
                  {tags.length > 0 && (
                    <ul className="subpage__tags reveal">
                      {tags.map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
                  )}

                  {/* BARRA in fondo al testo, allineata ai testi e fino al bordo
                      destro: da qui il form si espande. Hover = stessa
                      animazione delle voci del menu (riempimento + roll) */}
                  <button
                    type="button"
                    className={`quote-bar reveal${quote?.name === p.title ? " is-active" : ""}`}
                    onClick={(e) =>
                      setQuote({ name: p.title, rect: e.currentTarget.getBoundingClientRect() })
                    }
                  >
                    <span className="quote-bar__label" data-text="Richiedi un preventivo">
                      Richiedi un preventivo
                    </span>
                    <span className="quote-bar__arrow" aria-hidden="true">
                      <svg viewBox="0 0 40 24">
                        <path d="M2 12h34M28 4l9 8-9 8" />
                      </svg>
                    </span>
                  </button>
                </div>
              </div>

              {/* GALLERIA sotto la descrizione, stesso split 45/55 */}
              <div className="gallery">
                <div className="gallery__aside">
                  <span className="mono gallery__tag reveal">Galleria</span>
                </div>
                <div className="gallery__main">
                  <div className="gallery__grid">
                    <GalleryFigure product={p} index={i} showCaption={false} />
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </main>

      <QuoteDrawer
        productName={quote?.name ?? null}
        originRect={quote?.rect ?? null}
        onClose={() => setQuote(null)}
      />
    </>
  );
}
