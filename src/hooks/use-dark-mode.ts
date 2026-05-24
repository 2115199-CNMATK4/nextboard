"use client";

import { useEffect, useState } from "react";

/**
 * Tracks `prefers-color-scheme: dark`. Returns `false` on first render
 * (server / pre-effect) then syncs with the media query.
 */
function readPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function useDarkMode(): boolean {
  const [isDark, setIsDark] = useState(readPrefersDark);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    function onChange(e: MediaQueryListEvent) {
      setIsDark(e.matches);
    }
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return isDark;
}

/** "Ink" color: black in light theme, white in dark. */
export function useInkColor(): string {
  return useDarkMode() ? "#fafafa" : "#0a0a0a";
}
