import type { ReactElement } from "react";
import { Link } from "react-router-dom";

/** Logo fisso, al vivo dell'angolo in alto a sinistra, sopra a tutto. */
export function Logo(): ReactElement {
  return (
    <Link to="/" className="logo" aria-label="EDPRINT home">
      <span className="logo__mark" aria-hidden="true">
        <i className="c"></i>
        <i className="m"></i>
        <i className="y"></i>
        <i className="k"></i>
      </span>
      <span className="logo__word">
        EDPRINT<em>.</em>
      </span>
    </Link>
  );
}
