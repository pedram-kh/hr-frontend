// Sprint 7g Item 2 — the unified admin deep-link hash scheme, ADDITIVE on top
// of (never replacing) the pre-existing bare `#doc=<uuid>` compat form that
// `DocumentsPage` reads/writes itself (Sprint 7e).
//
//   #view=<view>&tab=<tab>&fact=<uuid>&emp=<uuid>&convenio=<id>
//
// `EscalationExplainer`'s `fix_link` values (Sprint 7g Item 1, ADR-0029) are
// written against this exact scheme. Every key is optional and independent —
// a caller reads only the ones relevant to the surface it owns.
export interface AdminHash {
  view: string | null;
  tab: string | null;
  fact: string | null;
  emp: string | null;
  convenio: number | null;
}

/** Parse `window.location.hash` once, at mount time — deep links are a one-shot initial-selection, never a live subscription. */
export function parseAdminHash(hash: string = window.location.hash): AdminHash {
  const out: AdminHash = { view: null, tab: null, fact: null, emp: null, convenio: null };
  const raw = hash.replace(/^#/, '');
  for (const part of raw.split('&')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq);
    const value = decodeURIComponent(part.slice(eq + 1));
    if (value === '') continue;
    if (key === 'view') out.view = value;
    else if (key === 'tab') out.tab = value;
    else if (key === 'fact') out.fact = value;
    else if (key === 'emp') out.emp = value;
    else if (key === 'convenio') {
      const n = Number(value);
      if (Number.isFinite(n)) out.convenio = n;
    }
  }
  return out;
}
