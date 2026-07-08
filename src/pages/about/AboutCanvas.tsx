import type { ReactElement, RefObject } from "react";
import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { HeroObject } from "./HeroObject";
import { Bottle } from "./Bottle";
import { MethodRing } from "./MethodRing";
import type { HeroObjectState } from "./aboutSections";

/**
 * L'unico Canvas della pagina About (AboutCanvas.tsx del brief): fisso in
 * viewport, pointer-events none, dietro ai contenuti HTML. Sfondo
 * trasparente: si vede la carta della pagina. Caricato con React.lazy —
 * la pagina deve leggersi anche prima/senza il 3D.
 */
export default function AboutCanvas({
  stateRef,
}: {
  stateRef: RefObject<HeroObjectState>;
}): ReactElement {
  return (
    <div className="axv__stage" aria-hidden="true">
      <Canvas
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        camera={{ fov: 38, near: 0.1, far: 50, position: [0, 0, 6] }}
      >
        {/* luci carta+inchiostro: morbide, senza ombre */}
        <hemisphereLight args={["#ffffff", "#b8b2a4", 1.15]} />
        <directionalLight position={[2, 3, 4]} intensity={0.7} />

        <HeroObject stateRef={stateRef} />
        {/* la bottiglia del logo e l'anello 3D del Metodo (le sue mini-
            bottiglie riusano la geometria del GLB): sospesi finché il GLB
            carica — la goccia intanto c'è già, nessun buco visivo */}
        <Suspense fallback={null}>
          <Bottle stateRef={stateRef} />
          <MethodRing stateRef={stateRef} />
        </Suspense>
      </Canvas>
    </div>
  );
}
