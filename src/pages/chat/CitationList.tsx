import type { Citation } from '../../lib/api';
import { useT } from '../../i18n/context';
import type { Dict } from '../../i18n/es';

// Maps a citation's authority_level to a design-system status badge. The badge is
// color + text (never color-only) per design-system §6.
function authorityBadge(
  t: Dict,
  level: string | null,
  isSalaryTable?: boolean,
  isReferenceFact?: boolean,
): { cls: string; label: string } {
  if (isSalaryTable) {
    return { cls: 'badge-verified', label: t.citationList.salaryTableBadge };
  }
  // A verified structured reference fact (Sprint 7c) — quoted exactly, cited to
  // its source with chunk_id = null, beside the salary-table branch. Bounded at
  // structured_reference: it can never outrank the convenio.
  if (isReferenceFact) {
    return { cls: 'badge-verified', label: t.citationList.referenceFactBadge };
  }
  switch (level) {
    case 'national_law':
      return { cls: 'badge-national', label: t.citationList.nationalLawBadge };
    case 'official_convenio':
      return { cls: 'badge-verified', label: t.citationList.officialConvenioBadge };
    case 'internal_hr_ruling':
      return { cls: 'badge-review', label: t.citationList.internalHrRulingBadge };
    default:
      return { cls: 'badge-historical', label: t.citationList.sourceBadge };
  }
}

function pageLabel(t: Dict, from: number | null, to: number | null): string {
  if (from == null) return '';
  if (to != null && to !== from) return `${t.citationList.pagePrefix} ${from}–${to}`;
  return `${t.citationList.pagePrefix} ${from}`;
}

// The numbered source list under a chat answer. The list renders in array order,
// and the backend renumbers the in-text [Fuente N] markers to that exact order
// (the cited subset, 1..M) — so marker N always resolves to the Nth item here,
// 1:1 (Sprint 2b-2 §7). A prose answer with no citations never reaches the
// employee; a salary answer cites the salary-table source document (chunk_id = null).
export function CitationList({ citations }: { citations: Citation[] }) {
  const t = useT();
  if (citations.length === 0) return null;

  return (
    <div className="citation-list">
      <div className="citation-list-label">{t.citationList.sourcesLabel}</div>
      <ol className="citation-items">
        {citations.map((c, i) => {
          const badge = authorityBadge(t, c.authority_level, c.is_salary_table, c.is_reference_fact);
          const page = pageLabel(t, c.page_from, c.page_to);
          const key = c.chunk_id ?? (c.is_reference_fact ? 'fact' : 'salary');
          return (
            <li key={`${key}-${c.document_id}-${i}`} className="citation">
              <div className="citation-head">
                <span className="citation-title">
                  {c.document_title ?? `${t.citationList.documentFallbackPrefix} ${c.document_id}`}
                </span>
                <span className={`badge ${badge.cls}`}>{badge.label}</span>
                {page && <span className="citation-page">{page}</span>}
              </div>
              {c.snippet && <p className="citation-snippet">{c.snippet}…</p>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
