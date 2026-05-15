export const STATUS_LABELS = {
  NEW: "New",
  AI_ACTIVE: "Active",
  WAITING_CUSTOMER: "Waiting Customer",
  HUMAN_REVIEW: "Human Review",
  HUMAN_TAKEOVER: "Human Takeover",
  PENDING_CLOSE_REVIEW: "Pending Close Review",
  CLOSED: "Closed"
};

export function getStatusLabel(status) {
  return STATUS_LABELS[status] || status;
}
