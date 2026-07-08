import { useEffect, useRef, type ReactElement } from "react";
import * as THREE from "three";
import { reduceMotion } from "../lib/reduceMotion";
import type { SixColors } from "./LiquidCanvas";

/**
 * Campo di "macchie liquide" monocolore per le card di servizio.
 * Stessa estetica dell'hero ma senza interazione col mouse: il colore
 * è una singola tonalità declinata in 6 sfumature (es. arancio pastello).
 * Porting di src/modules/blobField.ts.
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
  uniform vec3  uColorA;
  uniform vec3  uColorB;
  uniform vec3  uColorC;
  uniform vec3  uColorD; // base
  uniform vec3  uColorE;
  uniform vec3  uColorF;

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

  void main() {
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 auv = vUv; auv.x *= aspect;

    float t = uTime * 0.06;

    vec2 p = auv * 3.0;
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

    vec3 col = uColorD;
    col = mix(col, uColorA, smoothstep(0.50, 0.70, em));
    col = mix(col, uColorC, smoothstep(0.52, 0.72, e1));
    col = mix(col, uColorB, smoothstep(0.52, 0.72, e2));
    col = mix(col, uColorE, smoothstep(0.54, 0.74, e3));
    col = mix(col, uColorF, smoothstep(0.54, 0.74, e4));

    float g = fract(sin(dot(vUv * uResolution, vec2(12.9898, 78.233))) * 43758.5453);
    col += (g - 0.5) * 0.03;

    gl_FragColor = vec4(col, 1.0);
  }
`;

interface BlobCanvasProps {
  /** 6 sfumature [A,B,C,D(base),E,F] */
  colors: SixColors;
  className?: string;
  id?: string;
}

export function BlobCanvas({ colors, className, id }: BlobCanvasProps): ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colorsRef = useRef<SixColors>(colors);
  colorsRef.current = colors;

  useEffect(() => {
    const canvas = canvasRef.current;
    const media = canvas?.parentElement;
    if (!canvas || !media) return;

    const c = colorsRef.current;
    const aborter = new AbortController();
    const { signal } = aborter;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.Camera();

    const uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uColorA: { value: new THREE.Color(c[0]) },
      uColorB: { value: new THREE.Color(c[1]) },
      uColorC: { value: new THREE.Color(c[2]) },
      uColorD: { value: new THREE.Color(c[3]) },
      uColorE: { value: new THREE.Color(c[4]) },
      uColorF: { value: new THREE.Color(c[5]) },
    };

    const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms });
    const geometry = new THREE.PlaneGeometry(2, 2);
    scene.add(new THREE.Mesh(geometry, material));

    const resize = (): void => {
      const w = media.clientWidth;
      const h = media.clientHeight;
      renderer.setSize(w, h, false);
      uniforms.uResolution.value.set(w, h);
    };
    resize();
    window.addEventListener("resize", resize, { signal });

    const clock = new THREE.Clock();
    const renderFrame = (): void => {
      uniforms.uTime.value = clock.getElapsedTime();
      renderer.render(scene, camera);
    };

    let rafId = 0;
    let io: IntersectionObserver | null = null;

    if (reduceMotion) {
      renderFrame();
    } else {
      let running = true;
      const loop = (): void => {
        if (running) renderFrame();
        rafId = requestAnimationFrame(loop);
      };
      rafId = requestAnimationFrame(loop);

      io = new IntersectionObserver(
        (entries) => {
          running = entries[0]?.isIntersecting ?? true;
        },
        { threshold: 0 }
      );
      io.observe(media);
    }

    return () => {
      cancelAnimationFrame(rafId);
      io?.disconnect();
      aborter.abort();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className={className} id={id} aria-hidden="true" />;
}
