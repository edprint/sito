import type { ReactElement } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Logo } from "./components/Logo";
import { Nav } from "./components/Nav";
import { ScrollManager } from "./components/ScrollManager";
import { HomePage } from "./pages/home/HomePage";
import { CategoryPage } from "./pages/catalog/CategoryPage";
import { SubcategoryPage } from "./pages/catalog/SubcategoryPage";
// AboutPage è leggera (HTML): è il suo canvas R3F a essere lazy (React.lazy
// dentro AboutPage), così i contenuti si leggono anche prima/senza il 3D
import { AboutPage } from "./pages/about/AboutPage";

export default function App(): ReactElement {
  return (
    <>
      <Logo />
      <Nav />
      <ScrollManager />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        {/* vecchi URL delle pagine MPA (i redirect server-side sono in vercel.json) */}
        <Route path="/stampa.html" element={<Navigate to="/stampa" replace />} />
        <Route path="/about.html" element={<Navigate to="/about" replace />} />
        {/* catalogo: una pagina per categoria e una per sottocategoria. Le rotte
            statiche qui sopra hanno la precedenza (React Router le ordina) e gli
            slug sconosciuti rimbalzano alla home dalle pagine stesse. */}
        <Route path="/:categoria" element={<CategoryPage />} />
        <Route path="/:categoria/:sottocategoria" element={<SubcategoryPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
