import { io } from "socket.io-client";
import { getBrowserBackendOrigin } from "./backendOrigin.js";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || getBrowserBackendOrigin();
const REVIEWER_ACCESS_KEY = import.meta.env.VITE_REVIEWER_ACCESS_KEY;

let socket;
const ticketRoomRefs = new Map();
let dashboardRefs = 0;

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: REVIEWER_ACCESS_KEY ? { reviewerKey: REVIEWER_ACCESS_KEY } : undefined,
      autoConnect: false,
      reconnection: true
    });
  }

  return socket;
}

export function joinTicketRoom(ticketId) {
  if (!ticketId) return;
  const socketClient = getSocket();
  const currentCount = ticketRoomRefs.get(ticketId) || 0;
  ticketRoomRefs.set(ticketId, currentCount + 1);
  if (currentCount === 0) socketClient.emit("ticket:join", ticketId);
}

export function rejoinTicketRoom(ticketId) {
  if (!ticketId) return;
  const socketClient = getSocket();
  if (ticketRoomRefs.has(ticketId)) socketClient.emit("ticket:join", ticketId);
}

export function leaveTicketRoom(ticketId) {
  if (!ticketId) return;
  const socketClient = getSocket();
  const currentCount = ticketRoomRefs.get(ticketId) || 0;
  if (currentCount <= 1) {
    ticketRoomRefs.delete(ticketId);
    socketClient.emit("ticket:leave", ticketId);
    return;
  }

  ticketRoomRefs.set(ticketId, currentCount - 1);
}

export function joinDashboardRoom() {
  const socketClient = getSocket();
  dashboardRefs += 1;
  if (dashboardRefs === 1) socketClient.emit("dashboard:join");
}

export function rejoinDashboardRoom() {
  const socketClient = getSocket();
  if (dashboardRefs > 0) socketClient.emit("dashboard:join");
}

export function leaveDashboardRoom() {
  const socketClient = getSocket();
  dashboardRefs = Math.max(0, dashboardRefs - 1);
  if (dashboardRefs === 0) socketClient.emit("dashboard:leave");
}
