export const SB_THEME_STORAGE_KEY = "sb-theme";

export function readStoredTheme() {
  try {
    return localStorage.getItem(SB_THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Applies `dark` class on `<html>` when mode is dark (default). */
export function applyThemeClass(mode) {
  const root = document.documentElement;
  if (mode === "light") root.classList.remove("dark");
  else root.classList.add("dark");
}

export function persistTheme(mode) {
  try {
    localStorage.setItem(SB_THEME_STORAGE_KEY, mode);
  } catch {
    /* private mode, etc. */
  }
}

/** Call once before paint (e.g. from main.jsx) so the first frame matches saved preference. */
export function initThemeFromStorage() {
  applyThemeClass(readStoredTheme() === "light" ? "light" : "dark");
}

export function notifyThemeChange() {
  window.dispatchEvent(new Event("sb-theme-change"));
}
