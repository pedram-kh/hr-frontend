import type { MessageTrace } from '../../lib/api';
import { useT } from '../../i18n/context';

// The expandable "how I got here" view (design-system §8). Read-only; renders the
// pipeline as a provenance timeline. It never shows the API key or any secret —
// the backend builds the trace without them.
export function TracePanel({ trace }: { trace: MessageTrace }) {
  const t = useT();
  // Sprint 10b, Correction-02 (eyes-on finding): `list` is optional and, today,
  // only ever populated by the "Enrutado" step below — the actual
  // decomposed_queries rewrite texts, not just their count, so a reviewer can
  // read what the rewrite said.
  const steps: { label: string; meta: string; dot: string; list?: string[] }[] = [];

  if (trace.scope_filters) {
    const sf = trace.scope_filters as Record<string, unknown>;
    steps.push({
      label: t.tracePanel.scopeResolvedLabel,
      meta: `${t.tracePanel.convenioPrefix}${sf.convenio_id ?? '—'} · ${String(sf.as_of_date ?? '')}${t.tracePanel.statusPrefix}${JSON.stringify(sf.retrieval_status ?? [])}`,
      dot: 'src-admin_manual',
    });
  }

  if (trace.guardrail_check) {
    steps.push({
      label: t.tracePanel.guardrailLabel,
      meta: trace.guardrail_check.fired
        ? `${t.tracePanel.guardrailFiredPrefix}${trace.guardrail_check.reason ?? ''}${t.tracePanel.guardrailFiredSuffix}`
        : t.tracePanel.guardrailClear,
      dot: trace.guardrail_check.fired ? 'src-system' : 'src-filename_parse',
    });
  }

  if (trace.router_decision) {
    const rd = trace.router_decision;
    const subq = rd.subqueries && rd.subqueries.length > 0 ? ` · ${rd.subqueries.length}${t.tracePanel.subqueryCountSuffix}` : '';
    // Sprint 10b (ADR-0033): decomposed_queries is a SEPARATE array from
    // subqueries (rephrasing, not splitting) — rendered as its own count, not
    // folded into the subconsulta(s) count above.
    const decomp = rd.decomposed_queries && rd.decomposed_queries.length > 0
      ? ` · ${rd.decomposed_queries.length}${t.tracePanel.reformulationCountSuffix}`
      : '';
    steps.push({
      label: t.tracePanel.routedLabel,
      meta: `${rd.label}${t.tracePanel.confidencePrefix}${typeof rd.confidence === 'number' ? rd.confidence.toFixed(2) : rd.confidence} · ${rd.source}${subq}${decomp}`,
      dot: 'src-ai_agent',
      // Sprint 10b, Correction-02 (eyes-on finding): the actual rewrite
      // texts, not just the count above — undefined (no list rendered) when
      // there are none, same condition as `decomp`'s count above.
      list: rd.decomposed_queries && rd.decomposed_queries.length > 0 ? rd.decomposed_queries : undefined,
    });
  }

  if (trace.salary) {
    const sal = trace.salary;
    const cat = sal.category_source ? `${t.tracePanel.categoryPrefix}${sal.category_source}` : '';
    steps.push({
      label: t.tracePanel.salarySqlLabel,
      meta: `${sal.outcome ?? ''}${sal.year ? `${t.tracePanel.yearPrefix}${sal.year} (${sal.year_selection ?? ''})` : ''}${cat}`,
      dot: sal.outcome === 'answer' ? 'src-admin_manual' : 'src-system',
    });
  }

  if (trace.reference_fact) {
    const rf = trace.reference_fact;
    // Name the node a group match was made on: "ámbito: group" alone doesn't
    // say WHICH group, and that is the thing a reviewer is checking.
    const node = rf.group_node_label ? ` (${rf.group_node_label})` : '';
    const match = rf.match_kind ? `${t.tracePanel.scopePrefix}${rf.match_kind}${node}` : '';
    const validity = rf.validity_selection ? `${t.tracePanel.validityPrefix}${rf.validity_selection}` : '';
    steps.push({
      label: t.tracePanel.referenceFactLabel,
      meta: `${rf.outcome ?? ''}${rf.fact_id ? ` · fact #${rf.fact_id}` : ''}${match}${validity} · structured_reference`,
      dot: rf.outcome === 'answer' ? 'src-admin_manual' : 'src-system',
    });
  }

  if (trace.composition?.detected) {
    const c = trace.composition;
    const conflict = c.conflict?.conflict
      ? `${t.tracePanel.conflictPrefix}${c.conflict.unit}${t.tracePanel.conflictFactMid}${c.conflict.fact_values?.join('/')}${t.tracePanel.conflictVsConvenio}${c.conflict.prose_values?.join('/')}${t.tracePanel.conflictEscalateSuffix}`
      : t.tracePanel.convenioGoverns;
    steps.push({
      label: t.tracePanel.compositionLabel,
      meta: `${c.governing_on_topic_chunks ?? 0}${t.tracePanel.convenioChunkCountSuffix}${conflict}`,
      dot: c.conflict?.conflict ? 'src-system' : 'src-ai_agent',
    });
  }

  // Sprint 10a (ADR-0032). Placed before "Recuperación" because this is the
  // decision that determines WHAT was searched: on the fallback branch the
  // convenio filter was dropped and only the Estatuto was in scope, and on the
  // expired branch nothing was retrieved at all. A reviewer reading the
  // retrieval line below needs this line first to make sense of it.
  if (trace.prose_gap) {
    const pg = trace.prose_gap;
    const fallback = pg.classification === 'never_ingested';
    const evidence = pg.pending_embed
      ? t.tracePanel.pendingIndex
      : pg.reason_code
        ? ` · ${pg.reason_code}`
        : '';
    steps.push({
      label: t.tracePanel.convenioCoverageLabel,
      meta: fallback
        ? t.tracePanel.neverIngestedMeta
        : `${t.tracePanel.unrecoverableMeta}${evidence}`,
      dot: fallback ? 'src-ai_agent' : 'src-system',
    });
  }

  if (trace.retrieval) {
    const r = trace.retrieval;
    const passes = r.passes && r.passes.length > 1 ? ` · ${r.passes.length}${t.tracePanel.recallPassesSuffix}` : '';
    steps.push({
      label: t.tracePanel.retrievalLabel,
      meta: `${r.returned}/${r.eligible_total}${t.tracePanel.fragmentsScorePrefix}${r.top_score?.toFixed?.(3) ?? r.top_score}${passes}`,
      dot: 'src-ai_agent',
    });
  }

  if (trace.synthesis) {
    const s = trace.synthesis;
    const authority = (s.authority_used ?? []).join(', ');
    steps.push({
      label: t.tracePanel.synthesisLabel,
      meta: `${s.model ?? ''} · ${s.citation_count ?? 0}${t.tracePanel.citationCountSuffix}${authority ? `${t.tracePanel.groundedOnPrefix}${authority}` : ''}`,
      dot: 'src-ai_agent',
    });
  }

  if (trace.floor_decision?.grounding?.checked) {
    const g = trace.floor_decision.grounding;
    steps.push({
      label: t.tracePanel.groundingLabel,
      meta: `${g.grounded ? t.tracePanel.groundedVerified : t.tracePanel.groundedUnverified} · ${g.claims?.length ?? 0}${t.tracePanel.claimCountSuffix}${g.ungrounded && g.ungrounded.length > 0 ? ` · ${g.ungrounded.length}${t.tracePanel.ungroundedSuffix}` : ''}`,
      dot: g.grounded ? 'src-admin_manual' : 'src-system',
    });
  }

  if (trace.floor_decision) {
    const f = trace.floor_decision;
    const outcomeLabel =
      f.outcome === 'answer' ? t.tracePanel.outcomeAnswer : f.outcome === 'needs_category' ? t.tracePanel.outcomeNeedsCategory : t.tracePanel.outcomeEscalate;
    // Structured paths (salary SQL, reference fact) are grounded by construction —
    // they have no Check A/B retrieval+citation gate to show.
    const structuredPath = f.path === 'salary_sql' || f.path === 'reference_fact' || f.path === 'reference_fact_composition';
    const checks = structuredPath ? '' : ` · A=${f.check_a_retrieval ? '✓' : '✗'} B=${f.check_b_citations ? '✓' : '✗'}`;
    // Sprint 10a: an answer built on the Estatuto passed the same gates as any
    // other, so nothing above distinguishes it — say so on the decision line.
    const fallback = f.fallback === 'estatuto_gap' ? t.tracePanel.estatutoFallback : '';
    steps.push({
      label: t.tracePanel.decisionLabel,
      meta: `${outcomeLabel}${f.escalation_reason ? ` (${f.escalation_reason})` : ''}${checks}${fallback}`,
      dot: f.outcome === 'answer' ? 'src-admin_manual' : f.outcome === 'needs_category' ? 'src-ai_agent' : 'src-system',
    });
  }

  return (
    <details className="trace">
      <summary className="trace-toggle">{t.tracePanel.summaryToggle}</summary>
      <div className="well trace-body">
        <ul className="timeline">
          {steps.map((step, i) => (
            <li key={i} className="timeline-item">
              <span className={`timeline-dot ${step.dot}`} aria-hidden="true" />
              <div>
                <div className="timeline-action">{step.label}</div>
                <div className="timeline-meta">{step.meta}</div>
                {step.list && step.list.length > 0 && (
                  <details className="trace-decomp">
                    <summary>{t.tracePanel.showReformulationsSummary}</summary>
                    <ul className="trace-decomp-list">
                      {step.list.map((q, j) => <li key={j}>«{q}»</li>)}
                    </ul>
                  </details>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
