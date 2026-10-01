import { describe, expect, it } from 'vitest';
import { es } from '../../i18n/es';
import { en } from '../../i18n/en';
import { agentStepMeta, declineMeta, laneRow, normalizationDetail, traceOutcomeLabel } from './agentTrace';
import type { ChatOutcome, DeclineTrace } from '../../lib/api';

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
    ['force_decline', 'forzó una declinación (fuera de alcance)'],
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

// Slice 13c: the trace panel's "Lane" row.
describe('laneRow', () => {
  it('is null when the turn never reached the lane', () => {
    expect(laneRow(es, undefined)).toBeNull();
  });

  it('shows the model basis, the word count and a clean pass, with the detail lines', () => {
    const r = laneRow(es, {
      basis: 'model_knowledge',
      sources: [{ kind: 'model_knowledge', title: 'conocimiento general del modelo' }],
      web_attempted: true,
      fetch_errors: [{ url: 'https://www.sepe.es/x', status: 404, error: 'http_404' }],
      grounding: { checked: false, reason: 'model_knowledge_no_source' },
      postcheck: { passed: true },
      shape: { verdict: 'pass', rule_ids: [] },
      word_count: 64,
      prompt_sha256: 'abcdef0123456789abcdef',
      draft: { model: 'claude-sonnet-5', general_knowledge_ms: 900, cost_usd: 0.0034 },
    });
    expect(r?.label).toBe('Lane de conocimiento general');
    expect(r?.meta).toBe('conocimiento del modelo (sin página) · 64 palabras · sin bloqueo');
    expect(r?.detail).toContain('Se intentó una página: sí');
    expect(r?.detail).toContain('Error al leer: https://www.sepe.es/x · http_404');
    expect(r?.detail).toContain('Verificación contra la fuente: no aplica (no hay fuente)');
    expect(r?.detail).toContain('Forma: pasa');
    expect(r?.detail).toContain('Borrador: $0.0034 · 900 ms · claude-sonnet-5');
    expect(r?.detail).toContain('Prompt sha256: abcdef012345');
  });

  it('names the lock that blocked: the post-check, or the shape check with the rule and why', () => {
    const post = laneRow(en, { basis: 'model_knowledge', postcheck: { passed: false, hits: [{ pattern_id: 'F1', matched_span: '5' }] } });
    expect(post?.meta).toContain('blocked by the post-check');
    expect(post?.detail).toContain('Post-check: F1 «5»');

    const shape = laneRow(en, { basis: 'model_knowledge', postcheck: { passed: true }, shape: { verdict: 'blocked', rule_ids: ['S1'], hits: [{ rule_id: 'S1', detail: 'article: artículo 46' }] } });
    expect(shape?.meta).toContain('blocked by the shape check');
    expect(shape?.detail).toContain('Shape: S1 (article: artículo 46)');
  });

  it('renders a Sprint-13 trace (no basis, shape, words or hash) without inventing anything', () => {
    const r = laneRow(es, { sources: [{ kind: 'web', id: 'sepe-x', title: 'SEPE' }], grounding: { checked: true, grounded: true } });
    expect(r?.meta).toBe('origen no registrado · sin bloqueo');
    expect(r?.detail).toEqual(['Fuentes: SEPE', 'Verificación contra la fuente: verificada']);
  });
});

// Slice 13e (plan.md §5.2): the decision line's outcome word, and the decline gate's evidence line.
describe('traceOutcomeLabel', () => {
  const ALL: ChatOutcome[] = ['answer', 'escalate', 'needs_category', 'ask', 'decline'];

  it.each(ALL)('has a distinct, non-empty label for %s in both dictionaries', (o) => {
    for (const d of [es, en]) expect(traceOutcomeLabel(d, o).length).toBeGreaterThan(0);
  });

  it('has no label collisions', () => {
    for (const d of [es, en]) expect(new Set(ALL.map((o) => traceOutcomeLabel(d, o))).size).toBe(ALL.length);
  });

  it('reads an ask turn as a question and a decline as out of scope, never as an escalation', () => {
    expect(traceOutcomeLabel(es, 'ask')).toBe('preguntar');
    expect(traceOutcomeLabel(es, 'decline')).toBe('declinar (fuera de alcance)');
    expect(traceOutcomeLabel(en, 'decline')).toBe('decline (out of scope)');
  });

  it('shows an outcome it does not know rather than calling it an escalation', () => {
    expect(traceOutcomeLabel(es, 'future_outcome')).toBe('future_outcome');
  });
});

describe('declineMeta', () => {
  const planner: DeclineTrace = {
    granted: true,
    source: 'planner',
    reason: 'off_domain',
    checks: Array.from({ length: 10 }, (_, i) => ({ id: `D${i}`, pass: true })),
    denied_by: null,
    confirm: { label: 'off_domain', confidence: 0.95, floor: 0.9, source: 'llm' },
    gate_version: 'dg-1',
  };

  it('shows the source, the router vote against its floor, and the checks passed', () => {
    expect(declineMeta(es, planner)).toBe('fuente: planificador · router off_domain 0.95 (≥ 0.90) · 10 comprobaciones superadas');
  });

  it('shows the admin pattern for the guard source', () => {
    const guard: DeclineTrace = { ...planner, source: 'guard_admin', confirm: null, matched_pattern: 'gimnasio' };
    expect(declineMeta(es, guard)).toBe('fuente: lista de Guardarraíles · patrón «gimnasio» · 10 comprobaciones superadas');
  });

  it('names the check that refused when the decline was denied', () => {
    const denied: DeclineTrace = {
      ...planner,
      granted: false,
      denied_by: 'D7',
      checks: planner.checks.map((c) => (c.id === 'D7' ? { ...c, pass: false, detail: 'turno' } : c)),
    };
    expect(declineMeta(es, denied)).toBe('fuente: planificador · router off_domain 0.95 (≥ 0.90) · declinación denegada por D7 (turno)');
    expect(declineMeta(en, denied)).toContain('decline denied by D7 (turno)');
  });
});
