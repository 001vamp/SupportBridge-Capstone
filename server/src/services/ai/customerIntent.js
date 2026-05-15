const REQUEST_HUMAN_PATTERNS = [
  /\b(human|person|someone|agent|representative|rep|technician|tech|support)\b/i,
  /\b(talk|speak|chat|call)\s+(to|with)\s+(a\s+)?(human|person|someone|agent|representative|rep)\b/i,
  /\b(escalate|escalation)\b/i,
  /\b(real\s+person)\b/i,
  /\bcan\s+you\s+call\s+me\b/i
];

const UNRESOLVED_PATTERNS = [
  /\b(still)\b/i,
  /\b(not\s+working|doesn'?t\s+work|does\s+not\s+work|didn'?t\s+work|did\s+not\s+work)\b/i,
  /\b(can'?t|cannot|won'?t)\b/i,
  /\b(same\s+issue|same\s+problem)\b/i,
  /\b(broken|failing|failed|error|worse)\b/i,
  /\b(issue\s+persists|still\s+happening)\b/i
];

const RESOLVED_PATTERNS = [
  /\b(resolved|fixed|solved)\b/i,
  /\b(worked|works|working\s+now|it\s+works|that\s+worked)\b/i,
  /\b(it\s+is\s+fixed|it's\s+fixed|its\s+fixed|issue\s+is\s+fixed|problem\s+solved)\b/i,
  /\b(all\s+set|all\s+good|good\s+now|sorted|we'?re\s+good|i'?m\s+good)\b/i,
  /\b(thanks|thank\s+you|thx|appreciate\s+it)\b/i,
  /\b(perfect|great|awesome)\b/i
];

function anyMatch(patterns, text) {
  return patterns.some((pattern) => pattern.test(text));
}

function normalizeText(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

export function detectCustomerIntent(text) {
  const normalized = normalizeText(text);
  if (!normalized) return null;

  // 1) Human request always wins.
  if (anyMatch(REQUEST_HUMAN_PATTERNS, normalized)) {
    return "request_human";
  }

  // 2) If they mention it is still broken / not working, do NOT treat as resolved even if "thanks" is present.
  if (anyMatch(UNRESOLVED_PATTERNS, normalized)) {
    return null;
  }

  // 3) Otherwise, detect resolution / gratitude confirmation.
  if (anyMatch(RESOLVED_PATTERNS, normalized)) {
    return "resolved";
  }

  return null;
}

