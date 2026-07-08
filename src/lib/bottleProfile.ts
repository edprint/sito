/**
 * Profilo della bottiglia del logo, MISURATO da public/assets/Bottiglia.png
 * (contorno campionato riga per riga: scripts/blender/extract_profile.py).
 *
 * È la STESSA tabella incorporata in scripts/blender/build_bottiglia.py, che
 * genera il GLB: la goccia morpha verso questo profilo e a fine morph il GLB
 * (solchi e grana inclusi) subentra sulla stessa identica silhouette.
 * Se si rigenera il profilo, aggiornare ENTRAMBI i file.
 *
 * Coppie (z, r) normalizzate: z=0 base → z=1 sommità; r in frazione del
 * raggio massimo. Rapporto altezza/diametro misurato: 2.127.
 */

export const BOTTLE_H_OVER_D = 2.127;

const PROFILE: ReadonlyArray<readonly [number, number]> = [
  [0.0, 0.073],
  [0.022, 0.605],
  [0.044, 0.736],
  [0.066, 0.788],
  [0.088, 0.83],
  [0.11, 0.867],
  [0.132, 0.9],
  [0.154, 0.929],
  [0.176, 0.952],
  [0.198, 0.971],
  [0.22, 0.985],
  [0.242, 0.995],
  [0.264, 0.999],
  [0.275, 1.0],
  [0.286, 0.999],
  [0.308, 0.995],
  [0.33, 0.986],
  [0.352, 0.973],
  [0.374, 0.956],
  [0.396, 0.935],
  [0.418, 0.912],
  [0.44, 0.885],
  [0.462, 0.856],
  [0.484, 0.826],
  [0.506, 0.794],
  [0.528, 0.761],
  [0.55, 0.728],
  [0.572, 0.696],
  [0.594, 0.664],
  [0.616, 0.633],
  [0.638, 0.603],
  [0.66, 0.576],
  [0.682, 0.551],
  [0.704, 0.528],
  [0.726, 0.508],
  [0.748, 0.491],
  [0.77, 0.476],
  [0.792, 0.465],
  [0.814, 0.457],
  [0.836, 0.452],
  [0.841, 0.451],
  [0.858, 0.483],
  [0.88, 0.503],
  [0.9, 0.518],
  [0.908, 0.523],
  [0.916, 0.529],
  [0.924, 0.535],
  [0.932, 0.542],
  [0.94, 0.547],
  [0.943, 0.547],
  [0.948, 0.547],
  [0.956, 0.539],
  [0.964, 0.522],
  [0.972, 0.495],
  [0.98, 0.452],
  [0.988, 0.381],
  [0.996, 0.247],
  [1.0, 0.0],
];

// --- cubica monotona di Fritsch-Carlson (stessa dello script Blender):
// passa per tutti i punti senza oscillazioni tra l'uno e l'altro ------------
const xs = PROFILE.map((p) => p[0]);
const ys = PROFILE.map((p) => p[1]);
const n = xs.length;
const h: number[] = [];
const d: number[] = [];
for (let i = 0; i < n - 1; i++) {
  h.push(xs[i + 1]! - xs[i]!);
  d.push((ys[i + 1]! - ys[i]!) / h[i]!);
}
const m: number[] = new Array(n).fill(0);
m[0] = d[0]!;
m[n - 1] = d[n - 2]!;
for (let i = 1; i < n - 1; i++) {
  const a = d[i - 1]!;
  const b = d[i]!;
  m[i] = a * b > 0 ? 2 / (1 / a + 1 / b) : 0;
}

/** Raggio del profilo (frazione del raggio massimo) alla quota z ∈ [0,1]. */
export function bottleRadiusAt(z: number): number {
  const x = Math.min(Math.max(z, xs[0]!), xs[n - 1]!);
  let i = xs.findIndex((v, k) => k < n - 1 && x >= v && x <= xs[k + 1]!);
  if (i < 0) i = n - 2;
  const t = (x - xs[i]!) / h[i]!;
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  return h00 * ys[i]! + h10 * h[i]! * m[i]! + h01 * ys[i + 1]! + h11 * h[i]! * m[i + 1]!;
}
