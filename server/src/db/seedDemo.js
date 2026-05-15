/**
 * Local demo only: wipes tickets + messages and inserts fixed capstone demo rows.
 * Run: npm run seed:demo (from repo root or server workspace).
 * Never runs on app start.
 */
import dotenv from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

import { AI_STATE, TICKET_STATUS } from "../services/statusConstants.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.join(__dirname, "../../.env") });

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to seed demo data: NODE_ENV is production.");
  process.exit(1);
}

function resolveDbFilename() {
  const raw = process.env.DATABASE_PATH?.trim();
  if (!raw) return path.join(__dirname, "../../data/supportbridge.sqlite");
  if (path.isAbsolute(raw)) return raw;
  return path.resolve(process.cwd(), raw);
}

async function openDb() {
  const filename = resolveDbFilename();
  await fs.mkdir(path.dirname(filename), { recursive: true });
  const db = await open({ filename, driver: sqlite3.Database });
  await db.exec("PRAGMA foreign_keys = ON");
  return db;
}

async function ensureSchema(db) {
  const schemaPath = new URL("./schema.sql", import.meta.url);
  const schema = await fs.readFile(schemaPath, "utf8");
  await db.exec(schema);
}

function iso(minuteOffsetFromBase) {
  const base = Date.parse("2026-05-10T12:00:00.000Z");
  return new Date(base + minuteOffsetFromBase * 60_000).toISOString();
}

async function main() {
  const db = await openDb();
  await ensureSchema(db);

  console.warn("");
  console.warn("SupportBridge DEMO SEED — this DELETES all rows in messages and tickets.");
  console.warn(`Database file: ${resolveDbFilename()}`);
  console.warn("");

  await db.exec("BEGIN IMMEDIATE");
  try {
    await db.run("DELETE FROM messages");
    await db.run("DELETE FROM tickets");

    const tickets = [
      {
        id: "ticket_demo_wifi",
        customerName: "Demo User",
        customerEmail: "demo.user@example.com",
        title: "Wi-Fi is not working",
        description: "My laptop cannot connect to Wi-Fi.",
        category: "Network",
        status: TICKET_STATUS.AI_ACTIVE,
        aiState: AI_STATE.ACTIVE,
        aiResolutionSummary: null,
        closureRejectedReason: null,
        createdAt: iso(0),
        updatedAt: iso(3),
        closedAt: null,
        messages: [
          {
            id: "msg_demo_wifi_1",
            senderType: "customer",
            senderName: "Demo User",
            body: "My laptop cannot connect to Wi-Fi.",
            metadata: null,
            createdAt: iso(1)
          },
          {
            id: "msg_demo_wifi_2",
            senderType: "ai",
            senderName: "AI assistant",
            body: "Got it, Wi-Fi issues are annoying. Let’s try the basics first.\n\n1. Turn Wi-Fi off and back on.\n2. Restart your device.\n3. Check if another device can connect to the same Wi-Fi.\n\nAre you on Windows, Mac, iPhone, or Android?",
            metadata: JSON.stringify({ suggestedAction: "continue_troubleshooting", provider: "demo_seed" }),
            createdAt: iso(3)
          }
        ]
      },
      {
        id: "ticket_demo_vpn",
        customerName: "Alex Johnson",
        customerEmail: "alex.johnson@example.com",
        title: "VPN will not connect",
        description: "VPN fails when connecting from home.",
        category: "VPN",
        status: TICKET_STATUS.HUMAN_REVIEW,
        aiState: AI_STATE.PAUSED,
        aiResolutionSummary: null,
        closureRejectedReason: null,
        createdAt: iso(10),
        updatedAt: iso(18),
        closedAt: null,
        messages: [
          {
            id: "msg_demo_vpn_1",
            senderType: "customer",
            senderName: "Alex Johnson",
            body: "My VPN will not connect from home.",
            metadata: null,
            createdAt: iso(11)
          },
          {
            id: "msg_demo_vpn_2",
            senderType: "ai",
            senderName: "AI assistant",
            body: "Got it, let’s try the basics first. Restart the VPN app, check your internet connection, and try signing in again.",
            metadata: JSON.stringify({ suggestedAction: "continue_troubleshooting", provider: "demo_seed" }),
            createdAt: iso(13)
          },
          {
            id: "msg_demo_vpn_3",
            senderType: "customer",
            senderName: "Alex Johnson",
            body: "That did not work. I want a human.",
            metadata: null,
            createdAt: iso(15)
          },
          {
            id: "msg_demo_vpn_4",
            senderType: "ai",
            senderName: "AI assistant",
            body: "No problem — I’ll send this to a human reviewer.",
            metadata: JSON.stringify({ suggestedAction: "escalate_to_human", provider: "demo_seed" }),
            createdAt: iso(16)
          },
          {
            id: "msg_demo_vpn_5",
            senderType: "system",
            senderName: "System",
            body: "Ticket moved to human review.",
            metadata: JSON.stringify({ reason: "demo_seed_human_review" }),
            createdAt: iso(18)
          }
        ]
      },
      {
        id: "ticket_demo_login",
        customerName: "Maria Lopez",
        customerEmail: "maria.lopez@example.com",
        title: "Cannot log in to my account",
        description: "Customer could not log into their account.",
        category: "Login",
        status: TICKET_STATUS.PENDING_CLOSE_REVIEW,
        aiState: AI_STATE.PAUSED,
        aiResolutionSummary:
          "Customer confirmed the login issue is resolved after resetting their password.",
        closureRejectedReason: null,
        createdAt: iso(30),
        updatedAt: iso(38),
        closedAt: null,
        messages: [
          {
            id: "msg_demo_login_1",
            senderType: "customer",
            senderName: "Maria Lopez",
            body: "I cannot log in to my account.",
            metadata: null,
            createdAt: iso(31)
          },
          {
            id: "msg_demo_login_2",
            senderType: "ai",
            senderName: "AI assistant",
            body: "Got it, login issues are frustrating. Try checking Caps Lock, resetting your password, and waiting a few minutes if the account was locked.",
            metadata: JSON.stringify({ suggestedAction: "continue_troubleshooting", provider: "demo_seed" }),
            createdAt: iso(33)
          },
          {
            id: "msg_demo_login_3",
            senderType: "customer",
            senderName: "Maria Lopez",
            body: "That worked, thank you.",
            metadata: null,
            createdAt: iso(35)
          },
          {
            id: "msg_demo_login_4",
            senderType: "ai",
            senderName: "AI assistant",
            body: "Glad it’s working now. I’ll send this for human closure review.",
            metadata: JSON.stringify({ suggestedAction: "suggest_resolution", provider: "demo_seed" }),
            createdAt: iso(36)
          },
          {
            id: "msg_demo_login_5",
            senderType: "system",
            senderName: "System",
            body: "AI suggested closure pending human review.",
            metadata: JSON.stringify({ reason: "ai_suggested_closure" }),
            createdAt: iso(38)
          }
        ]
      },
      {
        id: "ticket_demo_printer",
        customerName: "Sam Turner",
        customerEmail: "sam.turner@example.com",
        title: "Printer will not print",
        description: "Printer showed offline and would not print.",
        category: "Printer",
        status: TICKET_STATUS.CLOSED,
        aiState: AI_STATE.DISABLED,
        aiResolutionSummary:
          "Customer confirmed the printer worked after restarting the printer and clearing the print queue.",
        closureRejectedReason: null,
        createdAt: iso(50),
        updatedAt: iso(62),
        closedAt: iso(62),
        messages: [
          {
            id: "msg_demo_printer_1",
            senderType: "customer",
            senderName: "Sam Turner",
            body: "The office printer will not print.",
            metadata: null,
            createdAt: iso(51)
          },
          {
            id: "msg_demo_printer_2",
            senderType: "ai",
            senderName: "AI assistant",
            body: "Got it, printer issues are annoying. Try restarting the printer, checking if it says offline, and clearing the print queue.",
            metadata: JSON.stringify({ suggestedAction: "continue_troubleshooting", provider: "demo_seed" }),
            createdAt: iso(53)
          },
          {
            id: "msg_demo_printer_3",
            senderType: "customer",
            senderName: "Sam Turner",
            body: "Restarting it worked.",
            metadata: null,
            createdAt: iso(55)
          },
          {
            id: "msg_demo_printer_4",
            senderType: "ai",
            senderName: "AI assistant",
            body: "Glad it worked. I’ll send this for human closure review.",
            metadata: JSON.stringify({ suggestedAction: "suggest_resolution", provider: "demo_seed" }),
            createdAt: iso(56)
          },
          {
            id: "msg_demo_printer_5",
            senderType: "system",
            senderName: "System",
            body: "AI suggested closure pending human review.",
            metadata: JSON.stringify({ reason: "ai_suggested_closure" }),
            createdAt: iso(57)
          },
          {
            id: "msg_demo_printer_6",
            senderType: "human",
            senderName: "Reviewer",
            body: "Confirmed. Closing this ticket.",
            metadata: null,
            createdAt: iso(60)
          },
          {
            id: "msg_demo_printer_7",
            senderType: "system",
            senderName: "System",
            body: "Human reviewer confirmed closure.",
            metadata: JSON.stringify({ action: "confirm_closure" }),
            createdAt: iso(62)
          }
        ]
      },
      {
        id: "ticket_demo_outlook",
        customerName: "Jordan Lee",
        customerEmail: "jordan.lee@example.com",
        title: "Outlook not receiving emails",
        description: "Outlook stopped receiving new mail.",
        category: "Email",
        status: TICKET_STATUS.HUMAN_TAKEOVER,
        aiState: AI_STATE.TAKEN_OVER,
        aiResolutionSummary: null,
        closureRejectedReason: null,
        createdAt: iso(70),
        updatedAt: iso(78),
        closedAt: null,
        messages: [
          {
            id: "msg_demo_outlook_1",
            senderType: "customer",
            senderName: "Jordan Lee",
            body: "Outlook is not receiving new emails.",
            metadata: null,
            createdAt: iso(71)
          },
          {
            id: "msg_demo_outlook_2",
            senderType: "ai",
            senderName: "AI assistant",
            body: "Got it, email issues are frustrating. Try refreshing Outlook, checking your internet connection, and signing out then back in.",
            metadata: JSON.stringify({ suggestedAction: "continue_troubleshooting", provider: "demo_seed" }),
            createdAt: iso(73)
          },
          {
            id: "msg_demo_outlook_3",
            senderType: "customer",
            senderName: "Jordan Lee",
            body: "I still do not see new messages.",
            metadata: null,
            createdAt: iso(75)
          },
          {
            id: "msg_demo_outlook_4",
            senderType: "system",
            senderName: "System",
            body: "Human reviewer took over.",
            metadata: JSON.stringify({ action: "takeover" }),
            createdAt: iso(76)
          },
          {
            id: "msg_demo_outlook_5",
            senderType: "human",
            senderName: "Reviewer",
            body: "I’m checking this now. Can you confirm if Outlook says “Working Offline”?",
            metadata: null,
            createdAt: iso(78)
          }
        ]
      },
      {
        id: "ticket_demo_slow_laptop",
        customerName: "Taylor Smith",
        customerEmail: "taylor.smith@example.com",
        title: "Laptop running slow",
        description: "Customer reports slow laptop performance.",
        category: "Performance",
        status: TICKET_STATUS.WAITING_CUSTOMER,
        aiState: AI_STATE.ACTIVE,
        aiResolutionSummary: null,
        closureRejectedReason: null,
        createdAt: iso(90),
        updatedAt: iso(93),
        closedAt: null,
        messages: [
          {
            id: "msg_demo_slow_1",
            senderType: "customer",
            senderName: "Taylor Smith",
            body: "My laptop has been really slow today.",
            metadata: null,
            createdAt: iso(91)
          },
          {
            id: "msg_demo_slow_2",
            senderType: "ai",
            senderName: "AI assistant",
            body: "Got it, slow computers are frustrating. Try restarting it, closing unused apps, and checking if storage is almost full. Did this start after opening a specific app?",
            metadata: JSON.stringify({ suggestedAction: "ask_customer", provider: "demo_seed" }),
            createdAt: iso(93)
          }
        ]
      }
    ];

    for (const t of tickets) {
      await db.run(
        `INSERT INTO tickets (
          id, customer_name, customer_email, title, description, category,
          status, ai_state, internal_notes, ai_resolution_summary,
          closure_rejected_reason, created_at, updated_at, closed_at
        ) VALUES (
          $id, $customerName, $customerEmail, $title, $description, $category,
          $status, $aiState, NULL, $aiResolutionSummary,
          $closureRejectedReason, $createdAt, $updatedAt, $closedAt
        )`,
        {
          $id: t.id,
          $customerName: t.customerName,
          $customerEmail: t.customerEmail,
          $title: t.title,
          $description: t.description,
          $category: t.category,
          $status: t.status,
          $aiState: t.aiState,
          $aiResolutionSummary: t.aiResolutionSummary,
          $closureRejectedReason: t.closureRejectedReason,
          $createdAt: t.createdAt,
          $updatedAt: t.updatedAt,
          $closedAt: t.closedAt
        }
      );

      for (const m of t.messages) {
        await db.run(
          `INSERT INTO messages (
            id, ticket_id, sender_type, sender_name, body, metadata, created_at
          ) VALUES ($id, $ticketId, $senderType, $senderName, $body, $metadata, $createdAt)`,
          {
            $id: m.id,
            $ticketId: t.id,
            $senderType: m.senderType,
            $senderName: m.senderName,
            $body: m.body,
            $metadata: m.metadata,
            $createdAt: m.createdAt
          }
        );
      }
    }

    await db.exec("COMMIT");
  } catch (error) {
    await db.exec("ROLLBACK");
    throw error;
  }

  await db.close();

  console.log("");
  console.log("Demo database reset complete.");
  console.log("Created 6 tickets.");
  console.log("Active: 1");
  console.log("Human Review: 1");
  console.log("Pending Close: 1");
  console.log("Closed: 1");
  console.log("Human Takeover: 1");
  console.log("Waiting Customer: 1");
  console.log("");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
