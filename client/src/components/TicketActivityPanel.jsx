import { getActivityLabel } from "../lib/activityLabels.js";

const MAX_EVENTS = 8;

export default function TicketActivityPanel({ messages }) {
  const total = messages.length;
  const shown = messages.slice(-MAX_EVENTS).reverse();

  return (
    <div className="rounded-2xl border border-zinc-200/90 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-black/40">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-white/50">Ticket activity</p>

      {total > MAX_EVENTS ? (
        <p className="mt-2 text-xs text-zinc-500 dark:text-white/40">Showing latest {MAX_EVENTS} events.</p>
      ) : null}

      <div className="mt-3 max-h-[min(40vh,320px)] space-y-2 overflow-y-auto sb-scrollbar pr-1">
        {total === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-white/40">No activity yet.</p>
        ) : (
          shown.map((message) => {
            const ts = message.createdAt || message.created_at;
            const activityLabel = getActivityLabel(message.body);
            return (
              <div
                key={message.id}
                className="rounded-lg border border-amber-400/55 bg-amber-50/95 px-2.5 py-1.5 text-[11px] text-amber-950/75 shadow-[0_0_0_1px_rgba(251,191,36,0.2)] dark:border-amber-300/55 dark:bg-amber-300/[0.04] dark:text-white/55 dark:shadow-[0_0_0_1px_rgba(252,211,77,0.12)]"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-amber-700/50 dark:text-white/35">↳</span>
                  <span className="font-semibold uppercase tracking-[0.14em] text-amber-900/60 dark:text-white/40">Activity</span>
                  <span className="text-amber-800/50 dark:text-white/60">·</span>
                  <span className="font-semibold text-amber-950/85 dark:text-white/70">{activityLabel}</span>
                </div>
                <p className="mt-1 break-words text-amber-950/85 dark:text-white/70">{message.body}</p>
                {ts ? <p className="mt-1 text-amber-800/50 dark:text-white/35">{new Date(ts).toLocaleString()}</p> : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
