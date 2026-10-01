import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { es } from '../i18n/es';
import { en } from '../i18n/en';
import { analyticsAuthorityLabel, analyticsPathLabel, analyticsTopicLabel, humanizeKey } from './statusLabels';

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
//
// Sprint 11b (plan.md §C.9 step 6): the label maps moved from module-level
// consts into `i18n/es.ts`/`en.ts` (`t.statusLabels.*`), so this guard now
// checks BOTH dictionaries — a gap or a collision introduced in only one
// language is still caught, not just the Spanish original.
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

const DICTS = { es, en } as const;

describe('RETRIEVAL_STATUS_LABELS', () => {
  // documents/document_chunks migrations, `retrieval_status` enum column:
  // hr-backend/database/migrations/2026_06_20_131008_create_documents_table.php:21
  // hr-backend/database/migrations/2026_06_20_131011_create_document_chunks_table.php:32
  const ENUM_VALUES = ['draft', 'active', 'historical'];

  for (const [lang, dict] of Object.entries(DICTS)) {
    it(`[${lang}] has a label for every retrieval_status enum value`, () => {
      assertFullCoverage(ENUM_VALUES, dict.statusLabels.retrievalStatus, 'statusLabels.retrievalStatus');
    });

    it(`[${lang}] gives every retrieval_status value a distinct label`, () => {
      assertNoLabelCollisions(ENUM_VALUES, dict.statusLabels.retrievalStatus, 'retrieval_status');
    });
  }
});

describe('TAGGING_STATUS_LABELS', () => {
  // documents migration, `tagging_status` enum column:
  // hr-backend/database/migrations/2026_06_20_131008_create_documents_table.php:25
  const ENUM_VALUES = ['auto_proposed', 'under_review', 'verified'];

  for (const [lang, dict] of Object.entries(DICTS)) {
    it(`[${lang}] has a label for every tagging_status enum value`, () => {
      assertFullCoverage(ENUM_VALUES, dict.statusLabels.taggingStatus, 'statusLabels.taggingStatus');
    });

    it(`[${lang}] gives every tagging_status value a distinct label`, () => {
      assertNoLabelCollisions(ENUM_VALUES, dict.statusLabels.taggingStatus, 'tagging_status');
    });
  }
});

describe('FACT_STATUS_LABELS', () => {
  // reference_facts migration, `status` enum column:
  // hr-backend/database/migrations/2026_06_26_120001_create_reference_facts_table.php:66
  const ENUM_VALUES = ['needs_review', 'verified'];

  for (const [lang, dict] of Object.entries(DICTS)) {
    it(`[${lang}] has a label for every reference_facts.status enum value`, () => {
      assertFullCoverage(ENUM_VALUES, dict.statusLabels.factStatus, 'statusLabels.factStatus');
    });

    it(`[${lang}] gives every reference_facts.status value a distinct label`, () => {
      assertNoLabelCollisions(ENUM_VALUES, dict.statusLabels.factStatus, 'reference_facts.status');
    });
  }
});

describe('GROUP_NODE_STATUS_LABELS', () => {
  // ConvenioGroup::STATUSES / ConvenioGroupCategory::STATUSES (plain varchar,
  // not a DB enum — see the migration comment on why — but a closed set):
  // hr-backend/app/Models/ConvenioGroup.php:31
  const ENUM_VALUES = ['needs_review', 'approved', 'rejected'];

  for (const [lang, dict] of Object.entries(DICTS)) {
    it(`[${lang}] has a label for every ConvenioGroup(Category) status value`, () => {
      assertFullCoverage(ENUM_VALUES, dict.statusLabels.groupNodeStatus, 'statusLabels.groupNodeStatus');
    });

    it(`[${lang}] gives every group/category status value a distinct label`, () => {
      assertNoLabelCollisions(ENUM_VALUES, dict.statusLabels.groupNodeStatus, 'group node status');
    });
  }
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
    'low_confidence.period_unsupported',
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
    // Sprint 13 (plan.md §D.12) — the five agent-engine reasons.
    'general_lane_blocked.question_prescreen',
    'general_lane_blocked.figure',
    'general_lane_blocked.entitlement_language',
    'general_lane_blocked.shape',
    'general_lane_blocked.ungrounded',
    'profile_incomplete.professional_group',
    'profile_incomplete.job_category',
    'profile_incomplete.seniority',
    'profile_incomplete.contract_type',
    'profile_incomplete.asserted_differs',
    'employee_requested_review.answer_reviewed',
    'employee_requested_review.declined_reviewed',
    'planner_escalated.off_domain',
    'planner_escalated.unsafe',
    'planner_escalated.unanswerable',
    'planner_escalated.needs_human_judgement',
    'planner_escalated.other',
    'tool_budget_exhausted.rounds',
    'tool_budget_exhausted.tool_calls',
    'tool_budget_exhausted.clarifications',
    'tool_budget_exhausted.wall_clock',
    'tool_budget_exhausted.malformed',
  ];

  it('has exactly 72 keys, matching EscalationExplainer::MATRIX', () => {
    expect(MATRIX_KEYS.length).toBe(72);
  });

  for (const [lang, dict] of Object.entries(DICTS)) {
    it(`[${lang}] has a label for every (reason.sub_outcome) pair in MATRIX`, () => {
      assertFullCoverage(MATRIX_KEYS, dict.statusLabels.subOutcome, 'statusLabels.subOutcome');
    });

    it(`[${lang}] has no stray keys beyond MATRIX (a renamed/removed sub_outcome left behind)`, () => {
      const stray = Object.keys(dict.statusLabels.subOutcome).filter((k) => !MATRIX_KEYS.includes(k));
      expect(stray, `statusLabels.subOutcome has keys not in MATRIX: ${stray.join(', ')}`).toEqual([]);
    });
  }

  // Collisions are NOT checked here: several sub-outcomes across different
  // reasons legitimately share a short label today (e.g. both
  // `salary_coverage_gap.no_convenio` and `reference_fact_coverage_gap.no_convenio`
  // say "Sin convenio asignado" — correct, since the table's other column
  // already shows `reason` and disambiguates them). Unlike the escalation-reason
  // badge (one column, must be unique), this is a two-column table.
});

// -----------------------------------------------------------------------------
// Sprint 12b item 6 (plan.md §4.4) — Analítica chart labels.
//
// Acceptance #2: "No raw internal key visible anywhere in Analítica". Every
// value that can reach a chart/legend/axis has a label in BOTH dictionaries,
// no two values share one label, and no label (nor the fallback) contains `_`.
//
// The three lists below are hand-copied from the cited backend sources (same
// "copy against copy" limit this file's header concedes), so the SCRAPE GUARD
// at the bottom diffs them against `hr-backend/app/**` itself when the sibling
// repo is present (it is not inside the frontend's Docker build context, so it
// skips there). The live-value sweep at CP-1 is the third check.
// -----------------------------------------------------------------------------

// `floor_decision.path`. 11 values are literals `'path' => '…'` in hr-backend/app
// (agent_*, pre_model_guard, reference_fact*, salary_*, general_knowledge); `prose`
// is the prose path's own value and `unknown` is DeflectionAnalytics' null bucket
// (DeflectionAnalytics.php:144).
const PATH_VALUES = [
  'salary_sql',
  'prose',
  'reference_fact',
  'reference_fact_composition',
  'salary_prose_crosspath',
  'general_knowledge',
  'agent_planner',
  'agent_ask_employee',
  'agent_finalize',
  'agent_figure_guard',
  'agent_budget',
  'pre_model_guard',
  'unknown',
];

// `authority_used` atoms: chunk enum (…131011_create_document_chunks_table.php:33),
// ReferenceFact::AUTHORITY_LEVEL, the general lane's `['general_knowledge']`, and
// DeflectionAnalytics' `none` bucket for an empty set.
const AUTHORITY_ATOMS = ['national_law', 'official_convenio', 'internal_hr_ruling', 'structured_reference', 'general_knowledge', 'none'];

// TopicLexicon::ANCHORS keys (hr-backend/app/Support/TopicLexicon.php).
const TOPIC_KEYS = [
  'vacaciones',
  'jornada',
  'permisos',
  'excedencia',
  'periodo_prueba',
  'trabajo_distancia',
  'horas_extra',
  'preaviso',
  'lactancia',
  'maternidad',
  'descanso',
  'festivos',
  'movilidad',
  'antiguedad',
  'despido',
  'ascensos',
];

describe('analyticsLabels (Sprint 12b item 6)', () => {
  const MAPS = {
    path: PATH_VALUES,
    authority: AUTHORITY_ATOMS,
    topic: TOPIC_KEYS,
  } as const;

  for (const [lang, dict] of Object.entries(DICTS)) {
    for (const [name, values] of Object.entries(MAPS)) {
      const labels = dict.analyticsLabels[name as keyof typeof MAPS] as Record<string, string>;

      it(`[${lang}] analyticsLabels.${name} has a label for every value`, () => {
        assertFullCoverage(values, labels, `analyticsLabels.${name}`);
      });

      it(`[${lang}] analyticsLabels.${name} has no stray keys (a renamed/removed value left behind)`, () => {
        const stray = Object.keys(labels).filter((k) => !values.includes(k));
        expect(stray, `analyticsLabels.${name} has keys not in the backend list: ${stray.join(', ')}`).toEqual([]);
      });

      it(`[${lang}] analyticsLabels.${name} gives every value a distinct label`, () => {
        assertNoLabelCollisions(values, labels, `analyticsLabels.${name}`);
      });

      it(`[${lang}] analyticsLabels.${name} never shows an internal key (no underscore, no blank)`, () => {
        for (const v of values) {
          const label = labels[v];
          expect(label.trim(), `${name}.${v} is blank`).not.toBe('');
          expect(label, `${name}.${v} label still contains "_"`).not.toContain('_');
        }
      });
    }
  }

  for (const [lang, dict] of Object.entries(DICTS)) {
    it(`[${lang}] the helpers resolve every known value, and a combined authority key joins its atoms`, () => {
      for (const v of PATH_VALUES) expect(analyticsPathLabel(dict, v)).toBe(dict.analyticsLabels.path[v as keyof typeof dict.analyticsLabels.path]);
      for (const v of TOPIC_KEYS) expect(analyticsTopicLabel(dict, v)).toBe(dict.analyticsLabels.topic[v as keyof typeof dict.analyticsLabels.topic]);
      const combo = analyticsAuthorityLabel(dict, 'national_law+official_convenio');
      expect(combo).toBe(`${dict.analyticsLabels.authority.national_law} + ${dict.analyticsLabels.authority.official_convenio}`);
    });

    it(`[${lang}] every pairwise combination of authority atoms renders without an underscore`, () => {
      const real = AUTHORITY_ATOMS.filter((a) => a !== 'none');
      for (const a of real) {
        for (const b of real) {
          if (a === b) continue;
          expect(analyticsAuthorityLabel(dict, [a, b].sort().join('+'))).not.toContain('_');
        }
      }
    });
  }

  it('an unmapped value falls back to a humanised string with no underscore (never raw snake_case)', () => {
    const warn = console.warn;
    console.warn = () => {};
    try {
      expect(analyticsPathLabel(es, 'brand_new_path')).toBe('Brand new path');
      expect(analyticsTopicLabel(es, 'some_new_topic')).toBe('Some new topic');
      expect(analyticsAuthorityLabel(es, 'national_law+brand_new_atom')).toBe('Ley + Brand new atom');
      expect(humanizeKey('a__b_c')).toBe('A b c');
      expect(humanizeKey('')).toBe('');
      for (const k of ['x_y_z', '_leading', 'trailing_', 'with space_and_underscore']) {
        expect(humanizeKey(k)).not.toContain('_');
      }
    } finally {
      console.warn = warn;
    }
  });
});

// SCRAPE GUARD — reads the backend sources this file's lists were copied from.
const BACKEND_APP = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'hr-backend', 'app');

function phpFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...phpFiles(full));
    else if (name.endsWith('.php')) out.push(full);
  }
  return out;
}

describe.skipIf(!existsSync(BACKEND_APP))('analyticsLabels vs the backend source (scrape guard; skipped without ../hr-backend)', () => {
  it("every `'path' => '<value>'` literal in hr-backend/app has a label", () => {
    const found = new Set<string>();
    for (const f of phpFiles(BACKEND_APP)) {
      for (const m of readFileSync(f, 'utf8').matchAll(/'path'\s*=>\s*'([a-z_]+)'/g)) found.add(m[1]);
    }
    expect(found.size, 'scrape found no path literals — the pattern or the repo layout changed').toBeGreaterThan(5);
    const unlabelled = [...found].filter((v) => !PATH_VALUES.includes(v));
    expect(unlabelled, `backend sets path value(s) with no label: ${unlabelled.join(', ')}`).toEqual([]);
  });

  it('every TopicLexicon::ANCHORS key has a label, and none is left over', () => {
    const src = readFileSync(join(BACKEND_APP, 'Support', 'TopicLexicon.php'), 'utf8');
    const block = src.slice(src.indexOf('const ANCHORS'), src.indexOf('];', src.indexOf('const ANCHORS')));
    const keys = [...block.matchAll(/^\s*'([a-z_]+)'\s*=>\s*\[/gm)].map((m) => m[1]);
    expect(keys.length, 'scrape found no ANCHORS keys').toBeGreaterThan(5);
    expect([...keys].sort()).toEqual([...TOPIC_KEYS].sort());
  });

  it('the authority atoms match the chunk enum and ReferenceFact::AUTHORITY_LEVEL', () => {
    const migration = readFileSync(
      join(BACKEND_APP, '..', 'database', 'migrations', '2026_06_20_131011_create_document_chunks_table.php'),
      'utf8',
    );
    const enumAtoms = [...(migration.match(/enum\('authority_level',\s*\[([^\]]+)\]/)?.[1] ?? '').matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
    expect(enumAtoms.length).toBeGreaterThan(0);
    for (const a of enumAtoms) expect(AUTHORITY_ATOMS, `chunk enum atom ${a} has no label`).toContain(a);

    const fact = readFileSync(join(BACKEND_APP, 'Models', 'ReferenceFact.php'), 'utf8');
    const level = fact.match(/AUTHORITY_LEVEL\s*=\s*'([a-z_]+)'/)?.[1];
    expect(level, 'ReferenceFact::AUTHORITY_LEVEL not found').toBeTruthy();
    expect(AUTHORITY_ATOMS).toContain(level);
  });
});
