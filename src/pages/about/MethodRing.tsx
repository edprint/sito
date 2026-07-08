import { useEffect, useMemo, useRef, type ReactElement, type RefObject } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import {
  BOTTLE_FILL,
  BOTTLE_TILT_DEG,
  METHOD_SCALE,
  METHOD_STEPS,
  type HeroObjectState,
} from "./aboutSections";
import { DRACO_PATH, GLB_URL } from "./Bottle";

/**
 * L'anello del capitolo Metodo in 3D: un'orbita FERMA in scena, inclinata
 * quasi in orizzontale, dimensionata sulla composizione del pin
 * (METHOD_SCALE): è la bottiglia a muoversi — scendendo dall'intro le entra
 * dentro, e uscendo dal Metodo la attraversa e ESCE DA SOTTO.
 *
 * I checkpoint sono MINI-BOTTIGLIE (stessa geometria del GLB, condivisa),
 * in piedi sull'anello e inclinate di 10° come nel logo. Con i METHOD_STEPS
 * attuali (0.15/0.5/0.85) due cadono sull'arco DIETRO la bottiglia (si
 * leggono attraverso il vetro, tintate) e una DAVANTI, in basso.
 *
 * Tratto sottilissimo, design ripreso dall'anello SVG che sostituisce:
 * traccia chiara, avanzamento in inchiostro, partenza a ore 12 in senso
 * orario. I bottoni HTML dei medaglioni restano nel DOM per tastiera e AT:
 * i click del mouse arrivano via raycast (il canvas è pointer-events: none)
 * e vengono inoltrati a quei bottoni.
 */

const TILT_X = THREE.MathUtils.degToRad(-72); // quasi orizzontale
const RAGGIO_REL = 0.42;  // raggio dell'anello in frazione dell'altezza bottiglia
const QUOTA_REL = -0.1;   // quota del piano dell'anello rispetto al centro scena
const TUBO = 0.004;       // spessore del tubo, sottilissimo (raggio anello = 1)
const SCALA_CP = 0.88;    // scala delle mini-bottiglie (altezza ≈ 0.22 raggi)

const COLORE_TRACCIA = "#e7e3da";
const COLORE_AVANZAMENTO = "#1b1b1b";
/** Da inattiva la mini-bottiglia è una versione tenue del proprio colore. */
const TENUE = 0.55;

/** Angolo sull'anello del progresso `at`: 0 a ore 12, senso orario. */
const angoloDi = (at: number): number => Math.PI / 2 - at * Math.PI * 2;

export function MethodRing({
  stateRef,
}: {
  stateRef: RefObject<HeroObjectState>;
}): ReactElement {
  const groupRef = useRef<THREE.Group>(null);
  const markersRef = useRef<THREE.Group[]>([]);
  const hitsRef = useRef<THREE.Mesh[]>([]);
  const { viewport, camera } = useThree();

  // stessa geometria della bottiglia grande (cache di useGLTF condivisa)
  const { scene } = useGLTF(GLB_URL, DRACO_PATH);
  const bottleGeo = useMemo(() => {
    let geo: THREE.BufferGeometry | null = null;
    scene.traverse((o) => {
      if (!geo && o instanceof THREE.Mesh) geo = o.geometry as THREE.BufferGeometry;
    });
    return geo!; // il GLB contiene la sola mesh "Bottiglia"
  }, [scene]);

  const trackGeo = useMemo(() => new THREE.TorusGeometry(1, TUBO, 8, 200), []);
  const fillGeo = useMemo(() => new THREE.TorusGeometry(1, TUBO * 1.6, 8, 200), []);
  const hitGeo = useMemo(() => new THREE.SphereGeometry(0.16, 8, 8), []);

  const trackMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: COLORE_TRACCIA,
        transparent: true,
        opacity: 0,
        toneMapped: false,
      }),
    []
  );
  // arco di avanzamento: torus intero, l'angolo oltre il progresso si scarta
  // nel fragment (niente geometrie ricostruite a ogni frame)
  const fillMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        uniforms: {
          uP: { value: 0 },
          uOpacity: { value: 0 },
          uColor: { value: new THREE.Color(COLORE_AVANZAMENTO) },
        },
        vertexShader: /* glsl */ `
          varying vec2 vXY;
          void main() {
            vXY = position.xy;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          varying vec2 vXY;
          uniform float uP;
          uniform float uOpacity;
          uniform vec3 uColor;
          void main() {
            float a = atan(vXY.y, vXY.x);
            // 0 a ore 12, cresce in senso orario (come l'SVG che sostituisce)
            float s = mod(1.5707963 - a, 6.2831853) / 6.2831853;
            float alpha = uOpacity * smoothstep(uP, uP - 0.008, s);
            if (alpha < 0.01) discard;
            gl_FragColor = vec4(uColor, alpha);
          }`,
      }),
    []
  );
  // mini-bottiglie: standard (prendono le luci di scena), opache sul davanti,
  // tintate dal vetro quando stanno sull'arco dietro. Ognuna ha il SUO
  // colore (terna C/M/Y da METHOD_STEPS): pieno da attiva, tenue a riposo
  const markerMats = useMemo(
    () =>
      METHOD_STEPS.map(
        (step) =>
          new THREE.MeshStandardMaterial({
            color: new THREE.Color(step.colore).lerp(new THREE.Color("#ffffff"), TENUE),
            roughness: 0.55,
            transparent: true,
            opacity: 0,
            toneMapped: false,
          })
      ),
    []
  );
  const colPieni = useMemo(() => METHOD_STEPS.map((s) => new THREE.Color(s.colore)), []);
  const colTenui = useMemo(
    () => colPieni.map((c) => c.clone().lerp(new THREE.Color("#ffffff"), TENUE)),
    [colPieni]
  );
  // sfere di hit più larghe delle mini-bottiglie, invisibili ma raycastabili
  const hitMat = useMemo(
    () => new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }),
    []
  );

  useEffect(
    () => () => {
      // bottleGeo appartiene alla cache del GLB: non si tocca
      [trackGeo, fillGeo, hitGeo].forEach((g) => g.dispose());
      [trackMat, fillMat, hitMat, ...markerMats].forEach((m) => m.dispose());
    },
    [trackGeo, fillGeo, hitGeo, trackMat, fillMat, hitMat, markerMats]
  );

  // click del mouse: raycast manuale (canvas pointer-events: none) inoltrato
  // al bottone HTML del checkpoint, che resta la fonte di verità (goTo)
  useEffect(() => {
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const onClick = (ev: MouseEvent): void => {
      const state = stateRef.current;
      if (!state || state.ring < 0.5) return;
      const target = ev.target as HTMLElement | null;
      if (target?.closest?.("a, button, input, textarea")) return; // la UI vera vince
      ndc.set((ev.clientX / window.innerWidth) * 2 - 1, -(ev.clientY / window.innerHeight) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(hitsRef.current, false)[0];
      const step = hit?.object.userData.step as number | undefined;
      if (step !== undefined) {
        document.querySelector<HTMLButtonElement>(`[data-axm-cp="${step}"]`)?.click();
      }
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [camera, stateRef]);

  useFrame((_, delta) => {
    const state = stateRef.current;
    const group = groupRef.current;
    if (!state || !group) return;

    const presenza = state.ring;
    group.visible = presenza > 0.01;
    if (!group.visible) return;

    // FERMO in scena: taglia e quota dalla composizione del pin, non dalla
    // bottiglia (che gli entra dentro e poi esce da sotto)
    const hb = viewport.height * BOTTLE_FILL * METHOD_SCALE;
    group.scale.setScalar(hb * RAGGIO_REL);
    group.position.set(0, hb * QUOTA_REL, 0);

    trackMat.opacity = presenza;
    fillMat.uniforms.uOpacity!.value = presenza;
    fillMat.uniforms.uP!.value = state.ringProgress;

    // checkpoint attivo: stessa logica di setActive nel rig di scroll
    const attivo = state.ringProgress < 0.33 ? 0 : state.ringProgress < 0.67 ? 1 : 2;
    const k = 1 - Math.exp(-9 * delta); // smorzamento indipendente dal framerate
    markersRef.current.forEach((m, i) => {
      const mat = markerMats[i]!;
      mat.opacity = presenza;
      mat.color.lerp(i === attivo ? colPieni[i]! : colTenui[i]!, k);
      const scala = SCALA_CP * (i === attivo ? 1.25 : 1);
      m.scale.setScalar(THREE.MathUtils.lerp(m.scale.x, scala, k));
    });
  });

  return (
    <group ref={groupRef} visible={false}>
      {/* l'anello inclinato: 2 checkpoint sull'arco dietro, 1 davanti */}
      <group rotation={[TILT_X, 0, 0]}>
        <mesh geometry={trackGeo} material={trackMat} />
        <mesh geometry={fillGeo} material={fillMat} />
      </group>
      {/* mini-bottiglie DRITTE nel mondo (fuori dal gruppo inclinato),
          ATTRAVERSATE dall'anello a metà corpo: il gruppo che pulsa sta sul
          punto dell'anello e la mesh è ribassata di mezza altezza (origine
          del GLB al centro base), inclinata di 10° come nel logo */}
      {METHOD_STEPS.map((step, i) => {
        const a = angoloDi(step.at);
        const pos: [number, number, number] = [
          Math.cos(a),
          Math.sin(a) * Math.cos(TILT_X),
          Math.sin(a) * Math.sin(TILT_X),
        ];
        return (
          <group key={step.id} position={pos}>
            <group
              scale={SCALA_CP}
              ref={(el): void => {
                if (el) markersRef.current[i] = el;
              }}
            >
              <mesh
                geometry={bottleGeo}
                material={markerMats[i]}
                position={[0, -0.125, 0]}
                rotation={[0, 0, -THREE.MathUtils.degToRad(BOTTLE_TILT_DEG)]}
              />
            </group>
            <mesh
              geometry={hitGeo}
              material={hitMat}
              userData={{ step: i }}
              ref={(el): void => {
                if (el) hitsRef.current[i] = el;
              }}
            />
          </group>
        );
      })}
    </group>
  );
}
