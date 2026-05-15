import { Server } from "socket.io"; // The Socket.IO server class.
import { createCorsOriginChecker } from "../app.js"; // Reuse the same CORS allow/deny rules as Express.
import { findTicketById } from "../db/queries.js";
import { logInfo } from "../utils/logger.js"; // Log helper used across the backend.

let io; // Holds the Socket.IO server instance once we create it.

export function initializeSocketServer(httpServer) {
  const corsOrigin = createCorsOriginChecker(); // Build the origin allow-checker for Socket.IO.

  io = new Server(httpServer, {
    cors: {
      origin: corsOrigin // Apply the same origin rules for Socket.IO handshakes.
    }
  });

  // Runs every time a browser/client connects to the Socket.IO server.
  io.on("connection", (socket) => {
    logInfo("socket.connected", { socketId: socket.id }); // Log the socket connection.

    // Client asks to join a per-ticket "room".
    socket.on("ticket:join", async (ticketId) => {
      if (!ticketId) return; // Ignore empty/invalid ids.
      const ticket = await findTicketById(ticketId);
      if (!ticket) return;
      socket.join(ticketRoom(ticketId)); // Put this socket into that room.
      logInfo("socket.ticket.join", { socketId: socket.id, ticketId }); // Log the join.
    });

    // Client asks to leave a per-ticket "room".
    socket.on("ticket:leave", (ticketId) => {
      if (!ticketId) return; // Ignore empty/invalid ids.
      socket.leave(ticketRoom(ticketId)); // Remove this socket from that room.
      logInfo("socket.ticket.leave", { socketId: socket.id, ticketId }); // Log the leave.
    });

    // Client asks to join the reviewer dashboard room.
    socket.on("dashboard:join", () => {
      if (!hasReviewerSocketAccess(socket)) return;
      socket.join("dashboard"); // Join the shared dashboard room.
      logInfo("socket.dashboard.join", { socketId: socket.id }); // Log the join.
    });

    // Client asks to leave the reviewer dashboard room.
    socket.on("dashboard:leave", () => {
      socket.leave("dashboard"); // Remove this socket from the dashboard room.
    });
  });

  return io; // Return the created Socket.IO server.
}

function hasReviewerSocketAccess(socket) {
  const expectedKey = process.env.REVIEWER_ACCESS_KEY;
  if (!expectedKey) return true;

  return socket.handshake.auth?.reviewerKey === expectedKey;
}

export function getSocketServer() {
  return io; // Return the existing Socket.IO server instance (or undefined if not initialized).
}

export function ticketRoom(ticketId) {
  return `ticket:${ticketId}`; // Room name used for updates related to one ticket.
}

export function broadcastMessageCreated(message) {
  if (!io || !message) return; // Do nothing if Socket.IO is not ready or message is missing.
  io.to(ticketRoom(message.ticketId)).emit("message:created", { message }); // Notify the ticket room.
}

export function broadcastTicketUpdated(ticket) {
  if (!io || !ticket) return; // Do nothing if Socket.IO is not ready or ticket is missing.
  io.to(ticketRoom(ticket.id)).emit("ticket:updated", { ticket }); // Notify the per-ticket room.
  io.to("dashboard").emit("ticket:updated", { ticket }); // Also notify everyone on the dashboard.
}

export function broadcastAiTyping(ticketId, isTyping) {
  if (!io || !ticketId) return; // Do nothing if Socket.IO is not ready or ticket id is missing.
  io.to(ticketRoom(ticketId)).emit("ai:typing", { ticketId, isTyping }); // Tell the UI the AI typing state.
}

export function broadcastAiClosureSuggested(ticket) {
  if (!io || !ticket) return; // Do nothing if Socket.IO is not ready or ticket is missing.
  io.to(ticketRoom(ticket.id)).emit("ai:closure-suggested", { ticket }); // Send closure suggestion to ticket room.
  io.to("dashboard").emit("ticket:updated", { ticket }); // Update dashboard because state changed.
}

export function broadcastReviewerAction(ticket, action) {
  if (!io || !ticket) return; // Do nothing if Socket.IO is not ready or ticket is missing.
  io.to(ticketRoom(ticket.id)).emit("reviewer:action", { ticket, action }); // Tell UI about reviewer actions.
}
