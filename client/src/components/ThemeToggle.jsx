import { useCallback, useSyncExternalStore } from "react";
import {
  applyThemeClass,
  notifyThemeChange,
  persistTheme
} from "../lib/themeStorage.js";

function subscribe(callback) {
  window.addEventListener("sb-theme-change", callback);
  return () => window.removeEventListener("sb-theme-change", callback);
}

function getSnapshot() {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function getServerSnapshot() {
  return "dark";
}

export default function ThemeToggle() {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isDark = mode === "dark";

  const toggle = useCallback(() => {
    const next = isDark ? "light" : "dark";
    applyThemeClass(next);
    persistTheme(next);
    notifyThemeChange();
  }, [isDark]);

  return (
    <button
      type="button"
      onClick={toggle}
      className="fixed bottom-5 right-5 z-[100] flex h-12 w-12 items-center justify-center rounded-full border border-zinc-300/90 bg-white/95 text-amber-500 shadow-lg shadow-zinc-400/25 backdrop-blur-md transition hover:scale-[1.06] hover:border-cyan-500/50 hover:text-cyan-600 dark:border-white/15 dark:bg-zinc-900/90 dark:text-amber-200 dark:shadow-black/40 dark:hover:border-[#00F7FF]/55 dark:hover:text-[#7dd3fc]"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      {isDark ? <IconSun /> : <IconMoon />}
    </button>
  );
}

function IconSun() {
  return (
    <svg aria-hidden className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" strokeLinecap="round" />
    </svg>
  );
}

function IconMoon() {
  return (
    <svg aria-hidden className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  );
}
