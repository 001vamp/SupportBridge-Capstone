import dotenv from "dotenv";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import { initializeDatabase } from "./db/connection.js";
import { initializeSocketServer } from "./sockets/socketServer.js";
import { logHermesStartupCheck } from "./utils/hermesStartupCheck.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load repo-root .env first (optional), then server/.env so the server package always picks up Hermes vars even if cwd differs.
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const port = Number(process.env.PORT || 3001);
const listenHost = process.env.LISTEN_HOST || "0.0.0.0";

await logHermesStartupCheck();
await initializeDatabase();

const app = createApp();
const httpServer = createServer(app);

initializeSocketServer(httpServer);

httpServer.listen(port, listenHost, () => {
  const hint = listenHost === "0.0.0.0" ? "LAN + localhost" : listenHost;
  console.log(`SupportBridge API on port ${port} (${hint}) — e.g. http://localhost:${port}/api/health`);
});
