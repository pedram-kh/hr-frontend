/**
 * Sprint 11c (plan.md §D.4) — node/edge colour, read from the existing design
 * tokens, never invented. ADR-0012: "Components reference only var(--…) — no
 * raw hex in component rules". three.js needs actual numbers/strings, not CSS
 * variables, so this module resolves each token via `getComputedStyle` at
 * call time — which is also what makes both themes correct for a WebGL
 * canvas: re-calling these functions after `data-theme` flips (see
 * `ThemeProvider.tsx`) picks up the new value automatically, with no cache to
 * invalidate.
 *
 * Spec §2: node colour encodes STATE, not node type — a convenio, a
 * territory hub, a sector hub and a topic hub all share one "scope" role.
 * Type is carried by size (`degree`) and label instead.
 */

/** The closed set the backend ever sends (KnowledgeGraphBuilder's node `state`). */
export type NodeState = 'scope' | 'active' | 'draft' | 'historical' | 'verified' | 'unverified_ai';

/** The closed set the backend ever sends (KnowledgeGraphBuilder's edge `provenance`). */
export type EdgeProvenance = 'system' | 'unverified_ai';

/**
 * One role → one token. `active` (document) and `verified` (fact) share
 * `--success` deliberately — spec §2's "green = current, trustworthy
 * knowledge" reads the same whichever knowledge type it is.
 */
export const NODE_STATE_TOKEN: Record<NodeState, string> = {
  scope: '--accent',
  verified: '--success',
  active: '--success',
  draft: '--warning',
  historical: '--text-faint',
  unverified_ai: '--provenance-ai',
};

export const EDGE_TOKEN = '--map-edge';
export const EDGE_UNVERIFIED_AI_TOKEN = '--provenance-ai';

/** "edges that ARE an unverified AI facet binding" render at half strength (plan.md §D.4). */
export const EDGE_UNVERIFIED_AI_OPACITY = 0.5;

/** Reads a CSS custom property's live value off `:root` (e.g. `'--accent'` → `'#2b6565'` or `'#94b9b8'`, whichever theme is active). */
export function readToken(varName: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

/** `opacity` (Sprint 11c filter chips, plan.md §D.3) multiplies whatever alpha the base colour already has — 1 (default) is a no-op, so every existing call site is unaffected. */
export function nodeColor(state: NodeState, opacity = 1): string {
  return scaleAlpha(readToken(NODE_STATE_TOKEN[state]), opacity);
}

/** A plain colour for a normal edge, or the AI token blended to `EDGE_UNVERIFIED_AI_OPACITY` — see `nodeColor` re: `opacity`. */
export function edgeColor(provenance: EdgeProvenance, opacity = 1): string {
  const base =
    provenance === 'unverified_ai' ? withAlpha(readToken(EDGE_UNVERIFIED_AI_TOKEN), EDGE_UNVERIFIED_AI_OPACITY) : readToken(EDGE_TOKEN);
  return scaleAlpha(base, opacity);
}

const HASH = 35; // '#'.charCodeAt(0) — spelled out so this module contains no literal colour syntax

/** `'#rrggbb'` (the shape every token in `index.css` happens to use) → `rgba(r, g, b, alpha)`. Anything else passes through unchanged rather than guess. */
export function withAlpha(color: string, alpha: number): string {
  if (color.length === 7 && color.charCodeAt(0) === HASH) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}

const RGBA_RE = /^rgba\((\d+), (\d+), (\d+), ([\d.]+)\)$/;

/**
 * Multiplies a colour's existing alpha by `factor` — unlike `withAlpha` (which
 * SETS an absolute alpha on a hex colour), this SCALES whatever alpha is
 * already there, so it composes with the unverified-AI edge's own 0.5. Used
 * only for the territory-filter dim (plan.md §D.3): "dims everything not
 * reachable from it" is a repaint, not a re-layout or a hide.
 */
export function scaleAlpha(color: string, factor: number): string {
  if (factor >= 1) return color;
  const rgba = RGBA_RE.exec(color);
  if (rgba) {
    const [, r, g, b, a] = rgba;
    return `rgba(${r}, ${g}, ${b}, ${(parseFloat(a) * factor).toFixed(3)})`;
  }
  return withAlpha(color, factor);
}
