"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronUp, ChevronDown, Trash2, PaintBucket, Ban } from "lucide-react";
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

const FONT_SIZE_PRESETS = [10, 14, 18, 24, 32, 48, 72] as const;
const MIN_FONT_SIZE = 6;
const MAX_FONT_SIZE = 200;

type OpenGroup = "color" | "width" | "fontSize" | "background" | null;

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
    const clamped = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Math.round(fs)));
    onStyleChange({ fontSize: clamped });
    setOpen(null);
  }

  function handleBackgroundClick(c: string | null) {
    onStyleChange({ background: c });
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
          {open === "fontSize" && (
            <>
              <FontSizeInput
                value={currentFontSize}
                onCommit={handleFontSizeClick}
              />
              {FONT_SIZE_PRESETS.map((fs) => (
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

          {/* Text background */}
          <button
            type="button"
            title={
              selectedObject.type === "text" && selectedObject.data.background
                ? "Nền text"
                : "Thêm nền"
            }
            aria-label="Nền text"
            aria-expanded={open === "background"}
            onClick={() => setOpen(open === "background" ? null : "background")}
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors",
              open === "background"
                ? "bg-black/10 dark:bg-white/10"
                : "hover:bg-black/10 dark:hover:bg-white/10"
            )}
          >
            {selectedObject.type === "text" && selectedObject.data.background ? (
              <span
                className="h-4 w-4 rounded border-2 border-black/20 dark:border-white/20"
                style={{ backgroundColor: selectedObject.data.background }}
              />
            ) : (
              <PaintBucket className="h-4 w-4" />
            )}
          </button>
          {open === "background" && (
            <>
              <button
                key="no-bg"
                type="button"
                title="Bỏ nền"
                aria-label="Bỏ nền"
                onClick={() => handleBackgroundClick(null)}
                className="toolbar-pop flex h-7 w-7 shrink-0 items-center justify-center rounded-lg hover:bg-black/10 dark:hover:bg-white/10"
              >
                <Ban className="h-4 w-4 text-zinc-500" />
              </button>
              {presetColors.map((c) => (
                <button
                  key={c}
                  type="button"
                  title={c}
                  aria-label={`Nền ${c}`}
                  onClick={() => handleBackgroundClick(c)}
                  className="toolbar-pop flex h-7 w-7 shrink-0 items-center justify-center rounded-lg hover:bg-black/10 dark:hover:bg-white/10"
                >
                  <span
                    className={cn(
                      "h-4 w-4 rounded border-2 transition-transform",
                      selectedObject.type === "text" &&
                        selectedObject.data.background === c
                        ? "scale-110 border-zinc-900 dark:border-white"
                        : "border-black/15 dark:border-white/15"
                    )}
                    style={{ backgroundColor: c }}
                  />
                </button>
              ))}
            </>
          )}
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

/** Inline numeric input for free-form font size entry. */
function FontSizeInput({
  value,
  onCommit,
}: {
  value: number;
  onCommit: (n: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));

  // Keep draft in sync when value prop changes externally (e.g. preset click).
  const [trackedValue, setTrackedValue] = useState(value);
  if (trackedValue !== value) {
    setTrackedValue(value);
    setDraft(String(value));
  }

  function commit() {
    const n = Number(draft);
    if (Number.isFinite(n) && n > 0) onCommit(n);
  }

  return (
    <input
      type="number"
      inputMode="numeric"
      min={MIN_FONT_SIZE}
      max={MAX_FONT_SIZE}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        }
        e.stopPropagation();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onFocus={(e) => e.currentTarget.select()}
      aria-label="Cỡ chữ tùy chỉnh"
      className={cn(
        "toolbar-pop h-7 w-12 shrink-0 rounded-lg border border-black/10 bg-white/40 px-1 text-center text-xs",
        "outline-none focus:border-blue-500 focus:bg-white/80",
        "dark:border-white/10 dark:bg-zinc-900/40 dark:focus:bg-zinc-900/80",
        "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      )}
    />
  );
}
