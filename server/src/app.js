import cors from "cors"; // Adds CORS headers to responses.
import express from "express"; // Creates the HTTP server + routing.
import { errorHandler } from "./middleware/errorHandler.js"; // Handles API errors consistently.
import { messagesRouter } from "./routes/messages.routes.js"; // Routes for ticket messages.
import { presentationRouter } from "./routes/presentation.routes.js"; // Dev presentation helpers.
import { reviewerRouter } from "./routes/reviewer.routes.js"; // Routes for reviewer actions.
import { ticketsRouter } from "./routes/tickets.routes.js"; // Routes for ticket CRUD/state.

// Dev: localhost Vite on common ports, plus private LAN hosts (same machine or phone on Wi‑Fi).
const DEV_LOCALHOST_REGEX =
  /^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\]):(?:5173|5174|5175)(?:\/)?$/;

function isPrivateLanHostname(hostname) {
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  // RFC 6598 shared space (common with Tailscale); same dev rules as other private LAN IPs.
  if (/^100\.(6[4-9]|[7-9][0-9]|10[0-9]|11[0-9]|12[0-7])\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  const m = /^172\.(\d{1,3})\./.exec(hostname);
  if (m) {
    const octet = Number(m[1]);
    if (octet >= 16 && octet <= 31) return true;
  }
  return false;
}

function isAllowedDevOrigin(origin) {
  if (DEV_LOCALHOST_REGEX.test(origin)) return true;
  try {
    const u = new URL(origin);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    const port = u.port || (u.protocol === "https:" ? "443" : "80");
    if (!isPrivateLanHostname(u.hostname)) return false;
    const p = Number(port);
    if (p === 5173 || p === 5174 || p === 5175) return true;
    if (p >= 1024 && p <= 65535) return true;
  } catch {
    return false;
  }
  return false;
}

export function createCorsOriginChecker() {
  const configuredClientOrigin = process.env.CLIENT_ORIGIN; // The production-ish allowed origin (if set).
  const isProduction = process.env.NODE_ENV === "production"; // True when we run in production mode.

  // This function is called by the CORS middleware for every request with an Origin header.
  return (origin, callback) => {
    // If the request has no Origin header (like curl), we allow it so non-browser calls still work.
    if (!origin) return callback(null, true);

    // In production, we only allow the exact CLIENT_ORIGIN (and only if it is set).
    if (isProduction) {
      return callback(null, !!configuredClientOrigin && origin === configuredClientOrigin);
    }

    // In dev, we allow:
    // 1) the exact CLIENT_ORIGIN if you set it
    // 2) localhost / 127.0.0.1 on Vite ports 5173-5175
    // 3) http(s) from private LAN IPs (so http://192.168.x.x:5173 can call the API)
    if (!!configuredClientOrigin && origin === configuredClientOrigin) return callback(null, true);
    return callback(null, isAllowedDevOrigin(origin));
  };
}

export function createApp() {
  const app = express(); // Create the express app instance.
  const corsOrigin = createCorsOriginChecker(); // Build the origin-allowing function for CORS.

  app.use(cors({ origin: corsOrigin })); // Apply CORS rules to all routes.
  app.use(express.json({ limit: "64kb" })); // Parse JSON request bodies with a small demo-safe limit.

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true }); // Simple check endpoint used by curl/preflight tests.
  });

  app.use("/api", presentationRouter); // Dev-only style URLs for presentation (/api/dev/join-urls).

  app.use("/api/tickets", ticketsRouter); // Attach ticket routes.
  app.use("/api/tickets", messagesRouter); // Attach message routes under /api/tickets.
  app.use("/api/tickets", reviewerRouter); // Attach reviewer routes under /api/tickets.

  app.use(errorHandler); // Last middleware: handle any thrown errors.

  return app; // Return the fully configured express app.
}
