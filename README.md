# SupportBridge AI

AI-assisted IT help desk for capstone demos: customers submit tickets and chat with an AI assistant; human reviewers monitor the queue, pause or take over conversations, and confirm final closure. The AI suggests fixes and resolution—it never closes tickets on its own.

| Docs | Description |
|------|-------------|
| [**Local setup**](#local-setup) (below) | Clone, install, env, run |
| [`docs/PROJECT_DOCUMENTATION.md`](docs/PROJECT_DOCUMENTATION.md) | Architecture, flows, file map |
| [`docs/DEMO_WALKTHROUGH.md`](docs/DEMO_WALKTHROUGH.md) | Presenter script for live demos |

---

## Prerequisites

- **Node.js** 18+ (20+ recommended)
- **npm** 9+ (comes with Node)
- A terminal (macOS, Linux, or Windows with WSL)

**Optional**

- **Hermes gateway** — local OpenAI-compatible API if you want LLM replies instead of built-in fallback templates ([Hermes setup](#optional-hermes-ai))
- Same Wi‑Fi — if you want phones/laptops on your LAN to open the app ([LAN access](#optional-lan--classroom-demo))

---

## Local setup

### 1. Clone the repository

```bash
git clone git@github.com:001vamp/SupportBridge-Capstone.git
cd SupportBridge-Capstone
```

### 2. Install dependencies

From the **repository root** (npm workspaces: `client` + `server`):

```bash
npm install
```

### 3. Configure environment

**Server (required)**

```bash
cp .env.example server/.env
```

Edit `server/.env`. Minimum for a first run:

```env
PORT=3001
LISTEN_HOST=0.0.0.0
DATABASE_PATH=server/data/supportbridge.sqlite
CLIENT_ORIGIN=http://localhost:5173
HERMES_ENABLED=false
```

Do **not** commit `server/.env` — it is gitignored. Secrets stay local.

**Client (only if you use a reviewer access key)**

Vite reads `VITE_*` variables from the `client/` folder:

```bash
cp .env.example client/.env
```

Keep only what you need in `client/.env`, for example:

```env
VITE_REVIEWER_ACCESS_KEY=your-shared-demo-key
```

If `REVIEWER_ACCESS_KEY` is set in `server/.env`, it must match `VITE_REVIEWER_ACCESS_KEY` in `client/.env`.

### 4. Start the app

```bash
npm run dev
```

This runs **both** processes with `concurrently`:

| Service | URL | Package |
|---------|-----|---------|
| **Frontend** (Vite) | http://localhost:5173 | `client/` |
| **API** (Express + Socket.IO) | http://localhost:3001 | `server/` |

### 5. Verify

```bash
curl http://localhost:3001/api/health
```

Expected: `{"ok":true}`

Then in a browser:

| Page | URL |
|------|-----|
| Submit a ticket | http://localhost:5173/ |
| Reviewer dashboard | http://localhost:5173/reviewer |
| LAN link helper (presentations) | http://localhost:5173/join |

Submit a test ticket → you should land on the chat page and see an **AI Assistant** reply (fallback AI works with `HERMES_ENABLED=false`).

---

## npm scripts

Run from the **repo root**:

| Command | What it does |
|---------|----------------|
| `npm run dev` | Start API + Vite (default for development) |
| `npm run dev:server` | API only |
| `npm run dev:client` | Vite only |
| `npm run start` | API without file watch (`server` workspace) |
| `npm run seed:demo` | Wipe tickets/messages and load 6 demo tickets (local only) |
| `npm run reset:demo` | Same as `seed:demo` |

Build the frontend for production preview:

```bash
npm run build --workspace client
npm run preview --workspace client -- --host
```

---

## Optional: Hermes AI

By default the app uses a **local fallback** provider (template-based troubleshooting). For real LLM replies:

1. Run your **Hermes gateway** locally (often `http://127.0.0.1:8642/v1`).
2. In `server/.env`:

```env
HERMES_ENABLED=true
HERMES_GATEWAY_URL=http://127.0.0.1:8642/v1
HERMES_API_KEY=your-gateway-bearer-token
HERMES_MODEL=hermes-agent
```

(`HERMES_KEY` works as an alias for `HERMES_API_KEY`.)

3. Restart `npm run dev`. Server log should show something like:

```text
[AI] Hermes is on → http://127.0.0.1:8642/v1 (model: hermes-agent).
[AI] Hermes gateway OK (GET …/v1/models → 200).
```

**Customer `~` prefix** — messages starting with `~` use Hermes **general chat** mode (not the IT help-desk script).

**If Hermes fails** (timeout, HTTP 500, bad auth), the app still replies using fallback templates. AI bubbles may show a small footnote with the gateway error when metadata is available.

**Common fix:** gateway returns *Codex refresh token already consumed* → refresh Codex on the gateway machine, run `hermes auth`, restart the gateway (not a SupportBridge bug).

---

## Optional: LAN / classroom demo

Other devices on your Wi‑Fi can use the app without per-machine config:

1. Keep `LISTEN_HOST=0.0.0.0` in `server/.env` (default in `.env.example`).
2. Vite already binds to all interfaces (`vite --host 0.0.0.0`).
3. On your laptop, open **http://localhost:5173/join** — it lists LAN URLs to share.
4. Each device opens e.g. `http://192.168.x.x:5173`; the browser calls the API on the **same hostname** port `3001`.

Allow inbound **5173** and **3001** in the host firewall if connections fail.

---

## Optional: demo database

Load fixed demo tickets (Wi‑Fi, VPN, login pending close, etc.):

```bash
npm run seed:demo
```

- Wipes **tickets** and **messages** in your SQLite file.
- Refuses to run when `NODE_ENV=production`.
- Does **not** run automatically on startup.

---

## Optional: reviewer access key

For a light demo gate (not production auth):

**`server/.env`**

```env
REVIEWER_ACCESS_KEY=choose-a-long-random-string
```

**`client/.env`**

```env
VITE_REVIEWER_ACCESS_KEY=choose-a-long-random-string
```

Same value on both sides. Customer ticket chat still works by ticket URL without this key.

---

## Project structure

```text
├── client/                 # React + Vite UI
│   └── src/
│       ├── pages/          # Customer, reviewer, /join
│       ├── components/     # Chat, badges, forms
│       ├── api/            # HTTP + Socket.IO
│       └── hooks/          # Live ticket/thread data
├── server/                 # Express API + Socket.IO
│   └── src/
│       ├── routes/         # REST endpoints
│       ├── services/       # Tickets, messages, AI, reviewer
│       ├── db/             # SQLite schema + queries
│       └── sockets/        # Realtime broadcasts
├── docs/                   # Architecture + demo walkthrough
├── .env.example            # Template (copy → server/.env, client/.env)
└── package.json            # Workspace root scripts
```

---

## Troubleshooting

| Problem | What to try |
|---------|-------------|
| `EADDRINUSE` on 3001 or 5173 | Stop the other process using that port, or change `PORT` / Vite port in config |
| Reviewer dashboard 403 | Set matching `REVIEWER_ACCESS_KEY` and `VITE_REVIEWER_ACCESS_KEY`, restart `npm run dev` |
| LAN device cannot load app | Use URL from `/join`; check firewall; same Wi‑Fi |
| API works on laptop but not phone | Open site via LAN IP, not `localhost` |
| AI always shows “offline template” footnote | Hermes disabled or failing — check `HERMES_ENABLED`, gateway logs, `server/.env` key |
| `SQLITE_BUSY` under heavy demo load | Normal with many simultaneous writes; retry; spread users across tickets |

---

## What gets committed

`.gitignore` excludes:

- `node_modules/`
- `server/.env`, `client/.env`, and any `.env` / `.env.local` (except `*.env.example`)
- `server/data/*.sqlite` (local database)
- `client/dist/`

Commit **only** `.env.example` and `client/.env.example` (empty placeholders). **Never** commit real API keys.

### Before your first `git push`

```bash
chmod +x scripts/check-secrets.sh
./scripts/check-secrets.sh
```

If you already committed a secret by mistake, **rotate the key** on the Hermes gateway (generate a new one) — removing it from git history is not enough once pushed.

---

## License

Add your license file before publishing if required by your course or organization.
