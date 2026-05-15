import { useEffect, useState } from "react";
import { getBrowserBackendOrigin } from "../api/backendOrigin.js";

const labels = {
  localhost: "This computer (localhost)",
  loopback: "This computer (127.0.0.1)",
  lan: "Network (LAN)"
};

export default function JoinPresentationPage() {
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const base = getBrowserBackendOrigin();
    fetch(`${base}/api/dev/join-urls`)
      .then((r) => {
        if (!r.ok) throw new Error("Could not load URL list.");
        return r.json();
      })
      .then((data) => setEntries(data.entries || []))
      .catch((e) => setError(e.message || "Failed to load."));
  }, []);

  return (
    <section className="mx-auto max-w-lg py-10">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">Open this app on the network</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-white/70">
        Use one of the links below from another phone or laptop on the same Wi‑Fi (presentation helper).
      </p>

      <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-white/50">
        You are here now
      </p>
      <p className="mt-1 break-all rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-sm text-zinc-800 dark:border-white/15 dark:bg-black/40 dark:text-white/90">
        {typeof window !== "undefined" ? window.location.href : ""}
      </p>

      <p className="mt-8 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-white/50">
        Same app on this machine
      </p>
      {error ? <p className="mt-2 text-sm text-red-600 dark:text-red-300">{error}</p> : null}
      {!error && entries === null ? (
        <p className="mt-2 text-sm text-zinc-500 dark:text-white/60">Loading…</p>
      ) : null}
      {entries && entries.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {entries.map((row) => (
            <li key={row.url}>
              <a
                className="block break-all rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-sm text-cyan-700 underline-offset-2 hover:underline dark:border-white/15 dark:bg-black/40 dark:text-[#7dd3fc]"
                href={row.url}
              >
                {row.url}
              </a>
              <span className="mt-0.5 block text-xs text-zinc-500 dark:text-white/50">{labels[row.kind] || row.kind}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="mt-10 text-xs text-zinc-500 dark:text-white/45">
        API must be running. Port comes from <code className="rounded bg-zinc-100 px-1 dark:bg-white/10">CLIENT_ORIGIN</code> in{" "}
        <code className="rounded bg-zinc-100 px-1 dark:bg-white/10">server/.env</code> or defaults to 5173.
      </p>
    </section>
  );
}
