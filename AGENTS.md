# hr-frontend — agent instructions

React + Vite + TypeScript SPA for the HR platform: the employee chat UI and the admin console. Talks to `hr-backend` over HTTP.

## Read before building
Canonical specs in the `hr-docs` repo (beside this one in the workspace):
- `architecture.md` (especially §4, the hierarchy/lens UI), `data-model.md`, `decisions/`, `glossary.md`.
Read the relevant doc before coding. For the current task, read the active sprint spec in `hr-docs/sprints/`.

## Non-negotiable rules
- **One reusable hierarchy component drives ALL lenses** (by province, sector, validity, topic). Do NOT build a separate tree per lens — a lens is a config (the level ordering) passed to the same component.
- **Hierarchy behaviour:** two visual forms (branching graph + indented list, user-switchable); two-level default; click-to-expand to full depth; expand-all / collapse-all; a leaf document opens its card in BOTH forms; lazy-load children on expand. This is front-end state only — it must not drive any schema assumption.
- **Auth:** email OTP flow (request code → verify code → session). Store the Sanctum token; daily (~24h) session; no passwords, no SSO.
- **Use glossary terms** in UI copy (convenio, facet, lens, scope).

## Stack & conventions
- React + Vite + TypeScript. Functional components + hooks.
- Centralized API client; never hardcode the backend URL (env config).
- Keep the admin console and the chat UI as separate route trees.

## Workflow
For any sprint: read the spec, write `plan.md`, STOP for review before building. When given a correction, apply it AND record it in the named doc as instructed.
