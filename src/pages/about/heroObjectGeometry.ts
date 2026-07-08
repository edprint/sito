import * as THREE from "three";
import { BOTTLE_H_OVER_D, bottleRadiusAt } from "../../lib/bottleProfile";

/**
 * Geometria unificata dell'oggetto guida: UNA sola BufferGeometry generata
 * da una griglia parametrica (u,v). Dalla stessa griglia — stesso numero e
 * ordine di vertici — vengono calcolati i target di forma, salvati come
 * buffer attributes e miscelati nel vertex shader:
 *
 *   position/normal  → SFERA (la goccia d'inchiostro, stato base)
 *   aPlane/aPlaneN   → PIANO (il foglio, 1.4 × 2)
 *   aCurl/aCurlN     → PIANO CURVATO (decorazione, piega cilindrica)
 *   aWrap/aWrapN     → CILINDRO APERTO (la tazza)
 *   aBottle/aBottleN → BOTTIGLIA del logo (rivoluzione del profilo misurato,
 *                      altezza 1 centrata: il vertex shader la scala con
 *                      uBottleH per pareggiare l'altezza del GLB reale)
 *
 * Il target "pannelli/totem" (strutture) non è un attributo: è una piega
 * procedurale del piano calcolata nel vertex shader (3 falde, uMorphFold).
 *
 * v = 0 è SEMPRE il bordo alto (polo nord della sfera, cima del foglio),
 * così il fronte della pennellata percorre le forme in modo coerente.
 */

// 96 invece dei 128 del brief: con il vertex shader a 4 snoise/vertice regge
// i 60fps anche su GPU modeste (e sul rendering software dei test headless
// pesa la metà). Su hardware discreto si può alzare senza altri cambi.
export const HERO_OBJECT_SEGMENTS = 96;

export const PLANE_W = 1.4;
export const PLANE_H = 2.0;

export function buildHeroObjectGeometry(
  segments: number = HERO_OBJECT_SEGMENTS
): THREE.BufferGeometry {
  const side = segments + 1;
  const count = side * side;

  const sphere = new Float32Array(count * 3);
  const sphereN = new Float32Array(count * 3);
  const plane = new Float32Array(count * 3);
  const planeN = new Float32Array(count * 3);
  const curl = new Float32Array(count * 3);
  const curlN = new Float32Array(count * 3);
  const wrap = new Float32Array(count * 3);
  const wrapN = new Float32Array(count * 3);
  const bottle = new Float32Array(count * 3);
  const bottleN = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2);

  // bottiglia: raggio massimo in unità di altezza (H/D misurato dal logo);
  // 0.995 = il GLB reale resta appena FUORI dal morph durante la
  // dissolvenza incrociata (niente z-fighting tra superfici coincidenti)
  const BOTTLE_R = (1 / (2 * BOTTLE_H_OVER_D)) * 0.995;

  // curvatura della decorazione: arco ~1.6 rad sulla larghezza del foglio
  const CURL_ARC = 1.6;
  const CURL_R = PLANE_W / CURL_ARC;

  // tazza: cilindro quasi chiuso (cucitura sul retro), proporzioni da mug
  const WRAP_ARC = 5.6;
  const WRAP_R = 0.48;
  const WRAP_H = 1.15;

  let p = 0;
  let t = 0;
  for (let j = 0; j < side; j++) {
    const v = j / segments;
    for (let i = 0; i < side; i++) {
      const u = i / segments;

      // ---- SFERA / GOCCIA: v=0 polo alto; raggio leggermente a goccia ----
      const theta = u * Math.PI * 2;
      const phi = v * Math.PI;
      const sp = Math.sin(phi);
      const dx = sp * Math.cos(theta);
      const dy = Math.cos(phi);
      const dz = sp * Math.sin(theta);
      // lieve allungamento verso l'alto: profilo da goccia, non sfera perfetta
      const r = 0.72 * (1 + 0.14 * Math.pow(0.5 + 0.5 * dy, 2));
      sphere[p] = dx * r;
      sphere[p + 1] = dy * r;
      sphere[p + 2] = dz * r;
      sphereN[p] = dx;
      sphereN[p + 1] = dy;
      sphereN[p + 2] = dz;

      // ---- PIANO / FOGLIO ----
      const px = (u - 0.5) * PLANE_W;
      const py = (0.5 - v) * PLANE_H;
      plane[p] = px;
      plane[p + 1] = py;
      plane[p + 2] = 0;
      planeN[p] = 0;
      planeN[p + 1] = 0;
      planeN[p + 2] = 1;

      // ---- PIANO CURVATO (piega cilindrica attorno all'asse Y) ----
      const ca = (u - 0.5) * CURL_ARC;
      curl[p] = Math.sin(ca) * CURL_R;
      curl[p + 1] = py;
      curl[p + 2] = (Math.cos(ca) - 1) * CURL_R;
      curlN[p] = Math.sin(ca);
      curlN[p + 1] = 0;
      curlN[p + 2] = Math.cos(ca);

      // ---- CILINDRO APERTO (tazza) ----
      const wa = (u - 0.5) * WRAP_ARC;
      wrap[p] = Math.sin(wa) * WRAP_R;
      wrap[p + 1] = (0.5 - v) * WRAP_H;
      wrap[p + 2] = Math.cos(wa) * WRAP_R;
      wrapN[p] = Math.sin(wa);
      wrapN[p + 1] = 0;
      wrapN[p + 2] = Math.cos(wa);

      // ---- BOTTIGLIA (rivoluzione del profilo, v=0 in cima come la sfera) ----
      const zn = 1 - v;
      const rB = bottleRadiusAt(zn) * BOTTLE_R;
      bottle[p] = Math.cos(theta) * rB;
      bottle[p + 1] = zn - 0.5;
      bottle[p + 2] = Math.sin(theta) * rB;
      // normale di rivoluzione: (cosθ, -dr/dz, sinθ) dal profilo
      const zA = Math.max(zn - 0.004, 0);
      const zB = Math.min(zn + 0.004, 1);
      const drdz = ((bottleRadiusAt(zB) - bottleRadiusAt(zA)) / (zB - zA)) * BOTTLE_R;
      let bnx = Math.cos(theta);
      let bny = -drdz;
      let bnz = Math.sin(theta);
      if (zn > 0.9995) {
        bnx = 0;
        bny = 1;
        bnz = 0; // polo superiore (sommità chiusa)
      }
      const bnl = Math.hypot(bnx, bny, bnz);
      bottleN[p] = bnx / bnl;
      bottleN[p + 1] = bny / bnl;
      bottleN[p + 2] = bnz / bnl;

      uvs[t] = u;
      uvs[t + 1] = 1 - v;

      p += 3;
      t += 2;
    }
  }

  // indici della griglia
  const indices = new Uint32Array(segments * segments * 6);
  let k = 0;
  for (let j = 0; j < segments; j++) {
    for (let i = 0; i < segments; i++) {
      const a = j * side + i;
      const b = a + 1;
      const c = a + side;
      const d = c + 1;
      indices[k++] = a;
      indices[k++] = c;
      indices[k++] = b;
      indices[k++] = b;
      indices[k++] = c;
      indices[k++] = d;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.setAttribute("position", new THREE.BufferAttribute(sphere, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(sphereN, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setAttribute("aPlane", new THREE.BufferAttribute(plane, 3));
  geometry.setAttribute("aPlaneN", new THREE.BufferAttribute(planeN, 3));
  geometry.setAttribute("aCurl", new THREE.BufferAttribute(curl, 3));
  geometry.setAttribute("aCurlN", new THREE.BufferAttribute(curlN, 3));
  geometry.setAttribute("aWrap", new THREE.BufferAttribute(wrap, 3));
  geometry.setAttribute("aWrapN", new THREE.BufferAttribute(wrapN, 3));
  geometry.setAttribute("aBottle", new THREE.BufferAttribute(bottle, 3));
  geometry.setAttribute("aBottleN", new THREE.BufferAttribute(bottleN, 3));
  // il bounding della sfera basta: le altre forme stanno nello stesso ingombro
  geometry.computeBoundingSphere();
  return geometry;
}
