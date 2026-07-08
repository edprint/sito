# Gestione contenuti (CMS) — pannello per il cliente

Le pagine servizio (**Stampa**, **Decorazioni ed allestimenti**, **Strutture
espositive**, **Gadget e merchandising**) sono *data-driven*: i prodotti e le
immagini vivono in `content/products/*.json` e il cliente li modifica da un
pannello web, senza toccare il codice.

- **Pannello:** `https://edprint.vercel.app/admin`
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
- **Homepage URL:** `https://edprint.vercel.app`
- **Authorization callback URL:** `https://edprint.vercel.app/api/callback`

Prendi nota di **Client ID** e genera un **Client Secret**.

### 2. Imposta le variabili d'ambiente su Vercel
Progetto su Vercel → *Settings* → *Environment Variables*:
- `GITHUB_CLIENT_ID` = *(il Client ID)*
- `GITHUB_CLIENT_SECRET` = *(il Client Secret)*

Poi fai un **Redeploy** perché le variabili vengano lette dalle funzioni `api/`.

### 3. Aggiorna `public/admin/config.yml`
Già impostato su `https://edprint.vercel.app` (`base_url`, `site_url`, `display_url`).
Se in futuro cambi dominio, aggiorna qui e nella OAuth App (passo 1), poi ridistribuisci.

### 4. Dai accesso al cliente
Il cliente deve poter scrivere sul repo `edprint/sito`:
- aggiungilo come **collaborator** (GitHub → repo → *Settings* → *Collaborators*), **oppure**
- mettilo in un team con permesso *Write* (il repo è di un'organizzazione).

Fatto questo, dal pannello farà *Login with GitHub* e potrà gestire tutto.

---

## Struttura di un prodotto (`content/products/NN-slug.json`)

```json
{
  "title": "Biglietti da visita",
  "order": 1,
  "categoria": "stampa",
  "sottocategoria": "stampati-commerciali",
  "settori": ["aziende", "studi"],
  "formato": "verticale",
  "hue": 12,
  "descrizione": "Il biglietto da visita della tua attività: carte pregiate e finiture su misura.",
  "descrizione2": "Carte da 300 a 600 g, plastificazione soft touch, verniciatura UV a registro.",
  "images": [
    { "src": "/uploads/biglietti-1.jpg", "alt": "Biglietti fronte" }
  ]
}
```

- `order` — posizione nella galleria, all'interno della sua sottocategoria (numero).
- `categoria` — su quale pagina servizio appare: `stampa` | `decorazioni` | `strutture` | `gadget`.
- `sottocategoria` — in quale sezione della pagina appare. **È il campo che comanda:**
  se la sottocategoria scelta appartiene a un'altra categoria, vince lei (il prodotto
  finisce lì). `categoria` serve solo da ripiego se la sottocategoria manca.
  Titoli e testo introduttivo di categorie e sottocategorie sono fissi (definiti nel
  codice, in `src/pages/catalog/taxonomy.ts`), il cliente gestisce solo i prodotti.

| Categoria | Sottocategorie |
|---|---|
| `stampa` (01) | `stampati-commerciali` (1.1) · `brochure-cataloghi-libri` (1.2) · `stampe-promozionali` (1.3) · `packaging-etichette-sticker` (1.4) · `manifesti-poster-striscioni` (1.5) · `adesivi-materiali-rigidi` (1.6) |
| `decorazioni` (02) | `decorazione-vetrine` (2.1) · `decorazione-automezzi` (2.2) · `interior-design` (2.3) · `insegne-totem` (2.4) |
| `strutture` (03) | `fondali-rollup-totem` (3.1) · `desk-postazioni` (3.2) · `punto-vendita-showroom` (3.3) |
| `gadget` (04) | `gadget-eventi-fiere` (4.1) · `kit-personalizzati` (4.2) · `premiazioni` (4.3) |

### Dove finisce un prodotto

Salvando un prodotto con `sottocategoria: stampati-commerciali`, questo compare
**in due pagine**, senza altro lavoro:

1. `/stampa` — nella sezione *1.1 Stampati commerciali*: il **nome** nell'elenco
   "Prodotti" e il suo **riquadro-galleria** nella galleria della sezione.
2. `/stampa/stampati-commerciali` — una **sezione dedicata**: titolo, descrizione,
   tag settore, galleria e bottone "Richiedi un preventivo".

Lo stesso vale per ogni sottocategoria di ogni categoria (`/decorazioni`,
`/decorazioni/insegne-totem`, e così via).
- `settori` — uno o più tag settore: `aziende` | `pa` | `horeca` | `studi`.
- `formato` — `verticale` | `orizzontale` | `quadrato` | `panoramico` (forma del riquadro).
- `hue` — colore del segnaposto (0–360), usato **solo** finché non ci sono immagini.
- `descrizione` — testo breve. Nella pagina categoria si rivela in accordion passando
  il mouse sul nome; nella scheda prodotto è il **paragrafo di sinistra**.
- `descrizione2` — il **paragrafo di destra** della scheda prodotto (materiali, formati,
  tirature, tempi). Facoltativo: se vuoto compare un testo segnaposto ben riconoscibile,
  così le due colonne non collassano.
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
