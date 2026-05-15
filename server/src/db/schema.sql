CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT,

  status TEXT NOT NULL,
  ai_state TEXT NOT NULL,

  internal_notes TEXT,

  ai_resolution_summary TEXT,
  closure_rejected_reason TEXT,

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  closed_at TEXT
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL,

  sender_type TEXT NOT NULL,
  sender_name TEXT,
  body TEXT NOT NULL,

  metadata TEXT,

  created_at TEXT NOT NULL,

  FOREIGN KEY (ticket_id) REFERENCES tickets(id)
);

CREATE INDEX IF NOT EXISTS idx_messages_ticket_id_created_at
ON messages(ticket_id, created_at);

CREATE INDEX IF NOT EXISTS idx_tickets_status_updated_at
ON tickets(status, updated_at);
