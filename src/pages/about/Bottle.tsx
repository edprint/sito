import { useEffect, useRef, type ReactElement, type RefObject } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import {
  BOTTLE_FILL,
  BOTTLE_SWAP,
  BOTTLE_TILT_DEG,
  type HeroObjectState,
} from "./aboutSections";
import { xFractionToWorld } from "./viewport";

/**
 * La bottiglia del logo (public/bottiglia-edprint.glb): superficie in VETRO
 * elegante tinto nell'arancio brand — MeshPhysicalMaterial trasparente con
 * clearcoat e riflessi da environment PROCEDURALE (RoomEnvironment + PMREM:
 * nessun asset esterno, come per il decoder Draco self-hosted). La grana del
 * GLB resta come micro-rilievo (normal map) perché il vetro non sembri
 * plastica perfetta; toneMapped off per non far slavare l'arancio.
 *
 * CONSEGNA FLUIDA: la goccia (HeroObject) MORPHA verso il profilo misurato
 * della bottiglia per state.bottle 0→BOTTLE_SWAP; qui il GLB entra in
 * dissolvenza incrociata (BOTTLE_SWAP→1) sulla stessa identica silhouette
 * (il morph è tenuto lo 0.5% più stretto: niente z-fighting). Simmetrico
 * al ritorno, quando la bottiglia rifluisce nelle altre forme.
 *
 * Presentazione: inclinata di 10° a destra come nel logo (pivot al CENTRO,
 * come la goccia), ruota molto lentamente attorno alla VERTICALE e un po'
 * più velocemente attorno al PROPRIO asse. L'altezza è una frazione del
 * viewport: nella presentazione dell'intro occupa quasi tutto lo schermo.
 */

export const GLB_URL = "/bottiglia-edprint.glb";
export const DRACO_PATH = "/draco/"; // decoder self-hosted (niente CDN)

const GLB_HEIGHT = 0.25; // altezza del GLB in metri (origine al centro base)

/** Rotazione continua attorno al proprio asse inclinato: lenta (rad/s).
 *  La rivoluzione attorno alla VERTICALE non è continua: arriva dai gesti
 *  (state.turn, in giri) — passaggio intro→Metodo e tocco dei checkpoint. */
const GIRO_ASSE = 0.15;
/** Opacità del vetro a regime (sulla carta bianca della pagina). */
const OPACITA_VETRO = 0.45;

useGLTF.preload(GLB_URL, DRACO_PATH);

export function Bottle({
  stateRef,
}: {
  stateRef: RefObject<HeroObjectState>;
}): ReactElement {
  const groupRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);
  const matsRef = useRef<THREE.MeshPhysicalMaterial[]>([]);
  // angolo accumulato dello spin lento (pesato su state.idle: si ferma in
  // reduced-motion e rallenta dolcemente dove la regia chiede quiete)
  const asse = useRef(0);
  const { viewport, gl, scene: rootScene, camera } = useThree();
  const { scene } = useGLTF(GLB_URL, DRACO_PATH);

  useEffect(() => {
    // riflessi: ambiente studio procedurale (RoomEnvironment via PMREM)
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.06).texture;

    // vetro tinto nell'arancio brand; opacity animata dalla dissolvenza
    const glass = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#ff5b2e"),
      roughness: 0.09,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.14,
      envMap: env,
      envMapIntensity: 0.9,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false,
    });
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        // la grana del GLB migra sul vetro come micro-rilievo
        const orig = Array.isArray(obj.material) ? obj.material[0] : obj.material;
        if (orig instanceof THREE.MeshStandardMaterial && orig.normalMap && !glass.normalMap) {
          glass.normalMap = orig.normalMap;
          glass.normalScale = new THREE.Vector2(0.35, 0.35);
        }
        obj.material = glass;
        // il vetro si disegna DOPO la goccia in dissolvenza (stessa posizione)
        obj.renderOrder = 2;
      }
    });
    matsRef.current = [glass];
    // precompila i programmi shader al mount: niente hitch alla prima
    // comparsa della bottiglia durante lo scroll
    gl.compile(rootScene, camera);
    return () => {
      glass.dispose();
      env.dispose();
      pmrem.dispose();
    };
  }, [scene, gl, rootScene, camera]);

  useFrame(({ clock }, delta) => {
    const state = stateRef.current;
    const group = groupRef.current;
    const spin = spinRef.current;
    if (!state || !group || !spin) return;

    // dissolvenza incrociata sopra il morph della goccia (stessa silhouette)
    const op = THREE.MathUtils.smoothstep(state.bottle, BOTTLE_SWAP, 1);
    group.visible = op > 0.002;
    if (!group.visible) return;
    matsRef.current.forEach((m) => {
      m.opacity = op * OPACITA_VETRO;
      // tinta del vetro: arancio brand, cambia ai checkpoint del Metodo
      m.color.copy(state.glassColor);
    });

    const t = clock.elapsedTime;
    // stessi micro-idle della goccia (si azzerano con state.idle → 0)
    const sway = Math.sin(t * 0.5) * 0.22 * state.idle;
    const float = Math.sin(t * 0.8) * 0.06 * state.idle;
    asse.current += delta * GIRO_ASSE * state.idle;

    // altezza relativa allo schermo (regge al resize senza ricalcoli)
    const altezza = viewport.height * BOTTLE_FILL * state.scale;
    const k = altezza / GLB_HEIGHT;
    group.scale.setScalar(k);
    group.position.x = xFractionToWorld(state.x, viewport.width);
    // pivot al CENTRO della bottiglia, come la goccia che le cede il posto
    group.position.y = state.y + float;
    // rivoluzione attorno alla VERTICALE: solo dai gesti (state.turn, giri)
    group.rotation.y = state.rotationY + sway + state.turn * Math.PI * 2;
    // proprio asse: spin lento continuo + giri extra dei gesti (state.spin)
    spin.rotation.y = asse.current + state.spin * Math.PI * 2;
  });

  return (
    <group ref={groupRef} visible={false}>
      {/* inclinazione fissa di 10° verso destra, come nel logo */}
      <group rotation={[0, 0, -THREE.MathUtils.degToRad(BOTTLE_TILT_DEG)]}>
        <group ref={spinRef}>
          {/* origine del GLB al centro della BASE: mezzo GLB più in basso,
              così il pivot del gruppo è il centro del corpo */}
          <primitive object={scene} position={[0, -GLB_HEIGHT / 2, 0]} />
        </group>
      </group>
    </group>
  );
}
