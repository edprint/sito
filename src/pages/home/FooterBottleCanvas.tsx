import { useEffect, useMemo, type ReactElement } from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { BOTTLE_H_OVER_D, bottleRadiusAt } from "../../lib/bottleProfile";

/**
 * Bottiglia del logo in VETRO liscio e trasparente, nel footer della home.
 * Ferma: nessuna animazione, nessuna entrata in scena — c'è dal primo frame.
 *
 * Non usa il GLB dell'About: quello ha i solchi in geometria e la grana come
 * normal map, cioè l'opposto di "liscio". Qui la superficie è un LatheGeometry
 * generato dallo STESSO profilo misurato sul logo (src/lib/bottleProfile.ts),
 * quindi la silhouette coincide con quella della SVG di ripiego — e non c'è
 * nessun asset da scaricare.
 *
 * Vetro vero: `transmission` (rifrazione) + `ior`, riflessi da un environment
 * procedurale (RoomEnvironment + PMREM: nessun HDR remoto, come nell'About).
 *
 * ATTENZIONE, canvas OPACO di proposito. In three (WebGLRenderer, pass di
 * trasmissione) c'è questa riga:
 *
 *     if ( _currentClearAlpha < 1 ) _this.setClearColor( 0xffffff, 0.5 );
 *
 * cioè: con un canvas `alpha: true` (clearAlpha 0) il render target della
 * trasmissione viene pulito a BIANCO 50%, e il vetro rifrange quel bianco →
 * bottiglia lattea, qualunque cosa si faccia con luci e envMapIntensity.
 * Quindi il canvas è `alpha: false` e la scena ha per sfondo lo stesso nero
 * del footer: il vetro rifrange il nero, cioè si vede attraverso.
 *
 * Non essendoci animazione il canvas è `frameloop="demand"`: disegna un frame
 * al mount e uno a ogni resize, poi sta zitto.
 */

/** inclinazione a destra, come nel logo */
const TILT_DEG = 10;
/** quanto la bottiglia esce dal bordo sinistro */
const BLEED = 0.3;

/** sfondo scena = sfondo footer (var --ink), così il canvas non si stacca */
function inkColor(): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue("--ink").trim();
  return v || "#111111";
}

function GlassBottle(): ReactElement {
  const { viewport, gl } = useThree();

  // profilo del logo → superficie di rivoluzione, alta 1 unità
  const geometry = useMemo(() => {
    const H = 1;
    const rMax = H / (2 * BOTTLE_H_OVER_D);
    const N = 180;
    const pts: THREE.Vector2[] = [new THREE.Vector2(0, 0)]; // disco di base
    for (let i = 0; i <= N; i++) {
      const z = i / N;
      // il vertice sull'asse (r=0) esiste solo in cima: chiude il solido
      pts.push(new THREE.Vector2(Math.max(bottleRadiusAt(z) * rMax, i === N ? 0 : 1e-4), z * H));
    }
    const g = new THREE.LatheGeometry(pts, 128);
    g.center(); // pivot al centro del corpo
    return g;
  }, []);

  // riflessi: ambiente studio procedurale, nessun asset esterno
  const envMap = useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    return env;
  }, [gl]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      envMap.dispose();
    };
  }, [geometry, envMap]);

  // niente useFrame: la posa dipende solo dal viewport, che cambia al resize
  // (R3F ridisegna da sé) — così `frameloop="demand"` non ha nulla da animare
  const altezza = Math.min(viewport.height, viewport.width * 0.9);
  const larghezza = altezza / BOTTLE_H_OVER_D;

  return (
    <group
      scale={altezza}
      // a sinistra, sporgendo di BLEED oltre il bordo
      position={[-viewport.width / 2 + larghezza * (0.5 - BLEED), 0, 0]}
    >
      <mesh geometry={geometry} rotation={[0, 0, -THREE.MathUtils.degToRad(TILT_DEG)]}>
        <meshPhysicalMaterial
          transmission={1}
          thickness={0.18}
          ior={1.5}
          roughness={0.06}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.08}
          envMap={envMap}
          envMapIntensity={0.8}
          /* nessun assorbimento: il vetro non tinge ciò che attraversa */
          attenuationDistance={4}
          attenuationColor="#ffffff"
          color="#ffffff"
        />
      </mesh>
    </group>
  );
}

/** Il ripiego (silhouette SVG) lo gestisce il footer con un error boundary. */
export default function FooterBottleCanvas(): ReactElement {
  const ink = useMemo(inkColor, []);
  return (
    <div className="footer__bottle3d" aria-hidden="true">
      <Canvas
        frameloop="demand"
        dpr={[1, 1.75]}
        // alpha: false → clearAlpha 1 → il pass di trasmissione NON si pulisce
        // a bianco (vedi il commento in testa al file)
        gl={{ antialias: true, alpha: false, powerPreference: "low-power" }}
        camera={{ fov: 38, near: 0.1, far: 50, position: [0, 0, 6] }}
      >
        <color attach="background" args={[ink]} />
        {/* una sola luce radente: dà il colmo sulla spalla, come su un vetro */}
        <directionalLight position={[-4, 2, 3]} intensity={0.8} />
        <GlassBottle />
      </Canvas>
    </div>
  );
}
