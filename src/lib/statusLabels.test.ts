import { describe, expect, it } from 'vitest';
import {
  FACT_STATUS_LABELS,
  GROUP_NODE_STATUS_LABELS,
  RETRIEVAL_STATUS_LABELS,
  SUB_OUTCOME_LABELS,
  TAGGING_STATUS_LABELS,
} from './statusLabels';

// Sprint 11a (§D.3) — extends Correction-02's coverage-guard PATTERN
// (`EscalationReasonLabelCoverageTest.php`: introspect the true enum, diff
// against the label map, fail the build on any gap) to the label maps this
// sprint added. Those maps have no backend PHP counterpart to Reflect —
// they're frontend-only display concerns — so unlike the escalation-reason
// guard (which introspects a LIVE Postgres CHECK constraint), these lists are
// hand-copied from the cited backend source below. That's a real trade-off:
// this guard only re-checks a copy against a copy. It still catches the
// literal Correction-02 bug shape (a new enum value shipped with zero label,
// or two values silently colliding on one label) provided a future PR that
// adds an enum value updates ONE of the two lists — normal review will
// generally catch a diff that adds a value in only one place.
function assertFullCoverage(enumValues: string[], labels: Record<string, string>, mapName: string) {
  const missing = enumValues.filter((v) => !(v in labels));
  expect(missing, `${mapName} is missing a label for: ${missing.join(', ')}`).toEqual([]);
}

function assertNoLabelCollisions(enumValues: string[], labels: Record<string, string>, mapName: string) {
  const seen = new Map<string, string>();
  const collisions: string[] = [];
  for (const value of enumValues) {
    const label = labels[value];
    if (label === undefined) continue;
    const prior = seen.get(label);
    if (prior) {
      collisions.push(`'${prior}' and '${value}' both display as '${label}'`);
    } else {
      seen.set(label, value);
    }
  }
  expect(collisions, `Two ${mapName} values are indistinguishable on screen: ${collisions.join('; ')}`).toEqual([]);
}

describe('RETRIEVAL_STATUS_LABELS', () => {
  // documents/document_chunks migrations, `retrieval_status` enum column:
  // hr-backend/database/migrations/2026_06_20_131008_create_documents_table.php:21
  // hr-backend/database/migrations/2026_06_20_131011_create_document_chunks_table.php:32
  const ENUM_VALUES = ['draft', 'active', 'historical'];

  it('has a label for every retrieval_status enum value', () => {
    assertFullCoverage(ENUM_VALUES, RETRIEVAL_STATUS_LABELS, 'RETRIEVAL_STATUS_LABELS');
  });

  it('gives every retrieval_status value a distinct label', () => {
    assertNoLabelCollisions(ENUM_VALUES, RETRIEVAL_STATUS_LABELS, 'retrieval_status');
  });
});

describe('TAGGING_STATUS_LABELS', () => {
  // documents migration, `tagging_status` enum column:
  // hr-backend/database/migrations/2026_06_20_131008_create_documents_table.php:25
  const ENUM_VALUES = ['auto_proposed', 'under_review', 'verified'];

  it('has a label for every tagging_status enum value', () => {
    assertFullCoverage(ENUM_VALUES, TAGGING_STATUS_LABELS, 'TAGGING_STATUS_LABELS');
  });

  it('gives every tagging_status value a distinct label', () => {
    assertNoLabelCollisions(ENUM_VALUES, TAGGING_STATUS_LABELS, 'tagging_status');
  });
});

describe('FACT_STATUS_LABELS', () => {
  // reference_facts migration, `status` enum column:
  // hr-backend/database/migrations/2026_06_26_120001_create_reference_facts_table.php:66
  const ENUM_VALUES = ['needs_review', 'verified'];

  it('has a label for every reference_facts.status enum value', () => {
    assertFullCoverage(ENUM_VALUES, FACT_STATUS_LABELS, 'FACT_STATUS_LABELS');
  });

  it('gives every reference_facts.status value a distinct label', () => {
    assertNoLabelCollisions(ENUM_VALUES, FACT_STATUS_LABELS, 'reference_facts.status');
  });
});

describe('GROUP_NODE_STATUS_LABELS', () => {
  // ConvenioGroup::STATUSES / ConvenioGroupCategory::STATUSES (plain varchar,
  // not a DB enum — see the migration comment on why — but a closed set):
  // hr-backend/app/Models/ConvenioGroup.php:31
  const ENUM_VALUES = ['needs_review', 'approved', 'rejected'];

  it('has a label for every ConvenioGroup(Category) status value', () => {
    assertFullCoverage(ENUM_VALUES, GROUP_NODE_STATUS_LABELS, 'GROUP_NODE_STATUS_LABELS');
  });

  it('gives every group/category status value a distinct label', () => {
    assertNoLabelCollisions(ENUM_VALUES, GROUP_NODE_STATUS_LABELS, 'group node status');
  });
});

describe('SUB_OUTCOME_LABELS', () => {
  // Mirrors EscalationExplainer::MATRIX exactly (hr-backend/app/Support/EscalationExplainer.php:35-104).
  // MATRIX itself is guard-tested against `registry()` on the backend
  // (`EscalationExplainerGuardTest`) — this list is that same 49-key set,
  // copied here because the short-label table (§D.2) is a purely frontend
  // display concern with no backend equivalent.
  const MATRIX_KEYS = [
    'sensitive_topic.pattern_baseline',
    'sensitive_topic.admin_blocked_topic',
    'off_domain.legal_medical',
    'off_domain.other_employee_data',
    'off_domain.router_off_domain',
    'off_domain.admin_off_domain',
    'explicit_request.explicit_request',
    'low_confidence.no_retrieval',
    'low_confidence.weak_retrieval',
    'low_confidence.citations_failed',
    'low_confidence.figure_not_grounded',
    'low_confidence.entailment_failed',
    'low_confidence.grounding_truncated',
    'low_confidence.aggregation',
    'low_confidence.cross_path',
    'low_confidence.answer_model_not_configured',
    'low_confidence.provider_error',
    'low_confidence.unspecified',
    'conflict.fact_vs_convenio',
    'salary_coverage_gap.no_convenio',
    'salary_coverage_gap.no_table',
    'salary_coverage_gap.future_only',
    'salary_coverage_gap.category_unresolved',
    'salary_coverage_gap.no_row_for_category',
    'salary_coverage_gap.statutory_figure',
    'reference_fact_coverage_gap.no_convenio',
    'reference_fact_coverage_gap.no_reference_data',
    'reference_fact_coverage_gap.only_needs_review',
    'reference_fact_coverage_gap.out_of_validity',
    'reference_fact_coverage_gap.employee_group_unknown',
    'reference_fact_coverage_gap.group_structure_not_approved',
    'reference_fact_coverage_gap.subarea_not_recorded',
    'reference_fact_coverage_gap.group_split_since_fact_bound',
    'reference_fact_coverage_gap.same_validity_conflict',
    'publish.topic_scope_conflict',
    'publish.semantic_overlap',
    'publish.semantic_near_overlap',
    'publish.semantic_compare_unavailable',
    'publish.semantic_no_text_to_compare',
    'publish.convert_blocked',
    'quality_sample_wrong.wrong_scope',
    'quality_sample_wrong.wrong_figure',
    'quality_sample_wrong.stale_document',
    'quality_sample_wrong.unclear',
    'quality_sample_wrong.other',
    'estatuto_fallback_gap.expired_no_successor',
    'estatuto_fallback_gap.tagging_under_review',
    'estatuto_fallback_gap.scan_no_text',
    'estatuto_fallback_gap.not_yet_embedded',
  ];

  it('has exactly 49 keys, matching EscalationExplainer::MATRIX', () => {
    expect(MATRIX_KEYS.length).toBe(49);
  });

  it('has a label for every (reason.sub_outcome) pair in MATRIX', () => {
    assertFullCoverage(MATRIX_KEYS, SUB_OUTCOME_LABELS, 'SUB_OUTCOME_LABELS');
  });

  it('has no stray keys beyond MATRIX (a renamed/removed sub_outcome left behind)', () => {
    const stray = Object.keys(SUB_OUTCOME_LABELS).filter((k) => !MATRIX_KEYS.includes(k));
    expect(stray, `SUB_OUTCOME_LABELS has keys not in MATRIX: ${stray.join(', ')}`).toEqual([]);
  });

  // Collisions are NOT checked here: several sub-outcomes across different
  // reasons legitimately share a short label today (e.g. both
  // `salary_coverage_gap.no_convenio` and `reference_fact_coverage_gap.no_convenio`
  // say "Sin convenio asignado" — correct, since the table's other column
  // already shows `reason` and disambiguates them). Unlike the escalation-reason
  // badge (one column, must be unique), this is a two-column table.
});
