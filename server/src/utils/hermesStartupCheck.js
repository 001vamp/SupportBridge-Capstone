/**
 * Prints whether Hermes is configured and optionally probes the gateway /models route.
 * Real customer replies still go through POST /chat/completions — this is only a connectivity hint.
 */
export async function logHermesStartupCheck() {
  const enabled = String(process.env.HERMES_ENABLED ?? "").trim().toLowerCase() === "true";

  if (!enabled) {
    console.log(
      "[AI] Hermes is off (HERMES_ENABLED is not true). Customer AI uses the built-in fallback templates."
    );
    return;
  }

  const gatewayUrl = (process.env.HERMES_GATEWAY_URL || "").trim().replace(/\/+$/, "");
  const apiKey = (process.env.HERMES_API_KEY || process.env.HERMES_KEY || "").trim();
  const model = (process.env.HERMES_MODEL || "hermes-agent").trim();

  if (!gatewayUrl || !apiKey) {
    console.warn(
      "[AI] Hermes is on but HERMES_GATEWAY_URL or HERMES_API_KEY / HERMES_KEY is empty — every AI call will fail and fall back."
    );
    return;
  }

  console.log(`[AI] Hermes is on → ${gatewayUrl} (model: ${model}).`);

  if (gatewayUrl.endsWith("/chat/completions")) {
    return;
  }

  const modelsUrl = gatewayUrl.endsWith("/v1") ? `${gatewayUrl}/models` : `${gatewayUrl}/v1/models`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(modelsUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal
    });
    clearTimeout(timer);

    if (response.ok) {
      console.log(`[AI] Hermes gateway OK (GET ${modelsUrl} → ${response.status}).`);
    } else if (response.status === 401 || response.status === 403) {
      console.warn(
        `[AI] Hermes gateway auth failed (${response.status}). Fix HERMES_API_KEY or gateway config — otherwise replies fall back.`
      );
    } else {
      console.log(
        `[AI] Hermes gateway HTTP ${response.status} for ${modelsUrl} (no /models is fine if chat/completions works).`
      );
    }
  } catch (error) {
    const reason = error.name === "AbortError" ? "probe timed out" : error.message;
    console.warn(`[AI] Hermes gateway probe failed (${reason}). AI may fall back until the gateway is reachable.`);
  }
}
