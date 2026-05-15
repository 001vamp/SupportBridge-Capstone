export function getTicketPublicCode(ticketId) {
  if (!ticketId) return "";

  const raw = String(ticketId);
  const lastSegment = raw.split("_").filter(Boolean).at(-1) || raw;
  const cleaned = lastSegment.replace(/[^a-z0-9]/gi, "");

  return cleaned.slice(0, 8).toUpperCase();
}

export function getTicketDisplayLabel(ticketId, { includeWord = true } = {}) {
  const code = getTicketPublicCode(ticketId);
  if (!code) return includeWord ? "Ticket" : "";
  if (!includeWord) return `#${code}`;
  return `Ticket #${code}`;
}
