// Sprint 12b (plan.md §5) — build-time presentation flags.
//
// Vite bakes `import.meta.env.VITE_*` at BUILD time (see Dockerfile), so a flag
// flip needs a frontend rebuild, never a backend deploy. They are functions,
// not module constants, so tests can `vi.stubEnv(...)` between cases.
//
// These hide UI only. Nothing is deleted, no permission changes, and the
// backend payloads are unchanged: the components stay in the tree and come
// back by flipping the flag (procedure in hr-docs/deploy.md).

// A flag is "on" for `true`/`1` (any case), "off" for any other non-empty
// value, and falls back to `fallback` when unset or empty.
export function parseFlag(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined) return fallback;
  const v = raw.trim().toLowerCase();
  if (v === '') return fallback;
  return v === 'true' || v === '1';
}

// Item 1 — the Chunk Health block in the document detail panel. Default OFF.
export const showChunkHealth = (): boolean => parseFlag(import.meta.env.VITE_SHOW_CHUNK_HEALTH, false);

// Item 7 — the Cobertura NAV ITEM only. Default ON. The page itself stays
// reachable by `#view=coverage` (fix-links from the backend point there,
// AdminLinks.php), still behind the `canViewCoverage` permission check.
export const showCoverageNav = (): boolean => parseFlag(import.meta.env.VITE_SHOW_COVERAGE, true);
