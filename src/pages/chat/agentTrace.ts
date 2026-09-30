import type { MessageTrace } from '../../lib/api';
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
    case 'normalization': {
      // Sprint 13b: the compact line; the full block (literal → canonical, topic, confidence, rejection, consumers) is
      // `normalizationDetail()` below, attached to this same timeline entry by TracePanel.
      const verdict = typeof step.verdict === 'string' ? step.verdict : 'absent';
      const topic = step.topic !== null && step.topic !== undefined ? ` · ${String(step.topic)}` : '';
      const conf = typeof step.confidence === 'number' ? ` · ${step.confidence}` : '';
      const by = typeof step.rejected_by === 'string' && step.rejected_by ? ` · ${step.rejected_by}` : '';
      return { label: t.tracePanel.agentNormalizationLabel, meta: `${normalizationVerdictText(t, verdict)}${topic}${conf}${by}` };
    }
    case 'round1a':
      return {
        label: t.tracePanel.agentRound1aLabel,
        meta: Array.isArray(step.seeded) ? step.seeded.join(', ') : '',
      };
    default:
      return { label: step.type, meta: '' };
  }
}

export function normalizationVerdictText(t: Dict, verdict: string): string {
  const text: Record<string, string> = {
    accepted: t.tracePanel.normVerdictAccepted,
    rejected: t.tracePanel.normVerdictRejected,
    declined: t.tracePanel.normVerdictDeclined,
    absent: t.tracePanel.normVerdictAbsent,
  };
  return text[verdict] ?? verdict;
}

type NormalizationBlock = NonNullable<NonNullable<MessageTrace['agent']>['normalization']>;

const fmt = (n: number | null | undefined): string => (typeof n === 'number' ? n.toFixed(3) : '—');

// Sprint 13b (plan.md §6.1/§8.3) — the reviewer's view of one normalization: literal, canonical, topic, confidence,
// verdict (+ why it was rejected) — the five things CP-1 asks to see per question — then Round 1a and each consumer.
export function normalizationDetail(t: Dict, n: NormalizationBlock): string[] {
  const p = t.tracePanel;
  const lines: string[] = [`${p.normLiteralPrefix}«${n.literal}»`];
  const canonical = n.used?.canonical_query ?? n.proposed?.canonical_query ?? null;
  lines.push(`${p.normCanonicalPrefix}${canonical ? `«${canonical}»` : p.normNone}`);
  const topic = n.used?.topic_name ?? (n.proposed?.topic_id !== null && n.proposed?.topic_id !== undefined ? `#${n.proposed.topic_id}` : null);
  lines.push(`${p.normTopicPrefix}${topic ?? p.normNone}${n.topic_dropped ? ` (${p.normTopicDropped})` : ''}`);
  lines.push(`${p.normConfidencePrefix}${typeof n.proposed?.confidence === 'number' ? n.proposed.confidence : p.normNone}`);
  lines.push(`${p.normVerdictPrefix}${normalizationVerdictText(t, n.verdict)}`);
  if (n.rejections.length > 0) {
    lines.push(`${p.normRejectedByPrefix}${n.rejections.map((r) => (r.span ? `${r.rule} «${r.span}»` : r.rule)).join(', ')}`);
  }
  if (n.round1a) {
    const skip: Record<string, string> = {
      tool_unavailable: p.normSkipToolUnavailable,
      compound_question: p.normSkipCompound,
      follow_up: p.normSkipFollowUp,
      no_verified_fact: p.normSkipNoVerifiedFact,
    };
    lines.push(n.round1a.ran ? p.normRound1aRan : `${p.normRound1aSkippedPrefix}${skip[n.round1a.skipped ?? ''] ?? n.round1a.skipped ?? ''}`);
  }
  n.consumers.forEach((c) => {
    lines.push(
      `${p.normConsumerPrefix}${c.tool} (${c.via}) · ${p.normScoresLabel}: ${fmt(c.literal_top_score)} → ${fmt(c.canonical_top_score)} → ${fmt(c.union_top_score)}`
        + (c.rescued_answer ? p.normRescuedSuffix : ''),
    );
  });
  return lines;
}
