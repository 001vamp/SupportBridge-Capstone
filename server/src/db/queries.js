import { getDatabase } from "./connection.js";

export async function insertTicket(ticket) {
  const db = await getDatabase();
  await db.run(
    `INSERT INTO tickets (
      id, customer_name, customer_email, title, description, category,
      status, ai_state, internal_notes, ai_resolution_summary,
      closure_rejected_reason, created_at, updated_at, closed_at
    ) VALUES (
      $id, $customerName, $customerEmail, $title, $description, $category,
      $status, $aiState, $internalNotes, $aiResolutionSummary,
      $closureRejectedReason, $createdAt, $updatedAt, $closedAt
    )`,
    {
      $id: ticket.id,
      $customerName: ticket.customerName,
      $customerEmail: ticket.customerEmail,
      $title: ticket.title,
      $description: ticket.description,
      $category: ticket.category,
      $status: ticket.status,
      $aiState: ticket.aiState,
      $internalNotes: ticket.internalNotes,
      $aiResolutionSummary: ticket.aiResolutionSummary,
      $closureRejectedReason: ticket.closureRejectedReason,
      $createdAt: ticket.createdAt,
      $updatedAt: ticket.updatedAt,
      $closedAt: ticket.closedAt
    }
  );
}

export async function listTickets() {
  const db = await getDatabase();
  return db.all(
    `SELECT
      id,
      customer_name AS customerName,
      customer_email AS customerEmail,
      title,
      description,
      category,
      status,
      ai_state AS aiState,
      internal_notes AS internalNotes,
      ai_resolution_summary AS aiResolutionSummary,
      closure_rejected_reason AS closureRejectedReason,
      created_at AS createdAt,
      updated_at AS updatedAt,
      closed_at AS closedAt
    FROM tickets
    ORDER BY updated_at DESC`
  );
}

export async function findTicketById(ticketId) {
  const db = await getDatabase();
  return db.get(
    `SELECT
      id,
      customer_name AS customerName,
      customer_email AS customerEmail,
      title,
      description,
      category,
      status,
      ai_state AS aiState,
      internal_notes AS internalNotes,
      ai_resolution_summary AS aiResolutionSummary,
      closure_rejected_reason AS closureRejectedReason,
      created_at AS createdAt,
      updated_at AS updatedAt,
      closed_at AS closedAt
    FROM tickets
    WHERE id = ?`,
    ticketId
  );
}

export async function touchTicket(ticketId, updatedAt) {
  const db = await getDatabase();
  await db.run(
    "UPDATE tickets SET updated_at = $updatedAt WHERE id = $ticketId",
    { $updatedAt: updatedAt, $ticketId: ticketId }
  );
}

export async function updateTicketAiResolution(ticketId, fields) {
  const db = await getDatabase();
  await db.run(
    `UPDATE tickets
    SET
      status = $status,
      ai_state = $aiState,
      ai_resolution_summary = $aiResolutionSummary,
      updated_at = $updatedAt
    WHERE id = $ticketId`,
    {
      $ticketId: ticketId,
      $status: fields.status,
      $aiState: fields.aiState,
      $aiResolutionSummary: fields.aiResolutionSummary,
      $updatedAt: fields.updatedAt
    }
  );
}

export async function updateTicketReviewerState(ticketId, fields) {
  const db = await getDatabase();
  await db.run(
    `UPDATE tickets
    SET
      status = $status,
      ai_state = $aiState,
      ai_resolution_summary = $aiResolutionSummary,
      closure_rejected_reason = $closureRejectedReason,
      updated_at = $updatedAt,
      closed_at = $closedAt
    WHERE id = $ticketId`,
    {
      $ticketId: ticketId,
      $status: fields.status,
      $aiState: fields.aiState,
      $aiResolutionSummary: fields.aiResolutionSummary,
      $closureRejectedReason: fields.closureRejectedReason,
      $updatedAt: fields.updatedAt,
      $closedAt: fields.closedAt
    }
  );
}

export async function insertMessage(message) {
  const db = await getDatabase();
  await db.run(
    `INSERT INTO messages (
      id, ticket_id, sender_type, sender_name, body, metadata, created_at
    ) VALUES (
      $id, $ticketId, $senderType, $senderName, $body, $metadata, $createdAt
    )`,
    {
      $id: message.id,
      $ticketId: message.ticketId,
      $senderType: message.senderType,
      $senderName: message.senderName,
      $body: message.body,
      $metadata: message.metadata,
      $createdAt: message.createdAt
    }
  );
}

export async function listMessagesForTicket(ticketId) {
  const db = await getDatabase();
  return db.all(
    `SELECT
      id,
      ticket_id AS ticketId,
      sender_type AS senderType,
      sender_name AS senderName,
      body,
      metadata,
      created_at AS createdAt
    FROM messages
    WHERE ticket_id = ?
    ORDER BY created_at ASC`,
    ticketId
  );
}
