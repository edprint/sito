import { useEffect, useRef, useState, type CSSProperties, type ReactElement } from "react";
import gsap from "gsap";
import { reduceMotion } from "../../lib/reduceMotion";
import { FORMATO_CLASS, SETTORE_LABEL, type Product } from "./products";

/**
 * Tile-galleria di un prodotto: carosello dedicato con freccia avanti in
 * basso a destra e freccia indietro che compare dopo la prima immagine;
 * le frecce si nascondono ai due estremi. Porting del carosello di
 * src/modules/stampaSections.ts.
 */
export function GalleryFigure({
  product,
  index,
  showCaption = true,
}: {
  product: Product;
  index: number;
  /** La didascalia (numero + nome + accordion) sotto il tile. Su pagine dove
   *  il nome del prodotto è già nel corpo (Stampati commerciali) si nasconde. */
  showCaption?: boolean;
}): ReactElement {
  const imgs = (product.images ?? []).filter((im) => im && im.src);
  const slideCount = imgs.length || 3; // senza immagini: 3 placeholder numerati
  const last = slideCount - 1;

  const [i, setI] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!trackRef.current) return;
    gsap.to(trackRef.current, {
      xPercent: -100 * i,
      duration: reduceMotion ? 0 : 0.7,
      ease: "power3.inOut",
    });
  }, [i]);

  const mod = FORMATO_CLASS[product.formato ?? "verticale"] ?? "";
  const single = imgs.length === 1 ? " ga--single" : "";
  const nn = String(index + 1).padStart(2, "0");

  const tags = (product.settori ?? []).map((s) => SETTORE_LABEL[s] ?? s);
  const hasAccordion = Boolean(product.descrizione) || tags.length > 0;

  return (
    <figure
      className={`ga ${mod}${single}`}
      style={{ "--h": product.hue ?? 12 } as CSSProperties}
      data-gallery
    >
      <div className="ga__frame">
        <div className="ga__track" ref={trackRef}>
          {imgs.length
            ? imgs.map((im, k) => (
                <div className="ga__slide" key={k}>
                  <img src={im.src} alt={im.alt ?? product.title} loading="lazy" />
                </div>
              ))
            : [1, 2, 3].map((n) => (
                <div className="ga__slide" key={n}>
                  <span className="ga__num">{n}</span>
                </div>
              ))}
        </div>
        <button
          className="ga__arrow ga__prev"
          type="button"
          aria-label="Immagine precedente"
          hidden={i === 0}
          onClick={() => setI((v) => Math.max(0, v - 1))}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4 7 12l8 8" /></svg>
        </button>
        <button
          className="ga__arrow ga__next"
          type="button"
          aria-label="Immagine successiva"
          hidden={i === last}
          onClick={() => setI((v) => Math.min(last, v + 1))}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4l8 8-8 8" /></svg>
        </button>
        <span className="ga__cover" aria-hidden="true"></span>
      </div>
      {showCaption && (
        <figcaption className="ga__cap" tabIndex={0}>
          <div className="ga__caphead">
            <span className="n">{nn}</span> <b>{product.title}</b>
          </div>
          {hasAccordion && (
            <div className="ga__desc">
              <div className="ga__descIn">
                {product.descrizione && <p className="ga__descText">{product.descrizione}</p>}
                {tags.length > 0 && (
                  <ul className="ga__tags">
                    {tags.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </figcaption>
      )}
    </figure>
  );
}
