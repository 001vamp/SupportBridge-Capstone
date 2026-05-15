import { findTicketById, insertMessage, touchTicket, updateTicketReviewerState } from "../db/queries.js";
import { createId } from "../utils/ids.js";
import { logInfo } from "../utils/logger.js";
import { nowIso } from "../utils/time.js";
import { AI_STATE, TICKET_STATUS } from "./statusConstants.js";
import { assertTicketOpen, makeHttpError } from "./ticketState.js";

/**
 * Customer explicitly requests a human. Pauses AI (same as AI-driven escalation) so the bot stops replying.
 * Does not change status when a reviewer is already in full takeover (human is already in control).
 */
export async function customerEscalateToHuman(ticketId, input = {}) {
  const ticket = await findTicketById(ticketId);
  if (!ticket) {
    throw makeHttpError("Ticket not found.", 404);
  }

  assertTicketOpen(ticket, "escalation");

  if (ticket.status === TICKET_STATUS.HUMAN_TAKEOVER && ticket.aiState === AI_STATE.TAKEN_OVER) {
    logInfo("customer.escalate.skipped", { ticketId, reason: "human_takeover_active" });
    return { ticket, systemMessage: null, skipped: true };
  }

  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  const timestamp = nowIso();
  const leavingPendingClose = ticket.status === TICKET_STATUS.PENDING_CLOSE_REVIEW;

  const systemBody = reason
    ? `Customer requested a human reviewer: ${reason}`
    : "Customer requested a human reviewer. AI is paused until a reviewer responds.";

  const systemMessage = {
    id: createId("msg"),
    ticketId: ticket.id,
    senderType: "system",
    senderName: "System",
    body: systemBody,
    metadata: JSON.stringify({ action: "customer_escalate", reason: reason || undefined }),
    createdAt: timestamp
  };

  await updateTicketReviewerState(ticket.id, {
    status: TICKET_STATUS.HUMAN_REVIEW,
    aiState: AI_STATE.PAUSED,
    aiResolutionSummary: leavingPendingClose ? null : ticket.aiResolutionSummary,
    closureRejectedReason: leavingPendingClose ? reason || "Customer requested a human during closure review." : ticket.closureRejectedReason,
    updatedAt: timestamp,
    closedAt: null
  });

  await insertMessage(systemMessage);
  await touchTicket(ticket.id, timestamp);

  logInfo("customer.escalate", { ticketId: ticket.id });

  return {
    ticket: await findTicketById(ticket.id),
    systemMessage,
    skipped: false
  };
}
