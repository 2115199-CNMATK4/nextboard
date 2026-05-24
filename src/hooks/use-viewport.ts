"use client";

import { useState, useCallback } from "react";
import {
  DEFAULT_VIEWPORT,
  MIN_SCALE,
  MAX_SCALE,
  type Viewport,
} from "@/lib/board/viewport";

export function useViewport(boardId?: string) {
  const key = boardId ? `vp:${boardId}` : null;

  const [viewport, setVpState] = useState<Viewport>(() => {
    if (!key || typeof window === "undefined") return DEFAULT_VIEWPORT;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const p = JSON.parse(raw) as Viewport;
        return { ...p, scale: Math.min(MAX_SCALE, Math.max(MIN_SCALE, p.scale)) };
      }
    } catch {}
    return DEFAULT_VIEWPORT;
  });

  const setViewport = useCallback(
    (vp: Viewport) => {
      const next: Viewport = {
        ...vp,
        scale: Math.min(MAX_SCALE, Math.max(MIN_SCALE, vp.scale)),
      };
      setVpState(next);
      if (key) {
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {}
      }
    },
    [key]
  );

  return { viewport, setViewport };
}
