# hr-frontend

React + Vite + TypeScript SPA for the HR platform — the employee chat UI and the
admin console. Talks to `hr-backend` over HTTP. See `AGENTS.md` and the canonical
specs in `hr-docs`.

> **Current:** email-OTP login → employee chat (Sprint 2b) and the admin console.
> The admin console has **Knowledge → Map** (the lens hierarchy + coverage gaps +
> document card), **Knowledge → Documents** (ingestion/verification table),
> **Escalations** (the Sprint-4 board + card drawer), **Settings → Answer model**,
> — Sprint 5 — **Directory**, **History**, and **Admins**, — Sprint 6 —
> **Seguridad → Guardarraíles** (the additive, raise-only guardrail console;
> writes super_admin-only, auditor read-only), and — Sprint 7a — **Review** (the
> messy-tail AI-tagging / vocabulary-proposals / expiry hub, with the fuchsia
> `--provenance-ai` signal for unverified-AI content). Each nav item is gated on
> its ability; the server enforces regardless.

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
- **`ReferenceFactPanel.tsx` / `ReferenceFactCreatePanel.tsx`** *(Sprint 7b-1,
  ADR-0021)* — Structured Reference Knowledge. A `reference_fact` leaf in
  `Hierarchy.tsx` is a **distinct-badged** leaf (`.badge-reference` — info-toned,
  **not** fuchsia; fuchsia stays reserved for unverified AI in 7b-2) that opens
  the **fact card** (value, raw_values, derived scope, source link + locator,
  topic, validity, the visible **authority lock**, the append-only provenance
  timeline) with the **verify** action and a bounded edit (the scope-edit 409
  confirm). The **create** panel is a two-column reader + form: read a
  `reference_source` (`.docx`/`.xlsx`) content on the left, enter a scoped fact on
  the right — convenio → derived territory/sector display, convenio-scoped job
  category, approved topic, value/raw, validity, optional source link + locator;
  authority is **locked** to `structured_reference` (no higher option). Both gated
  on `knowledge.edit`; a new fact lands **needs review** (inert until verified).
- **AI-segmented facts in the fact card + the review queue** *(Sprint 7b-2,
  ADR-0022)* — the `ai_agent` lane lights the **fuchsia** (`--provenance-ai`,
  reserved-and-unlit since 7b-1): an AI-proposed fact (`source==='ai_agent' &&
  status==='needs_review'`) renders fuchsia-accented with an **AI** pill, a notice
  showing `confidence` + structured `uncertainty`, a **possible version/duplicate**
  notice (linking the `duplicate_of` sibling — **in 7d that notice becomes an
  action**, see the comparison surfaces below), and — the safety defense — the exact
  **source line** (`source_excerpt`, the `ÁLAVA › COEAS ÁLAVA › Grupo 1: …` trail)
  inline so the reviewer checks the scope against the quote. Actions: **verify
  proposal** / **fix then verify** / **reject** / **re-segment source** (all
  `knowledge.edit`). `ReviewQueuePage.tsx` gains a **"Reference facts"** tab — the
  **uncertain-first** queue (uncertainty, then ascending confidence) with the value,
  scope, group, confidence, and uncertainty/duplicate flags. On verify the fuchsia
  reverts; the AI origin persists only as the `ai_agent` provenance dot.

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

> **Reference-fact answer + composition in chat (Sprint 7c, ADR-0023) — additive,
> reuses the salary-citation rendering.** `CitationList.tsx` shows a **"Dato de
> referencia"** badge for a `structured_reference` fact citation (`is_reference_fact`,
> `chunk_id = null` — the salary-citation shape), and renders the **multi-source**
> composition set (the fact + the governing convenio chunks) in the model's citation
> order so `[Fuente N]` stays 1:1. `TracePanel.tsx` adds a **reference-fact** step
> (matched fact, scope tier, validity, `structured_reference`) and a **composition**
> step (governing-prose count; a same-point **conflict** is shown as *escalates, no
> mezcla* — the convenio governs). The `MessageTrace`/`Citation` types gain the
> additive `reference_fact` / `composition` blocks and `is_reference_fact` flag.

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

### Guardrails console (Sprint 6, `src/pages/admin/GuardrailsPage.tsx`, ADR-0019)

The admin layer over the hardcoded baseline — **additive, raise-only**. The nav
item (**Seguridad → Guardarraíles**) is visible to any admin; the page gates its
own write affordances on the server-provided `can_manage` (`guardrails.manage` /
super_admin), so **auditor is read-only**. No new visual primitives — reuses the
`card`, `field`, `input`, `badge`, `kv`, and table styles.

- **Five knobs**, each showing the **inline hardcoded floor** and the **effective**
  value: the retrieval/confidence/router **thresholds** (with **client
  reject-below-floor** for fast feedback — the server is authoritative — and the
  Check-C-is-a-tiebreaker honesty note); the **add-only** blocked-topics list (+
  off-domain kind); the **off-domain message**; the length-capped **tone** textarea
  with the "style only, can't bypass grounding" helper; and the **convert-by-reason**
  checkboxes with `sensitive_topic` **locked**.
- A **change-history** panel (read-only) over `guardrail_config_events`.
- The server **rejects** a below-floor write (422) even if the client check is
  bypassed; the page surfaces the server message verbatim.

### Review hub (Sprint 7a, `src/pages/admin/ReviewQueuePage.tsx`, ADR-0020)

The messy-tail review console — three tabs, **AI proposes → human confirms**:

- **AI tagging** — the `under_review` backlog sorted by `tagging_confidence`,
  **fuchsia-marked**, opening the existing `DocumentDetailPanel`. Verifying reuses
  the **Sprint-3 Confirm-tags button + bounded edit** (accept/adjust the AI's
  facets → confirm) — no new verify mechanism; on confirm the doc turns normal and
  becomes embeddable, the AI origin surviving only as the `ai_agent` provenance
  dot. A "Re-suggest with AI" button re-runs the proposal.
- **Vocabulary proposals** — the variant→alias-first chooser
  (`ProposeVocabularyForm`); proposing rides `knowledge.edit`, approve/reject the
  `vocabulary.approve` ability (super_admin can propose-and-approve), gated on the
  server-provided identity abilities.
- **Expiry** — near-expiry docs + the same-convenio successor handoff
  (link-successor writes `predecessor_document_id`; dismiss; escalate) — never
  auto-retire.

### The three comparison surfaces (Sprint 7d, ADR-0024)

All three show the same thing — **two passages and a score** — because a human can
only check a machine's claim if the evidence is on screen next to it. The one new
CSS block (`.notice-body`, `.passage-list`, `.compare-grid`, `.compare-field`) is
layout only; every colour comes from existing tokens, and fuchsia keeps its single
meaning of unverified AI via the existing `.notice--ai`.

- **The publish fence** (`EscalationCardDrawer.tsx`) — a `publish_blocked` with
  reason `semantic_overlap` shows the overlapping convenio passages and offers **no
  acknowledgement**: that outcome cannot be clicked through. A
  `publish_requires_acknowledgement` shows the near-passages plus an explicit tick
  and a separate publish button; the tick starts **unchecked every time** and is
  cleared by editing the draft, because an acknowledgement is a decision about the
  text that was compared. When the comparison could not be made, the same prompt
  appears with copy that says so — never mistakable for a real near-passage.
- **The fact version pair** (`FactDuplicatePanel.tsx`, opened from the
  reference-facts queue row or the fact card's flag) — the two facts **side by
  side** with the differing fields marked and the shared scope left visible (it is
  what proves they are two versions of one fact). Three verdicts behind a confirm
  modal: **Sustituir** (pre-selecting the direction the validity dates support —
  pre-selecting is not deciding), **Coexisten**, **Descartar**. The supersede copy
  states the exact date the older window will close and that nothing is deleted.
- **The succession proposal** (`ReviewQueuePage.tsx` → `SuccessionProposalNotice`) —
  a **fuchsia** `.notice--ai` block above the existing successor `<select>`: the
  relationship, the score, both validity windows and the compared passages.
  **Confirm** pre-selects the proposed successor in that same `<select>` and calls
  the unchanged 7a resolve endpoint (the "also retire" checkbox is **never**
  pre-checked by a proposal); **Reject** clears the fuchsia and leaves the task
  open. A non-`successor` relationship offers no confirm button — it says plainly
  that the AI is not proposing a succession, and the human picks by hand.

**The `--provenance-ai` token is re-valued to fuchsia `#e879f9`** (was violet
`#7c3aed`) in the vanilla-CSS token system (ADR-0012/0013, **not** Tailwind).
Fuchsia means **"unverified AI — needs a human" only**: it marks the review queue,
the AI-proposed facets on the card, and the proposed-vocabulary list, and **never
bleeds onto confirmed content** (on verify/approve the UI reverts to normal). The
new nav item is **Review**, gated on the relevant abilities.

## Scripts

```bash
npm run dev      # dev server
npm run build    # tsc -b && vite build
npm run lint     # eslint
```
