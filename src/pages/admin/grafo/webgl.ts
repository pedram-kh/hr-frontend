/**
 * Sprint 11c (plan.md §B.5, R4) — WebGL detection, run BEFORE the dynamic
 * `import('3d-force-graph')` so a machine without WebGL never downloads the
 * 358 KB gzip 3D chunk at all (it only ever pays for `force-graph`, 56 KB).
 *
 * The try/catch is not defensive padding: `getContext('webgl')` can THROW
 * (rather than return `null`) on some locked-down/headless setups, and an
 * uncaught throw from a feature-detect is exactly the shape of the Sprint-8
 * `crypto.randomUUID()` bug this project already has a name for (deploy.md
 * §6a) — a feature-detect everyone assumed could only return falsy.
 */
export function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') ?? c.getContext('webgl'));
  } catch {
    return false;
  }
}
