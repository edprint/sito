# Brief tecnico v2 — Pagina About con oggetto 3D guida (scroll verticale)

Azienda di stampa e grafica. Servizi: stampa (piccolo e grande formato), decorazione e
allestimento, strutture espositive, gadget e merchandising.

> Questo brief **sostituisce** la versione "piano sequenza" precedente. L'approccio è
> semplificato: pagina a scroll verticale classica con contenuti HTML reali, più un unico
> oggetto 3D che guida lo storytelling visivo.

## Concept

Una pagina About normale (hero + una sezione per servizio + CTA), con un **unico
oggetto 3D "compagno di viaggio"** in un canvas fisso in viewport. Mentre le sezioni
scorrono, l'oggetto si trasforma: è sempre lo stesso segno grafico che diventa foglio,
telo, rivestimento, struttura e infine gadget. Il mondo sta fermo, si trasforma l'oggetto.

Regole di regia:

- Le trasformazioni sono guidate dallo scroll (scrub), mai autonome. Sono ammesse
  micro-animazioni idle (rotazione lenta, floating) quando una sezione è "a riposo".
- Nessun taglio: ogni stato nasce dal precedente per morph/piegatura/scala.
- L'oggetto si alterna tra lato destro e sinistro dello schermo a ogni sezione (layout a
  zig-zag con i testi); la transizione di lato avviene "in viaggio" tra una sezione e l'altra.
- Camera sostanzialmente fissa: al massimo leggeri dolly/tilt. È l'oggetto che si muove,
  scala e morpha.
- Easing smorzati: scrub ~1, Lenis per lo smoothing.
- Palette: carta + inchiostro + CMYK come unico accento cromatico.
- Il movimento si ferma del tutto alla CTA finale.

## Struttura della pagina e stati dell'oggetto

Sezioni HTML reali, ognuna ~100–150vh. L'oggetto ha uno **stato** per sezione e una
**transizione** tra sezioni consecutive.

| Sezione | Lato oggetto | Stato dell'oggetto | Transizione in ingresso |
| --- | --- | --- | --- |
| Hero — "Tutto inizia da un segno" | centro | Curva di Bézier che si disegna (drawRange), maniglie vettoriali accennate | — |
| Stampa (piccolo e grande formato) | destra | Foglio con grafica: 4 layer CMYK sfalsati che si allineano (fuori registro → registro); poi il foglio scala fino a proporzioni da telo | La curva collassa/si appiattisce nel foglio |
| Decorazione e allestimento | sinistra | Il piano si curva e si adagia su una superficie (vetrina/parete stilizzata): morph da piano a superficie curva | Il telo si stacca e "vola" a sinistra curvandosi |
| Strutture espositive | destra | 3–4 pannelli si alzano e si incastrano in un piccolo stand stilizzato (estrusione + rotazioni) | Il piano curvo si suddivide nei pannelli |
| Gadget e merchandising | sinistra | La grafica si avvolge su una tazza (morph di wrapping); la tazza ruota lentamente in idle | I pannelli si richiudono e si arrotolano nel cilindro |
| CTA — "Dal segno all'oggetto. E ritorno." | centro | La tazza (o il segno che ne riemerge) si ferma al centro | Ritorno al centro, moto a zero |

Tutti gli stati sono realizzabili in **geometria procedurale + morph semplici** (nessun
GLB necessario per la v1). Upgrade futuri opzionali da Blender: tazza modellata, stand
raffinato — esportati in GLB con shape keys, sostituendo i procedurali senza toccare la
regia.

## Stack

Già installato: three, @react-three/fiber, @react-three/drei, gsap (ScrollTrigger), lenis.
TypeScript strict.

## Architettura

```
src/features/about/
├── AboutPage.tsx               # sezioni HTML + canvas fisso dietro
├── AboutCanvas.tsx             # Canvas R3F position:fixed, pointer-events:none
├── useScrollScenes.ts          # Lenis + un ScrollTrigger per sezione, orchestrazione stati
├── HeroObject.tsx              # l'oggetto guida: gestisce stati e morph
├── shaders/halftone.frag.glsl  # (fase successiva) retino CMYK
└── sections/                   # componenti HTML delle sezioni (testi, layout zig-zag)
```

Principi:

- **Un solo Canvas**, `position: fixed; inset: 0; pointer-events: none;` z-index dietro ai
  contenuti (o dietro ai testi ma sopra lo sfondo). I contenuti HTML scorrono
  normalmente sopra.
- **Un ScrollTrigger per sezione** (trigger = la sezione stessa, `start: 'top bottom'`,
  `end: 'bottom top'` o simili), ciascuno con la propria mini-timeline scrubbata che porta
  l'oggetto dallo stato precedente al proprio. Alternativa accettabile: una timeline
  master unica con label — scegliere l'approccio più leggibile, ma il tempo appartiene
  sempre allo scroll.
- **L'oggetto espone un'API di stato**, non anima da solo: posizione laterale (x), scala,
  rotazione, e un set di valori di morph 0→1 (flatten, curl, panels, wrap). Le timeline
  animano solo questi valori.
- Posizionamento laterale in coordinate viewport: convertire "60% a destra" in x world
  in base a camera e viewport (helper con `useThree` viewport), così il layout regge al
  resize.

## Trasformazioni: come realizzarle (procedurale)

- **Curva che si disegna**: `TubeGeometry` su `CatmullRomCurve3` +
  `setDrawRange(0, count * progress)`, oppure Line2 con dashOffset.
- **Curva → foglio**: crossfade di scala/opacità tra tubo e un `PlaneGeometry` ad alta
  suddivisione (il piano servirà per i morph successivi). Accettabile e più elegante:
  morph dei vertici del tubo che si appiattiscono nel piano.
- **Fuori registro CMYK**: 4 piani identici con offset x/y decrescente a progress
  crescente, blending moltiplicativo o additivo; da vicino (fase 2) shader halftone.
- **Piano → superficie curva (decorazione)**: vertex displacement del piano suddiviso:
  `z = curl(progress) * f(x)` (piega cilindrica progressiva). Un semplice morph scritto
  in JS sugli attributi o un piccolo vertex shader con uniform `uCurl`.
- **Pannelli → stand**: suddividere il piano in 3–4 mesh; timeline che le trasla/ruota in
  posizione (pavimento, due pareti, un totem). Piccoli overshoot finali (back.out
  leggero) per l'assestamento.
- **Wrapping sulla tazza**: `CylinderGeometry` aperta; morph dal piano al cilindro
  interpolando le posizioni dei vertici tra le due geometrie (stesso vertex count/ordine:
  generare entrambe con la stessa griglia UV). Uniform `uWrap` 0→1.

## Performance e accessibilità

- `dpr={[1, 1.75]}`, canvas `pointer-events: none`.
- `prefers-reduced-motion: reduce` → oggetto statico per sezione (stati finali, niente
  scrub), contenuti HTML invariati.
- Mobile: stesso layout ma oggetto centrato dietro i testi (niente zig-zag), geometrie a
  suddivisione ridotta. La pagina resta pienamente fruibile anche se il canvas non
  carica.
- Testi e contenuti sono HTML: nessun testo nel canvas.
- Lazy-load del canvas (React.lazy): la pagina deve renderizzare i contenuti anche
  prima/senza il 3D.

## Fasi di lavoro

1. **Struttura pagina + rig**: sezioni HTML con layout zig-zag, canvas fisso, Lenis,
   ScrollTrigger per sezione, oggetto placeholder (un piano colorato) che cambia lato e
   scala a ogni sezione, overlay di debug con sezione attiva e progressi.
2. Stati procedurali dell'oggetto: curva → foglio → CMYK che si allinea → scala telo.
3. Morph di curvatura (decorazione) e pannelli/stand (strutture).
4. Wrapping sulla tazza + idle rotation + stato finale CTA.
5. Shader halftone, rifiniture di luce/materiali (carta, inchiostro), micro-parallax dei testi.
6. Reduced-motion, mobile, ottimizzazione. Eventuale upgrade GLB da Blender (tazza, stand).

Non passare alla fase successiva finché lo scrub della precedente non è fluido.
