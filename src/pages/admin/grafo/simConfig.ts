/**
 * Sprint 11c (plan.md §C.1) — the one setting that actually needed fixing.
 *
 * `d3-force-3d` (the simulation `3d-force-graph` drives) is already
 * deterministic where it matters: it builds `random = lcg()`, a fixed-seed
 * (`s = 1`) linear congruential generator, and passes it to every force via
 * `force.initialize(nodes, random, nDim)`. The `|| Math.random` fallbacks
 * that exist in its source only apply to a force initialised outside a
 * simulation, which never happens through the public API we call.
 *
 * `three-forcegraph` (the renderer layer) is NOT deterministic by default: it
 * ships `cooldownTime: 15000` — the simulation stops after 15 WALL-CLOCK
 * seconds, so a fast machine runs more ticks than a slow one before stopping
 * and settles into a different final layout. Reload-identical would hold on
 * one laptop and fail across two, which is exactly the shape of bug that
 * passes local review and fails spec §6.5 in the field. `cooldownTicks` (a
 * TICK count, not a clock) is the fix.
 */
export const SIM_CONFIG = {
  warmupTicks: 0,
  cooldownTicks: 300,
  cooldownTime: Infinity, // MUST stay Infinity: the 15000ms default makes layout machine-speed-dependent
  numDimensions: 3,
} as const;
