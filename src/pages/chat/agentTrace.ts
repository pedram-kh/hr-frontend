import type { Dict } from '../../i18n/es';

// Sprint 13, build step 8 (plan.md §D.12/§E.15) — one timeline entry per
// `trace.agent.steps[]` row. Rendered generically by `type` rather than one
// bespoke component per tool, since new tool/step types are expected as the
// agent grows (§9's own general_lane tool is the very next one) — an unknown
// future `type` still renders (the fallback branch), it just doesn't get a
// tailored label.
export function agentStepMeta(t: Dict, step: { type: string; [k: string]: unknown }): { label: string; meta: string } {
  switch (step.type) {
    case 'round0':
      return {
        label: t.tracePanel.agentRound0Label,
        meta: Array.isArray(step.seeded) ? step.seeded.join(', ') : '',
      };
    case 'planner_round': {
      const calls = Array.isArray(step.calls) ? step.calls : [];
      const names = calls.map((c) => (c as { tool?: string }).tool ?? '?').join(', ');
      return {
        label: `${t.tracePanel.agentPlannerRoundLabel} ${String(step.round ?? '')}`,
        meta: `${names || t.tracePanel.agentNoCallsMeta}${step.stop_reason ? ` · ${String(step.stop_reason)}` : ''}`,
      };
    }
    case 'tool_call':
      return {
        label: t.tracePanel.agentToolCallLabel,
        meta: `${String(step.tool ?? '')} · ${String(step.status ?? '')}`,
      };
    case 'tool_denied':
      return {
        label: t.tracePanel.agentToolDeniedLabel,
        meta: `${String(step.tool ?? '')} · ${String(step.reason ?? '')}`,
      };
    case 'finalize':
      return {
        label: t.tracePanel.agentFinalizeLabel,
        meta: Array.isArray(step.use) ? step.use.join(', ') : '',
      };
    case 'planner_escalate':
      return {
        label: t.tracePanel.agentPlannerEscalateLabel,
        meta: String(step.category ?? ''),
      };
    case 'rule_verdict': {
      // Recorded by `RuleEngine::run()` ONLY for a non-allow verdict, as `{rule, verdict}`. It used to fall through to the
      // default branch and render as the raw type name with an empty line (CP-2 trace review).
      const verdictText: Record<string, string> = {
        deny: t.tracePanel.agentRuleVerdictDeny,
        rewrite: t.tracePanel.agentRuleVerdictRewrite,
        force_escalate: t.tracePanel.agentRuleVerdictForceEscalate,
        force_finish: t.tracePanel.agentRuleVerdictForceFinish,
        force_ask: t.tracePanel.agentRuleVerdictForceAsk,
      };
      const verdict = typeof step.verdict === 'string' ? step.verdict : '';
      const rule = typeof step.rule === 'string' ? step.rule : '';
      if (!verdict || verdict === 'allow') {
        return { label: t.tracePanel.agentRuleVerdictLabel, meta: t.tracePanel.agentRuleNoObjectionsMeta };
      }
      return { label: t.tracePanel.agentRuleVerdictLabel, meta: `${rule || '?'} · ${verdictText[verdict] ?? verdict}` };
    }
    default:
      return { label: step.type, meta: '' };
  }
}
