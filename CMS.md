# Gestione contenuti (CMS) — pannello per il cliente

La galleria della pagina **Stampa** è ora *data-driven*: i prodotti e le immagini
vivono in `content/products/*.json` e il cliente li modifica da un pannello web,
senza toccare il codice.

- **Pannello:** `https://TUO-DOMINIO.vercel.app/admin`
- **CMS:** [Sveltia CMS](https://github.com/sveltia/sveltia-cms) (Git-based, salva su GitHub)
- **Hosting:** Vercel (deploy automatico ad ogni salvataggio)
- **Login cliente:** GitHub OAuth

## Come funziona (flusso)

1. Il cliente apre `/admin` e fa **Login with GitHub**.
2. Aggiunge/modifica un **Prodotto**: nome, ordine, formato del riquadro, immagini (drag&drop).
3. Al **Save**, Sveltia fa un commit su GitHub (`content/products/*.json` + immagini in `public/uploads/`).
4. Vercel **ricostruisce** il sito → in ~1 minuto le modifiche sono online.

---

## Setup una tantum (da fare una volta sola)

### 1. Crea una GitHub OAuth App
GitHub → *Settings* → *Developer settings* → *OAuth Apps* → **New OAuth App**
- **Application name:** EDPRINT CMS
- **Homepage URL:** `https://TUO-DOMINIO.vercel.app`
- **Authorization callback URL:** `https://TUO-DOMINIO.vercel.app/api/callback`

Prendi nota di **Client ID** e genera un **Client Secret**.

### 2. Imposta le variabili d'ambiente su Vercel
Progetto su Vercel → *Settings* → *Environment Variables*:
- `GITHUB_CLIENT_ID` = *(il Client ID)*
- `GITHUB_CLIENT_SECRET` = *(il Client Secret)*

Poi fai un **Redeploy** perché le variabili vengano lette dalle funzioni `api/`.

### 3. Aggiorna `public/admin/config.yml`
Sostituisci `https://REPLACE-CON-IL-TUO-DOMINIO.vercel.app` con il dominio reale
nei campi `base_url`, `site_url`, `display_url`. Verifica che `repo:` sia corretto.

### 4. Dai accesso al cliente
Il cliente deve poter scrivere sul repo:
- crea/usa un account GitHub per lui e aggiungilo come **collaborator** del repo
  `ermastuff/edprint` (GitHub → repo → *Settings* → *Collaborators*), **oppure**
- mettilo in un team con permesso *Write* se il repo è di un'organizzazione.

Fatto questo, dal pannello farà *Login with GitHub* e potrà gestire tutto.

---

## Struttura di un prodotto (`content/products/NN-slug.json`)

```json
{
  "title": "Biglietti da visita",
  "order": 1,
  "categoria": "stampa",
  "settori": ["aziende", "studi"],
  "formato": "verticale",
  "hue": 12,
  "descrizione": "Il biglietto da visita della tua attività: carte pregiate e finiture su misura.",
  "images": [
    { "src": "/uploads/biglietti-1.jpg", "alt": "Biglietti fronte" }
  ]
}
```

- `order` — posizione nella galleria (numero).
- `categoria` — su quale pagina servizio appare: `stampa` | `decorazioni` | `strutture` | `gadget`.
  La pagina Stampa mostra solo i prodotti con `categoria: stampa`.
- `settori` — uno o più tag settore: `aziende` | `pa` | `horeca` | `studi`.
- `formato` — `verticale` | `orizzontale` | `quadrato` | `panoramico` (forma del riquadro).
- `hue` — colore del segnaposto (0–360), usato **solo** finché non ci sono immagini.
- `descrizione` — testo breve rivelato in accordion passando il mouse sul nome del prodotto.
- `images` — elenco immagini del carosello (il primo è quello mostrato per primo).

> **Aggiungere un prodotto da zero:** nel pannello, collezione *Prodotti* → **New Prodotto**,
> compila i campi, carica le immagini e salva. Verrà creato un nuovo file
> `content/products/NN-nome.json` e il sito si aggiorna al deploy.

## Note

- Finché un prodotto non ha immagini, mostra 3 segnaposti numerati (per far vedere
  il carosello). Appena il cliente carica le foto, compaiono al loro posto.
- Le immagini finiscono nel repo (`public/uploads/`): caricare **foto già ottimizzate
  per il web** (max ~1600px, JPG/WebP). Se in futuro diventano tante, si può spostare
  lo storage su un CDN (es. Cloudinary) mantenendo lo stesso pannello.

### Alternativa al login (se l'OAuth su Vercel desse problemi)
In luogo delle funzioni `api/auth` + `api/callback`, si può usare il worker ufficiale
[`sveltia-cms-auth`](https://github.com/sveltia/sveltia-cms-auth) su Cloudflare
(gratis) e puntare `base_url` a quel worker. Il resto della config non cambia.
