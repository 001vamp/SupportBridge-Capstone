import { Router } from "express";
import { createCustomerMessage, getMessagesForTicket, maybeGenerateAiResponse } from "../services/messageService.js";
import { getTicket } from "../services/ticketService.js";
import {
  broadcastAiClosureSuggested,
  broadcastAiTyping,
  broadcastMessageCreated,
  broadcastTicketUpdated
} from "../sockets/socketServer.js";
import { requireReviewerAccess } from "../middleware/reviewerAccess.js";

export const messagesRouter = Router();

messagesRouter.get("/:ticketId/messages", async (req, res, next) => {
  try {
    const ticket = await getTicket(req.params.ticketId);
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found." });
    }

    const messages = await getMessagesForTicket(ticket.id);
    res.json({ messages });
  } catch (error) {
    next(error);
  }
});

messagesRouter.post("/:ticketId/messages", async (req, res, next) => {
  try {
    const ticket = await getTicket(req.params.ticketId);
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found." });
    }

    broadcastAiTyping(ticket.id, true);
    const result = await createCustomerMessage(ticket, req.body);
    broadcastAiTyping(ticket.id, false);

    broadcastMessageCreated(result.message);
    if (result.aiResult?.aiMessage) broadcastMessageCreated(result.aiResult.aiMessage);
    if (result.aiResult?.systemMessage) broadcastMessageCreated(result.aiResult.systemMessage);
    if (result.ticket) {
      broadcastTicketUpdated(result.ticket);
      if (result.ticket.status === "PENDING_CLOSE_REVIEW") {
        broadcastAiClosureSuggested(result.ticket);
      }
    }

    res.status(201).json({ message: result.message, aiResult: result.aiResult, ticket: result.ticket });
  } catch (error) {
    broadcastAiTyping(req.params.ticketId, false);
    next(error);
  }
});

messagesRouter.post("/:ticketId/ai/respond", requireReviewerAccess, async (req, res, next) => {
  try {
    const ticket = await getTicket(req.params.ticketId);
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found." });
    }

    const result = await maybeGenerateAiResponse(ticket);
    if (!result) {
      return res.status(409).json({ error: "AI response is not available for this ticket." });
    }

    if (result.aiMessage) broadcastMessageCreated(result.aiMessage);
    if (result.systemMessage) broadcastMessageCreated(result.systemMessage);
    const updatedTicket = await getTicket(req.params.ticketId);
    if (updatedTicket) {
      broadcastTicketUpdated(updatedTicket);
      if (updatedTicket.status === "PENDING_CLOSE_REVIEW") {
        broadcastAiClosureSuggested(updatedTicket);
      }
    }

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});
