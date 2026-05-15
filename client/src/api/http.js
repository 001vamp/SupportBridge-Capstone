import { getBrowserBackendOrigin } from "./backendOrigin.js";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || `${getBrowserBackendOrigin()}/api`;
const REVIEWER_ACCESS_KEY = import.meta.env.VITE_REVIEWER_ACCESS_KEY;

async function request(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...options.headers
  };

  if (REVIEWER_ACCESS_KEY && isReviewerRequest(path)) {
    headers["x-reviewer-key"] = REVIEWER_ACCESS_KEY;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data.error || data.errors?.join(" ") || "Request failed.";
    throw new Error(message);
  }

  return data;
}

function isReviewerRequest(path) {
  return path.includes("/reviewer/") || path === "/tickets" || path.endsWith("/ai/respond");
}

export function createTicket(payload) {
  return request("/tickets", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function listTickets() {
  return request("/tickets");
}

export function getTicket(ticketId) {
  return request(`/tickets/${ticketId}`);
}

export function getTicketMessages(ticketId) {
  return request(`/tickets/${ticketId}/messages`);
}

export function createTicketMessage(ticketId, payload) {
  return request(`/tickets/${ticketId}/messages`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function pauseTicketAi(ticketId) {
  return request(`/tickets/${ticketId}/reviewer/pause-ai`, {
    method: "POST"
  });
}

export function resumeTicketAi(ticketId) {
  return request(`/tickets/${ticketId}/reviewer/resume-ai`, {
    method: "POST"
  });
}

export function takeoverTicket(ticketId) {
  return request(`/tickets/${ticketId}/reviewer/takeover`, {
    method: "POST"
  });
}

export function releaseTicket(ticketId) {
  return request(`/tickets/${ticketId}/reviewer/release`, {
    method: "POST"
  });
}

export function createHumanTicketMessage(ticketId, payload) {
  return request(`/tickets/${ticketId}/reviewer/messages`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function confirmTicketClose(ticketId) {
  return request(`/tickets/${ticketId}/reviewer/confirm-closure`, {
    method: "POST"
  });
}

export function rejectTicketClose(ticketId, payload = {}) {
  return request(`/tickets/${ticketId}/reviewer/reject-closure`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function reopenTicket(ticketId) {
  return request(`/tickets/${ticketId}/reviewer/reopen`, {
    method: "POST"
  });
}

export function closeTicketAsReviewer(ticketId) {
  return request(`/tickets/${ticketId}/reviewer/close-ticket`, {
    method: "POST"
  });
}

export function customerEscalateToHuman(ticketId, payload = {}) {
  return request(`/tickets/${ticketId}/escalate`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
