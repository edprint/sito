/**
 * Form "Richiedi preventivo" (demo, senza backend):
 * mostra una conferma e resetta i campi.
 */
export function initForm(): void {
  const form = document.querySelector<HTMLFormElement>("#quote-form");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const note = document.querySelector<HTMLElement>("#form-note");
    if (note) note.hidden = false;
    form.reset();
  });
}
