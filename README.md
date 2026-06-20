# hr-frontend

React + Vite + TypeScript SPA for the HR platform — the employee chat UI and the
admin console. Talks to `hr-backend` over HTTP. See `AGENTS.md` and the canonical
specs in `hr-docs`.

> **Sprint 0:** email-OTP login into two empty protected shells. No chat, no
> admin modules, no lens/hierarchy UI yet.

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
  console shell at `/admin` (both empty; each calls `/me`). Routing target after
  login is chosen by `account_type`.

## Scripts

```bash
npm run dev      # dev server
npm run build    # tsc -b && vite build
npm run lint     # eslint
```
