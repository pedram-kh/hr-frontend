import { describe, expect, it } from 'vitest';
import { nodeVal } from './nodeSize';

describe('nodeVal', () => {
  it('grows sub-linearly so a degree-88 hub does not dwarf a degree-1 leaf', () => {
    const hub = nodeVal(88);
    const leaf = nodeVal(1);
    expect(hub / leaf).toBeLessThan(10); // sqrt(88)≈9.4 vs linear would be 88x
  });

  it('never collapses to zero or negative on an unexpected degree-0 node', () => {
    expect(nodeVal(0)).toBeGreaterThan(0);
    expect(nodeVal(-1)).toBeGreaterThan(0); // defensive: a data surprise, not a crash
  });

  it('is monotonically non-decreasing in degree', () => {
    const degrees = [0, 1, 2, 5, 10, 88, 149];
    for (let i = 1; i < degrees.length; i++) {
      expect(nodeVal(degrees[i])).toBeGreaterThanOrEqual(nodeVal(degrees[i - 1]));
    }
  });
});
