import type { PaginationMeta } from '../../lib/usePaginatedQuery';
import { useT } from '../../i18n/context';

/**
 * Sprint 8 — the pager JSX itself, extracted alongside `usePaginatedQuery`
 * (same 4x-copy-pasted origin in `ReviewQueuePage.tsx`). Always rendered, not
 * hidden on a single page — "page 1 of 1" is itself visible proof there's
 * nothing hidden past the cap (the Sprint 7g Documents-page fix's own framing).
 */
export function Pager({ meta, setPage }: { meta: PaginationMeta; setPage: (fn: (p: number) => number) => void }) {
  const t = useT();
  return (
    <div className="docs-pager">
      <button className="btn btn-ghost" disabled={meta.current_page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
        {t.pager.prevButton}
      </button>
      <span className="muted">{t.pager.pagePrefix} {meta.current_page} {t.pager.pageOfConnector} {meta.last_page}</span>
      <button className="btn btn-ghost" disabled={meta.current_page >= meta.last_page} onClick={() => setPage((p) => p + 1)}>
        {t.pager.nextButton}
      </button>
    </div>
  );
}
