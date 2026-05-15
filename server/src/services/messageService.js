import { findTicketById, insertMessage, listMessagesForTicket, touchTicket, updateTicketAiResolution } from "../db/queries.js";
import { AI_STATE, TICKET_STATUS } from "./statusConstants.js";
import { generateAiResponse } from "./ai/aiService.js";
import { detectCustomerIntent } from "./ai/customerIntent.js";
import { createId } from "../utils/ids.js";
import { assertTicketOpen, canAiRespond } from "./ticketState.js";
import { logInfo } from "../utils/logger.js";
import { nowIso } from "../utils/time.js";

const aiResponseLocks = new Map();

export async function createCustomerMessage(ticket, input) {
  const body = normalizeMessageBody(input?.body);

  if (!body) {
    const error = new Error("Message body is required.");
    error.statusCode = 400;
    throw error;
  }

  assertTicketOpen(ticket, "customer message");

  const timestamp = nowIso();
  const message = {
    id: createId("msg"),
    ticketId: ticket.id,
    senderType: "customer",
    senderName: ticket.customerName,
    body,
    metadata: null,
    createdAt: timestamp
  };

  await insertMessage(message);
  await touchTicket(ticket.id, timestamp);
  const aiResult = await maybeGenerateAiResponse(ticket);

  return {
    message,
    aiResult,
    ticket: await findTicketById(ticket.id)
  };
}

function normalizeMessageBody(value) {
  if (typeof value !== "string") return "";

  const trimmed = value.trim();
  if (trimmed.startsWith("undefined")) return "";

  return trimmed;
}

export async function getMessagesForTicket(ticketId) {
  return listMessagesForTicket(ticketId);
}

export async function maybeGenerateAiResponse(ticket) {
  const previousGeneration = aiResponseLocks.get(ticket.id) || Promise.resolve();
  let queuedGeneration;

  queuedGeneration = previousGeneration
    .catch(() => null)
    .then(() => generateLockedAiResponse(ticket))
    .finally(() => {
      if (aiResponseLocks.get(ticket.id) === queuedGeneration) {
        aiResponseLocks.delete(ticket.id);
      }
  });

  aiResponseLocks.set(ticket.id, queuedGeneration);
  return queuedGeneration;
}

async function generateLockedAiResponse(ticket) {
  const currentTicket = await findTicketById(ticket.id);

  if (!currentTicket || !canAiRespond(currentTicket)) {
    return null;
  }

  const messages = await listMessagesForTicket(currentTicket.id);
  const latestCustomerText = findLatestCustomerMessageText(messages);
  const intent = detectCustomerIntent(latestCustomerText);
  const aiReply =
    intent === "resolved"
      ? buildResolvedIntentReply(currentTicket, latestCustomerText)
      : intent === "request_human"
        ? buildRequestHumanIntentReply()
        : await generateAiResponse(currentTicket, messages);

  const latestTicket = await findTicketById(currentTicket.id);
  if (!latestTicket || !canAiRespond(latestTicket)) {
    logInfo("ai.response.discarded", {
      ticketId: currentTicket.id,
      status: latestTicket?.status,
      aiState: latestTicket?.aiState
    });
    return null;
  }

  logInfo("ai.response.generated", {
    ticketId: latestTicket.id,
    suggestedAction: aiReply.suggestedAction,
    provider: aiReply.metadata?.provider,
    model: aiReply.metadata?.model,
    fallbackReason: aiReply.metadata?.fallbackReason
  });
  const timestamp = nowIso();
  const aiMetadata = {
    suggestedAction: aiReply.suggestedAction,
    ...(aiReply.metadata || {})
  };
  const aiMessage = {
    id: createId("msg"),
    ticketId: latestTicket.id,
    senderType: "ai",
    senderName: "AI assistant",
    body: aiReply.message,
    metadata: JSON.stringify(aiMetadata),
    createdAt: timestamp
  };

  await insertMessage(aiMessage);
  await touchTicket(currentTicket.id, timestamp);

  let systemMessage = null;
  if (aiReply.suggestedAction === "suggest_resolution") {
    const summary = aiReply.resolutionSummary || "The AI assistant thinks the issue may be resolved.";
    const systemTimestamp = nowIso();
    systemMessage = {
      id: createId("msg"),
      ticketId: latestTicket.id,
      senderType: "system",
      senderName: "System",
      body: "AI suggested closure pending human review.",
      metadata: JSON.stringify({ reason: "ai_suggested_closure" }),
      createdAt: systemTimestamp
    };

    await updateTicketAiResolution(latestTicket.id, {
      status: TICKET_STATUS.PENDING_CLOSE_REVIEW,
      aiState: AI_STATE.PAUSED,
      aiResolutionSummary: summary,
      updatedAt: systemTimestamp
    });
    await insertMessage(systemMessage);
  } else if (aiReply.suggestedAction === "escalate_to_human") {
    const systemTimestamp = nowIso();
    systemMessage = {
      id: createId("msg"),
      ticketId: latestTicket.id,
      senderType: "system",
      senderName: "System",
      body: "Ticket escalated for human review.",
      metadata: JSON.stringify({ reason: "ai_escalated_to_human" }),
      createdAt: systemTimestamp
    };

    await updateTicketAiResolution(latestTicket.id, {
      status: TICKET_STATUS.HUMAN_REVIEW,
      aiState: AI_STATE.PAUSED,
      aiResolutionSummary: latestTicket.aiResolutionSummary,
      updatedAt: systemTimestamp
    });
    await insertMessage(systemMessage);
  }

  return { aiMessage, systemMessage };
}

function findLatestCustomerMessageText(messages) {
  if (!Array.isArray(messages)) return "";

  const latestCustomerMessage = [...messages]
    .reverse()
    .find((message) => message?.senderType === "customer" || message?.sender_type === "customer");

  return typeof latestCustomerMessage?.body === "string" ? latestCustomerMessage.body : "";
}

function buildResolvedIntentReply(ticket, latestCustomerText) {
  return {
    message: "Glad it’s working now. I’ll send this for human closure review.",
    suggestedAction: "suggest_resolution",
    resolutionSummary: buildIntentResolutionSummary(ticket, latestCustomerText),
    metadata: {
      provider: "intent",
      model: "intent-v1",
      responseMode: "intent"
    }
  };
}

function buildRequestHumanIntentReply() {
  return {
    message: "No problem — I’ll send this to a human reviewer.",
    suggestedAction: "escalate_to_human",
    metadata: {
      provider: "intent",
      model: "intent-v1",
      responseMode: "intent"
    }
  };
}

function buildIntentResolutionSummary(ticket, latestCustomerText) {
  const title = String(ticket?.title || "").trim();
  const ticketPart = title ? `${title}` : "Ticket appears resolved";
  const customerPart = String(latestCustomerText || "").trim();
  if (!customerPart) return ticketPart;
  return `${ticketPart}. Customer said: "${truncate(customerPart, 140)}"`;
}

function truncate(value, maxLen) {
  const text = String(value || "");
  if (text.length <= maxLen) return text;
  return `${text.slice(0, Math.max(0, maxLen - 1)).trimEnd()}…`;
}
