"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { getBounds, type StyleChange } from "@/lib/board/objects";
import { canvasToScreen, type Viewport } from "@/lib/board/viewport";
import { usePresetColors, PRESET_WIDTHS, WidthDot } from "./toolbar";
import type { BoardObject } from "@/types/database";

interface FloatingObjectToolbarProps {
  selectedObject: BoardObject;
  viewport: Viewport;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onDelete: () => void;
  onStyleChange: (style: StyleChange) => void;
}

const FONT_SIZES = [12, 18, 24, 36] as const;

type OpenGroup = "color" | "width" | "fontSize" | null;

export function FloatingObjectToolbar({
  selectedObject,
  viewport,
  onBringToFront,
  onSendToBack,
  onDelete,
  onStyleChange,
}: FloatingObjectToolbarProps) {
  const presetColors = usePresetColors();
  const [open, setOpen] = useState<OpenGroup>(null);
  const [trackedId, setTrackedId] = useState(selectedObject.id);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Reset open group whenever the selected object changes
  // (recommended React 19 pattern: derive state from prop changes during render).
  if (trackedId !== selectedObject.id) {
    setTrackedId(selectedObject.id);
    setOpen(null);
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(null);
    }
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const bounds = getBounds(selectedObject);
  const tl = canvasToScreen(bounds.x, bounds.y, viewport);
  const tr = canvasToScreen(bounds.x + bounds.width, bounds.y, viewport);
  const centerX = (tl.x + tr.x) / 2;
  const topY = Math.max(8, tl.y - 48);

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
  const displayColor = currentStrokeColor ?? currentFillColor ?? "#0a0a0a";

  const currentStrokeWidth =
    isStrokeType || isFillType
      ? selectedObject.data.strokeWidth ?? 1
      : null;

  const currentFontSize = isText ? selectedObject.data.fontSize : null;

  function handleColorClick(c: string) {
    if (isText) onStyleChange({ fill: c });
    else if (isFillType) onStyleChange({ fill: c, stroke: c });
    else onStyleChange({ stroke: c });
    setOpen(null);
  }

  function handleWidthClick(w: number) {
    onStyleChange({ strokeWidth: w });
    setOpen(null);
  }

  function handleFontSizeClick(fs: number) {
    onStyleChange({ fontSize: fs });
    setOpen(null);
  }

  return (
    <div
      ref={rootRef}
      className={cn(
        "glass-panel pointer-events-auto absolute z-30 p-1",
        "flex flex-row items-center gap-0.5",
        "max-w-[calc(100vw-1rem)] overflow-x-auto"
      )}
      style={{ left: centerX, top: topY, transform: "translateX(-50%)" }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Arrange */}
      <IconButton title="Đưa lên trên" Icon={ChevronUp} onClick={onBringToFront} />
      <IconButton title="Đưa xuống dưới" Icon={ChevronDown} onClick={onSendToBack} />

      <Divider />

      {/* Color */}
      <button
        type="button"
        title="Màu"
        aria-label="Màu"
        aria-expanded={open === "color"}
        onClick={() => setOpen(open === "color" ? null : "color")}
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors",
          open === "color"
            ? "bg-black/10 dark:bg-white/10"
            : "hover:bg-black/10 dark:hover:bg-white/10"
        )}
      >
        <span
          className="h-4 w-4 rounded-full border-2 border-black/20 dark:border-white/20"
          style={{ backgroundColor: displayColor }}
        />
      </button>
      {open === "color" &&
        presetColors.map((c) => (
          <button
            key={c}
            type="button"
            title={c}
            aria-label={`Màu ${c}`}
            onClick={() => handleColorClick(c)}
            className="toolbar-pop flex h-7 w-7 shrink-0 items-center justify-center rounded-lg hover:bg-black/10 dark:hover:bg-white/10"
          >
            <span
              className={cn(
                "h-4 w-4 rounded-full border-2 transition-transform",
                displayColor === c
                  ? "scale-110 border-zinc-900 dark:border-white"
                  : "border-black/15 dark:border-white/15"
              )}
              style={{ backgroundColor: c }}
            />
          </button>
        ))}

      {/* Width (non-text) */}
      {!isText && currentStrokeWidth != null && (
        <>
          <button
            type="button"
            title={`Độ dày ${currentStrokeWidth}px`}
            aria-label="Độ dày nét"
            aria-expanded={open === "width"}
            onClick={() => setOpen(open === "width" ? null : "width")}
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors",
              open === "width"
                ? "bg-black/10 dark:bg-white/10"
                : "hover:bg-black/10 dark:hover:bg-white/10"
            )}
          >
            <WidthDot width={currentStrokeWidth} />
          </button>
          {open === "width" &&
            PRESET_WIDTHS.map((w) => (
              <button
                key={w}
                type="button"
                title={`Độ dày ${w}px`}
                aria-label={`Độ dày ${w}px`}
                onClick={() => handleWidthClick(w)}
                className={cn(
                  "toolbar-pop flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors",
                  currentStrokeWidth === w
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                    : "hover:bg-black/10 dark:hover:bg-white/10"
                )}
              >
                <WidthDot width={w} />
              </button>
            ))}
        </>
      )}

      {/* Font size (text only — edit content by double-click) */}
      {isText && currentFontSize != null && (
        <>
          <button
            type="button"
            title={`Cỡ chữ ${currentFontSize}`}
            aria-label="Cỡ chữ"
            aria-expanded={open === "fontSize"}
            onClick={() => setOpen(open === "fontSize" ? null : "fontSize")}
            className={cn(
              "flex h-7 min-w-[28px] shrink-0 items-center justify-center rounded-lg px-1 text-xs font-medium transition-colors",
              open === "fontSize"
                ? "bg-black/10 dark:bg-white/10"
                : "hover:bg-black/10 dark:hover:bg-white/10"
            )}
          >
            {currentFontSize}
          </button>
          {open === "fontSize" &&
            FONT_SIZES.map((fs) => (
              <button
                key={fs}
                type="button"
                title={`Cỡ chữ ${fs}`}
                onClick={() => handleFontSizeClick(fs)}
                className={cn(
                  "toolbar-pop flex h-7 min-w-[28px] shrink-0 items-center justify-center rounded-lg px-1 text-xs transition-colors",
                  currentFontSize === fs
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                    : "hover:bg-black/10 dark:hover:bg-white/10"
                )}
              >
                {fs}
              </button>
            ))}
        </>
      )}

      <Divider />

      <button
        type="button"
        title="Xóa (Del)"
        aria-label="Xóa"
        onClick={onDelete}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-500/10"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function IconButton({
  title,
  Icon,
  onClick,
}: {
  title: string;
  Icon: typeof ChevronUp;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-black/10 dark:hover:bg-white/10"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function Divider() {
  return (
    <div className="mx-0.5 h-5 w-px shrink-0 bg-black/15 dark:bg-white/15" />
  );
}
