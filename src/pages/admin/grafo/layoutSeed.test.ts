import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { seedPositions } from './layoutSeed';
import { SIM_CONFIG } from './simConfig';

// Sprint 11c (plan.md §C.2). Co-located, matching the repo's two existing
// test files (`statusLabels.test.ts`, `citationMarkers.test.ts`) rather than
// a `__tests__/` subfolder — the plan's illustrative path was aspirational,
// this is the actual convention.

const GRAFO_DIR = dirname(fileURLToPath(import.meta.url));

/**
 * Strips block and line comments so the randomness scan below checks actual
 * code, not doc-comments that legitimately name the forbidden APIs while
 * explaining why this module doesn't need them (see simConfig.ts's docblock).
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

/** Every source file under this module, recursively — excludes this test file itself. */
function grafoSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...grafoSourceFiles(path));
    } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.test.ts') && !entry.name.endsWith('.test.tsx')) {
      out.push(path);
    }
  }
  return out;
}

describe('seedPositions', () => {
  it('contains no randomness or clock read anywhere in the grafo module', () => {
    // Scoped to src/pages/admin/grafo/ on purpose: node_modules ships
    // `|| Math.random` fallbacks (unreachable through the public API — see
    // simConfig.ts's docblock), and the repo has one legitimate
    // `Math.random` in ChatScreen.tsx. An app-wide grep would fail for
    // reasons unrelated to this feature's determinism guarantee.
    const forbidden = /Math\.random|crypto\.getRandomValues|Date\.now|new Date\(|performance\.now/;
    for (const file of grafoSourceFiles(GRAFO_DIR)) {
      const code = stripComments(readFileSync(file, 'utf8'));
      expect(code, `${file} must not read randomness or the clock`).not.toMatch(forbidden);
    }
  });

  it('produces a stable, snapshotted layout for a fixed 12-id fixture', () => {
    const ids = [
      'c:1', 'c:2', 'doc:doc-1', 'doc:doc-2', 'fact:fact-1', 'fact:fact-2',
      's:20', 't:10', 'tp:100', 'tp:101', 'tp:102', 'tp:103',
    ];
    expect(seedPositions(ids)).toMatchSnapshot();
  });

  it('is order-invariant: a shuffled input yields byte-identical output', () => {
    const ids = [
      'c:1', 'c:2', 'doc:doc-1', 'doc:doc-2', 'fact:fact-1', 'fact:fact-2',
      's:20', 't:10', 'tp:100', 'tp:101', 'tp:102', 'tp:103',
    ];
    const shuffled = [ids[7], ids[2], ids[11], ids[0], ids[9], ids[4], ids[1], ids[10], ids[5], ids[8], ids[3], ids[6]];

    expect(seedPositions(shuffled)).toEqual(seedPositions(ids));
  });

  it('is a pure function of its input: calling it twice yields identical output', () => {
    const ids = ['c:1', 'c:2', 'doc:doc-1'];
    expect(seedPositions(ids)).toEqual(seedPositions(ids));
  });
});

describe('SIM_CONFIG', () => {
  it('never lets the cooldown depend on wall-clock time', () => {
    // The library default is 15000 (ms) — machine-speed-dependent, and
    // exactly the bug spec §6.5 ("reload-identical") forbids. See
    // simConfig.ts's docblock for why this single value matters.
    expect(SIM_CONFIG.cooldownTime).toBe(Infinity);
  });

  it('stops the simulation on a finite tick count instead', () => {
    expect(Number.isFinite(SIM_CONFIG.cooldownTicks)).toBe(true);
    expect(SIM_CONFIG.cooldownTicks).toBeGreaterThan(0);
  });
});
