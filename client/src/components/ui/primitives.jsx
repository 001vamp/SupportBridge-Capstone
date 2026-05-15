const baseFocus =
  "focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:ring-offset-2 focus:ring-offset-zinc-100 dark:focus:ring-white dark:focus:ring-offset-black";

export function Card({ children, className = "" }) {
  return (
    <div
      className={`rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-lg shadow-zinc-300/30 dark:border-white/15 dark:bg-black dark:shadow-2xl dark:shadow-black/40 ${className}`}
    >
      {children}
    </div>
  );
}

export function Button({ children, className = "", variant = "primary", type = "button", ...props }) {
  const variants = {
    primary:
      "border-zinc-800 bg-zinc-900 text-white shadow-lg shadow-zinc-400/20 hover:bg-zinc-800 dark:border-white dark:bg-white dark:text-black dark:shadow-black/30 dark:hover:bg-black dark:hover:text-white",
    secondary:
      "border-zinc-300 bg-white text-zinc-900 hover:border-zinc-800 hover:bg-zinc-900 hover:text-white dark:border-white/30 dark:bg-black dark:text-white dark:hover:border-white dark:hover:bg-white dark:hover:text-black",
    success:
      "border-zinc-300 bg-white text-zinc-900 hover:border-zinc-800 hover:bg-zinc-900 hover:text-white dark:border-white/30 dark:bg-black dark:text-white dark:hover:border-white dark:hover:bg-white dark:hover:text-black",
    warning:
      "border-zinc-300 bg-white text-zinc-900 hover:border-zinc-800 hover:bg-zinc-900 hover:text-white dark:border-white/30 dark:bg-black dark:text-white dark:hover:border-white dark:hover:bg-white dark:hover:text-black",
    danger:
      "border-zinc-300 bg-white text-zinc-900 hover:border-zinc-800 hover:bg-zinc-900 hover:text-white dark:border-white/30 dark:bg-black dark:text-white dark:hover:border-white dark:hover:bg-white dark:hover:text-black",
    dangerSoft:
      "border-red-400/70 bg-red-50 text-red-800 hover:border-red-400 hover:bg-red-100 dark:border-red-400/60 dark:bg-red-500/10 dark:text-red-200 dark:hover:border-red-300 dark:hover:bg-red-500/15",
    ghost:
      "border-transparent bg-transparent text-zinc-600 hover:bg-zinc-200/80 hover:text-zinc-900 dark:text-white/80 dark:hover:bg-white/10 dark:hover:text-white"
  };

  return (
    <button
      type={type}
      className={`inline-flex min-h-10 items-center justify-center rounded-lg border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${baseFocus} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({ className = "", ...props }) {
  return (
    <input
      className={`mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 disabled:bg-zinc-100 dark:border-white/25 dark:bg-black dark:text-white dark:placeholder:text-white/50 dark:disabled:bg-black/80 ${baseFocus} ${className}`}
      {...props}
    />
  );
}

export function Textarea({ className = "", ...props }) {
  return (
    <textarea
      className={`mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 disabled:bg-zinc-100 dark:border-white/25 dark:bg-black dark:text-white dark:placeholder:text-white/50 dark:disabled:bg-black/80 ${baseFocus} ${className}`}
      {...props}
    />
  );
}

export function FieldLabel({ children, htmlFor }) {
  return (
    <label className="block text-xs font-semibold uppercase text-zinc-500 dark:text-white/70" htmlFor={htmlFor}>
      {children}
    </label>
  );
}

export function Notice({ children, tone = "info", className = "" }) {
  const tones = {
    info: "border-zinc-200 bg-zinc-50 text-zinc-800 dark:border-white/25 dark:bg-black dark:text-white",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-white/25 dark:bg-black dark:text-white",
    warning: "border-amber-200 bg-amber-50 text-amber-950 dark:border-white/25 dark:bg-black dark:text-white",
    danger: "border-red-200 bg-red-50 text-red-900 dark:border-white/25 dark:bg-black dark:text-white",
    muted: "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-white/15 dark:bg-black dark:text-white/80"
  };

  return <p className={`rounded-xl border p-3 text-sm ${tones[tone]} ${className}`}>{children}</p>;
}

export function EmptyState({ children, className = "" }) {
  return (
    <div
      className={`rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 p-8 text-sm text-zinc-600 dark:border-white/25 dark:bg-black dark:text-white/70 ${className}`}
    >
      {children}
    </div>
  );
}

export function LoadingState({ children = "Loading..." }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-700 dark:border-white/25 dark:bg-black dark:text-white/80">
      <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-cyan-600 shadow-md shadow-cyan-600/30 dark:bg-white dark:shadow-black/30" />
      {children}
    </div>
  );
}
