/**
 * Sprint 11c (plan.md §C.1) — the layout seed. A pure function, no randomness,
 * no clock: `seedPositions()` sorts its own input, so an endpoint returning
 * nodes in a different order can never move the layout (spec §6.5,
 * "reload-identical"). Positions are written onto the node objects before
 * `graphData()` is called; `d3-force-3d`'s `initializeNodes` only assigns a
 * position when the existing one is `NaN` (`d3-force-3d/src/simulation.js`),
 * so a seeded node keeps this exact starting point.
 *
 * The golden-angle spiral is the SAME one `d3-force-3d` itself falls back to
 * internally (`initialAngleRoll = Math.PI * (3 - Math.sqrt(5))`,
 * `src/simulation.js`) — this file exists not because the library is random
 * (it isn't: fixed-seed LCG, see `simConfig.ts`'s docblock), but so the start
 * shape stops depending on the library's own iteration order over `nodes`,
 * which is an implementation detail we don't own.
 */

export interface SeededNode {
  id: string;
  x: number;
  y: number;
  z: number;
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)); // ≈ 2.39996 rad
const YAW_STEP = (Math.PI * 20) / (9 + Math.sqrt(221));

/** Golden-angle spiral keyed on the id-sorted index. No randomness, no clock. */
export function seedPositions(ids: readonly string[]): SeededNode[] {
  const sorted = [...ids].sort(); // sorts internally: caller's order cannot matter
  return sorted.map((id, i) => {
    const r = 10 * Math.cbrt(0.5 + i);
    const roll = i * GOLDEN_ANGLE;
    const yaw = i * YAW_STEP;
    return {
      id,
      x: r * Math.sin(roll) * Math.cos(yaw),
      y: r * Math.cos(roll),
      z: r * Math.sin(roll) * Math.sin(yaw),
    };
  });
}
