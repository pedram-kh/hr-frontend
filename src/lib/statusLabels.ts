// Sprint 11a (§D.3) — shared human-status label maps, alongside
// escalationReasons.ts's existing pattern (Correction-02). Each map covers
// one small, closed enum; each is guard-tested on the backend
// (`*LabelCoverageTest`, extended in this sprint) against the real source of
// truth (a DB CHECK constraint or a `Rule::in([...])` array), never a
// hand-copied list left to drift.

// --- Escalation sub-outcomes (§D.2 — AnalyticsPage "por corrección" table) --
// Short labels only — the LONG-form Spanish sentence for each of these 49
// `reason.sub_outcome` pairs already exists in
// `EscalationExplainer::MATRIX`/`registry()` (backend, `found`/`stopped_reason`
// fields) for the card-drawer explanation. This is the dense-table-row
// equivalent: a few words, not a sentence.
export const SUB_OUTCOME_LABELS: Record<string, string> = {
  'sensitive_topic.pattern_baseline': 'Tema sensible (base)',
  'sensitive_topic.admin_blocked_topic': 'Tema bloqueado por admin',
  'off_domain.legal_medical': 'Consejo legal/médico',
  'off_domain.other_employee_data': 'Datos de otra persona',
  'off_domain.router_off_domain': 'Fuera de ámbito',
  'off_domain.admin_off_domain': 'Fuera de ámbito (admin)',
  'explicit_request.explicit_request': 'Petición explícita de RR.HH.',
  'low_confidence.no_retrieval': 'Sin contenido encontrado',
  'low_confidence.weak_retrieval': 'Contenido poco relevante',
  'low_confidence.citations_failed': 'Sin respaldo documental',
  'low_confidence.figure_not_grounded': 'Cifra no respaldada',
  'low_confidence.entailment_failed': 'Afirmación no respaldada',
  'low_confidence.grounding_truncated': 'Comprobación incompleta',
  'low_confidence.aggregation': 'Total agregado no soportado',
  'low_confidence.cross_path': 'Pregunta compuesta (salario + otro)',
  'low_confidence.answer_model_not_configured': 'Modelo de respuesta sin configurar',
  'low_confidence.provider_error': 'Fallo del proveedor de respuestas',
  'low_confidence.unspecified': 'Baja confianza (sin detalle)',
  'conflict.fact_vs_convenio': 'Dato vs. convenio en conflicto',
  'salary_coverage_gap.no_convenio': 'Sin convenio asignado',
  'salary_coverage_gap.no_table': 'Sin tabla salarial cargada',
  'salary_coverage_gap.future_only': 'Tabla aún no vigente',
  'salary_coverage_gap.category_unresolved': 'Categoría no válida',
  'salary_coverage_gap.no_row_for_category': 'Sin fila para la categoría',
  'salary_coverage_gap.statutory_figure': 'Cifra estatutaria (SMI)',
  'reference_fact_coverage_gap.no_convenio': 'Sin convenio asignado',
  'reference_fact_coverage_gap.no_reference_data': 'Sin dato de referencia',
  'reference_fact_coverage_gap.only_needs_review': 'Dato sin verificar',
  'reference_fact_coverage_gap.out_of_validity': 'Dato fuera de vigencia',
  'reference_fact_coverage_gap.employee_group_unknown': 'Grupo del empleado desconocido',
  'reference_fact_coverage_gap.group_structure_not_approved': 'Grupo sin aprobar',
  'reference_fact_coverage_gap.subarea_not_recorded': 'Sub-área no registrada',
  'reference_fact_coverage_gap.group_split_since_fact_bound': 'Grupo dividido tras vincular el dato',
  'reference_fact_coverage_gap.same_validity_conflict': 'Datos en conflicto (misma vigencia)',
  'publish.topic_scope_conflict': 'Tema sin etiquetar',
  'publish.semantic_overlap': 'Coincide con el convenio',
  'publish.semantic_near_overlap': 'Posible coincidencia parcial',
  'publish.semantic_compare_unavailable': 'Comparación no disponible',
  'publish.semantic_no_text_to_compare': 'Sin texto para comparar',
  'publish.convert_blocked': 'Motivo no convertible',
  'quality_sample_wrong.wrong_scope': 'Ámbito incorrecto',
  'quality_sample_wrong.wrong_figure': 'Cifra incorrecta',
  'quality_sample_wrong.stale_document': 'Documento desactualizado',
  'quality_sample_wrong.unclear': 'Respuesta poco clara',
  'quality_sample_wrong.other': 'Otro motivo',
  'estatuto_fallback_gap.expired_no_successor': 'Convenio vencido sin sucesor',
  'estatuto_fallback_gap.tagging_under_review': 'Etiquetado sin verificar',
  'estatuto_fallback_gap.scan_no_text': 'Escaneo sin texto',
  'estatuto_fallback_gap.not_yet_embedded': 'Indexado pendiente',
};

/** Label for a `reason.sub_outcome` pair; falls back to the raw sub_outcome for anything unmapped. */
export function subOutcomeLabel(reason: string | null | undefined, subOutcome: string | null | undefined): string {
  if (!subOutcome) return '—';
  const key = `${reason ?? ''}.${subOutcome}`;
  return SUB_OUTCOME_LABELS[key] ?? subOutcome;
}

// --- GroupsQueue.tsx fact/node status (§D.2) --------------------------------
export const FACT_STATUS_LABELS: Record<string, string> = {
  verified: 'Verificado',
  needs_review: 'Por revisar',
};

export function factStatusLabel(status: string | null | undefined): string {
  if (!status) return '—';
  return FACT_STATUS_LABELS[status] ?? status;
}

// Node status covers both the top-level and child-node badges in
// GroupsQueue.tsx (same 3-value enum, same ConvenioGroup::STATUSES source).
export const GROUP_NODE_STATUS_LABELS: Record<string, string> = {
  needs_review: 'Por revisar',
  approved: 'Aprobado',
  rejected: 'Rechazado',
};

export function groupNodeStatusLabel(status: string | null | undefined): string {
  if (!status) return '—';
  return GROUP_NODE_STATUS_LABELS[status] ?? status;
}

// --- Documents: retrieval_status / tagging_status (§D.2) --------------------
// Enum per `documents`/`document_chunks` migrations (`retrieval_status`):
// draft | active | historical.
export const RETRIEVAL_STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  active: 'Activo',
  historical: 'Histórico',
};

export function retrievalStatusLabel(status: string | null | undefined): string {
  if (!status) return '—';
  return RETRIEVAL_STATUS_LABELS[status] ?? status;
}

export const TAGGING_STATUS_LABELS: Record<string, string> = {
  auto_proposed: 'Auto-propuesto',
  under_review: 'En revisión',
  verified: 'Verificado',
};

export function taggingStatusLabel(status: string | null | undefined): string {
  if (!status) return '—';
  return TAGGING_STATUS_LABELS[status] ?? status;
}
