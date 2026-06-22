import type { MessageTrace } from '../../lib/api';

// The expandable "how I got here" view (design-system §8). Read-only; renders the
// pipeline as a provenance timeline. It never shows the API key or any secret —
// the backend builds the trace without them.
export function TracePanel({ trace }: { trace: MessageTrace }) {
  const steps: { label: string; meta: string; dot: string }[] = [];

  if (trace.scope_filters) {
    const sf = trace.scope_filters as Record<string, unknown>;
    steps.push({
      label: 'Ámbito resuelto',
      meta: `convenio ${sf.convenio_id ?? '—'} · ${String(sf.as_of_date ?? '')} · estado ${JSON.stringify(sf.retrieval_status ?? [])}`,
      dot: 'src-admin_manual',
    });
  }

  if (trace.guardrail_check) {
    steps.push({
      label: 'Salvaguarda',
      meta: trace.guardrail_check.fired
        ? `activada (${trace.guardrail_check.reason ?? ''})`
        : 'sin incidencias',
      dot: trace.guardrail_check.fired ? 'src-system' : 'src-filename_parse',
    });
  }

  if (trace.retrieval) {
    const r = trace.retrieval;
    steps.push({
      label: 'Recuperación',
      meta: `${r.returned}/${r.eligible_total} fragmentos · score máx. ${r.top_score?.toFixed?.(3) ?? r.top_score}`,
      dot: 'src-ai_agent',
    });
  }

  if (trace.synthesis) {
    const s = trace.synthesis;
    const authority = (s.authority_used ?? []).join(', ');
    steps.push({
      label: 'Síntesis',
      meta: `${s.model ?? ''} · ${s.citation_count ?? 0} cita(s)${authority ? ` · fundamentado en: ${authority}` : ''}`,
      dot: 'src-ai_agent',
    });
  }

  if (trace.floor_decision) {
    const f = trace.floor_decision;
    steps.push({
      label: 'Decisión',
      meta: `${f.outcome === 'answer' ? 'responder' : 'escalar'}${f.escalation_reason ? ` (${f.escalation_reason})` : ''} · A=${f.check_a_retrieval ? '✓' : '✗'} B=${f.check_b_citations ? '✓' : '✗'}`,
      dot: f.outcome === 'answer' ? 'src-admin_manual' : 'src-system',
    });
  }

  return (
    <details className="trace">
      <summary className="trace-toggle">Cómo llegué a esto</summary>
      <div className="well trace-body">
        <ul className="timeline">
          {steps.map((step, i) => (
            <li key={i} className="timeline-item">
              <span className={`timeline-dot ${step.dot}`} aria-hidden="true" />
              <div>
                <div className="timeline-action">{step.label}</div>
                <div className="timeline-meta">{step.meta}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
