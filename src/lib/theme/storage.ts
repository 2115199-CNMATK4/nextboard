// Client-only theme preference. Persisted in localStorage so the inline
// pre-paint script in layout.tsx can read it without React.

export type ThemeMode = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "nextboard.theme.v1";
export const THEME_CHANGE_EVENT = "nextboard:theme-change";

export function isValidTheme(v: unknown): v is ThemeMode {
  return v === "light" || v === "dark" || v === "system";
}

export function loadTheme(): ThemeMode {
  if (typeof window === "undefined") return "system";
  try {
    const v = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isValidTheme(v) ? v : "system";
  } catch {
    return "system";
  }
}

export function saveTheme(theme: ThemeMode): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* localStorage unavailable */
  }
}

/** Resolve a ThemeMode to whether dark should be active right now. */
export function resolveDark(theme: ThemeMode): boolean {
  if (typeof window === "undefined") return false;
  if (theme === "dark") return true;
  if (theme === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Apply theme to the document — toggles `.dark` on <html>. */
export function applyTheme(theme: ThemeMode): void {
  if (typeof document === "undefined") return;
  const dark = resolveDark(theme);
  document.documentElement.classList.toggle("dark", dark);
}
