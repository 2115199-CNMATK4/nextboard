"use client";

import { useEffect, useRef } from "react";
import { canvasToScreen, type Viewport } from "@/lib/board/viewport";
import type { BoardObject } from "@/types/database";

type TextObject = Extract<BoardObject, { type: "text" }>;

interface TextEditorOverlayProps {
  object: TextObject;
  viewport: Viewport;
  onSave: (text: string) => void;
  onCancel: () => void;
}

export function TextEditorOverlay({
  object,
  viewport,
  onSave,
  onCancel,
}: TextEditorOverlayProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.select();
  }, []);

  const { x: left, y: top } = canvasToScreen(
    object.data.x,
    object.data.y,
    viewport
  );
  const width = Math.max(60, (object.data.width ?? 120) * viewport.scale);
  const fontSize = Math.max(8, object.data.fontSize * viewport.scale);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
      return;
    }
    e.stopPropagation(); // prevent canvas keyboard handlers
  }

  function handleBlur(e: React.FocusEvent<HTMLTextAreaElement>) {
    const text = e.currentTarget.value.trim();
    if (text) {
      onSave(text);
    } else {
      onCancel();
    }
  }

  return (
    <textarea
      ref={ref}
      defaultValue={object.data.text}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      style={{
        position: "absolute",
        left,
        top,
        width,
        minHeight: fontSize * 1.5,
        fontSize,
        fontFamily: "inherit",
        color: object.data.fill,
        background: "rgba(255,255,255,0.9)",
        border: "2px dashed #3b82f6",
        borderRadius: 4,
        outline: "none",
        padding: "2px 4px",
        margin: 0,
        resize: "none",
        overflow: "hidden",
        lineHeight: 1.4,
        zIndex: 40,
        boxSizing: "border-box",
      }}
      onMouseDown={(e) => e.stopPropagation()}
    />
  );
}
