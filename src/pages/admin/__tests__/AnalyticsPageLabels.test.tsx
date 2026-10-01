// @vitest-environment jsdom
//
// Sprint 12b item 6 / acceptance #2 — "No raw internal key visible anywhere in
// Analítica". Renders the real page with every raw internal value the backend
// can send (plus one it has never sent) and asserts what is actually on screen.
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../../../i18n/LocaleProvider';
import { es } from '../../../i18n/es';
import { en } from '../../../i18n/en';
import { AnalyticsPage } from '../AnalyticsPage';

const deflection = {
  period: { from: '2026-09-01', to: '2026-10-01' },
  summary: {
    answered: 10,
    escalated: 2,
    needs_category: 0,
    ask: 1,
    declined: 3,
    deflection_rate: 0.83,
    path_split: {
      salary_sql: 121,
      prose: 685,
      reference_fact_composition: 48,
      agent_planner: 13,
      brand_new_path: 1, // never sent by the backend yet — must still not render raw
    },
    authority_split: {
      none: 5,
      'national_law+official_convenio': 7,
      structured_reference: 3,
    },
  },
  hr_agent_replies: [],
  satisfaction: { up: 1, down: 0, rate: 1 },
  declined_by_day: [
    { date: '2026-09-30', declined: 2 },
    { date: '2026-10-01', declined: 1 },
  ],
};

const byFix = {
  period: { from: '2026-09-01', to: '2026-10-01' },
  by_fix: [
    { reason: 'low_confidence', sub_outcome: 'no_retrieval', fix_action: null, fix_surface: null, fix_link: null, card_count: 3, resolved_count: 1 },
  ],
  unexplained_count: 0,
  board_throughput: { by_agent: [], total_resolved: 1, converted_to_document: 0, conversion_rate: null },
  fence_outcomes: [],
};

const clusters = {
  run_date: '2026-10-01',
  clusters: [],
  topic_breakdown: { periodo_prueba: 9, horas_extra: 4, trabajo_distancia: 2 },
  unanswered_ranking: [],
  declined_ranking: [],
};

function respond(url: string) {
  const body = url.includes('deflection') ? deflection : url.includes('escalations-by-fix') ? byFix : clusters;
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) } as unknown as Response);
}

describe('AnalyticsPage — no raw internal value on screen (Sprint 12b item 6)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn((url: string) => respond(String(url))));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    window.localStorage.removeItem('hr-locale');
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders chart labels, headings and axis as Spanish prose', async () => {
    render(
      <LocaleProvider>
        <AnalyticsPage />
      </LocaleProvider>,
    );
    expect(await screen.findByText(es.analyticsPage.pathSplitHeading)).toBeInTheDocument();

    // path legend
    expect(screen.getByText('Preguntas sobre el sueldo')).toBeInTheDocument();
    expect(screen.getByText('Preguntas resueltas con el texto del convenio o la ley')).toBeInTheDocument();
    expect(screen.getByText('Preguntas que combinan varios datos de referencia')).toBeInTheDocument();
    expect(screen.getByText('Brand new path')).toBeInTheDocument(); // humanised fallback
    // authority legend (combined key joins its atoms)
    expect(screen.getByText('Ley + Convenio')).toBeInTheDocument();
    expect(screen.getByText('Sin fuente documental')).toBeInTheDocument();
    expect(screen.getByText('Dato de referencia')).toBeInTheDocument();
    // topics
    expect(screen.getByText('Periodo de prueba')).toBeInTheDocument();
    expect(screen.getByText('Horas extraordinarias')).toBeInTheDocument();
    expect(screen.getByText('Trabajo a distancia')).toBeInTheDocument();

    // Nothing the user can read contains an internal identifier: snake_case, the
    // `YYYY-MM-DD` axis, the `§` section marks, or the old "(path_split)" suffixes.
    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/[a-z]+_[a-z]+/);
    expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(text).not.toContain('§');
    expect(text).not.toMatch(/deflection/i);
    // `title` tooltips on the bars mirror the label, so they are checked too.
    for (const el of Array.from(document.querySelectorAll('[title]'))) {
      expect(el.getAttribute('title') ?? '').not.toMatch(/_/);
    }
  });
});

describe('analyticsPage chrome has no internal identifiers (both locales)', () => {
  for (const [lang, dict] of Object.entries({ es, en })) {
    it(`[${lang}] no analyticsPage / analytics view string shows a snake_case name, a § mark or "deflection"`, () => {
      const strings = [
        ...Object.entries(dict.analyticsPage),
        ['adminShell.views.analytics.description', dict.adminShell.views.analytics.description],
      ] as [string, string][];
      const offenders = strings.filter(([, v]) => /[a-z]+_[a-z]+|§|deflection/i.test(v)).map(([k]) => k);
      expect(offenders, `identifier-like text in: ${offenders.join(', ')}`).toEqual([]);
    });
  }
});
