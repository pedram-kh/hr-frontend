import type { Citation } from '../../lib/api';

// Maps a citation's authority_level to a design-system status badge. The badge is
// color + text (never color-only) per design-system §6.
function authorityBadge(level: string | null): { cls: string; label: string } {
  switch (level) {
    case 'national_law':
      return { cls: 'badge-national', label: 'Ley nacional' };
    case 'official_convenio':
      return { cls: 'badge-verified', label: 'Convenio' };
    case 'internal_hr_ruling':
      return { cls: 'badge-review', label: 'Resolución RR. HH.' };
    default:
      return { cls: 'badge-historical', label: 'Fuente' };
  }
}

function pageLabel(from: number | null, to: number | null): string {
  if (from == null) return '';
  if (to != null && to !== from) return `p. ${from}–${to}`;
  return `p. ${from}`;
}

// The numbered source list under an answer. Every surfaced answer cites source
// document + page; an answer with no citations never reaches the employee, so
// this list is never empty on an answered turn (Sprint 2b-1).
export function CitationList({ citations }: { citations: Citation[] }) {
  if (citations.length === 0) return null;

  return (
    <div className="citation-list">
      <div className="citation-list-label">Fuentes</div>
      <ol className="citation-items">
        {citations.map((c, i) => {
          const badge = authorityBadge(c.authority_level);
          return (
            <li key={`${c.chunk_id}-${i}`} className="citation">
              <div className="citation-head">
                <span className="citation-title">{c.document_title ?? `Documento ${c.document_id}`}</span>
                <span className={`badge ${badge.cls}`}>{badge.label}</span>
                <span className="citation-page">{pageLabel(c.page_from, c.page_to)}</span>
              </div>
              {c.snippet && <p className="citation-snippet">{c.snippet}…</p>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
