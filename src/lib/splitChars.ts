/**
 * Avvolge ogni parola in <span class="word"> e ogni lettera in <span class="char">.
 * L'a-capo può avvenire solo tra le parole (agli spazi), mai dentro una parola.
 *
 * NB (React): muta i figli dell'elemento. Va usato solo su nodi che non
 * vengono ri-renderizzati (testi statici); al cambio route React scarta
 * comunque l'intero sottoalbero.
 */
export function splitChars(el: HTMLElement): HTMLElement[] {
  const words = (el.textContent ?? "").split(" ");
  const frag = document.createDocumentFragment();
  const chars: HTMLElement[] = [];
  words.forEach((word, wi) => {
    const wordSpan = document.createElement("span");
    wordSpan.className = "word";
    for (const ch of word) {
      const span = document.createElement("span");
      span.className = "char";
      span.textContent = ch;
      wordSpan.appendChild(span);
      chars.push(span);
    }
    frag.appendChild(wordSpan);
    if (wi < words.length - 1) frag.appendChild(document.createTextNode(" "));
  });
  el.textContent = "";
  el.appendChild(frag);
  return chars;
}
