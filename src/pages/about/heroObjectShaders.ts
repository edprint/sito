/**
 * Shader dell'oggetto guida (goccia d'inchiostro → pennellate di forma).
 *
 * VERTEX — la pennellata: ogni uniform di morph (uMorphPlane/Curl/Fold/Wrap,
 * 0→1) È il fronte della stesura: il morph del singolo vertice è ritardato
 * con smoothstep in base alla sua coordinata lungo la direzione della
 * pennellata, con bordo irregolare (simplex) e trascinamento dei vertici sul
 * fronte. Il liquido (uLiquid) è simplex 3D animato con uTime lungo la
 * normale, con residuo minimo anche negli stati solidi.
 *
 * FRAGMENT — look ripreso dagli hero liquidi del sito (LiquidCanvas):
 * stesse funzioni hash/noise/fbm, stessa palette (arancio/viola/verde/
 * giallo/ciano su base che qui è inchiostro), stessa grana da stampa;
 * in più fresnel "bagnato" color carta e fuori registro CMYK (uRegister).
 */

/** Simplex noise 3D (Ashima Arts / Ian McEwan, MIT) — assente nel repo. */
const SNOISE_3D = /* glsl */ `
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute(permute(permute(
                 i.z + vec4(0.0, i1.z, i2.z, 1.0))
               + i.y + vec4(0.0, i1.y, i2.y, 1.0))
               + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }
`;

export const heroObjectVertexShader = /* glsl */ `
  attribute vec3 aPlane;
  attribute vec3 aPlaneN;
  attribute vec3 aCurl;
  attribute vec3 aCurlN;
  attribute vec3 aWrap;
  attribute vec3 aWrapN;
  attribute vec3 aBottle;
  attribute vec3 aBottleN;

  uniform float uTime;
  uniform float uLiquid;
  uniform float uMorphBottle; // goccia→BOTTIGLIA del logo (morph fluido)
  uniform float uBottleH;     // altezza della bottiglia in unità oggetto
  uniform float uMorphPlane;
  uniform float uMorphCurl;
  uniform float uMorphFold;
  uniform float uMorphWrap;
  uniform float uSweepWidth;  // ampiezza del fronte della pennellata
  uniform float uEdgeJitter;  // irregolarità del bordo del fronte
  uniform float uDrag;        // trascinamento dei vertici sul fronte
  uniform float uTrail;       // scia d'inchiostro nello scatto laterale (CP3)

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPos;

  ${SNOISE_3D}

  // fronte della pennellata: il valore globale m (0→1) avanza lungo "delay";
  // ogni vertice completa il morph quando il fronte lo supera
  float gate(float m, float delay, float jit) {
    float front = m * (1.0 + uSweepWidth + uEdgeJitter * 2.0) - delay - jit;
    return smoothstep(0.0, uSweepWidth, front);
  }

  // banda del fronte (per il trascinamento): massima a metà transizione
  float band(float m, float delay, float jit) {
    float front = m * (1.0 + uSweepWidth + uEdgeJitter * 2.0) - delay - jit;
    float x = (front - uSweepWidth * 0.5) / (uSweepWidth * 0.6);
    return exp(-x * x) * 4.0 * m * (1.0 - m);
  }

  // strutture: il piano si ripiega in 3 falde (le due esterne si alzano)
  void foldTarget(vec3 pp, float amt, out vec3 fp, out vec3 fn) {
    float w = ${(1.4 / 3).toFixed(4)};
    float ang = 1.25 * amt;
    float s = sin(ang);
    float c = cos(ang);
    fp = pp;
    fn = vec3(0.0, 0.0, 1.0);
    if (pp.x < -0.5 * w) {
      float dx = pp.x + 0.5 * w;
      fp.x = -0.5 * w + dx * c;
      fp.z = -dx * s;
      fn = vec3(s, 0.0, c);
    } else if (pp.x > 0.5 * w) {
      float dx = pp.x - 0.5 * w;
      fp.x = 0.5 * w + dx * c;
      fp.z = dx * s;
      fn = vec3(-s, 0.0, c);
    }
  }

  void main() {
    vUv = uv;

    // bordo del fronte irregolare, leggermente vivo nel tempo. Un SOLO
    // campione di noise condiviso: le transizioni non si sovrappongono mai
    // (una sezione alla volta), quindi non servono bordi indipendenti.
    float jit = snoise(vec3(uv * 4.0, 3.7 + uTime * 0.10)) * uEdgeJitter;
    float jitF = jit * 0.6;

    // direzione della pennellata per ogni trasformazione
    float dB = uv.y;                   // goccia→bottiglia: dal basso verso l'alto
    float dP = 1.0 - uv.y;             // goccia→foglio: dall'alto verso il basso
    float dC = uv.x;                   // foglio→curva: da sinistra a destra
    float dF = abs(uv.x - 0.5) * 2.0;  // curva→falde: dal centro verso i bordi
    float dW = uv.x;                   // falde→tazza: avvolgimento da sinistra

    float mB = gate(uMorphBottle, dB, jit);
    float mP = gate(uMorphPlane, dP, jit);
    float mC = gate(uMorphCurl, dC, jit);
    float mF = gate(uMorphFold, dF, jitF);
    float mW = gate(uMorphWrap, dW, jit);

    // catena dei morph: goccia → bottiglia → foglio → curva → falde → tazza
    // (la bottiglia è in testa: uscendo verso il foglio i due fronti si
    // incrociano e la forma fluisce dall'una all'altro senza sostituzioni)
    vec3 pos = position;
    vec3 nrm = normal;
    pos = mix(pos, aBottle * uBottleH, mB);
    nrm = mix(nrm, aBottleN, mB);
    pos = mix(pos, aPlane, mP);
    nrm = mix(nrm, aPlaneN, mP);
    pos = mix(pos, aCurl, mC);
    nrm = mix(nrm, aCurlN, mC);
    if (uMorphFold > 0.001) {
      vec3 fPos;
      vec3 fNrm;
      foldTarget(aPlane, mF, fPos, fNrm);
      pos = mix(pos, fPos, mF);
      nrm = mix(nrm, fNrm, mF);
    }
    pos = mix(pos, aWrap, mW);
    nrm = mix(nrm, aWrapN, mW);
    nrm = normalize(nrm);

    // trascinamento d'inchiostro sul fronte della pennellata
    vec3 drag = vec3(0.0);
    drag += vec3(0.0, -0.8, 0.0) * band(uMorphBottle, dB, jit);
    drag += vec3(0.0, -1.0, 0.0) * band(uMorphPlane, dP, jit);
    drag += vec3(1.0, 0.0, 0.0) * band(uMorphCurl, dC, jit);
    drag += vec3(sign(uv.x - 0.5), 0.0, 0.0) * band(uMorphFold, dF, jitF);
    drag += vec3(1.0, 0.0, 0.0) * band(uMorphWrap, dW, jit);
    pos += drag * uDrag * 0.12;

    // inchiostro vivo: il noise non si spegne mai del tutto (residuo 0.012).
    // Diventando bottiglia il liquido si placa: la forma arriva pulita e il
    // GLB reale può subentrare in dissolvenza sulla stessa silhouette
    float amp = (uLiquid * 0.26 + 0.012) * (1.0 - uMorphBottle * 0.92);
    float n1 = snoise(pos * 1.6 + vec3(0.0, uTime * 0.45, 0.0));
    float n2 = snoise(pos * 3.3 - vec3(uTime * 0.30));
    float n3 = snoise(pos * 2.1 + vec3(17.0, 31.0, uTime * 0.40));
    pos += nrm * (n1 * 0.7 + n2 * 0.3) * amp;

    // normali: perturbazione coerente con il liquido, riusando i campioni
    // del displacement (approssimazione economica: 4 snoise/vertice totali)
    vec3 nJ = vec3(n1, n3, n2);
    nrm = normalize(nrm + nJ * (uLiquid * 0.55 + 0.04) * (1.0 - uMorphBottle * 0.9));

    // scia d'inchiostro (CP3 Metodo): smear dei vertici all'indietro,
    // per-vertice irregolare, mentre l'oggetto scatta lateralmente
    if (uTrail > 0.001) {
      float streak = snoise(vec3(uv * 7.0, 5.0)) * 0.5 + 0.5;
      pos.x -= uTrail * streak * streak * 1.1;
    }

    vNormal = normalize(normalMatrix * nrm);
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    vViewPos = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

export const heroObjectFragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPos;

  uniform float uTime;
  uniform float uLiquid;
  uniform float uRegister;   // fuori registro CMYK (1 = sfalsato, 0 = a registro)
  uniform float uMorphPlane; // quanto siamo "materia stampata"
  uniform float uMorphBottle; // quanto siamo BOTTIGLIA (→ arancio pieno)
  uniform float uGlassFade;  // dissolvenza nella consegna al vetro del GLB
  uniform float uBgMix;      // intro: goccia immersa nel colore di pagina
  uniform float uHalftone;   // metodo CP2: retino da stampa in superficie
  uniform vec3 uBg;          // colore di apertura della pagina
  uniform vec3 uAccent;      // tinta della sezione corrente
  uniform vec3 uColorA;      // arancio   (palette hero)
  uniform vec3 uColorB;      // viola
  uniform vec3 uColorC;      // verde
  uniform vec3 uColorD;      // base: qui INCHIOSTRO (negli hero era crema)
  uniform vec3 uColorE;      // giallo
  uniform vec3 uColorF;      // ciano
  uniform vec3 uPaper;       // crema carta degli hero (fresnel/fogli)

  // --- stesse funzioni degli hero liquidi (LiquidCanvas/BlobCanvas) ---
  vec2 hash(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(dot(hash(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
          dot(hash(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
      mix(dot(hash(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
          dot(hash(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x),
      u.y
    );
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = p * 2.0 + 7.3;
      a *= 0.5;
    }
    return v;
  }

  // "artwork" astratto stampato sul foglio (bande fbm), campionato per lastra
  // NB: fbm è ~[-0.5, 0.5] → normalizzato come negli hero (*0.5+0.5)
  float art(vec2 uv) {
    return smoothstep(0.52, 0.62, fbm(uv * vec2(3.0, 4.2) + 2.3) * 0.5 + 0.5);
  }

  void main() {
    // marmo liquido come negli hero: domain warp animato
    vec2 p = vUv * 3.1;
    float t = uTime * 0.08;
    vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2, 1.3) - t));
    vec2 r2 = vec2(
      fbm(p + 3.5 * q + vec2(1.7, 9.2) + 0.20 * t),
      fbm(p + 3.5 * q + vec2(8.3, 2.8) - 0.15 * t)
    );
    float em = fbm(p * 0.9 + r2 * 1.5 + t * 0.3) * 0.5 + 0.5;
    float e1 = fbm(p + 3.5 * r2) * 0.5 + 0.5;
    float e2 = fbm(p * 1.4 + 2.0 * q - t * 0.5) * 0.5 + 0.5;
    float e3 = fbm(p * 1.7 + q * 1.5 + vec2(3.0, -t)) * 0.5 + 0.5;
    float e4 = fbm(p * 1.2 + r2 * 1.8 + vec2(-2.0, t)) * 0.5 + 0.5;

    // base inchiostro; il marmo colorato "vive" quando l'inchiostro è
    // liquido e resta come residuo negli stati solidi
    float vis = 0.18 + 0.82 * smoothstep(0.05, 0.8, uLiquid);
    vec3 col = uColorD;
    col = mix(col, uColorA, smoothstep(0.55, 0.75, em) * 0.55 * vis);
    col = mix(col, uColorC, smoothstep(0.56, 0.76, e1) * 0.45 * vis);
    col = mix(col, uColorB, smoothstep(0.56, 0.76, e2) * 0.50 * vis);
    col = mix(col, uColorE, smoothstep(0.58, 0.78, e3) * 0.50 * vis);
    col = mix(col, uColorF, smoothstep(0.58, 0.78, e4) * 0.50 * vis);

    // accento della sezione corrente (l'API di stato della fase 1)
    col = mix(col, uAccent, smoothstep(0.50, 0.90, em) * 0.35);

    // materia stampata: quando è foglio e il liquido è sceso, la superficie
    // diventa carta con l'artwork in quadricromia; le 4 lastre C/M/Y/K sono
    // lo STESSO artwork con offset che convergono a registro (uRegister 1→0)
    float sheet = uMorphPlane * (1.0 - smoothstep(0.25, 0.85, uLiquid));
    if (sheet > 0.001) {
      float rr = uRegister * 0.05;
      float aC = art(vUv + vec2(rr, rr * 0.5));
      float aM = art(vUv + vec2(-rr * 0.8, rr * 0.2));
      float aY = art(vUv + vec2(rr * 0.3, -rr * 0.9));
      float aK = art(vUv);
      vec3 print = uPaper * 0.97;
      print = mix(print, print * vec3(0.15, 0.75, 0.95), aC * 0.80); // C
      print = mix(print, print * vec3(0.95, 0.20, 0.65), aM * 0.80); // M
      print = mix(print, print * vec3(0.98, 0.90, 0.15), aY * 0.80); // Y
      print = mix(print, print * vec3(0.16), aK * 0.85);             // K
      col = mix(col, print, sheet * 0.9);
    }

    // retino da stampa (metodo CP2): punti d'inchiostro su carta, raggio
    // guidato dalla luminanza del colore sottostante
    if (uHalftone > 0.001) {
      vec2 cell = fract(vUv * vec2(46.0, 66.0)) - 0.5;
      float lum = dot(col, vec3(0.299, 0.587, 0.114));
      float rad = (1.0 - lum) * 0.46 + 0.10;
      float dotMask = 1.0 - smoothstep(rad - 0.12, rad, length(cell));
      vec3 ht = mix(uPaper * 0.97, vec3(0.08), dotMask);
      col = mix(col, ht, uHalftone);
    }

    // bottiglia: il marmo d'inchiostro lascia il posto all'arancio pieno del
    // brand (lo stesso del GLB che subentrerà in dissolvenza)
    float mBot = smoothstep(0.30, 0.92, uMorphBottle);
    col = mix(col, uColorA, mBot);

    // intro: la goccia è immersa nel colore di pagina — la distingue solo
    // la luce (ombreggiatura attenuata, fresnel sempre presente)
    col = mix(col, uBg, uBgMix * 0.94 * (1.0 - mBot));

    // illuminazione semplice + fresnel "bagnato" color carta; da bottiglia
    // l'ombreggiatura si ammorbidisce verso il look del materiale opaco del GLB
    vec3 n = normalize(vNormal);
    if (!gl_FrontFacing) n = -n;
    vec3 viewDir = normalize(vViewPos);
    vec3 lightDir = normalize(vec3(0.5, 0.8, 0.6));
    float diff = max(dot(n, lightDir), 0.0);
    col *= mix(mix(0.62 + 0.48 * diff, 0.93 + 0.10 * diff, uBgMix), 0.86 + 0.26 * diff, mBot);

    // da bottiglia fresnel e speculare restano vivi: la consegna è a un VETRO
    float fre = pow(1.0 - abs(dot(n, viewDir)), 2.4);
    col += uPaper * fre * (0.20 + 0.30 * uLiquid + 0.25 * uBgMix) * (1.0 - mBot * 0.35);

    vec3 h = normalize(lightDir + viewDir);
    col += vec3(0.9) * pow(max(dot(n, h), 0.0), 60.0) * (0.20 + 0.55 * uLiquid) * (1.0 - mBot * 0.45);

    // grana da stampa (identica agli hero)
    float g = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
    col += (g - 0.5) * 0.045;

    // dissolvenza d'uscita: il vetro del GLB sale sopra, la goccia svanisce
    gl_FragColor = vec4(col, 1.0 - uGlassFade);
  }
`;
