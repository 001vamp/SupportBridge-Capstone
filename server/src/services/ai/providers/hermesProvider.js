import { AI_SUGGESTED_ACTION } from "./fallbackProvider.js";
import { logInfo } from "../../../utils/logger.js";

const HERMES_TIMEOUT_MS = 15000;
const MAX_HISTORY_MESSAGES = 12;
const VALID_ACTIONS = new Set(Object.values(AI_SUGGESTED_ACTION));

const SYSTEM_PROMPT_IT = [
  "You are an IT help desk chat assistant inside SupportBridge AI.",
  "You help customers with basic troubleshooting before a human reviewer steps in.",
  "",
  "TONE:",
  "- Friendly, calm, sympathetic.",
  "- Short, conversational, no lectures.",
  "",
  "HARD LIMITS (must follow):",
  "- Maximum 120 words total.",
  "- Maximum 3 numbered steps (1., 2., 3.).",
  "- Maximum 2 questions total.",
  "- No big markdown sections, no headings, no long guides.",
  "",
  "CONTENT RULES:",
  "- DISCOVERY FIRST: If the ticket title/description look like placeholders/tests (\"test\", \"hello\", empty) OR the customer has not described a real symptom yet, do not give restart/reinstall/crash-playbook steps. Ask what is wrong, what they expected, device/OS, and any exact error text.",
  "- Only after you know what is failing (crash vs login vs Wi-Fi vs printer, etc.) give short, safe steps.",
  "- Safest first action first once the problem type is clear.",
  "- If the customer is vague (\"hey\", \"help\"), ask what happened + ask their device/OS + ask the exact error.",
  "- Do not give platform-specific deep instructions unless the user already said Windows/Mac/iPhone/Android.",
  "- Do not give Windows + Mac instructions in the same message unless the user asked for both or it is truly necessary.",
  "- Avoid repeating steps already suggested in the chat history.",
  "- If steps fail or the user seems annoyed, say a human reviewer can step in.",
  "- If the user asks for a person or refuses AI help, say a human reviewer can step in.",
  "",
  "ESCALATION (human review):",
  "- If the customer needs a real person, refuses AI-only help, or you cannot safely help further, respond with JSON containing \"message\" (assistant reply) and \"suggestedAction\": \"escalate_to_human\" (exactly that string). Do not use plain text only for escalations — the ticket must move to human review.",
  "",
  "SAFETY:",
  "- Never ask for passwords, one-time codes, private keys, or sensitive info.",
  "- Never claim you performed actions.",
  "- Never close the ticket yourself.",
  "",
  "SPECIAL CASE: malware/virus",
  "- First: tell them to disconnect from the internet.",
  "- Tell them not to enter passwords, 2FA codes, or payment info.",
  "- Ask device/OS and what symptom they see.",
  "- Do not give a full cleanup guide until they answer.",
  "",
  "FIRST MESSAGE RULE:",
  "- Acknowledge (\"Got it\" / \"That sounds frustrating\"). If the problem is not clear yet, ask 2–4 short questions only — no troubleshooting steps until they describe what broke.",
  "- If the problem is already clear, give at most 2–3 easy steps and at most 2 questions.",
  "",
  "You may respond in plain text."
].join("\n");

/** Latest customer message started with ~ → Hermes is off the SupportBridge IT ticket script for this completion. */
const SYSTEM_PROMPT_GENERAL = [
  "You are Hermes. For THIS reply the customer prefixed their latest line with ~ — that means normal chat or a side topic, not \"SupportBridge ticket AI\" mode.",
  "",
  "WHAT ~ MEANS (non-negotiable):",
  "- You are not running the help desk. Do not sound like tier-1 support or a ticket bot.",
  "- No invented incident: if they only said hi or something tiny, answer in kind — do not assume a broken laptop or app.",
  "",
  "TURN OFF unless they clearly pivot to asking for hands-on tech help:",
  "- Troubleshooting playbooks (restart/reinstall/clear cache/VPN/router/printer steps, numbered fix lists).",
  "- Ticket language: \"escalate\", \"reviewer\", \"human agent\", \"I'll log this\", \"case number\", \"closure\".",
  "- Corporate assistant filler: \"How can I assist you today?\", \"I'd be happy to help with your issue\", \"Please don't hesitate\".",
  "",
  "DO:",
  "- Match their length and tone (one word or emoji → keep it short).",
  "- Answer real questions straight (explain, rewrite text, casual advice, light humor if harmless).",
  "- If they only greet you, greet back briefly — no interrogation about devices or errors.",
  "",
  "SAFETY (always):",
  "- Refuse illegal or clearly harmful requests; no passwords, OTPs, recovery codes, or full card numbers.",
  "- No claiming you accessed their machine, employer systems, or accounts.",
  "- No exploit / break-in / harassment instructions — refuse and offer legitimate alternatives.",
  "",
  "FORMAT: Plain text only for this mode (no JSON). Keep it under ~120 words unless they explicitly want more."
].join("\n");

export class HermesProviderError extends Error {
  constructor(reason, message = reason) {
    super(message);
    this.name = "HermesProviderError";
    this.reason = reason;
  }
}

export async function generateHermesResponse(ticket, messages = [], options = {}) {
  const baseConfig = getHermesConfig(options);
  const chatMode = classifyHermesChatMode(messages);
  const config = { ...baseConfig, chatMode };
  logInfo("ai.hermes.chat_mode", { hermes_chat_mode: chatMode });
  const response = await requestHermes(config, buildHermesPayload(ticket, messages, config.model, chatMode));
  const rawOutput = await readHermesBody(response);
  return finalizeHermesAssistantOutput(rawOutput, config);
}

function finalizeHermesAssistantOutput(rawOutput, config) {
  const { assistantText, structuredCandidate } = deriveAssistantPayload(rawOutput);

  if (!assistantText?.trim() && !structuredCandidate) {
    throw new HermesProviderError("empty_response", "Hermes gateway returned an empty assistant payload.");
  }

  const jsonObject =
    structuredCandidate ||
    (assistantText ? tryParseHermesContractJson(assistantText) : null);

  if (jsonObject && hasContractFields(jsonObject)) {
    try {
      const validated = validateHermesOutput(jsonObject);
      logInfo("ai.hermes.response_mode", { response_mode: "json" });
      return {
        ...validated,
        metadata: {
          provider: "hermes",
          model: config.model,
          responseMode: "json",
          ...(config.chatMode ? { hermesChatMode: config.chatMode } : {})
        }
      };
    } catch {
      const recovered = tryRecoverHermesEscalation(jsonObject);
      if (recovered) {
        logInfo("ai.hermes.response_mode", { response_mode: "json_escalation_recovered" });
        return {
          ...recovered,
          metadata: {
            provider: "hermes",
            model: config.model,
            responseMode: "json_escalation_recovered",
            ...(config.chatMode ? { hermesChatMode: config.chatMode } : {})
          }
        };
      }
      // Invalid JSON contract — fall through to plain-text handling using assistant text only.
    }
  }

  const plainSource = pickPlainTextFallbackSource(assistantText, jsonObject);

  if (!plainSource?.trim()) {
    throw new HermesProviderError("empty_response", "Hermes response did not include usable assistant text.");
  }

  logInfo("ai.hermes.response_mode", { response_mode: "plain_text" });
  return {
    message: plainSource.trim(),
    suggestedAction: AI_SUGGESTED_ACTION.CONTINUE_TROUBLESHOOTING,
    metadata: {
      provider: "hermes",
      model: config.model,
      responseMode: "plain_text",
      ...(config.chatMode ? { hermesChatMode: config.chatMode } : {})
    }
  };
}

function pickPlainTextFallbackSource(assistantText, jsonObject) {
  if (assistantText?.trim()) return assistantText.trim();
  if (jsonObject && typeof jsonObject.message === "string" && jsonObject.message.trim()) {
    return jsonObject.message.trim();
  }
  return "";
}

function deriveAssistantPayload(rawOutput) {
  if (typeof rawOutput === "string") {
    const assistantText = rawOutput.trim();
    return { assistantText, structuredCandidate: null };
  }

  if (!rawOutput || typeof rawOutput !== "object") {
    throw new HermesProviderError("invalid_response", "Hermes gateway returned a non-object response.");
  }

  if (hasContractFields(rawOutput)) {
    return { assistantText: "", structuredCandidate: rawOutput };
  }

  const extracted = extractGatewayAssistantContent(rawOutput);

  if (typeof extracted === "string") {
    return { assistantText: extracted, structuredCandidate: null };
  }

  if (extracted && typeof extracted === "object" && hasContractFields(extracted)) {
    return { assistantText: "", structuredCandidate: extracted };
  }

  throw new HermesProviderError("invalid_response", "Hermes response did not contain assistant content.");
}

function extractGatewayAssistantContent(output) {
  return (
    output.output ??
    output.content ??
    output.message?.content ??
    output.choices?.[0]?.message?.content ??
    output.choices?.[0]?.text ??
    null
  );
}

function tryParseHermesContractJson(value) {
  if (!value || typeof value !== "string") return null;

  const cleaned = stripCodeFence(value.trim());

  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === "object" && hasContractFields(parsed)) return parsed;
  } catch {
    // Not JSON — caller will use plain text.
  }

  return null;
}

function getHermesConfig(options = {}) {
  const gatewayUrl = options.gatewayUrl || process.env.HERMES_GATEWAY_URL;
  const apiKey = (
    options.apiKey ||
    process.env.HERMES_API_KEY ||
    process.env.HERMES_KEY ||
    ""
  ).trim();
  const model = options.model || process.env.HERMES_MODEL || "hermes-agent";

  if (!gatewayUrl) {
    throw new HermesProviderError("missing_gateway_url", "HERMES_GATEWAY_URL is required when Hermes is enabled.");
  }

  if (!apiKey) {
    throw new HermesProviderError(
      "missing_api_key",
      "HERMES_API_KEY or HERMES_KEY is required when Hermes is enabled."
    );
  }

  return {
    gatewayUrl,
    apiKey,
    model,
    timeoutMs: options.timeoutMs || HERMES_TIMEOUT_MS
  };
}

async function requestHermes(config, payload) {
  if (typeof fetch !== "function") {
    throw new HermesProviderError("fetch_unavailable", "Global fetch is unavailable in this Node runtime.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(buildChatCompletionsUrl(config.gatewayUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {})
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!response.ok) {
      const errText = await response.text();
      let detail = errText.trim().slice(0, 800);
      try {
        const parsed = JSON.parse(errText);
        const msg = parsed?.error?.message;
        if (typeof msg === "string" && msg.trim()) detail = msg.trim();
      } catch {
        // keep raw slice
      }
      throw new HermesProviderError(
        "http_error",
        `Hermes gateway HTTP ${response.status}: ${detail || "(empty body)"}`
      );
    }

    return response;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new HermesProviderError("timeout", `Hermes gateway timed out after ${config.timeoutMs}ms.`);
    }

    if (error instanceof HermesProviderError) {
      throw error;
    }

    throw new HermesProviderError("unreachable", error.message || "Hermes gateway is unreachable.");
  } finally {
    clearTimeout(timeout);
  }
}

function buildChatCompletionsUrl(gatewayUrl) {
  const trimmed = String(gatewayUrl || "").replace(/\/+$/, "");
  if (trimmed.endsWith("/chat/completions")) return trimmed;
  return `${trimmed}/chat/completions`;
}

function buildHermesPayload(ticket = {}, messages = [], model, chatMode) {
  const recentHistory = normalizeMessagesForHermes(messages, chatMode).slice(-MAX_HISTORY_MESSAGES);
  const systemPrompt = chatMode === "general" ? SYSTEM_PROMPT_GENERAL : SYSTEM_PROMPT_IT;

  // General (~) mode: do not send ticket workflow JSON or suggestedAction rules — they prime the model back into "helpful support assistant".
  if (chatMode === "general") {
    return {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: JSON.stringify({
            hermesChatMode: "general",
            recentMessages: recentHistory
          })
        }
      ],
      temperature: 0.55
    };
  }

  return {
    model,
    messages: [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: JSON.stringify({
          hermesChatMode: chatMode,
          ticket: {
            id: ticket.id,
            title: ticket.title,
            description: ticket.description,
            category: ticket.category,
            status: ticket.status,
            aiState: ticket.aiState,
            createdAt: ticket.createdAt,
            updatedAt: ticket.updatedAt
          },
          recentMessages: recentHistory,
          suggestedActionRules: {
            continue_troubleshooting: "Use for useful next troubleshooting steps.",
            ask_customer: "Use when waiting for the customer to try something or answer a question.",
            suggest_resolution: "Use only when the customer clearly confirms the issue is fixed.",
            escalate_to_human: "Use when the customer requests a person, refuses AI help, is frustrated, or repeated steps failed."
          }
        })
      }
    ],
    temperature: 0.2
  };
}

function normalizeMessagesForHermes(messages, chatMode) {
  if (!Array.isArray(messages)) return [];

  return messages
    .filter((message) => message?.body)
    .map((message) => {
      const senderType = message.senderType || message.sender_type;
      let body = String(message.body);
      if (chatMode === "general" && senderType === "customer") {
        body = stripLeadingGeneralModePrefix(body);
      }
      return {
        senderType,
        senderName: message.senderName || message.sender_name,
        body,
        createdAt: message.createdAt || message.created_at
      };
    })
    .filter((message) => message.body.trim().length > 0);
}

/** Latest customer line starts with ~ (after leading whitespace) → general Hermes mode for this completion. */
export function classifyHermesChatMode(messages) {
  const raw = getLatestCustomerMessageBody(messages);
  if (String(raw ?? "").trimStart().startsWith("~")) return "general";
  return "it_helpdesk";
}

function getLatestCustomerMessageBody(messages) {
  if (!Array.isArray(messages)) return "";
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i];
    const st = m?.senderType || m?.sender_type;
    if (st === "customer" && m?.body != null) return String(m.body);
  }
  return "";
}

/** Remove one leading ~ (and following whitespace) from customer text sent to Hermes. */
function stripLeadingGeneralModePrefix(body) {
  return String(body ?? "").replace(/^\s*~\s*/, "");
}

async function readHermesBody(response) {
  const text = await response.text();

  if (!text.trim()) {
    throw new HermesProviderError("empty_response", "Hermes gateway returned an empty response.");
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function stripCodeFence(value) {
  return value
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function hasContractFields(value) {
  return Boolean(value && typeof value === "object" && "message" in value && "suggestedAction" in value);
}

/** If strict validation failed but escalation is obvious, still honor human review (Hermes partial JSON). */
function tryRecoverHermesEscalation(output) {
  if (!output || typeof output !== "object") return null;
  const message = typeof output.message === "string" ? output.message.trim() : "";
  const suggestedAction = normalizeSuggestedAction(output.suggestedAction);
  if (!message || suggestedAction !== AI_SUGGESTED_ACTION.ESCALATE_TO_HUMAN) return null;
  return { message, suggestedAction };
}

function validateHermesOutput(output) {
  const message = typeof output.message === "string" ? output.message.trim() : "";
  const suggestedAction = normalizeSuggestedAction(output.suggestedAction);

  if (!message) {
    throw new HermesProviderError("invalid_message", "Hermes response did not include a usable message.");
  }

  if (!suggestedAction) {
    throw new HermesProviderError("invalid_action", "Hermes response did not include a valid suggestedAction.");
  }

  return {
    message,
    suggestedAction,
    ...(typeof output.resolutionSummary === "string" && output.resolutionSummary.trim()
      ? { resolutionSummary: output.resolutionSummary.trim() }
      : {})
  };
}

function normalizeSuggestedAction(action) {
  if (typeof action !== "string") return null;

  const normalized = action.trim().toLowerCase();
  if (VALID_ACTIONS.has(normalized)) return normalized;

  const actionAliases = {
    ask: AI_SUGGESTED_ACTION.ASK_CUSTOMER,
    ask_customer: AI_SUGGESTED_ACTION.ASK_CUSTOMER,
    continue: AI_SUGGESTED_ACTION.CONTINUE_TROUBLESHOOTING,
    continue_troubleshooting: AI_SUGGESTED_ACTION.CONTINUE_TROUBLESHOOTING,
    resolve: AI_SUGGESTED_ACTION.SUGGEST_RESOLUTION,
    suggest_resolution: AI_SUGGESTED_ACTION.SUGGEST_RESOLUTION,
    escalate: AI_SUGGESTED_ACTION.ESCALATE_TO_HUMAN,
    escalate_to_human: AI_SUGGESTED_ACTION.ESCALATE_TO_HUMAN
  };

  return actionAliases[normalized] || null;
}
