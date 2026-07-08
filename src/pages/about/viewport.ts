/**
 * Helper di posizionamento in coordinate viewport (brief v2): converte una
 * posizione laterale espressa come frazione dello schermo in x world, in
 * base alla larghezza del viewport three (da useThree().viewport).
 *
 * fraction: 0 = centro, +1 = bordo destro, -1 = bordo sinistro.
 * La conversione avviene a ogni frame in HeroObject, così il layout regge
 * al resize senza ricalcolare le timeline.
 */
export function xFractionToWorld(fraction: number, viewportWidth: number): number {
  return (fraction * viewportWidth) / 2;
}
