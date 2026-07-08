import { useEffect, useMemo, useRef, type ReactElement, type RefObject } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { reduceMotion } from "../../lib/reduceMotion";
import {
  BOTTLE_FILL,
  BOTTLE_SWAP,
  BOTTLE_TILT_DEG,
  INTRO_BG,
  type HeroObjectState,
} from "./aboutSections";
import { buildHeroObjectGeometry } from "./heroObjectGeometry";
import { heroObjectFragmentShader, heroObjectVertexShader } from "./heroObjectShaders";
import { xFractionToWorld } from "./viewport";

/**
 * L'oggetto guida — FASE 2: goccia d'inchiostro liquida che si trasforma a
 * pennellate (goccia → foglio → curva → falde → tazza → goccia).
 *
 * Non anima da solo: a ogni frame copia l'API di stato (posseduta dalle
 * timeline di useScrollScenes) nelle uniform e nel transform. Le uniche
 * animazioni autonome sono uTime (noise idle, quasi congelato con
 * prefers-reduced-motion) e il micro-idle pesato da state.idle.
 *
 * Palette e look ripresi dagli hero liquidi del sito (LiquidCanvas):
 * stessi 6 colori con la base scambiata in inchiostro, crema come fresnel.
 */
export function HeroObject({
  stateRef,
}: {
  stateRef: RefObject<HeroObjectState>;
}): ReactElement {
  const meshRef = useRef<THREE.Mesh>(null);
  const { viewport } = useThree();

  const geometry = useMemo(() => buildHeroObjectGeometry(), []);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: heroObjectVertexShader,
        fragmentShader: heroObjectFragmentShader,
        side: THREE.DoubleSide,
        // trasparente per la dissolvenza nella consegna al vetro del GLB
        // (alpha 1 ovunque tranne nel tratto BOTTLE_SWAP→1 di state.bottle)
        transparent: true,
        uniforms: {
          uTime: { value: 0 },
          uLiquid: { value: 1 },
          uMorphBottle: { value: 0 },
          uBottleH: { value: 1 },
          uGlassFade: { value: 0 },
          uMorphPlane: { value: 0 },
          uMorphCurl: { value: 0 },
          uMorphFold: { value: 0 },
          uMorphWrap: { value: 0 },
          uRegister: { value: 0 },
          uBgMix: { value: 1 },
          uHalftone: { value: 0 },
          uTrail: { value: 0 },
          uSweepWidth: { value: 0.35 },
          uEdgeJitter: { value: 0.16 },
          uDrag: { value: 1 },
          uBg: { value: new THREE.Color(INTRO_BG) },
          uAccent: { value: new THREE.Color("#1b1b1b") },
          // palette hero home (LiquidCanvas), base D → inchiostro
          uColorA: { value: new THREE.Color("#ff5b2e") }, // arancio
          uColorB: { value: new THREE.Color("#cdabfe") }, // viola
          uColorC: { value: new THREE.Color("#8fae94") }, // verde
          uColorD: { value: new THREE.Color("#141414") }, // inchiostro
          uColorE: { value: new THREE.Color("#ffd21e") }, // giallo
          uColorF: { value: new THREE.Color("#2ec5ff") }, // ciano
          uPaper: { value: new THREE.Color("#f1e8de") }, // crema carta hero
        },
      }),
    []
  );

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material]
  );

  useFrame(({ clock }, delta) => {
    const state = stateRef.current;
    const mesh = meshRef.current;
    if (!state || !mesh) return;

    const u = material.uniforms;
    // uTime è l'unica animazione autonoma (noise idle); quasi fermo in RM
    u.uTime!.value = (u.uTime!.value as number) + delta * (reduceMotion ? 0.04 : 1);

    // lo stato posseduto dalle timeline → uniform
    u.uLiquid!.value = state.liquid;
    u.uMorphPlane!.value = state.plane;
    u.uMorphCurl!.value = state.curl;
    u.uMorphFold!.value = state.fold;
    u.uMorphWrap!.value = state.wrap;
    u.uRegister!.value = state.register;
    u.uBgMix!.value = state.bgMix;
    u.uHalftone!.value = state.halftone;
    u.uTrail!.value = state.trail;
    (u.uAccent!.value as THREE.Color).copy(state.color);

    // morph FLUIDO verso la bottiglia: state.bottle 0→BOTTLE_SWAP piega la
    // forma sul profilo misurato; oltre, resta in scena come sottofondo
    // della dissolvenza del GLB (stessa silhouette) e sparisce a 1
    const morphB = Math.min(state.bottle / BOTTLE_SWAP, 1);
    u.uMorphBottle!.value = morphB;
    // dissolvenza incrociata con il vetro del GLB (stessa silhouette)
    u.uGlassFade!.value = THREE.MathUtils.smoothstep(state.bottle, BOTTLE_SWAP, 1);
    // altezza della bottiglia in unità oggetto: il world scale del mesh è
    // state.scale, così a fine morph l'altezza pareggia quella del GLB
    u.uBottleH!.value = viewport.height * BOTTLE_FILL;

    // trasformazioni di regia + micro-idle ammesso (pesato da state.idle)
    mesh.visible = state.bottle < 0.999 && state.scale > 0.01;
    if (!mesh.visible) return;

    const sway = Math.sin(clock.elapsedTime * 0.5) * 0.22 * state.idle;
    const float = Math.sin(clock.elapsedTime * 0.8) * 0.06 * state.idle;
    mesh.position.x = xFractionToWorld(state.x, viewport.width);
    mesh.position.y = state.y + float;
    mesh.scale.setScalar(state.scale);
    mesh.rotation.y = state.rotationY + sway;
    // l'inclinazione della bottiglia (10° a destra) entra con il morph
    mesh.rotation.z = -THREE.MathUtils.degToRad(BOTTLE_TILT_DEG) * morphB;
  });

  // frustumCulled off: morph e noise superano il bounding della geometria base
  return <mesh ref={meshRef} geometry={geometry} material={material} frustumCulled={false} />;
}
