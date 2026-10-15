import { describe, expect, it } from 'vitest';
import { en } from '../../i18n/en';
import { es } from '../../i18n/es';
import { searchableLine } from './DocumentDetailPanel';

describe('searchable chunk count', () => {
  it('uses the singular when there is one chunk', () => {
    expect(searchableLine(es.documentDetail, 1)).toBe('Buscable · 1 fragmento');
    expect(searchableLine(en.documentDetail, 1)).toBe('Searchable · 1 chunk');
  });

  it('uses the plural for every other count', () => {
    expect(searchableLine(es.documentDetail, 0)).toBe('Buscable · 0 fragmentos');
    expect(searchableLine(es.documentDetail, 2)).toBe('Buscable · 2 fragmentos');
    expect(searchableLine(en.documentDetail, 2)).toBe('Searchable · 2 chunks');
  });
});
