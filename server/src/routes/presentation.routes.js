import os from "node:os";
import { Router } from "express";

export const presentationRouter = Router();

/**
 * Lists likely browser URLs for the Vite app (same host as this API machine, dev port).
 * Used by /join presentation page; safe read-only machine info.
 */
presentationRouter.get("/dev/join-urls", (_req, res) => {
  const protocol = getDevClientProtocol();
  const port = getViteDevPort();
  const joinPath = "/join";

  const hostSet = new Map();

  hostSet.set("localhost", { kind: "localhost", host: "localhost" });
  hostSet.set("127.0.0.1", { kind: "loopback", host: "127.0.0.1" });

  const nets = os.networkInterfaces();
  for (const list of Object.values(nets)) {
    if (!list) continue;
    for (const addr of list) {
      if (addr.family !== "IPv4" || addr.internal) continue;
      hostSet.set(addr.address, { kind: "lan", host: addr.address });
    }
  }

  const order = (a, b) => {
    const rank = { localhost: 0, loopback: 1, lan: 2 };
    return rank[a.kind] - rank[b.kind] || a.host.localeCompare(b.host);
  };

  const entries = [...hostSet.values()]
    .sort(order)
    .map(({ kind, host }) => ({
      kind,
      host,
      url: `${protocol}//${host}:${port}${joinPath}`
    }));

  res.json({ joinPath, port, protocol: protocol.replace(":", ""), entries });
});

function getDevClientProtocol() {
  const co = process.env.CLIENT_ORIGIN?.trim();
  if (co) {
    try {
      const u = new URL(co);
      return u.protocol === "https:" ? "https:" : "http:";
    } catch {
      /* ignore */
    }
  }
  return "http:";
}

function getViteDevPort() {
  const co = process.env.CLIENT_ORIGIN?.trim();
  if (co) {
    try {
      const u = new URL(co);
      const p = u.port;
      if (p) return Number(p);
      return u.protocol === "https:" ? 443 : 80;
    } catch {
      /* ignore */
    }
  }
  return 5173;
}
