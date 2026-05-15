import { Router } from "express";
import {
  closeTicketAsReviewer,
  confirmClosure,
  createReviewerMessage,
  listReviewerMessages,
  pauseAi,
  rejectClosure,
  releaseTicket,
  reopenTicket,
  resumeAi,
  takeoverTicket
} from "../services/reviewerService.js";
import {
  broadcastMessageCreated,
  broadcastReviewerAction,
  broadcastTicketUpdated
} from "../sockets/socketServer.js";
import { requireReviewerAccess } from "../middleware/reviewerAccess.js";

export const reviewerRouter = Router();

reviewerRouter.use("/:ticketId/reviewer", requireReviewerAccess);

reviewerRouter.post("/:ticketId/reviewer/pause-ai", async (req, res, next) => {
  try {
    const result = await pauseAi(req.params.ticketId);
    broadcastReviewerResult(result, "pause_ai");
    res.json(result);
  } catch (error) {
    next(error);
  }
});

reviewerRouter.post("/:ticketId/reviewer/resume-ai", async (req, res, next) => {
  try {
    const result = await resumeAi(req.params.ticketId);
    broadcastReviewerResult(result, "resume_ai");
    res.json(result);
  } catch (error) {
    next(error);
  }
});

reviewerRouter.post("/:ticketId/reviewer/takeover", async (req, res, next) => {
  try {
    const result = await takeoverTicket(req.params.ticketId);
    broadcastReviewerResult(result, "takeover");
    res.json(result);
  } catch (error) {
    next(error);
  }
});

reviewerRouter.post("/:ticketId/reviewer/release", async (req, res, next) => {
  try {
    const result = await releaseTicket(req.params.ticketId);
    broadcastReviewerResult(result, "release");
    res.json(result);
  } catch (error) {
    next(error);
  }
});

reviewerRouter.get("/:ticketId/reviewer/messages", async (req, res, next) => {
  try {
    const result = await listReviewerMessages(req.params.ticketId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

reviewerRouter.post("/:ticketId/reviewer/messages", async (req, res, next) => {
  try {
    const result = await createReviewerMessage(req.params.ticketId, req.body);
    if (result.message) broadcastMessageCreated(result.message);
    if (result.ticket) broadcastTicketUpdated(result.ticket);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

reviewerRouter.post("/:ticketId/reviewer/reject-closure", async (req, res, next) => {
  try {
    const result = await rejectClosure(req.params.ticketId, req.body);
    broadcastReviewerResult(result, "reject_closure");
    res.json(result);
  } catch (error) {
    next(error);
  }
});

reviewerRouter.post("/:ticketId/reviewer/confirm-closure", async (req, res, next) => {
  try {
    const result = await confirmClosure(req.params.ticketId);
    broadcastReviewerResult(result, "confirm_closure");
    res.json(result);
  } catch (error) {
    next(error);
  }
});

reviewerRouter.post("/:ticketId/reviewer/reopen", async (req, res, next) => {
  try {
    const result = await reopenTicket(req.params.ticketId);
    broadcastReviewerResult(result, "reopen");
    res.json(result);
  } catch (error) {
    next(error);
  }
});

reviewerRouter.post("/:ticketId/reviewer/close-ticket", async (req, res, next) => {
  try {
    const result = await closeTicketAsReviewer(req.params.ticketId);
    broadcastReviewerResult(result, "reviewer_close");
    res.json(result);
  } catch (error) {
    next(error);
  }
});

function broadcastReviewerResult(result, action) {
  if (result.systemMessage) broadcastMessageCreated(result.systemMessage);
  if (result.ticket) {
    broadcastTicketUpdated(result.ticket);
    broadcastReviewerAction(result.ticket, action);
  }
}
