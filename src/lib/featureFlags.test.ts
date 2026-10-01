// Sprint 12b (plan.md §5.2) — flag parsing matrix and the two env readers.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseFlag, showChunkHealth, showCoverageNav } from './featureFlags';

afterEach(() => vi.unstubAllEnvs());

describe('parseFlag', () => {
  it('falls back when unset or blank', () => {
    expect(parseFlag(undefined, true)).toBe(true);
    expect(parseFlag(undefined, false)).toBe(false);
    expect(parseFlag('', true)).toBe(true);
    expect(parseFlag('  ', false)).toBe(false);
  });

  it('reads true / 1 (any case) as on', () => {
    for (const v of ['true', 'TRUE', 'True', '1', ' true ']) expect(parseFlag(v, false)).toBe(true);
  });

  it('reads any other value as off, even when the fallback is on', () => {
    for (const v of ['false', 'FALSE', '0', 'no', 'off', 'yes']) expect(parseFlag(v, true)).toBe(false);
  });
});

describe('showChunkHealth (item 1 — default OFF)', () => {
  it('is off when unset', () => {
    vi.stubEnv('VITE_SHOW_CHUNK_HEALTH', '');
    expect(showChunkHealth()).toBe(false);
  });
  it('turns on with true / 1', () => {
    vi.stubEnv('VITE_SHOW_CHUNK_HEALTH', 'true');
    expect(showChunkHealth()).toBe(true);
    vi.stubEnv('VITE_SHOW_CHUNK_HEALTH', '1');
    expect(showChunkHealth()).toBe(true);
  });
  it('stays off with false', () => {
    vi.stubEnv('VITE_SHOW_CHUNK_HEALTH', 'false');
    expect(showChunkHealth()).toBe(false);
  });
});

describe('showCoverageNav (item 7 — default ON)', () => {
  it('is on when unset', () => {
    vi.stubEnv('VITE_SHOW_COVERAGE', '');
    expect(showCoverageNav()).toBe(true);
  });
  it('turns off with false / 0', () => {
    vi.stubEnv('VITE_SHOW_COVERAGE', 'false');
    expect(showCoverageNav()).toBe(false);
    vi.stubEnv('VITE_SHOW_COVERAGE', '0');
    expect(showCoverageNav()).toBe(false);
  });
  it('stays on with true', () => {
    vi.stubEnv('VITE_SHOW_COVERAGE', 'true');
    expect(showCoverageNav()).toBe(true);
  });
});
