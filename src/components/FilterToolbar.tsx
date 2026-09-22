import { useState } from 'react';
import type { ReactNode } from 'react';

// Sprint 11a (§C.2) — a layout shell, not a state manager. Every screen keeps
// its own filter state, its own API params, and its own <select>/<input>/
// checkbox JSX verbatim, passed in as `children`; this component only
// supplies the outer chrome (search/primary slot, a "Filtros" disclosure with
// an active-count badge, "Limpiar filtros", and the always-visible total) so
// every filtered admin screen looks and behaves the same way around the edges
// without touching a single screen's own fetch/query-building logic.
//
// A screen with no filter controls at all (`children` omitted — Review's AI
// tagging / Groups / Vocabulary / Expiry tabs, §C.1) renders no "Filtros"
// button and no disclosure region: "apply everywhere" means consistent
// chrome, not inventing filters that don't exist.
// `object`, not `Record<string, unknown>` — every caller passes its own
// closed filter-state interface (e.g. `HistoryFilters`), which has no index
// signature, so TS won't structurally assign it to a `Record` parameter type.
// This function is the only place that needs the values, so it casts once.
function countActive(filters: object): number {
  return Object.values(filters as Record<string, unknown>).filter(
    (v) => v !== undefined && v !== null && v !== '' && v !== false,
  ).length;
}

export function FilterToolbar({
  primary,
  filters,
  onClear,
  total,
  children,
}: {
  /** Always-visible, left-aligned content that is NOT a filter (search box, upload button, an active deep-link chip). */
  primary?: ReactNode;
  /** Read-only — used only to compute the active-filter count badge. Never written by this component. */
  filters?: object;
  /** Resets every filter in `children` back to its default. Only shown once at least one filter is active. */
  onClear?: () => void;
  /** Always-visible, right-aligned total (e.g. "N documents"). Rendered as-is, unchanged from today's `.docs-total` pattern. */
  total?: ReactNode;
  /** The screen's own, unmodified filter controls. */
  children?: ReactNode;
}) {
  // Defaults to visible so wrapping a screen in this component changes
  // nothing about what's on screen today — the toggle only adds the OPTION
  // to hide filters, never hides them by default.
  const [open, setOpen] = useState(true);
  const hasFilterControls = Boolean(children);
  const activeCount = filters ? countActive(filters) : 0;

  return (
    <div className="filter-toolbar">
      <div className="docs-toolbar filter-toolbar-row">
        {primary}
        {hasFilterControls && (
          <button
            type="button"
            className="btn btn-ghost filter-toolbar-toggle"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            Filtros
            {activeCount > 0 && <span className="filter-toolbar-badge">{activeCount}</span>}
          </button>
        )}
        {hasFilterControls && activeCount > 0 && onClear && (
          <button type="button" className="btn btn-ghost" onClick={onClear}>
            Limpiar filtros
          </button>
        )}
        {total}
      </div>
      {hasFilterControls && open && <div className="docs-toolbar filter-toolbar-filters">{children}</div>}
    </div>
  );
}
