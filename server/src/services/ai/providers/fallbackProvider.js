export const AI_SUGGESTED_ACTION = {
  CONTINUE_TROUBLESHOOTING: "continue_troubleshooting",
  ASK_CUSTOMER: "ask_customer",
  SUGGEST_RESOLUTION: "suggest_resolution",
  ESCALATE_TO_HUMAN: "escalate_to_human"
};

const MAX_AI_RETRIES_BEFORE_ESCALATION = 2;

const ISSUE_TYPES = [
  {
    id: "network",
    labels: ["network", "internet", "wifi", "wi-fi", "vpn"],
    matcher: /\b(network|internet|wifi|wi-fi|vpn|connection|connectivity|offline|router|modem)\b/i,
    firstStep:
      "Start by turning Wi-Fi off and back on, then try opening a known working site. If that fails, restart the router or reconnect the VPN and tell me what error appears.",
    followUp:
      "Thanks for checking. Next, restart the device, forget and rejoin the Wi-Fi network, or disconnect and reconnect the VPN. Send the exact error message if it still fails."
  },
  {
    id: "password",
    labels: ["password", "login", "account"],
    matcher: /\b(password|login|log in|sign in|signin|account|locked|credential|mfa|2fa|reset)\b/i,
    firstStep:
      "Try resetting the password from the sign-in page, then sign in again using a private browser window. If your account says it is locked, tell me the exact lockout message.",
    followUp:
      "If the reset did not work, clear saved passwords for that site and try the newest reset link only once. If the account still shows locked or invalid credentials, I can escalate it."
  },
  {
    id: "printer",
    labels: ["printer", "printing"],
    matcher: /\b(printer|printing|print|queue|paper|toner|ink|scanner)\b/i,
    firstStep:
      "Check that the printer is powered on, has paper, and is on the same network as your device. Then clear the print queue and try printing one test page.",
    followUp:
      "Next, restart the printer and your device, then remove and re-add the printer from system settings. Tell me whether the test page prints after that."
  },
  {
    id: "email",
    labels: ["email", "mail", "outlook", "gmail"],
    matcher: /\b(email|e-mail|mail|outlook|gmail|inbox|sent mail|smtp|imap|attachment)\b/i,
    firstStep:
      "First, refresh the mailbox and check webmail in a browser. If webmail works, restart the mail app and confirm whether sending, receiving, or attachments are the part failing.",
    followUp:
      "Try removing and re-adding the mailbox in the mail app only if webmail works. If webmail also fails, send the exact error shown on the page."
  },
  {
    id: "software",
    labels: ["software", "app", "crash"],
    matcher: /\b(software|app|application|crash|crashes|crashed|freezes|frozen|error|bug|update)\b/i,
    firstStep:
      "Close the app completely and reopen it. If it still crashes, restart the device and check whether the app has an available update.",
    followUp:
      "Next, try launching the app with no other apps open and capture the exact error or crash message. If it still crashes after an update or restart, I can escalate it."
  },
  {
    id: "slow_computer",
    labels: ["slow computer", "performance"],
    matcher: /\b(slow|sluggish|lag|lagging|performance|freezing|hangs|computer|laptop|desktop)\b/i,
    firstStep:
      "Restart the computer, then open only the app you need and check whether performance improves. Also confirm how much free storage is available.",
    followUp:
      "If it is still slow, close startup apps, install pending system updates, and note whether the slowness affects one app or the whole computer."
  }
];

const GENERAL_ISSUE = {
  id: "general",
  firstStep:
    "I want to help, but I do not have enough detail yet. In one or two sentences: what is not working, what you expected instead, and what device or browser you are using? If you see an error message, paste the exact text.",
  followUp:
    "Thanks — please add when it started, whether anything changed (update, travel, new Wi-Fi), and the exact message or behavior you see now so we can pick the right next step."
};

const RESOLVED_PATTERN =
  /\b(resolved|fixed|fix(?:ed)?|works|working now|it works|all set|thank you|thanks|solved|good now)\b/i;

const NEGATIVE_PATTERN =
  /\b(still broken|still not|didn'?t work|did not work|doesn'?t work|does not work|\bno\b|not working|same issue|still failing|failed|worse|broken)\b/i;

export async function generateFallbackResponse(ticket, messages = [], options = {}) {
  const safeMessages = Array.isArray(messages) ? messages : [];
  const latestCustomerMessage = findLatestCustomerMessage(safeMessages);
  const latestCustomerText = latestCustomerMessage?.body || "";
  const issue = detectIssueType(ticket, safeMessages);
  const aiMessageCount = countAiMessages(safeMessages);
  const metadata = buildFallbackMetadata(options.fallbackReason, options.hermesErrorDetail);

  // Leading ~ = general chat (matches Hermes provider). Do not run IT keyword routing on these.
  if (String(latestCustomerText).trimStart().startsWith("~")) {
    const rest = String(latestCustomerText).replace(/^\s*~\s*/, "").trim();
    const message = buildTildeGeneralFallbackBody(rest, safeMessages);
    return {
      message,
      suggestedAction: AI_SUGGESTED_ACTION.ASK_CUSTOMER,
      metadata: { ...metadata, tildeGeneralStub: true }
    };
  }

  if (NEGATIVE_PATTERN.test(latestCustomerText)) {
    if (aiMessageCount >= MAX_AI_RETRIES_BEFORE_ESCALATION) {
      return {
        message:
          "Thanks for trying those steps. Since the issue is still happening, I am escalating this to a human reviewer with the troubleshooting history.",
        suggestedAction: AI_SUGGESTED_ACTION.ESCALATE_TO_HUMAN,
        metadata
      };
    }

    return {
      message: issue.followUp,
      suggestedAction: AI_SUGGESTED_ACTION.CONTINUE_TROUBLESHOOTING,
      metadata
    };
  }

  if (RESOLVED_PATTERN.test(latestCustomerText)) {
    return {
      message:
        "Glad that is working now. I will mark this as ready for resolution review.",
      suggestedAction: AI_SUGGESTED_ACTION.SUGGEST_RESOLUTION,
      resolutionSummary: buildResolutionSummary(ticket, issue, safeMessages),
      metadata
    };
  }

  return {
    message: issue.firstStep,
    suggestedAction: AI_SUGGESTED_ACTION.ASK_CUSTOMER,
    metadata
  };
}

function buildFallbackMetadata(fallbackReason, hermesErrorDetail) {
  return {
    provider: "fallback",
    ...(fallbackReason ? { fallbackReason } : {}),
    ...(hermesErrorDetail ? { hermesErrorDetail } : {})
  };
}

function detectIssueType(ticket = {}, messages = []) {
  // Only ticket fields + human-written lines. Including past AI replies poisons keywords
  // (e.g. AI says “device or app” → false “software” match on the next customer ping).
  const humanBodies = bodiesFromHumanSenders(messages);
  const searchText = [ticket.title, ticket.description, ticket.category, ...humanBodies].filter(Boolean).join(" ");

  const categoryText = String(ticket.category || "").toLowerCase();
  const categoryMatch = ISSUE_TYPES.find((issue) =>
    issue.labels.some((label) => categoryText.includes(label))
  );

  if (categoryMatch) return categoryMatch;

  return ISSUE_TYPES.find((issue) => issue.matcher.test(searchText)) || GENERAL_ISSUE;
}

/** Customer + reviewer text only — never AI/system bodies for keyword routing. */
function bodiesFromHumanSenders(messages) {
  if (!Array.isArray(messages)) return [];
  const allowed = new Set(["customer", "reviewer"]);
  return messages
    .filter((m) => allowed.has(String(m?.senderType || m?.sender_type || "").toLowerCase()))
    .map((m) => m?.body)
    .filter(Boolean);
}

function truncatePlain(text, maxLen) {
  const s = String(text || "").trim();
  if (s.length <= maxLen) return s;
  return `${s.slice(0, Math.max(0, maxLen - 1)).trimEnd()}…`;
}

/**
 * Hermes is supposed to answer ~ lines; when we land here, Hermes was off or errored.
 * Keep copy varied and react to small talk so it does not feel like a brand-new empty session.
 */
function buildTildeGeneralFallbackBody(rest, safeMessages) {
  const trimmed = String(rest || "").trim();
  const lower = trimmed.toLowerCase();

  if (/\b(how'?s life|how is life|hows life)\b/i.test(trimmed)) {
    return "No real life on my side, but things are quiet — thanks for asking. What are you poking at today?";
  }
  if (/\b(how are you|how're you|how r you|you doing alright|you doing ok|you ok)\b/i.test(lower)) {
    return "I'm here and responding — all good on my end. What's up with you?";
  }
  if (/^(hi|hello|hey|yo|hiya)\b[!?.\s]*$/i.test(trimmed) || (trimmed.length < 28 && /^(hi|hello|hey)\b/i.test(trimmed))) {
    return "Hey — what's going on?";
  }
  if (!trimmed.length) {
    return "Hey — what's up?";
  }

  const prior = priorCustomerBodiesBeforeLatestCustomer(safeMessages);
  if (prior.length) {
    const echo = truncatePlain(prior[prior.length - 1], 52);
    if (echo && !lower.includes(echo.toLowerCase())) {
      return `On “${truncatePlain(trimmed, 96)}” — you also mentioned “${echo}” earlier. Want to zoom in on one of those?`;
    }
  }

  return `On “${truncatePlain(trimmed, 120)}”: what do you want next — a quick explanation, a rewrite, or something else?`;
}

function priorCustomerBodiesBeforeLatestCustomer(messages) {
  if (!Array.isArray(messages)) return [];
  const bodies = [];
  for (const m of messages) {
    if (String(m?.senderType || m?.sender_type || "").toLowerCase() !== "customer") continue;
    bodies.push(String(m.body || ""));
  }
  if (bodies.length <= 1) return [];
  return bodies.slice(0, -1).map((b) => String(b).replace(/^\s*~\s*/, "").trim()).filter(Boolean);
}

function findLatestCustomerMessage(messages) {
  return [...messages]
    .reverse()
    .find((message) => message?.senderType === "customer" || message?.sender_type === "customer");
}

function countAiMessages(messages) {
  return messages.filter((message) => {
    const senderType = message?.senderType || message?.sender_type || "";
    return ["ai", "assistant", "bot"].includes(String(senderType).toLowerCase());
  }).length;
}

function buildResolutionSummary(ticket = {}, issue, messages) {
  const title = ticket.title || "Support issue";
  const latestCustomerMessage = findLatestCustomerMessage(messages);
  const confirmation = latestCustomerMessage?.body
    ? ` Customer confirmed: "${latestCustomerMessage.body}"`
    : "";

  return `${title} appears resolved after ${issue.id} troubleshooting.${confirmation}`;
}
