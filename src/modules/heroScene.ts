import * as THREE from "three";

/**
 * Sfondo dell'hero: piano full-screen con shader a macchie di colore
 * (crema / arancio / viola / verde) in un liquido animato.
 * Muovendo il mouse le macchie si "mescolano" (vortice attorno al
 * puntatore), con effetto smooth. Rispetta prefers-reduced-motion.
 */

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  uniform float uTime;
  uniform vec2  uResolution;
  uniform vec2  uMouse;     // -0.5 .. 0.5
  uniform float uStrength;  // 0 .. 1 (mescolamento in hover)
  uniform vec3  uColorA;    // arancio
  uniform vec3  uColorB;    // viola
  uniform vec3  uColorC;    // verde
  uniform vec3  uColorD;    // crema (base)
  uniform vec3  uColorE;    // giallo
  uniform vec3  uColorF;    // ciano

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
  vec2 rot(vec2 p, float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c) * p;
  }

  void main() {
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 auv = vUv; auv.x *= aspect;

    // posizione mouse in coordinate aspetto-corrette
    vec2 amp = (uMouse + 0.5); amp.x *= aspect;

    // vortice del liquido attorno al mouse (raggio più stretto = effetto localizzato)
    float d = distance(auv, amp);
    float infl = smoothstep(0.42, 0.0, d) * uStrength;
    vec2 rel = auv - amp;
    rel = rot(rel, infl * 5.0);
    vec2 suv = amp + rel;

    float t = uTime * 0.08;

    // domain warp intenso -> aspetto "marmo / fluido" (scala più alta = più macchie)
    vec2 p = suv * 3.3;
    vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2, 1.3) - t));
    vec2 r2 = vec2(
      fbm(p + 3.5 * q + vec2(1.7, 9.2) + 0.20 * t),
      fbm(p + 3.5 * q + vec2(8.3, 2.8) - 0.15 * t)
    );

    // campi di rumore normalizzati in [0,1], uno per colore
    float em = fbm(p * 0.9 + r2 * 1.5 + t * 0.3) * 0.5 + 0.5;
    float e1 = fbm(p + 3.5 * r2) * 0.5 + 0.5;
    float e2 = fbm(p * 1.4 + 2.0 * q - t * 0.5) * 0.5 + 0.5;
    float e3 = fbm(p * 1.7 + q * 1.5 + vec2(3.0, -t)) * 0.5 + 0.5;
    float e4 = fbm(p * 1.2 + r2 * 1.8 + vec2(-2.0, t)) * 0.5 + 0.5;

    // tutte le macchie sono nello SFONDO (crema base + 5 colori distribuiti);
    // il mouse le mescola solo con il vortice (suv), non le "accende"
    vec3 col = uColorD;
    col = mix(col, uColorA, smoothstep(0.50, 0.70, em)); // arancio
    col = mix(col, uColorC, smoothstep(0.52, 0.72, e1)); // verde
    col = mix(col, uColorB, smoothstep(0.52, 0.72, e2)); // viola
    col = mix(col, uColorE, smoothstep(0.54, 0.74, e3)); // giallo
    col = mix(col, uColorF, smoothstep(0.54, 0.74, e4)); // ciano

    // grana da stampa
    float g = fract(sin(dot(vUv * uResolution, vec2(12.9898, 78.233))) * 43758.5453);
    col += (g - 0.5) * 0.045;

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function initHeroScene({ reduceMotion }: { reduceMotion: boolean }): void {
  const canvas = document.querySelector<HTMLCanvasElement>("#hero-canvas");
  const media = document.querySelector<HTMLElement>(".hero__media");
  if (!canvas || !media) return;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.Camera(); // il vertex shader scrive già in clip-space

  const uniforms = {
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uStrength: { value: 0 },
    uColorA: { value: new THREE.Color(0xff5b2e) },
    uColorB: { value: new THREE.Color(0xcdabfe) },
    uColorC: { value: new THREE.Color(0x8fae94) },
    uColorD: { value: new THREE.Color(0xf1e8de) },
    uColorE: { value: new THREE.Color(0xffd21e) }, // giallo
    uColorF: { value: new THREE.Color(0x2ec5ff) }, // ciano
  };

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  scene.add(mesh);

  const targetMouse = new THREE.Vector2(0, 0);
  let strengthTarget = 0;

  const resize = (): void => {
    const w = media.clientWidth;
    const h = media.clientHeight;
    renderer.setSize(w, h, false);
    uniforms.uResolution.value.set(w, h);
  };
  resize();
  window.addEventListener("resize", resize);

  // mescolamento: il puntatore muove il liquido; da fermo/uscito svanisce
  media.addEventListener("pointermove", (e) => {
    const r = media.getBoundingClientRect();
    targetMouse.set(
      (e.clientX - r.left) / r.width - 0.5,
      -((e.clientY - r.top) / r.height - 0.5)
    );
    strengthTarget = 1;
  });
  media.addEventListener("pointerleave", () => {
    strengthTarget = 0;
  });

  const clock = new THREE.Clock();

  const renderFrame = (): void => {
    uniforms.uTime.value = clock.getElapsedTime();
    strengthTarget *= 0.965; // decade dolcemente se il mouse è fermo
    uniforms.uStrength.value +=
      (strengthTarget - uniforms.uStrength.value) * 0.09;
    uniforms.uMouse.value.lerp(targetMouse, 0.1);
    renderer.render(scene, camera);
  };

  if (reduceMotion) {
    renderFrame();
    return;
  }

  let running = true;
  const loop = (): void => {
    if (running) renderFrame();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  // pausa il rendering quando l'hero è fuori dallo schermo
  const io = new IntersectionObserver(
    (entries) => {
      running = entries[0]?.isIntersecting ?? true;
    },
    { threshold: 0 }
  );
  io.observe(media);
}
