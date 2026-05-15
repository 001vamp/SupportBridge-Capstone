# SupportBridge AI — demo walkthrough

Use this while presenting. URLs assume local dev: **http://localhost:5173** (Vite) and API **http://localhost:3001**. On another device on your Wi‑Fi, use your machine’s LAN URL (same port) — the app targets the API on **the same hostname** automatically.

**Background reading:** [`PROJECT_DOCUMENTATION.md`](./PROJECT_DOCUMENTATION.md) — architecture, how the system works, and setup notes.

---

## 0. Preflight checklist (do this first)

1. **Dependencies:** `npm install` (repo root).
2. **Database (optional but recommended for a clean queue):**  
   `npm run seed:demo` — wipes local SQLite `tickets` + `messages` and inserts **6 fixed demo tickets** (`ticket_demo_wifi`, `ticket_demo_vpn`, …). **Not** for production; refuses if `NODE_ENV=production`.
3. **Run stack:** `npm run dev` (starts API + Vite).
4. **Hermes (optional):** If `HERMES_ENABLED=true` in `server/.env`, keep your Hermes gateway reachable; otherwise the **fallback** AI still replies.
5. **Reviewer gate:** If `REVIEWER_ACCESS_KEY` is set on the server, set the **same** value in the client as `VITE_REVIEWER_ACCESS_KEY` (see `.env.example`) or reviewer routes and the dashboard socket room will 403.
6. **Health check:** `curl http://localhost:3001/api/health` → `{"ok":true}`.
7. **Presentation URLs:** open **`/join`** — lists `localhost`, loopback, and LAN links for this machine’s Vite port (from `CLIENT_ORIGIN` or **5173**).

**Two demo styles:**

| Style | What to do |
|--------|------------|
| **A — Seeded dashboard** | After `seed:demo`, open **Reviewer** — you’ll see Wi‑Fi (active), VPN (human review), Login (pending close), Printer (closed), Outlook (takeover), Slow laptop (waiting). Good for a **fast** architecture + UI tour. |
| **B — Full live story** | Skip seed (or seed then still submit a **new** Wi‑Fi ticket from `/`) and follow sections 2–12 on that ticket for pause / human / takeover / closure. |

---

## 1. Project explanation

**Say:**

> My capstone project is SupportBridge AI. It is an AI-assisted IT help desk ticketing system. The idea is that a customer submits a support ticket, then an AI assistant tries basic troubleshooting first. A human reviewer can monitor the ticket, pause the AI, take over the conversation, and confirm final closure. The AI can suggest that a ticket is resolved, but only a human reviewer can actually close it.

**Then:**

> The main goal is not to replace human support. The goal is to help with first-level troubleshooting and make escalation smoother.

---

## 2. Customer ticket form

Open **http://localhost:5173**

**Point out:** Customer support portal · ticket form · “What happens next” (AI + human flow).

**Say:**

> This is the customer side. The customer starts by submitting a ticket. The form collects basic information like name, issue title, category, and description.

**Demo data** (or click **Fill demo ticket** on the form):

| Field | Value |
|--------|--------|
| Name | Demo User |
| Email | demo@example.com |
| Issue title | Wi-Fi is not working |
| Category | Network |
| Description | My laptop cannot connect to Wi-Fi. |

Click **Submit Ticket** → lands on the ticket chat.

*(If you used `seed:demo`, you can instead open chat for **`ticket_demo_wifi`** from the URL bar: `/tickets/ticket_demo_wifi/chat` — it already has a customer + AI thread for a quick story.)*

---

## 3. AI first response

**Say:**

> Once the ticket is created, the customer is placed into a chat with the AI assistant. The AI gives simple first-level troubleshooting steps based on the issue.

**Point out:** ticket id · **AI Active** · **Live** badge · first **AI Assistant** message.

**Say:**

> This AI response is coming through Hermes when it is enabled and reachable. If Hermes fails or times out, the system has fallback AI logic so the demo does not break.

**Optional:** Customer messages that start with **`~`** switch Hermes to a **general** assistant mode (still safety-limited), not the IT script.

---

## 4. Reviewer dashboard

Open **http://localhost:5173/reviewer** (second tab is fine).

**Say:**

> This is the human reviewer dashboard. Reviewers can see active tickets, tickets needing human review, tickets waiting for closure review, and closed tickets.

**Point out:** metric cards · queue · status badges · AI state badges · Live indicator · ticket tracker sidebar.

**Say:**

> The dashboard updates live through Socket.IO, but the REST API is still the source of truth.

Click **View** on the ticket you’re demoing (**new Wi‑Fi ticket** or seeded **`ticket_demo_wifi`** for the long walkthrough; **`ticket_demo_login`** to jump straight to **Confirm close**).

---

## 5. Reviewer ticket page

**Say:**

> This is the reviewer command center. The reviewer can see the ticket summary, the conversation, AI status, and reviewer controls.

**Point out:** ticket summary · chat transcript · reviewer command panel · AI controls · human message box · takeover · resolution review · **Close ticket** (reviewer can force-close any open ticket except use **Confirm close** when already pending closure).

**Say:**

> The reviewer can watch the AI/customer conversation and step in whenever needed.

**Customer side:** **Talk to a human** pauses AI and queues the ticket for human review (no AI reply on that action).

---

## 6. Customer follow-up (live)

Customer tab → send: **`That did not work.`**

Reviewer tab (no refresh).

**Say:**

> The reviewer sees the customer message live. This is handled by Socket.IO.

---

## 7. Pause AI

Reviewer → **Pause AI**.

**Say:**

> If the reviewer wants to stop the AI from responding, they can pause it. This prevents the AI from sending more troubleshooting messages.

Customer tab → send: **`Can someone help me?`**

**Say:**

> Since the AI is paused, the customer message comes through, but the AI does not respond.

*(Alternatively: **Talk to a human** on the customer page does the same kind of pause-for-human without typing that phrase.)*

---

## 8. Human message

Reviewer → human message box:

> Hi, I’m taking a look now. Can you restart the laptop and check if the Wi-Fi option appears again?

**Send human message.**

**Say:**

> The human reviewer can respond directly inside the ticket conversation.

Customer tab → show the human message.

---

## 9. Take over

Reviewer → **Take over**.

**Say:**

> Takeover means the human reviewer is now controlling the conversation. The AI stays quiet while the human is handling the ticket.

**Point out:** Human Takeover / Taken over.

**Say:**

> This is important because the AI should not talk over the human technician.

**Seeded shortcut:** Open **`ticket_demo_outlook`** — it’s already in takeover with a human line.

---

## 10. Release

Reviewer → **Release**.

**Say:**

> Once the reviewer is done, they can release the ticket back to AI-assisted mode.

**Point out:** AI Active again.

---

## 11. Customer confirms fix

Customer tab → send: **`That worked, thank you.`**

**Say:**

> When the customer confirms the issue is fixed, the system moves toward closure review. The backend detects resolution-style phrases and suggests closure; the AI still does not close the ticket by itself.

**Point out:** **Pending Close Review** (and AI paused for that state).

**If it does not flip** (very rare): Hermes can still chat naturally; closure for “thanks / it worked” is reinforced by **intent detection** on the server. If something looks off, note you are tightening intent + workflow over time.

**Seeded shortcut:** **`ticket_demo_login`** is already pending close with a closure summary.

---

## 12. Confirm close

Reviewer → **Confirm close** (when pending close).

**Say:**

> Final closure requires a human reviewer. This prevents the AI from closing tickets without oversight.

**Point out:** Closed · AI disabled · customer composer disabled.

Customer tab → closed notice.

**Seeded shortcut:** **`ticket_demo_printer`** is already closed with a believable thread.

---

## 13. Architecture (short)

**Say:**

> The frontend is React and Vite. The backend is Node and Express. SQLite stores tickets and messages. Socket.IO handles live updates. Hermes can run locally through the gateway. The AI provider is isolated: if Hermes fails, the fallback provider still responds.

**Diagram (optional):**

React → Express → SQLite → AI layer → Hermes **or** fallback.

**Say:**

> The backend owns ticket state. The AI only suggests messages or actions; it does not directly close tickets.

---

## 14. Safety / control

**Say:**

> The AI cannot close tickets on its own. A human confirms final close. The human can pause AI or take over. If a human pauses or takes over while AI is generating, the late AI response is discarded. A fallback exists if Hermes fails. The AI can mark tickets for **human review** (escalation); customers can also **request a human**, which pauses the AI for that ticket.

---

## 15. Future work

**Say:**

> With more time: real authentication, roles, reporting, stronger Hermes intent for edge cases, email, attachments, PostgreSQL, deployment. We already have a **local seed script** for repeatable demos (`npm run seed:demo`).

---

## Ultra-short pitch

> SupportBridge AI is an AI-assisted help desk. A customer submits a ticket and chats with an AI for first-level troubleshooting. A human reviewer monitors, pauses or takes over, and confirms final closure. The human stays in control.

**Demo order:** Submit Wi-Fi ticket → AI replies → reviewer dashboard → open ticket → customer “That did not work” → live update → pause AI → customer “Can someone help me?” (no AI) → human message → take over → release → customer “That worked, thank you.” → pending close → confirm close.

**Angle:** This is not just a chatbot — it is a **hybrid AI + human help desk workflow**.
