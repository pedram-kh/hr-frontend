import { describe, expect, it } from 'vitest';
import { en } from './en';
import { es } from './es';

const KINDS = [
  'complement',
  'no_structure',
  'unrecognized',
  'unknown_group',
  'ambiguous_split_group',
  'unknown_sub_area',
] as const;

describe('groups queue reason strings', () => {
  it('has an English and a Spanish string for every visible kind', () => {
    for (const kind of KINDS) {
      expect(en.groupsQueue.reasons[kind].length).toBeGreaterThan(0);
      expect(es.groupsQueue.reasons[kind].length).toBeGreaterThan(0);
    }
    expect(en.groupsQueue.diffNote.length).toBeGreaterThan(0);
    expect(es.groupsQueue.diffNote.length).toBeGreaterThan(0);
  });

  it('interpolates the group label except for the no-structure sentence', () => {
    for (const kind of KINDS) {
      if (kind === 'no_structure') {
        expect(en.groupsQueue.reasons[kind]).not.toContain('{label}');
        expect(es.groupsQueue.reasons[kind]).not.toContain('{label}');
      } else {
        expect(en.groupsQueue.reasons[kind]).toContain('{label}');
        expect(es.groupsQueue.reasons[kind]).toContain('{label}');
      }
    }
  });
});
