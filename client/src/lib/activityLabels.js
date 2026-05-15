export function getActivityLabel(body = "") {
  const text = String(body).toLowerCase();

  if (text.includes("escalated for human") || text.includes("requested a human reviewer")) return "Human review";
  if (text.includes("paused")) return "AI paused";
  if (text.includes("resumed")) return "AI resumed";
  if (text.includes("took over")) return "Human takeover";
  if (text.includes("released")) return "Takeover released";
  if (text.includes("suggested closure") || text.includes("pending close") || text.includes("resolution")) return "Resolution review";
  if (text.includes("confirmed closure") || text.includes("closed by reviewer")) return "Ticket closed";
  if (text.includes("reopened") || text.includes("reopen")) return "Ticket reopened";

  return "Activity";
}
