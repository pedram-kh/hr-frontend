# hr-frontend

React + Vite + TypeScript SPA for the HR platform — the employee chat UI and the
admin console. Talks to `hr-backend` over HTTP. See `AGENTS.md` and the canonical
specs in `hr-docs`.

> **Current:** email-OTP login → employee chat (Sprint 2b) and the admin console.
> The admin console has **Knowledge → Map** (the lens hierarchy + coverage gaps +
> document card), **Knowledge → Documents** (ingestion/verification table),
> **Escalations** (the Sprint-4 board + card drawer), **Settings → Answer model**,
> and — Sprint 5 — **Directory**, **History**, and **Admins** (each nav item gated
> on its ability; the server enforces regardless).

## Requirements

- Node 20+ (developed on Node 24)
- `hr-backend` running on `http://localhost:8000`

## Setup

```bash
npm install
cp .env.example .env          # VITE_API_BASE_URL=http://localhost:8000
npm run dev                   # http://localhost:5173
```

## What's here

- **Centralized API client** (`src/lib/api.ts`) — base URL from
  `VITE_API_BASE_URL` (never hardcoded); attaches the `Bearer` token; clears it on 401.
- **Auth** (`src/auth/`) — token stored in `localStorage`; on boot, `/me` resolves
  the identity; daily (~24h) session via the Sanctum token.
- **Login flow** (`src/pages/LoginPage.tsx`) — enter email → request code → enter
  the 6-digit code → store token → redirect. In local dev, read the code from
  MailHog at <http://localhost:8025>.
- **Two separate protected route trees** — employee chat shell at `/app`, admin
  console shell at `/admin`. Routing target after login is chosen by `account_type`.

### Knowledge Center (Sprint 3, `src/pages/admin/`)

- **`Hierarchy.tsx`** — the single reusable lens-hierarchy component (ADR-0001) in
  two forms from one data model: an indented **list** and a hand-rolled **SVG
  graph** (absolutely-positioned HTML node boxes + an SVG connector overlay with
  deterministic coordinates — no layout dependency, ADR-0012). Lens-driven, lazy
  children, leaf-opens-card, coverage-gap node badges. Exports `GAP_META` (the
  shared gap label/colour map: a hole reads `--danger`/`--warning`, a staleness/
  scope note reads `--neutral`).
- **`KnowledgeMapPage.tsx`** — the **Knowledge → Map** view: lens + graph/list
  segmented controls, the coverage-gap summary bar, the hierarchy, and the card.
- **`DocumentDetailPanel.tsx`** — the document card: scope facets (territory/sector
  marked *derived*), topics, chunk health, lineage, the provenance timeline (with
  the reserved `ai_agent` dot colour), the real-PDF viewer, the read-only
  **sandbox** ("test a question against this document" — persists nothing), and the
  bounded-edit UI (FK pickers, the scope-warning modal, the id-94 retag flow). Edit
  affordances are gated on the `knowledge.edit` ability (`canEditKnowledge()` from
  `/me`'s `abilities`); an auditor sees a read-only notice (colour **and** text).

### Escalation board + two-way chat (Sprint 4, `src/pages/admin/` + `src/pages/chat/`)

- **`EscalationBoardPage.tsx`** — the Kanban board (New → Assigned → In Progress →
  Resolved), filters (status/reason/`mine`), opens the card drawer. Assign/move/reply/
  resolve affordances are gated on the **`escalation.work`** ability
  (`canWorkEscalations()` from `/me`); an auditor sees a read-only board.
- **`EscalationCardDrawer.tsx`** — the card detail: the **card-scoped** conversation
  bubbles + the reused `TracePanel` (why it escalated), the triage controls
  (assign/status), the **reply** box (writes an `hr_agent` turn), and the
  **Save-as-knowledge** flow — resolution + optional convert + the required
  approved-topic pick + the **scope-confirm modal** + the conflict-block message.
- **`ChatScreen.tsx`** (employee) — now **hydrates from `GET /chat/session` on mount
  and polls (~25 s) / re-hydrates on window focus**, so a human reply appears in the
  employee's chat. A human turn renders as a distinct, clearly-attributed bubble
  (`chat-bubble--agent`, "Respuesta de Recursos Humanos (persona)") — never mistakable
  for a bot answer, never showing the admin's identity.
- **`DocumentDetailPanel.tsx`** — for an `internal_hr_ruling` it shows the badge + the
  "created from escalation #N by [agent]" provenance with a **back-link** to the card
  (deep-links into the board via `AdminShell`).

The only new visual primitives are the `internal_hr_ruling` badge and the
`chat-bubble--agent` variant (one class/token each, per the design-system rule).

### Access control — Directory / Admins / History (Sprint 5, `src/pages/admin/`)

The UI **only hides** on the new abilities (`canManageDirectory` /
`canManageAdmins` / `canViewAllHistory` from `/me`'s `abilities`); the server
enforces every endpoint (ADR-0018). `AdminShell` shows each nav item only when
the ability is held. No new visual primitives — reuses the table, drawer,
modal, badge, `kv`, timeline, and the chat `CitationList`/`TracePanel`.

- **`DirectoryPage.tsx`** — searchable/filterable employee list + a create/edit
  **drawer** with FK pickers (convenio → convenio-scoped category, territory),
  the **email-edit warning** + the **409 confirm modal**, a **staleness badge** +
  **mark-reviewed**, and the **audit-log timeline**.
- **`CsvImportPanel.tsx`** — the two-phase CSV flow: upload → **dry-run report**
  (per-row pass/fail, nothing written) → **apply** the valid rows. Bad rows are
  shown, never hidden.
- **`AdminsPage.tsx`** — list/create admins, **role checkboxes** (the four roles
  via `syncRoles`), and **deactivate/reactivate** (deactivation revokes access).
- **`HistoryPage.tsx`** — the gated full-conversation browser: list + filters
  (convenio/territory/outcome/reason/date) + content **search**, and a read-only
  **conversation drawer** (opening it writes the server-side access-log row).
  Read-only for everyone — acting routes through the escalation board.
- **`EscalationCardDrawer.tsx`** — now shows a "no permission" notice for the
  conversation when the server reports `conversation_restricted` (knowledge_editor).

## Scripts

```bash
npm run dev      # dev server
npm run build    # tsc -b && vite build
npm run lint     # eslint
```
