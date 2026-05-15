import { getActivityLabel } from "../lib/activityLabels.js";

const senderLabels = {
  customer: "Customer",
  ai: "AI Assistant",
  human: "Human Reviewer",
  system: "System"
};

function aiFallbackFootnote(message) {
  const sender = message.senderType || message.sender_type;
  if (sender !== "ai") return null;
  const raw = message.metadata;
  if (!raw || typeof raw !== "string") return null;
  let meta;
  try {
    meta = JSON.parse(raw);
  } catch {
    return null;
  }
  if (meta.provider !== "fallback") return null;
  if (typeof meta.hermesErrorDetail === "string" && meta.hermesErrorDetail.trim()) {
    const d = meta.hermesErrorDetail.trim();
    return d.length > 240 ? `${d.slice(0, 237)}…` : d;
  }
  if (meta.fallbackReason === "hermes_disabled") {
    return "Offline template — Hermes is turned off in server config.";
  }
  if (meta.fallbackReason) {
    return "Offline template — Hermes did not return a reply for this message.";
  }
  return "Offline template — Hermes was not used for this reply.";
}

const BUBBLE_MAX = "max-w-[min(720px,68%)]";

function bubbleClasses(sender) {
  if (sender === "ai") {
    return `rounded-2xl border-2 border-cyan-500/50 bg-white/90 px-3.5 py-2.5 shadow-md shadow-cyan-500/10 shadow-[0_0_14px_rgba(6,182,212,0.2)] dark:border-[#7dd3fc]/80 dark:bg-black/40 dark:shadow-black/30 dark:shadow-[0_0_16px_rgba(0,247,255,0.18)]`;
  }
  if (sender === "customer") {
    return `rounded-2xl border-2 border-zinc-300 bg-white px-3.5 py-2.5 shadow-md shadow-zinc-300/25 dark:border-white/50 dark:bg-black/40 dark:shadow-black/30`;
  }
  if (sender === "human") {
    return `rounded-2xl border-2 border-zinc-400 bg-zinc-50 px-3.5 py-2.5 shadow-md shadow-zinc-300/20 dark:border-white/35 dark:bg-black/40 dark:shadow-black/30`;
  }
  return `rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 px-3.5 py-2.5 shadow-md shadow-zinc-200/40 dark:border-white/15 dark:bg-black/20 dark:shadow-black/30`;
}

export default function MessageBubble({ message }) {
  const sender = message.senderType || message.sender_type || "system";
  const isSystem = sender === "system";
  const isCustomer = sender === "customer";
  const createdAt = message.createdAt || message.created_at;
  const timestamp = createdAt ? new Date(createdAt).toLocaleString() : "";
  const fallbackNote = aiFallbackFootnote(message);

  if (isSystem) {
    const activityLabel = getActivityLabel(message.body);

    return (
      <div className="flex w-full min-w-0 justify-center py-1">
        <div className="group relative my-0.5 w-fit max-w-[min(720px,80%)] min-w-0 rounded-lg border border-amber-400/60 bg-amber-50/90 px-2.5 py-1.5 text-[11px] text-amber-950/70 shadow-[0_0_0_1px_rgba(251,191,36,0.25)] dark:border-amber-300/55 dark:bg-amber-300/[0.04] dark:text-white/55 dark:shadow-[0_0_0_1px_rgba(252,211,77,0.12)]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="text-amber-700/50 dark:text-white/35">↳</span>
              <span className="shrink-0 font-semibold uppercase tracking-[0.14em] text-amber-800/60 dark:text-white/40">Activity</span>
              <span className="shrink-0 text-amber-800/50 dark:text-white/60">·</span>
              <span className="shrink-0 font-semibold text-amber-900/80 dark:text-white/70">{activityLabel}</span>
              <span className="max-w-[18rem] truncate text-amber-950/75 dark:text-white/65">{message.body}</span>
            </div>
            {timestamp ? <span className="shrink-0 text-amber-800/40 dark:text-white/30">{timestamp}</span> : null}
          </div>

          <div
            className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 w-[28rem] max-w-[calc(100vw-1rem)] -translate-x-1/2 overflow-y-auto rounded-lg border border-amber-300/50 bg-white px-3 py-2 text-[11px] text-amber-950 shadow-xl shadow-amber-900/10 opacity-0 transition-opacity duration-150 group-hover:opacity-100 dark:border-amber-300/40 dark:bg-black/90 dark:text-white/80 dark:shadow-black/60"
            role="tooltip"
            aria-label={activityLabel}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold text-amber-950 dark:text-white/80">{activityLabel}</span>
              {timestamp ? <span className="shrink-0 text-amber-800/50 dark:text-white/40">{timestamp}</span> : null}
            </div>
            <p className="mt-1 whitespace-pre-wrap leading-4 text-amber-950/90 dark:text-white/80">{message.body}</p>
          </div>
        </div>
      </div>
    );
  }

  const rowAlign = isCustomer ? "justify-end" : "justify-start";

  return (
    <div className={`flex w-full min-w-0 py-0.5 ${rowAlign}`}>
      <div className={`w-fit min-w-0 ${BUBBLE_MAX} ${bubbleClasses(sender)}`}>
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-600 dark:text-white/70">
          <span className="font-semibold text-zinc-900 dark:text-white">{senderLabels[sender] || "System"}</span>
          {timestamp ? <time className="shrink-0 text-zinc-500 dark:text-white/50">{timestamp}</time> : null}
        </div>
        <p className="whitespace-pre-wrap break-words text-sm leading-6 text-zinc-800 dark:text-white/90">{message.body}</p>
        {fallbackNote ? (
          <p className="mt-1.5 border-t border-cyan-500/20 pt-1.5 text-[11px] leading-4 text-zinc-500 dark:border-white/10 dark:text-white/45">
            {fallbackNote}
          </p>
        ) : null}
      </div>
    </div>
  );
}
