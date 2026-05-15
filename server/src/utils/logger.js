export function logInfo(event, details = {}) {
  const fields = Object.entries(details)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}=${value}`)
    .join(" ");

  console.log(`[supportbridge] ${event}${fields ? ` ${fields}` : ""}`);
}
