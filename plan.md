# Design-system adoption — plan

Visual refactor of `hr-frontend` to the design system in `hr-docs/design-system.md`
(per ADR-0012: vanilla CSS + tokens, no Tailwind). **No behavior, routing, data, or
API changes.** Only addition is the Inter font package. All changes stay in `hr-frontend`.

## What I read
- `hr-docs/design-system.md` §§1–8 (tokens, type scale, components, a11y floor, voice).
- `hr-docs/architecture/decisions/0012-vanilla-css-design-tokens.md`.
- Current `src/index.css` (hardcoded hex, tag-level rules) and the two screens
  (`LoginPage`, `DocumentsPage` + `DocumentDetailPanel`), shells, auth context, api types.

## Steps (build only after approval)

### 1. Tokens + theming — `src/index.css`
- Add a full token layer in `:root` (light values): brand/accent, semantic state
  (danger/warning/success/info/neutral + `-bg` tints), surfaces & text, border,
  spacing scale (`--space-1..8`), radii (`--radius-sm/md/lg`), shadows
  (`--shadow-sm/--shadow-panel`), and type tokens (`--text-xs..xl` with size/line-height).
- Add a `[data-theme="dark"]` block overriding surface/text/border + state `-bg` tints
  and brighter state foregrounds per §2; accent + state *roles* stay constant.
- Re-express **every** existing rule against `var(--…)` — remove all raw hex from
  component rules. Keep existing semantic classNames working: `card`, `muted`, `error`,
  `centered`, `shell*`, `docs-*`, `docs-table`, `badge-*`, `detail`, `kv`, `timeline`,
  `src-*`, `page*`, `reassign`, `review-task`. No class renames.

### 2. Component classes (§5)
- `.btn` base + `.btn-primary` / `.btn-secondary` / `.btn-ghost` / `.btn-danger`.
- `.card`, `.panel` (drawer), `.well` (source/extracted text).
- `.input`, `.select`, `.textarea`, `.field` (label + control + help text).
- `.badge` base + status variants. Map existing → new roles:
  `badge-conflict`→danger, `badge-review`→warning, `badge-warn`/`badge-empty`→warning
  (distinct icon), `badge-verified`→success, `badge-national`→info,
  `badge-historical`→neutral. Quiet colored foreground on tint, not saturated fills.
- `.docs-table` per spec: sticky uppercase header on `--surface-raised`, `--text-sm`
  cells, row hover, selected row `--accent-weak` + 2px `--accent` left border,
  numeric/right-aligned columns `tabular-nums`.
- `.timeline` / `.timeline-item` with origin-colored source dot
  (`filename_parse` neutral, `system` warning, `admin_manual` accent; keep `ai_agent`),
  action text + actor/time + old→new value.
- `.facet` scope chips (faint label + value on `--surface-raised`, `--radius-sm`).

### 3. Load Inter
- `npm i @fontsource/inter`; import weights 400/500/600/700 once at app entry
  (`src/main.tsx`). Set body font stack to Inter + system fallback. Apply type scale
  (§3), `tabular-nums` on data.

### 4. Theme toggle (in-memory, §6 / ADR-0012)
- New `ThemeProvider` (React context, **no** localStorage/sessionStorage): initialize
  from `prefers-color-scheme`, then honor explicit user choice in state; write
  `data-theme` onto `<html>` via effect.
- Add an unobtrusive light/dark toggle button (`.btn-ghost`) in the admin header
  (and employee header for consistency). Wrap provider in `main.tsx`.

### 5. Accessibility floor (§6)
- Global `:focus-visible` → 2px `--accent` outline, 2px offset; never bare `outline:none`.
- ≥36px hit targets on `.btn` and row actions.
- Wrap transitions in `@media (prefers-reduced-motion: no-preference)`.
- Every status badge keeps text + icon (never color-only); verify AA both themes.

### 6. Refactor screens (no functional change)
- **LoginPage**: wrap controls in `.field` + `.input`, primary action `.btn .btn-primary`,
  "use a different email" as `.btn .btn-ghost`. Replace bare `form/input/button`
  tag-level styling reliance with classes.
- **DocumentsPage**: `.docs-table` markup classes, status `.badge-*` variants with
  icons, `.btn`/`.select` for toolbar, `.field` for filter. Empty state reads as health.
- **DocumentDetailPanel**: `.panel` drawer, `.facet` chips for scope tags, `.timeline`
  for provenance, `.well` for source/extracted page text, confirm/re-assign as
  `.btn-primary` / `.btn-secondary`.

### 7. Copy pass (§7, light touch — visible words only)
- Errors say what happened + how to fix (e.g. non-PDF message).
- Empty review state: "No documents need review" framing.
- Action buttons keep their name through the flow (Confirm tags → Tags confirmed).
- Sentence case; end-user-facing labels.

## Constraints honored
- No Tailwind, no CSS-in-JS, no component library. No routing/state/data/API changes.
- `tsc -b` + `eslint .` stay clean. Theme state in memory only.

## Verification (after build)
- `npm run build` (tsc + vite) and `npm run lint` clean.
- Login + Documents render in light & dark; focus visible throughout; badges/timeline
  read clearly. Screenshots if producible. Write a short design-adoption note.

## Open assumptions (flag, not blockers)
- `@fontsource/inter` per-weight CSS imports (400/500/600/700), not the variable package,
  since the guide names `@fontsource/inter`.
- Keep `badge-warn` as the empty-text variant (components reference it) and add
  `badge-empty`/`badge-verified`/`badge-historical` aliases for the full §5 set.
- Theme toggle added to both shell headers (admin primarily; employee for parity).
