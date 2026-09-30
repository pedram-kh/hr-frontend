import { describe, expect, it } from 'vitest';
import { es } from '../../i18n/es';
import { en } from '../../i18n/en';
import { agentStepMeta, normalizationDetail } from './agentTrace';

// CP-2 trace review: a `rule_verdict` step used to render as the raw type name with an empty meta line.
describe('agentStepMeta — rule_verdict', () => {
  it('shows the rule id and what it did', () => {
    const r = agentStepMeta(es, { type: 'rule_verdict', rule: 'salary_intent_pre_call', verdict: 'deny' });
    expect(r.label).toBe('Regla');
    expect(r.meta).toBe('salary_intent_pre_call · denegó la llamada');
  });

  it.each([
    ['rewrite', 'reescribió la llamada'],
    ['force_escalate', 'forzó el escalado'],
    ['force_finish', 'forzó el cierre con la respuesta'],
    ['force_ask', 'forzó una pregunta'],
  ])('renders %s', (verdict, text) => {
    expect(agentStepMeta(es, { type: 'rule_verdict', rule: 'R08', verdict }).meta).toBe(`R08 · ${text}`);
  });

  it('never renders an empty meta line, and says "sin objeciones" when there is no verdict', () => {
    expect(agentStepMeta(es, { type: 'rule_verdict' }).meta).toBe('sin objeciones');
    expect(agentStepMeta(es, { type: 'rule_verdict', rule: 'x', verdict: 'allow' }).meta).toBe('sin objeciones');
    expect(agentStepMeta(en, { type: 'rule_verdict' }).meta).toBe('no objections');
  });

  it('falls back to the raw verdict for an unknown one rather than dropping it', () => {
    expect(agentStepMeta(es, { type: 'rule_verdict', rule: 'r', verdict: 'future_verdict' }).meta).toBe('r · future_verdict');
  });
});

// Sprint 13b (plan.md §6.1/§8.3): the normalization entry shows the five things CP-1 reads per question.
describe('agentStepMeta / normalizationDetail — normalization', () => {
  const accepted = {
    requested: true,
    literal: 'Entré este mes, ¿cuánto tiempo estoy en fase de prueba?',
    proposed: { topic_id: 3, canonical_query: 'duración del período de prueba', confidence: 0.9, reason: 'coloquial' },
    verdict: 'accepted' as const,
    rejections: [],
    used: { topic_id: 3, topic_name: 'periodo de prueba', canonical_query: 'duración del período de prueba' },
    topic_dropped: false,
    round1a: { ran: true, topic_id: 3 },
    consumers: [{ tool: 'reference_fact', via: 'round_1a', literal_top_score: null, canonical_top_score: null, union_top_score: null, check_a_rescued: false, rescued_answer: true }],
  };

  it('renders the compact step for each verdict, never an empty meta', () => {
    expect(agentStepMeta(es, { type: 'normalization', verdict: 'accepted', topic: 'periodo de prueba', confidence: 0.9, rejected_by: null }).meta).toBe('aceptada · periodo de prueba · 0.9');
    expect(agentStepMeta(es, { type: 'normalization', verdict: 'rejected', topic: 3, confidence: 0.8, rejected_by: 'figure_not_in_literal' }).meta).toBe('descartada · 3 · 0.8 · figure_not_in_literal');
    expect(agentStepMeta(en, { type: 'normalization', verdict: 'absent', topic: null, confidence: null, rejected_by: null }).meta).toBe('not proposed');
    expect(agentStepMeta(es, { type: 'normalization', verdict: 'declined' }).label).toBe('Normalización de la pregunta');
    expect(agentStepMeta(es, { type: 'round1a', seeded: ['reference_fact'] })).toEqual({ label: 'Ronda 1a (ruta de dato verificado)', meta: 'reference_fact' });
  });

  it('lists literal, canonical, topic, confidence and verdict, then Round 1a and the consumer', () => {
    const lines = normalizationDetail(es, accepted);
    expect(lines.slice(0, 5)).toEqual([
      'Pregunta original: «Entré este mes, ¿cuánto tiempo estoy en fase de prueba?»',
      'Forma normalizada: «duración del período de prueba»',
      'Tema: periodo de prueba',
      'Confianza: 0.9',
      'Veredicto: aceptada',
    ]);
    expect(lines).toContain('Ronda 1a: ejecutada');
    expect(lines.at(-1)).toContain('reference_fact (round_1a)');
    expect(lines.at(-1)).toContain('rescate');
  });

  it('shows why a proposal was rejected, and why Round 1a did not run', () => {
    const lines = normalizationDetail(en, {
      ...accepted,
      verdict: 'rejected',
      used: null,
      rejections: [{ rule: 'figure_not_in_literal', span: '15' }, { rule: 'scan:F1', span: null }],
      round1a: { ran: false, skipped: 'follow_up' },
      consumers: [],
    });
    expect(lines).toContain('Reason: figure_not_in_literal «15», scan:F1');
    expect(lines).toContain('Round 1a: not run — not the first turn');
    expect(lines).toContain('Verdict: rejected');
    expect(lines).toContain('Normalized form: «duración del período de prueba»'); // the PROPOSED one, so the reviewer can read what was refused
  });

  it('tolerates a declined block with nothing proposed', () => {
    const lines = normalizationDetail(es, { ...accepted, verdict: 'declined', proposed: null, used: null, round1a: null, consumers: [] });
    expect(lines).toContain('Forma normalizada: —');
    expect(lines).toContain('Tema: —');
    expect(lines).toContain('Confianza: —');
  });
});
