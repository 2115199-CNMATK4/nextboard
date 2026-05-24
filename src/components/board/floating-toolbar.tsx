"use client";

import { ChevronUp, ChevronDown, Trash2, Type } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { getBounds, type StyleChange } from "@/lib/board/objects";
import { canvasToScreen, type Viewport } from "@/lib/board/viewport";
import { PRESET_COLORS, PRESET_WIDTHS } from "./toolbar";
import type { BoardObject } from "@/types/database";

interface FloatingObjectToolbarProps {
  selectedObject: BoardObject;
  viewport: Viewport;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onDelete: () => void;
  onStyleChange: (style: StyleChange) => void;
  onEditText?: () => void;
}

const FONT_SIZES = [12, 18, 24, 36] as const;

export function FloatingObjectToolbar({
  selectedObject,
  viewport,
  onBringToFront,
  onSendToBack,
  onDelete,
  onStyleChange,
  onEditText,
}: FloatingObjectToolbarProps) {
  const bounds = getBounds(selectedObject);
  const tl = canvasToScreen(bounds.x, bounds.y, viewport);
  const tr = canvasToScreen(bounds.x + bounds.width, bounds.y, viewport);
  const centerX = (tl.x + tr.x) / 2;
  const topY = Math.max(8, tl.y - 52);

  const isText = selectedObject.type === "text";
  const isStrokeType =
    selectedObject.type === "line" ||
    selectedObject.type === "arrow" ||
    selectedObject.type === "freehand";
  const isFillType =
    selectedObject.type === "rect" || selectedObject.type === "ellipse";

  const currentStrokeColor = isStrokeType
    ? selectedObject.data.stroke
    : isFillType
    ? (selectedObject.data.stroke ?? "#0a0a0a")
    : null;

  const currentFillColor = isFillType
    ? selectedObject.data.fill
    : isText
    ? selectedObject.data.fill
    : null;

  const activeColor = currentStrokeColor ?? currentFillColor ?? null;

  const handleColorClick = (c: string) => {
    if (isText) {
      onStyleChange({ fill: c });
    } else if (isFillType) {
      onStyleChange({ fill: c, stroke: c });
    } else {
      onStyleChange({ stroke: c });
    }
  };

  return (
    <div
      className="glass-panel pointer-events-auto absolute z-30 flex items-center gap-0.5 px-2 py-1.5"
      style={{ left: centerX, top: topY, transform: "translateX(-50%)" }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Arrange */}
      <button
        type="button"
        title="Đưa lên trên"
        onClick={onBringToFront}
        className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-black/10 dark:hover:bg-white/10"
      >
        <ChevronUp className="h-4 w-4" />
      </button>
      <button
        type="button"
        title="Đưa xuống dưới"
        onClick={onSendToBack}
        className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-black/10 dark:hover:bg-white/10"
      >
        <ChevronDown className="h-4 w-4" />
      </button>

      <div className="mx-1 h-5 w-px bg-black/15 dark:bg-white/15" />

      {/* Color swatches */}
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          title={c}
          onClick={() => handleColorClick(c)}
          className={cn(
            "h-5 w-5 rounded-full border-2 transition-transform hover:scale-110",
            activeColor === c
              ? "scale-110 border-zinc-900 dark:border-white"
              : "border-transparent"
          )}
          style={{ backgroundColor: c }}
        />
      ))}

      {/* Stroke width (non-text) */}
      {!isText && (
        <>
          <div className="mx-1 h-5 w-px bg-black/15 dark:bg-white/15" />
          {PRESET_WIDTHS.map((w) => (
            <button
              key={w}
              type="button"
              title={`Độ dày ${w}px`}
              onClick={() => onStyleChange({ strokeWidth: w })}
              className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-black/10 dark:hover:bg-white/10"
            >
              <div
                className="w-5 rounded-full bg-current"
                style={{ height: w }}
              />
            </button>
          ))}
        </>
      )}

      {/* Font size + edit text (text only) */}
      {isText && (
        <>
          <div className="mx-1 h-5 w-px bg-black/15 dark:bg-white/15" />
          {FONT_SIZES.map((fs) => (
            <button
              key={fs}
              type="button"
              title={`Cỡ chữ ${fs}`}
              onClick={() => onStyleChange({ fontSize: fs })}
              className={cn(
                "flex h-7 min-w-[28px] items-center justify-center rounded-lg px-1 text-xs hover:bg-black/10 dark:hover:bg-white/10",
                selectedObject.type === "text" &&
                  selectedObject.data.fontSize === fs &&
                  "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
              )}
            >
              {fs}
            </button>
          ))}
          <div className="mx-1 h-5 w-px bg-black/15 dark:bg-white/15" />
          <button
            type="button"
            title="Sửa text"
            onClick={onEditText}
            className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-black/10 dark:hover:bg-white/10"
          >
            <Type className="h-4 w-4" />
          </button>
        </>
      )}

      <div className="mx-1 h-5 w-px bg-black/15 dark:bg-white/15" />

      {/* Delete */}
      <button
        type="button"
        title="Xóa (Del)"
        onClick={onDelete}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
