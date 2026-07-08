import { useEffect, useMemo, useRef, type ReactElement } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { LiquidCanvas } from "../../components/LiquidCanvas";
import { GalleryFigure } from "./GalleryFigure";
import { Toc } from "./Toc";
import { productsOfCategory } from "./products";
import { findCategory, type Category } from "./taxonomy";
import { useCatalogAnimations } from "./useCatalogAnimations";

/**
 * Pagina di una categoria di servizio (/stampa, /decorazioni, …): hero liquido
 * + una sezione per sottocategoria (testo, elenco prodotti, galleria). I
 * prodotti arrivano dal CMS: il nome finisce nell'elenco della sua sezione e
 * il tile nella galleria della stessa sezione, mentre la scheda completa vive
 * nella pagina della sottocategoria.
 */
export function CategoryPage(): ReactElement {
  const { categoria } = useParams();
  const cat = findCategory(categoria);
  if (!cat) return <Navigate to="/" replace />;
  // key: cambiando categoria la pagina si rimonta (contesti GSAP puliti)
  return <CategoryView key={cat.slug} category={cat} />;
}

function CategoryView({ category }: { category: Category }): ReactElement {
  const rootRef = useRef<HTMLElement>(null);
  useCatalogAnimations(rootRef);

  const bySubcat = useMemo(() => productsOfCategory(category.slug), [category]);
  const tocItems = useMemo(
    () => category.subcategories.map((sc) => ({ id: `subcat-${sc.slug}`, title: sc.title })),
    [category]
  );

  useEffect(() => {
    document.title = `${category.title} — EDPRINT`;
    document.body.classList.add("theme-cat", `theme-${category.slug}`);
    return () => document.body.classList.remove("theme-cat", `theme-${category.slug}`);
  }, [category]);

  return (
    <>
      {/* menu indice: appare quando la prima sottosezione è a schermo pieno */}
      <Toc items={tocItems} label={`Indice sezioni ${category.title}`} />

      <main id="top" ref={rootRef}>
        {/* ===================== HERO CATEGORIA ===================== */}
        <section className="phero">
          {/* sopra: testo sul colore di riferimento della categoria */}
          <div className="phero__top">
            <span className="mono phero__idx">{category.numero}</span>
            <h1 className={`phero__title${category.title.length > 14 ? " phero__title--long" : ""}`}>
              {category.title}
            </h1>
            <span className="mono phero__meta">{category.meta}</span>
          </div>
          {/* sotto: liquido, con la palette della categoria */}
          <div className="phero__media">
            <LiquidCanvas
              className="phero__canvas"
              id={`${category.slug}-liquid`}
              colors={category.liquid}
            />
            <div className="halftone" aria-hidden="true"></div>
          </div>
        </section>

        {/* ============ SOTTOCATEGORIE (testo + galleria) ============ */}
        {category.subcategories.map((sc) => {
          const items = bySubcat.get(sc.slug) ?? [];
          return (
            <section key={sc.slug} className="subcat" id={`subcat-${sc.slug}`}>
              <div className="svc">
                <div className="svc__aside">
                  <span className="mono svc__tag reveal">{sc.numero}</span>
                </div>
                <div className="svc__main">
                  <h2 className="svc__title">{sc.title}</h2>
                  <p className="svc__lead reveal">{sc.intro}</p>
                  <Link to={`/${category.slug}/${sc.slug}`} className="svc__more reveal">
                    Esplora la sezione e richiedi un preventivo
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </Link>
                  {items.length > 0 && (
                    <div className="svc__block">
                      <h3 className="mono svc__h reveal">Prodotti</h3>
                      <ul className="svc__prods">
                        {items.map((p, i) => (
                          <li key={p.title}>
                            <span className="n">{String(i + 1).padStart(2, "0")}</span> {p.title}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
              {items.length > 0 && (
                <div className="gallery">
                  <div className="gallery__aside">
                    <span className="mono gallery__tag reveal">Galleria</span>
                  </div>
                  <div className="gallery__main">
                    <h2 className="gallery__title reveal">
                      Alcuni lavori usciti dalle nostre macchine.
                    </h2>
                    <div className="gallery__grid">
                      {items.map((p, i) => (
                        <GalleryFigure key={p.title} product={p} index={i} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </main>
    </>
  );
}
