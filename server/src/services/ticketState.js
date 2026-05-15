import { AI_STATE, TICKET_STATUS } from "./statusConstants.js";

export function makeHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export function assertTicketExists(ticket) {
  if (!ticket) {
    throw makeHttpError("Ticket not found.", 404);
  }
}

export function assertTicketOpen(ticket, actionName = "action") {
  if (ticket.status === TICKET_STATUS.CLOSED) {
    throw makeHttpError(`Closed tickets cannot receive this ${actionName}.`, 409);
  }
}

export function canAiRespond(ticket) {
  return ticket?.status !== TICKET_STATUS.CLOSED && ticket?.aiState === AI_STATE.ACTIVE;
}

export function statusAfterAiResume(ticket) {
  if (ticket.status === TICKET_STATUS.PENDING_CLOSE_REVIEW) {
    throw makeHttpError("AI cannot resume while closure is pending review.", 409);
  }

  if (ticket.status === TICKET_STATUS.CLOSED) {
    throw makeHttpError("Closed tickets cannot resume AI.", 409);
  }

  return TICKET_STATUS.AI_ACTIVE;
}
