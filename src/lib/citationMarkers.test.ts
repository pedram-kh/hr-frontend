import { describe, expect, it } from 'vitest';
import { stripSourceMarkers } from './citationMarkers';

// Sprint 10a — Correction-01 (E1). This is a pure display transform: the
// stored/returned text keeps its markers untouched (Check B parses them);
// only the employee-facing render strips them.
describe('stripSourceMarkers', () => {
  it('removes a single marker and the space it leaves behind', () => {
    expect(stripSourceMarkers('Tienes 30 días de vacaciones [Fuente 1] al año.')).toBe(
      'Tienes 30 días de vacaciones al año.',
    );
  });

  it('removes multiple markers scattered across the text', () => {
    expect(
      stripSourceMarkers('La jornada es de 40 horas [Fuente 1] y las vacaciones son 30 días [Fuente 2].'),
    ).toBe('La jornada es de 40 horas y las vacaciones son 30 días.');
  });

  it('removes a marker immediately followed by punctuation without leaving a stray space', () => {
    expect(stripSourceMarkers('Corresponden 30 días [Fuente 3], según el convenio.')).toBe(
      'Corresponden 30 días, según el convenio.',
    );
  });

  it('is a no-op on text with no markers', () => {
    expect(stripSourceMarkers('Un/a compañero/a de Recursos Humanos revisará tu consulta.')).toBe(
      'Un/a compañero/a de Recursos Humanos revisará tu consulta.',
    );
  });

  it('handles a double-digit marker index', () => {
    expect(stripSourceMarkers('Ver detalle [Fuente 12] del convenio.')).toBe('Ver detalle del convenio.');
  });

  it('never matches a bracketed number that is not a Fuente marker', () => {
    expect(stripSourceMarkers('El artículo [14] del Estatuto.')).toBe('El artículo [14] del Estatuto.');
  });
});
