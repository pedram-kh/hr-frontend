import { describe, expect, it } from 'vitest';
import { es } from '../../i18n/es';
import { en } from '../../i18n/en';
import { agentStepMeta } from './agentTrace';

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
