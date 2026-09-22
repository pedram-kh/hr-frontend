/**
 * Sprint 11c (plan.md §3) — node size encodes `degree`, never node type
 * (colour already encodes state; carrying type in a THIRD visual channel
 * would be redundant with the persistent-label rule, which already marks the
 * 46 scope nodes). A pure function so both renderers (3D's `nodeVal`,
 * 2D's `nodeCanvasObject` radius) share one sizing rule instead of two that
 * could silently drift apart.
 *
 * `sqrt`, not linear: `periodo de prueba`'s degree-88 hub would otherwise
 * dwarf every degree-1 leaf by 88×, burying the rest of the picture under one
 * sphere. `+1` keeps a degree-0 node (should not occur — every drawn node has
 * at least one edge — but never divide-by/collapse-to-zero on a data surprise).
 */
export function nodeVal(degree: number): number {
  return 1 + Math.sqrt(Math.max(degree, 0));
}
