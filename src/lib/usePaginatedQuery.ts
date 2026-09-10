import { useCallback, useEffect, useState } from 'react';
import type { Paginated } from './api';

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  total: number;
}

/**
 * Sprint 8 (build-authorization requirement) — extracted from the 4
 * copy-pasted `page`/`meta`/`refresh`/`useEffect`/pager blocks that used to
 * live inline in `ReviewQueuePage.tsx`'s `TaggingQueue`/`ReferenceFactsQueue`/
 * `VocabularyQueue`/`ExpiryQueue` (and now the new Sprint-8 tabs/pages too).
 *
 * `fetcher` must resolve to the standard Laravel `Paginated<T>` envelope
 * (`{data, current_page, last_page, total}`) for the requested page. Any
 * extra top-level fields a given endpoint returns alongside the paginated
 * list (e.g. `can_approve` on the vocabulary-proposals response) are the
 * caller's own concern — unwrap them in the `fetcher` closure and track them
 * with a separate `useState`, exactly as `VocabularyQueue` already does.
 *
 * `depsKey` is a single opaque string/number capturing anything else the
 * `fetcher` closure varies on (filters, month, verdict, …), so a filter
 * change re-fetches from page 1 the same way the pre-extraction blocks did.
 * A single scalar (not a spread array) is deliberate: the lint rule for
 * `useCallback` dependency arrays requires a static array literal, and a
 * `[page, ...deps]` spread doesn't qualify — join multi-value filters into
 * one string (e.g. `` `${month}|${verdict}` ``) at the call site instead.
 */
export function usePaginatedQuery<T>(
  fetcher: (page: number) => Promise<Paginated<T>>,
  depsKey: string | number = '',
) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<PaginationMeta>({ current_page: 1, last_page: 1, total: 0 });

  // `fetcher` is intentionally excluded from the dependency array: callers
  // pass a fresh closure every render, but it only ever varies on `page`
  // and whatever is already summarized in `depsKey` — including it here
  // would refetch on every render regardless of whether anything real
  // changed (defeating the whole point of memoizing this).
  const refresh = useCallback(
    (pageOverride?: number) => {
      setLoading(true);
      setError(null);
      fetcher(pageOverride ?? page)
        .then((p) => {
          setRows(p.data);
          setMeta({ current_page: p.current_page, last_page: p.last_page, total: p.total });
        })
        .catch((e) => setError(String((e as Error).message ?? e)))
        .finally(() => setLoading(false));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page, depsKey],
  );

  useEffect(() => refresh(), [refresh]);

  return { rows, setRows, loading, error, page, setPage, meta, refresh };
}
