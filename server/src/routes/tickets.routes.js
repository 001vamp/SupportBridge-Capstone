import { Router } from "express";
import { customerEscalateToHuman } from "../services/customerEscalationService.js";
import { createTicket, getTicket, getTickets, validateTicketInput } from "../services/ticketService.js";
import { broadcastMessageCreated, broadcastTicketUpdated } from "../sockets/socketServer.js";
import { requireReviewerAccess } from "../middleware/reviewerAccess.js";

export const ticketsRouter = Router();

ticketsRouter.post("/", async (req, res, next) => {
  try {
    const errors = validateTicketInput(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const ticket = await createTicket(req.body);
    broadcastTicketUpdated(ticket);
    res.status(201).json({ ticket });
  } catch (error) {
    next(error);
  }
});

ticketsRouter.get("/", requireReviewerAccess, async (_req, res, next) => {
  try {
    const tickets = await getTickets();
    res.json({ tickets });
  } catch (error) {
    next(error);
  }
});

ticketsRouter.post("/:ticketId/escalate", async (req, res, next) => {
  try {
    const ticket = await getTicket(req.params.ticketId);
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found." });
    }

    const result = await customerEscalateToHuman(req.params.ticketId, req.body);
    if (result.systemMessage) broadcastMessageCreated(result.systemMessage);
    if (result.ticket) broadcastTicketUpdated(result.ticket);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

ticketsRouter.get("/:ticketId", async (req, res, next) => {
  try {
    const ticket = await getTicket(req.params.ticketId);
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found." });
    }

    res.json({ ticket });
  } catch (error) {
    next(error);
  }
});
