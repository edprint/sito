import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { startSmoothScroll } from "./lib/smoothScroll";
import App from "./App";

// Smooth scroll globale del sito (come il vecchio main.ts). Le pagine che
// vogliono parametri diversi (About: lerp 0.09) lo ricreano al mount e
// ripristinano il default all'unmount.
startSmoothScroll();

const container = document.getElementById("root");
if (!container) throw new Error("#root non trovato");

createRoot(container).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
