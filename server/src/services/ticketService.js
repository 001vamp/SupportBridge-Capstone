import { createId } from "../utils/ids.js";
import { nowIso } from "../utils/time.js";
import { findTicketById, insertTicket, listTickets } from "../db/queries.js";
import { maybeGenerateAiResponse } from "./messageService.js";
import { AI_STATE, TICKET_STATUS } from "./statusConstants.js";
import { logInfo } from "../utils/logger.js";

const MAX_FIELD_LENGTHS = {
  customerName: 120,
  customerEmail: 254,
  title: 160,
  description: 5000,
  category: 80
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function createTicket(input) {
  const timestamp = nowIso();
  const ticket = {
    id: createId("ticket"),
    customerName: input.customerName.trim(),
    customerEmail: input.customerEmail?.trim() || null,
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category?.trim() || null,
    status: TICKET_STATUS.AI_ACTIVE,
    aiState: AI_STATE.ACTIVE,
    internalNotes: null,
    aiResolutionSummary: null,
    closureRejectedReason: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    closedAt: null
  };

  await insertTicket(ticket);
  logInfo("ticket.created", { ticketId: ticket.id, status: ticket.status, aiState: ticket.aiState });
  await maybeGenerateAiResponse(ticket);
  return findTicketById(ticket.id);
}

export async function getTickets() {
  return listTickets();
}

export async function getTicket(ticketId) {
  return findTicketById(ticketId);
}

export function validateTicketInput(input) {
  const errors = [];

  if (!input.customerName?.trim()) errors.push("Customer name is required.");
  if (!input.title?.trim()) errors.push("Title is required.");
  if (!input.description?.trim()) errors.push("Description is required.");
  if (input.customerEmail?.trim() && !EMAIL_REGEX.test(input.customerEmail.trim())) {
    errors.push("Customer email must be a valid email address.");
  }

  Object.entries(MAX_FIELD_LENGTHS).forEach(([field, maxLength]) => {
    const value = input[field];
    if (typeof value === "string" && value.trim().length > maxLength) {
      errors.push(`${field} must be ${maxLength} characters or fewer.`);
    }
  });

  return errors;
}
