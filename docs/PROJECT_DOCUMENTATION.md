# SupportBridge AI — Project Documentation

This document describes **what the project is for**, **how it is built**, **how data and AI flow through the system**, and **what we configured to get it running** for local development, capstone demos, and LAN presentations.

For a step-by-step presenter script, see [`DEMO_WALKTHROUGH.md`](./DEMO_WALKTHROUGH.md). For quick commands, see the root [`README.md`](../README.md).

---

## 1. Purpose

**SupportBridge AI** is a capstone-style **AI-assisted IT help desk**. It is not meant to replace human support; it automates **first-line troubleshooting** while keeping humans in control of escalation and **final closure**.

| Actor | Role |
|--------|------|
| **Customer** | Submits a ticket (title, category, description), then chats in a ticket thread. Can request a human or prefix messages with `~` for general (non–help-desk) chat when Hermes is enabled. |
| **AI assistant** | Suggests troubleshooting steps, asks clarifying questions, can suggest resolution or escalation. **Never** closes a ticket by itself. |
| **Human reviewer** | Monitors a dashboard, pauses/resumes AI, takes over the thread, sends human messages, rejects or confirms AI closure suggestions, force-closes or reopens tickets. |

**Design principle:** The **backend owns all durable state** (SQLite). AI providers only return `{ message, suggestedAction, … }`; the **message service** decides what to persist and how ticket status / AI state change.

---

## 2. High-level architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Browser (customer or reviewer)                                         │
│  React + Vite (port 5173, --host 0.0.0.0 for LAN)                      │
│  • REST via fetch → same hostname :3001/api                             │
│  • Socket.IO client → same hostname :3001                               │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Node.js HTTP server (Express + Socket.IO on one process, port 3001)    │
│  • REST: /api/tickets, messages, reviewer actions, /api/dev/join-urls   │
│  • Sockets: ticket rooms, dashboard room, live message/ticket events    │
│  • Services: ticket, message, reviewer, escalation, AI orchestration    │
└───────────────┬─────────────────────────────┬───────────────────────────┘
                │                             │
                ▼                             ▼
┌───────────────────────────┐   ┌───────────────────────────────────────────┐
│  SQLite (WAL mode)        │   │  AI layer (provider pattern)              │
│  tickets, messages        │   │  Hermes (OpenAI-compatible gateway)     │
│  server/data/…sqlite      │   │       OR                                  │
└───────────────────────────┘   │  fallbackProvider (local templates)     │
                                └───────────────────┬───────────────────────┘
                                                    │
                                                    ▼
                                    ┌───────────────────────────────┐
                                    │  Hermes gateway (optional)    │
                                    │  e.g. http://127.0.0.1:8642/v1 │
                                    │  POST …/chat/completions      │
                                    └───────────────────────────────┘
```

### Monorepo layout

| Path | Stack | Responsibility |
|------|--------|----------------|
| `client/` | React 19, Vite 6, Tailwind, React Router, socket.io-client | Customer portal, reviewer dashboard, chat UI, theme toggle |
| `server/` | Node (ESM), Express 4, Socket.IO 4, sqlite3 | API, persistence, realtime, AI orchestration |
| `docs/` | Markdown | Demo walkthrough, this document |
| Root `package.json` | npm workspaces + `concurrently` | `npm run dev` runs both packages |

---

## 3. How it works (main flows)

### 3.1 Create ticket → first AI reply

1. Customer submits the form at `/` → `POST /api/tickets`.
2. `ticketService.createTicket` inserts a row with `status: AI_ACTIVE`, `aiState: ACTIVE`.
3. `maybeGenerateAiResponse` runs (queued per ticket id so concurrent messages on the **same** ticket serialize).
4. `aiService` calls Hermes if `HERMES_ENABLED=true`, else fallback; on Hermes errors, **fallback** with reason logged and optional `hermesErrorDetail` in message metadata.
5. AI message is inserted; Socket.IO emits `message:created` and `ticket:updated` to the ticket room and dashboard.

### 3.2 Customer sends a chat message

1. `POST /api/tickets/:ticketId/messages` with `{ body }`.
2. Customer message saved; AI generation runs if `canAiRespond(ticket)` (open ticket + `aiState === ACTIVE`).
3. **Intent shortcuts** (no LLM): phrases like “talk to a human” → escalate; “thanks / it works” (without “still broken”) → suggest resolution.
4. Otherwise Hermes or fallback builds the reply.
5. If `suggestedAction` is `suggest_resolution` or `escalate_to_human`, ticket status/AI state updates and a **system** message may be added.

### 3.3 Reviewer actions

Reviewer routes live under `/api/tickets/:ticketId/reviewer/*` and require optional header `x-reviewer-key` when `REVIEWER_ACCESS_KEY` is set.

Examples: pause AI (`aiState: PAUSED`), takeover (`HUMAN_TAKEOVER` + `TAKEN_OVER`), human message (`senderType: human`), confirm close (`CLOSED` + `DISABLED`).

Each action updates SQLite, may insert system/human messages, and broadcasts via Socket.IO.

### 3.4 Realtime updates

- **Ticket room:** `ticket:{ticketId}` — clients emit `ticket:join` after opening chat.
- **Dashboard room:** `dashboard` — reviewers with valid socket auth (optional key).
- **Events:** `message:created`, `ticket:updated`, `ai:typing`, `ai:closure-suggested`, `reviewer:action`.
- **Fallback:** If the socket is not `live`, hooks poll every **4s** (`useTicketThread`, `useTickets`).

### 3.5 LAN / multi-device demos

- API binds to **`LISTEN_HOST=0.0.0.0`** (default) so other machines can reach port **3001**.
- Vite uses **`host: true`** (all interfaces) on port **5173**.
- The browser client resolves the API as **`window.location.hostname:3001`** (`client/src/api/backendOrigin.js`), so opening `http://192.168.x.x:5173` automatically talks to `http://192.168.x.x:3001` without per-device env files.
- Dev **CORS** allows localhost, private LAN IPs (10/8, 172.16–31, 192.168), and **Tailscale-style** `100.64.0.0/10` on common dev ports.
- Presentation page **`/join`** calls `GET /api/dev/join-urls` to list localhost, loopback, and LAN IPv4 links.
- SQLite uses **WAL** + **busy_timeout** to tolerate many simultaneous writes during classroom demos (~20 clients is reasonable; Hermes upstream remains the main bottleneck if everyone triggers AI at once).

---

## 4. Frontend routes

| Route | Page | Audience |
|-------|------|----------|
| `/` | Customer submit | Customer |
| `/tickets/:ticketId/chat` | Customer chat | Customer (ticket id is the “link”) |
| `/join` | LAN URL helper | Presenter |
| `/reviewer` | Ticket queue dashboard | Reviewer |
| `/reviewer/:ticketId` | Ticket command center | Reviewer |

Shared chrome: `AppShell` (nav, theme). Status/AI badges: `TicketStatusBadge`, `AIStateBadge`, `ConnectionIndicator`.

---

## 5. Backend API (summary)

| Method | Path | Notes |
|--------|------|--------|
| GET | `/api/health` | `{ ok: true }` |
| GET | `/api/dev/join-urls` | LAN presentation URLs |
| POST | `/api/tickets` | Create ticket |
| GET | `/api/tickets` | List all (reviewer key if configured) |
| GET | `/api/tickets/:id` | Single ticket |
| POST | `/api/tickets/:id/escalate` | Customer “talk to human” |
| GET | `/api/tickets/:id/messages` | Thread history |
| POST | `/api/tickets/:id/messages` | Customer message + optional AI reply |
| POST | `/api/tickets/:id/ai/respond` | Manual AI trigger (reviewer) |
| POST | `/api/tickets/:id/reviewer/*` | Pause, resume, takeover, release, messages, close, reopen, closure confirm/reject |

Errors go through `middleware/errorHandler.js` with consistent JSON shapes.

---

## 6. Data model

**`tickets`:** id, customer fields, title, description, category, `status`, `ai_state`, internal notes, AI resolution summary, closure rejection reason, timestamps, `closed_at`.

**`messages`:** id, `ticket_id`, `sender_type` (`customer` | `ai` | `human` | `system`), body, optional JSON `metadata` (provider, `suggestedAction`, fallback/Hermes debug).

Indexes: messages by ticket + time; tickets by status + updated time.

Schema: `server/src/db/schema.sql`. Queries: `server/src/db/queries.js`.

---

## 7. Ticket status and AI state

### Ticket `status`

| Value | Meaning |
|--------|---------|
| `NEW` | Defined; new tickets typically start as `AI_ACTIVE` |
| `AI_ACTIVE` | AI may respond when `aiState` is `ACTIVE` |
| `WAITING_CUSTOMER` | Used in workflow transitions |
| `HUMAN_REVIEW` | Needs human attention (e.g. after escalation) |
| `HUMAN_TAKEOVER` | Reviewer owns the conversation |
| `PENDING_CLOSE_REVIEW` | AI suggested resolution; human must confirm |
| `CLOSED` | Terminal; no new customer messages |

### `aiState`

| Value | AI can reply? |
|--------|----------------|
| `ACTIVE` | Yes (if ticket not closed) |
| `PAUSED` | No |
| `TAKEN_OVER` | No |
| `DISABLED` | No (e.g. after close) |

`canAiRespond` is implemented in `server/src/services/ticketState.js`.

---

## 8. AI layer

### 8.1 Orchestration (`server/src/services/ai/aiService.js`)

- Reads `HERMES_ENABLED`.
- Tries `generateHermesResponse`; on any failure, `generateFallbackResponse` with `fallbackReason` and optional `hermesErrorDetail`.
- AI providers **never** touch the database.

### 8.2 Fallback provider (`fallbackProvider.js`)

- Always available; keyword-based issue types (network, password, printer, etc.).
- **Discovery-first** general copy when the issue is vague.
- Customer lines starting with **`~`** use a small-talk / general stub (not IT routing).
- Issue detection uses **ticket fields + customer/reviewer bodies only** (not past AI text, which previously caused false “close the app” matches).

### 8.3 Hermes provider (`hermesProvider.js`)

- OpenAI-compatible **`POST {HERMES_GATEWAY_URL}/chat/completions`** with `Authorization: Bearer` (`HERMES_API_KEY` or `HERMES_KEY`).
- Two modes from the **latest customer message**:
  - **`it_helpdesk`** — default IT system prompt + ticket JSON + `suggestedActionRules`.
  - **`general`** — customer message starts with **`~`**; minimal payload (history only, no ticket workflow JSON) and a separate system prompt (no help-desk script).
- Responses: strict JSON contract when valid; otherwise plain text with `continue_troubleshooting`.
- Startup probe: `logHermesStartupCheck()` GETs `/v1/models` when Hermes is enabled.

### 8.4 Customer intent (`customerIntent.js`)

Regex-based detection for **request human** and **resolved** phrases before calling the LLM.

### 8.5 UI hint when fallback is used

`MessageBubble.jsx` shows a footnote when `metadata.provider === "fallback"`, preferring `hermesErrorDetail` when the gateway failed.

---

## 9. Environment configuration

Copy [`.env.example`](../.env.example) to **`server/.env`** (and optionally repo-root `.env`). Server loads **repo root first**, then **`server/.env`** (`server/src/index.js`).

| Variable | Purpose |
|----------|---------|
| `PORT` | API port (default `3001`) |
| `LISTEN_HOST` | `0.0.0.0` for LAN; `127.0.0.1` to block remote |
| `DATABASE_PATH` | SQLite file path |
| `CLIENT_ORIGIN` | Production CORS; also used to infer Vite port for `/join` URLs |
| `HERMES_ENABLED` | `true` to use Hermes |
| `HERMES_GATEWAY_URL` | e.g. `http://127.0.0.1:8642/v1` |
| `HERMES_API_KEY` / `HERMES_KEY` | Bearer token for gateway |
| `HERMES_MODEL` | e.g. `hermes-agent` |
| `REVIEWER_ACCESS_KEY` | Server-side reviewer gate |
| `VITE_REVIEWER_ACCESS_KEY` | Same value in client build-time env |
| `VITE_BACKEND_PORT` | If API is not on 3001 |
| `VITE_API_BASE_URL` / `VITE_SOCKET_URL` | Override auto hostname logic |

**Client env** must be prefixed with `VITE_` and set before `npm run dev` if you change them.

---

## 10. What we did to get it working

This section captures practical setup from development and demo prep—not exhaustive history, but the issues that mattered.

### 10.1 Run the stack

```bash
cd "/Users/mew/lighthouse-osx/Capstone "   # note: folder name may include a trailing space on disk
npm install
npm run dev
```

- **Client:** http://localhost:5173  
- **API:** http://localhost:3001/api/health  

### 10.2 Hermes gateway

1. Run the **Hermes gateway** locally (separate process; often port **8642**).
2. Set `HERMES_ENABLED=true`, `HERMES_GATEWAY_URL`, and `HERMES_API_KEY` in `server/.env`.
3. On startup, look for `[AI] Hermes gateway OK` in server logs.
4. If chat returns **500** with *Codex refresh token already consumed*: refresh Codex on the gateway machine, run **`hermes auth`**, restart the gateway—not a SupportBridge code bug.
5. Wrong Hermes **profile** or stale key → same symptom; re-auth and align the Bearer key with what the gateway expects.

### 10.3 AI behavior fixes (in-repo)

- **Fallback** no longer classifies issues using AI message text (fixed bogus “close the app” replies).
- **`~` mode** in Hermes sends a lean payload so the model stays in general chat; fallback has its own `~` handling when Hermes is down.
- **Vague tickets** prompt discovery questions instead of immediate restart steps.
- **HTTP errors** from Hermes include gateway body text in logs and optional UI footnotes.

### 10.4 LAN presentations

- Use **`/join`** for copy-paste URLs for other devices.
- Ensure Wi‑Fi/firewall allows **5173** and **3001** on the presenter machine.
- Spread demo users across **several tickets** to reduce SQLite + Hermes contention.
- Optional: `npm run seed:demo` for six fixed tickets (refuses `NODE_ENV=production`).

### 10.5 Reviewer demo gate

If `REVIEWER_ACCESS_KEY` is set on the server, set **`VITE_REVIEWER_ACCESS_KEY`** to the same value or reviewer list/socket dashboard will **403**.

### 10.6 Database for demos

```bash
npm run seed:demo   # wipes tickets + messages, inserts demo scenarios
```

Does **not** run on app startup.

---

## 11. Key source files (map)

| Area | Files |
|------|--------|
| Server entry | `server/src/index.js` |
| HTTP app + CORS | `server/src/app.js` |
| Socket.IO | `server/src/sockets/socketServer.js` |
| DB | `server/src/db/connection.js`, `schema.sql`, `queries.js`, `seedDemo.js` |
| Tickets | `server/src/services/ticketService.js`, `routes/tickets.routes.js` |
| Messages + AI | `server/src/services/messageService.js`, `routes/messages.routes.js` |
| Reviewer | `server/src/services/reviewerService.js`, `routes/reviewer.routes.js` |
| AI | `server/src/services/ai/aiService.js`, `providers/hermesProvider.js`, `providers/fallbackProvider.js`, `customerIntent.js` |
| Hermes probe | `server/src/utils/hermesStartupCheck.js` |
| LAN URLs | `server/src/routes/presentation.routes.js`, `client/src/pages/JoinPresentationPage.jsx` |
| Client API | `client/src/api/http.js`, `backendOrigin.js`, `socket.js` |
| Realtime hooks | `client/src/hooks/useTicketThread.js`, `useTickets.js` |
| UI pages | `client/src/pages/*.jsx`, `client/src/components/*.jsx` |

---

## 12. Security and limitations (MVP)

- **No real authentication** — ticket ids are bearer links for customers; reviewer key is a thin demo gate exposed to the browser if set in Vite env.
- **SQLite** — single-writer; fine for demos; not a multi-tenant production database.
- **Hermes** — single upstream; concurrent AI requests can queue or fail under load.
- **Vite dev server** — adequate for class demos; for heavier load use `npm run build` + static hosting or `vite preview --host`.
- **Not implemented:** email, attachments, RBAC, audit logs, PostgreSQL, production deployment playbook.

---

## 13. Scripts reference

| Command | Effect |
|---------|--------|
| `npm run dev` | API + Vite concurrently |
| `npm run dev:server` | API only |
| `npm run dev:client` | Vite only |
| `npm run start` | Production-style server start (server workspace) |
| `npm run seed:demo` / `reset:demo` | Reset DB + demo tickets |

---

## 14. Related docs

- [`DEMO_WALKTHROUGH.md`](./DEMO_WALKTHROUGH.md) — presenter script and demo order  
- [`README.md`](../README.md) — quick start, Hermes env vars, status tables  

---

*Last updated to reflect the codebase as of the capstone demo period (SupportBridge AI monorepo, Hermes optional gateway, LAN/`/join` presentation helpers, WAL SQLite tuning).*
