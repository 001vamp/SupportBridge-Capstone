import {
  findTicketById,
  insertMessage,
  listMessagesForTicket,
  touchTicket,
  updateTicketReviewerState
} from "../db/queries.js";
import { createId } from "../utils/ids.js";
import { logInfo } from "../utils/logger.js";
import { nowIso } from "../utils/time.js";
import { AI_STATE, TICKET_STATUS } from "./statusConstants.js";
import { assertTicketOpen, makeHttpError, statusAfterAiResume } from "./ticketState.js";

async function requireTicket(ticketId) {
  const ticket = await findTicketById(ticketId);
  if (!ticket) {
    throw makeHttpError("Ticket not found.", 404);
  }

  return ticket;
}

function assertNotClosed(ticket) {
  assertTicketOpen(ticket, "reviewer action");
}

function createSystemMessage(ticketId, body, action, timestamp, metadata = {}) {
  return {
    id: createId("msg"),
    ticketId,
    senderType: "system",
    senderName: "System",
    body,
    metadata: JSON.stringify({ action, ...metadata }),
    createdAt: timestamp
  };
}

function fieldOrCurrent(update, ticket, field) {
  return Object.hasOwn(update, field) ? update[field] : ticket[field];
}

async function applyReviewerAction(ticketId, buildUpdate) {
  const ticket = await requireTicket(ticketId);
  assertNotClosed(ticket);

  const timestamp = nowIso();
  const update = buildUpdate(ticket, timestamp);

  await updateTicketReviewerState(ticket.id, {
    status: fieldOrCurrent(update, ticket, "status"),
    aiState: fieldOrCurrent(update, ticket, "aiState"),
    aiResolutionSummary: fieldOrCurrent(update, ticket, "aiResolutionSummary"),
    closureRejectedReason: fieldOrCurrent(update, ticket, "closureRejectedReason"),
    updatedAt: timestamp,
    closedAt: fieldOrCurrent(update, ticket, "closedAt")
  });

  const systemMessage = createSystemMessage(
    ticket.id,
    update.systemBody,
    update.action,
    timestamp,
    update.metadata
  );
  await insertMessage(systemMessage);
  logInfo("reviewer.action", {
    ticketId: ticket.id,
    action: update.action,
    status: fieldOrCurrent(update, ticket, "status"),
    aiState: fieldOrCurrent(update, ticket, "aiState")
  });

  return {
    ticket: await findTicketById(ticket.id),
    systemMessage
  };
}

export async function pauseAi(ticketId) {
  return applyReviewerAction(ticketId, (ticket) => {
    if (ticket.aiState === AI_STATE.DISABLED) {
      throw makeHttpError("Disabled AI cannot be paused.", 409);
    }

    return {
      action: "pause_ai",
      aiState: AI_STATE.PAUSED,
      systemBody: "AI paused by reviewer."
    };
  });
}

export async function resumeAi(ticketId) {
  return applyReviewerAction(ticketId, (ticket) => ({
    action: "resume_ai",
    status: statusAfterAiResume(ticket),
    aiState: AI_STATE.ACTIVE,
    systemBody: "AI resumed by reviewer."
  }));
}

export async function takeoverTicket(ticketId) {
  return applyReviewerAction(ticketId, (ticket) => {
    if (ticket.status === TICKET_STATUS.PENDING_CLOSE_REVIEW) {
      throw makeHttpError("Resolve or reject closure review before takeover.", 409);
    }

    return {
      action: "takeover",
      status: TICKET_STATUS.HUMAN_TAKEOVER,
      aiState: AI_STATE.TAKEN_OVER,
      systemBody: "Human reviewer took over."
    };
  });
}

export async function releaseTicket(ticketId) {
  return applyReviewerAction(ticketId, (ticket) => {
    if (ticket.status !== TICKET_STATUS.HUMAN_TAKEOVER || ticket.aiState !== AI_STATE.TAKEN_OVER) {
      throw makeHttpError("Only tickets in human takeover can be released.", 409);
    }

    return {
      action: "release",
      status: TICKET_STATUS.AI_ACTIVE,
      aiState: AI_STATE.ACTIVE,
      systemBody: "Human reviewer released takeover."
    };
  });
}

export async function createReviewerMessage(ticketId, input) {
  const ticket = await requireTicket(ticketId);
  assertNotClosed(ticket);
  if (ticket.aiState === AI_STATE.ACTIVE) {
    throw makeHttpError("Pause AI or take over before sending a human message.", 409);
  }

  const body = normalizeMessageBody(input?.body);
  if (!body) {
    throw makeHttpError("Message body is required.", 400);
  }

  const timestamp = nowIso();
  const message = {
    id: createId("msg"),
    ticketId: ticket.id,
    senderType: "human",
    senderName: input.senderName?.trim() || "Reviewer",
    body,
    metadata: null,
    createdAt: timestamp
  };

  await insertMessage(message);
  await touchTicket(ticket.id, timestamp);

  return {
    ticket: await findTicketById(ticket.id),
    message
  };
}

function normalizeMessageBody(value) {
  if (typeof value !== "string") return "";

  const trimmed = value.trim();
  if (trimmed.startsWith("undefined")) return "";

  return trimmed;
}

export async function listReviewerMessages(ticketId) {
  const ticket = await requireTicket(ticketId);
  const messages = await listMessagesForTicket(ticket.id);
  return { ticket, messages };
}

export async function rejectClosure(ticketId, input = {}) {
  return applyReviewerAction(ticketId, (ticket) => {
    if (ticket.status !== TICKET_STATUS.PENDING_CLOSE_REVIEW) {
      throw makeHttpError("Only tickets pending close review can reject closure.", 409);
    }

    const reason = input.reason?.trim() || null;

    return {
      action: "reject_closure",
      status: TICKET_STATUS.HUMAN_REVIEW,
      aiState: AI_STATE.PAUSED,
      aiResolutionSummary: null,
      closureRejectedReason: reason,
      systemBody: reason
        ? `Human reviewer rejected AI closure: ${reason}`
        : "Human reviewer rejected AI closure.",
      metadata: reason ? { reason } : {}
    };
  });
}

export async function confirmClosure(ticketId) {
  const ticket = await requireTicket(ticketId);
  if (ticket.status !== TICKET_STATUS.PENDING_CLOSE_REVIEW) {
    throw makeHttpError("Only tickets pending close review can be closed.", 409);
  }

  const timestamp = nowIso();
  await updateTicketReviewerState(ticket.id, {
    status: TICKET_STATUS.CLOSED,
    aiState: AI_STATE.DISABLED,
    aiResolutionSummary: ticket.aiResolutionSummary,
    closureRejectedReason: ticket.closureRejectedReason,
    updatedAt: timestamp,
    closedAt: timestamp
  });

  const systemMessage = createSystemMessage(
    ticket.id,
    "Human reviewer confirmed closure.",
    "confirm_closure",
    timestamp
  );
  await insertMessage(systemMessage);
  logInfo("closure.confirmed", { ticketId: ticket.id, status: TICKET_STATUS.CLOSED });

  return {
    ticket: await findTicketById(ticket.id),
    systemMessage
  };
}

/** Close ticket immediately (any open state). Pending-close flow can still use confirm closure; this is for direct reviewer shutdown. */
export async function closeTicketAsReviewer(ticketId) {
  const ticket = await requireTicket(ticketId);
  if (ticket.status === TICKET_STATUS.CLOSED) {
    throw makeHttpError("Ticket is already closed.", 409);
  }

  const timestamp = nowIso();
  await updateTicketReviewerState(ticket.id, {
    status: TICKET_STATUS.CLOSED,
    aiState: AI_STATE.DISABLED,
    aiResolutionSummary: ticket.aiResolutionSummary,
    closureRejectedReason: ticket.closureRejectedReason,
    updatedAt: timestamp,
    closedAt: timestamp
  });

  const systemMessage = createSystemMessage(
    ticket.id,
    "Ticket closed by reviewer.",
    "reviewer_close",
    timestamp
  );
  await insertMessage(systemMessage);
  logInfo("reviewer.action", {
    ticketId: ticket.id,
    action: "reviewer_close",
    status: TICKET_STATUS.CLOSED,
    aiState: AI_STATE.DISABLED
  });

  return {
    ticket: await findTicketById(ticket.id),
    systemMessage
  };
}

export async function reopenTicket(ticketId) {
  const ticket = await requireTicket(ticketId);
  if (ticket.status !== TICKET_STATUS.CLOSED) {
    throw makeHttpError("Only closed tickets can be reopened.", 409);
  }

  const timestamp = nowIso();

  await updateTicketReviewerState(ticket.id, {
    status: TICKET_STATUS.HUMAN_REVIEW,
    aiState: AI_STATE.PAUSED,
    aiResolutionSummary: ticket.aiResolutionSummary,
    closureRejectedReason: ticket.closureRejectedReason,
    updatedAt: timestamp,
    closedAt: null
  });

  const systemMessage = createSystemMessage(
    ticket.id,
    "Ticket reopened by reviewer.",
    "reopen",
    timestamp
  );
  await insertMessage(systemMessage);
  logInfo("reviewer.action", {
    ticketId: ticket.id,
    action: "reopen",
    status: TICKET_STATUS.HUMAN_REVIEW,
    aiState: AI_STATE.PAUSED
  });

  return {
    ticket: await findTicketById(ticket.id),
    systemMessage
  };
}
