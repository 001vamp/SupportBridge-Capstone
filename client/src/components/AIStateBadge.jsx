const stateClasses = {
  ACTIVE: "border-cyan-500/50 bg-cyan-50 text-cyan-800 dark:border-[#00F7FF]/50 dark:bg-[#00F7FF]/10 dark:text-[#00F7FF]",
  PAUSED: "border-red-300 bg-red-50 text-red-800 dark:border-red-400/60 dark:bg-red-400/10 dark:text-red-200",
  TAKEN_OVER: "border-zinc-300 bg-zinc-100 text-zinc-800 dark:border-white/25 dark:bg-black dark:text-white",
  DISABLED: "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-white/15 dark:bg-black dark:text-white/80"
};

export default function AIStateBadge({ state }) {
  const normalized = typeof state === "string" ? state.trim() : "";
  const label = getAiStateLabel(normalized);
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${stateClasses[normalized] || stateClasses.DISABLED}`}>
      {label}
    </span>
  );
}

function getAiStateLabel(state) {
  if (!state) return "AI";

  const labels = {
    ACTIVE: "AI Active",
    PAUSED: "AI Paused",
    TAKEN_OVER: "AI Taken over",
    DISABLED: "AI Disabled"
  };

  return labels[state] || "AI";
}
