"use client";

import { useCallback, useEffect, useState } from "react";
import {
  applyTheme,
  loadTheme,
  saveTheme,
  THEME_CHANGE_EVENT,
  type ThemeMode,
} from "@/lib/theme/storage";

/**
 * Theme preference hook. `theme` is the user's stored choice
 * ("light" | "dark" | "system"). Use `useDarkMode()` if you only need the
 * resolved boolean (what's currently rendered).
 */
export function useTheme(): {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
} {
  const [theme, setThemeState] = useState<ThemeMode>(loadTheme);

  // React to system-pref changes when mode is "system".
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  // React to changes from other tabs / components.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === "nextboard.theme.v1") {
        const next = loadTheme();
        setThemeState(next);
        applyTheme(next);
      }
    }
    function onLocalChange(e: Event) {
      const ev = e as CustomEvent<ThemeMode>;
      if (ev.detail) setThemeState(ev.detail);
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener(THEME_CHANGE_EVENT, onLocalChange as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(
        THEME_CHANGE_EVENT,
        onLocalChange as EventListener
      );
    };
  }, []);

  const setTheme = useCallback((next: ThemeMode) => {
    saveTheme(next);
    applyTheme(next);
    setThemeState(next);
    window.dispatchEvent(
      new CustomEvent(THEME_CHANGE_EVENT, { detail: next })
    );
  }, []);

  return { theme, setTheme };
}
