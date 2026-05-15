import fs from "node:fs/promises";
import path from "node:path";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

let db;

function resolveDatabasePath() {
  return path.resolve(process.env.DATABASE_PATH || "server/data/supportbridge.sqlite");
}

export async function getDatabase() {
  if (!db) {
    const filename = resolveDatabasePath();
    await fs.mkdir(path.dirname(filename), { recursive: true });
    db = await open({
      filename,
      driver: sqlite3.Database
    });
    await db.exec("PRAGMA foreign_keys = ON");
    // WAL + busy wait: many demo browsers can write at once (new tickets, messages) without SQLITE_BUSY as often.
    await db.exec("PRAGMA journal_mode = WAL");
    await db.exec("PRAGMA synchronous = NORMAL");
    await db.exec("PRAGMA busy_timeout = 8000");
  }

  return db;
}

export async function initializeDatabase() {
  const database = await getDatabase();
  const schemaPath = new URL("./schema.sql", import.meta.url);
  const schema = await fs.readFile(schemaPath, "utf8");
  await database.exec(schema);
}
