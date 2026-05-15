import { getStatusLabel } from "../lib/status.js";

const statusClasses = {
  NEW: "border-zinc-300 bg-zinc-100 text-zinc-800 dark:border-white/25 dark:bg-black dark:text-white",
  AI_ACTIVE: "border-zinc-300 bg-zinc-100 text-zinc-800 dark:border-white/25 dark:bg-black dark:text-white",
  WAITING_CUSTOMER: "border-zinc-300 bg-zinc-100 text-zinc-800 dark:border-white/25 dark:bg-black dark:text-white",
  HUMAN_REVIEW:
    "border-amber-400/70 bg-amber-50 text-amber-950 shadow-sm shadow-amber-200/50 dark:border-amber-300/60 dark:bg-amber-300/10 dark:text-amber-200 dark:shadow-[0_0_18px_rgba(252,211,77,0.22)]",
  HUMAN_TAKEOVER: "border-zinc-300 bg-zinc-100 text-zinc-800 dark:border-white/25 dark:bg-black dark:text-white",
  PENDING_CLOSE_REVIEW: "border-zinc-300 bg-zinc-100 text-zinc-800 dark:border-white/25 dark:bg-black dark:text-white",
  CLOSED: "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-white/15 dark:bg-black dark:text-white/80"
};

export default function TicketStatusBadge({ status }) {
  const showHumanReviewIcon = status === "HUMAN_REVIEW";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses[status] || statusClasses.CLOSED}`}
    >
      {showHumanReviewIcon ? <HumanHandAlertIcon /> : null}
      {getStatusLabel(status)}
    </span>
  );
}

function HumanHandAlertIcon() {
  return (
    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-amber-500/60 bg-white text-[10px] leading-none text-amber-800 dark:border-amber-300/60 dark:bg-black dark:text-amber-200">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-3.5 w-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Simple hand outline */}
        <path d="M8 12V7.5a1.5 1.5 0 0 1 3 0V12" />
        <path d="M11 12V6.8a1.5 1.5 0 0 1 3 0V12" />
        <path d="M14 12V8.2a1.5 1.5 0 0 1 3 0V13" />
        <path d="M8 12c-.9-.7-2.2-.4-2.8.6-.5.8-.4 1.9.3 2.6l3.3 3.5c.6.7 1.5 1.1 2.4 1.1h3.3c1.2 0 2.3-.6 2.9-1.6l1.2-2.1c.4-.7.6-1.5.6-2.3V13" />
        {/* Exclamation mark */}
        <path d="M16.6 6.2v4.1" />
        <path d="M16.6 12.3h0" />
      </svg>
    </span>
  );
}
