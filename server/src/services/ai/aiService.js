import { generateFallbackResponse } from "./providers/fallbackProvider.js";
import { HermesProviderError, generateHermesResponse } from "./providers/hermesProvider.js";
import { logInfo } from "../../utils/logger.js";

const FALLBACK_REASON_DISABLED = "hermes_disabled";

export async function generateAiResponse(ticket, messages = [], options = {}) {
  const hermesEnabled = parseBoolean(options.hermesEnabled ?? process.env.HERMES_ENABLED);

  if (!hermesEnabled) {
    return generateFallbackResponse(ticket, messages, {
      fallbackReason: FALLBACK_REASON_DISABLED
    });
  }

  try {
    return await generateHermesResponse(ticket, messages, options.hermes);
  } catch (error) {
    const fallbackReason = getFallbackReason(error);
    logInfo("ai.hermes.failure", {
      response_mode: "fallback",
      ticketId: ticket?.id,
      reason: fallbackReason,
      message: error.message
    });

    return generateFallbackResponse(ticket, messages, {
      fallbackReason,
      hermesErrorDetail: truncateForMeta(error?.message, 420)
    });
  }
}

function parseBoolean(value) {
  return String(value).trim().toLowerCase() === "true";
}

function getFallbackReason(error) {
  if (error instanceof HermesProviderError && error.reason) {
    return error.reason;
  }

  return "hermes_failure";
}

function truncateForMeta(text, maxLen) {
  const s = String(text ?? "").trim();
  if (!s) return undefined;
  if (s.length <= maxLen) return s;
  return `${s.slice(0, Math.max(0, maxLen - 1)).trim()}…`;
}

export default generateAiResponse;
