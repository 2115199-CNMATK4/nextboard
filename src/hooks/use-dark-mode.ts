"use client";

import { useEffect, useState } from "react";

/**
 * Returns whether `.dark` is currently applied to the document root.
 * Source of truth = html element class, which is set by the inline pre-paint
 * script in layout.tsx and updated by `useTheme().setTheme(...)`.
 */
function readDarkClass(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

export function useDarkMode(): boolean {
  const [isDark, setIsDark] = useState(readDarkClass);

  useEffect(() => {
    const html = document.documentElement;
    const observer = new MutationObserver(() => {
      setIsDark(html.classList.contains("dark"));
    });
    observer.observe(html, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}

/** "Ink" color: black in light theme, white in dark. */
export function useInkColor(): string {
  return useDarkMode() ? "#fafafa" : "#0a0a0a";
}
