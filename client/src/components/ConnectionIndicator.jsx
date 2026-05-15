const labels = {
  live: "Live",
  reconnecting: "Reconnecting",
  offline: "Offline fallback"
};

const classes = {
  live: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-400/40 dark:bg-black dark:text-emerald-300",
  reconnecting: "border-zinc-300 bg-zinc-100 text-zinc-800 dark:border-white/25 dark:bg-black dark:text-white",
  offline: "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-white/15 dark:bg-black dark:text-white/80"
};

export default function ConnectionIndicator({ status }) {
  const value = status || "offline";
  const dotClassName = value === "live" ? "animate-pulse" : "";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${classes[value] || classes.offline}`}>
      <span className={`h-1.5 w-1.5 rounded-full bg-current ${dotClassName}`} />
      {labels[value] || labels.offline}
    </span>
  );
}
