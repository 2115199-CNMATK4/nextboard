"use client";

import { useEffect, useRef, useState } from "react";
import {
  MousePointer2,
  Type,
  Square,
  Circle,
  Minus,
  ArrowRight,
  Pencil,
  Eraser,
  Grid3x3,
  Shapes,
  ImagePlus,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useInkColor } from "@/hooks/use-dark-mode";
import type { ToolMode } from "@/lib/board/objects";

/** 7 fixed accent colors. Ink color (black/white) is prepended dynamically. */
const ACCENT_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
] as const;

export function usePresetColors(): string[] {
  const ink = useInkColor();
  return [ink, ...ACCENT_COLORS];
}

/** Re-export as runtime constant for non-hook callers (backwards compat). */
export const PRESET_COLORS = ["#0a0a0a", ...ACCENT_COLORS] as const;

export const PRESET_WIDTHS = [2, 4, 8] as const;
export type PresetWidth = (typeof PRESET_WIDTHS)[number];

type ShapeChoice = "rect" | "ellipse";
type OpenGroup = "color" | "width" | "shape" | null;

export function BoardToolbar({
  tool,
  onToolChange,
  strokeColor,
  onStrokeColorChange,
  strokeWidth,
  onStrokeWidthChange,
  gridVisible,
  onGridToggle,
  onPickImage,
  imageUploading = false,
}: {
  tool: ToolMode;
  onToolChange: (m: ToolMode) => void;
  strokeColor: string;
  onStrokeColorChange: (c: string) => void;
  strokeWidth: number;
  onStrokeWidthChange: (w: number) => void;
  gridVisible: boolean;
  onGridToggle: () => void;
  onPickImage?: () => void;
  imageUploading?: boolean;
}) {
  const presetColors = usePresetColors();
  const [open, setOpen] = useState<OpenGroup>(null);
  // Remembers which shape was last picked so the trigger shows that icon when
  // the shape tool isn't active.
  const [lastShape, setLastShape] = useState<ShapeChoice>(
    tool === "ellipse" ? "ellipse" : "rect"
  );
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Close open group on outside click / Escape
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

  function pickTool(m: ToolMode) {
    onToolChange(m);
    setOpen(null);
  }

  function pickShape(s: ShapeChoice) {
    setLastShape(s);
    onToolChange(s);
    setOpen(null);
  }

  function pickColor(c: string) {
    onStrokeColorChange(c);
    setOpen(null);
  }

  function pickWidth(w: number) {
    onStrokeWidthChange(w);
    setOpen(null);
  }

  const shapeActive = tool === "rect" || tool === "ellipse";
  // Display shape: prefer the active tool if it's a shape, otherwise last-picked.
  const displayShape: ShapeChoice = shapeActive ? (tool as ShapeChoice) : lastShape;
  const ShapeIcon = displayShape === "rect" ? Square : Circle;

  return (
    <div
      ref={rootRef}
      className={cn(
        "glass-panel pointer-events-auto p-1.5",
        "flex flex-row items-center gap-0.5",
        "md:flex-col md:items-stretch",
        "max-w-[calc(100vw-1rem)] overflow-x-auto",
        "md:max-w-none md:overflow-x-visible md:max-h-[calc(100vh-2rem)] md:overflow-y-auto"
      )}
    >
      {/* Tool group — select, text, [shape trigger + expanded options], line, arrow, freehand, eraser */}
      <ToolButton
        active={tool === "select"}
        label="Chọn"
        Icon={MousePointer2}
        onClick={() => pickTool("select")}
      />
      <ToolButton
        active={tool === "text"}
        label="Text"
        Icon={Type}
        onClick={() => pickTool("text")}
      />

      {/* Shape: collapsed trigger shows last-picked icon; expand to choose */}
      <ToolButton
        active={shapeActive}
        label="Hình"
        Icon={shapeActive ? ShapeIcon : Shapes}
        onClick={() => setOpen(open === "shape" ? null : "shape")}
        highlighted={open === "shape"}
      />
      {open === "shape" && (
        <>
          <ToolButton
            active={tool === "rect"}
            label="Chữ nhật"
            Icon={Square}
            onClick={() => pickShape("rect")}
            pop
          />
          <ToolButton
            active={tool === "ellipse"}
            label="Ellipse"
            Icon={Circle}
            onClick={() => pickShape("ellipse")}
            pop
          />
        </>
      )}

      <ToolButton
        active={tool === "line"}
        label="Đường thẳng"
        Icon={Minus}
        onClick={() => pickTool("line")}
      />
      <ToolButton
        active={tool === "arrow"}
        label="Mũi tên"
        Icon={ArrowRight}
        onClick={() => pickTool("arrow")}
      />
      <ToolButton
        active={tool === "freehand"}
        label="Vẽ tự do"
        Icon={Pencil}
        onClick={() => pickTool("freehand")}
      />
      <ToolButton
        active={tool === "eraser"}
        label="Cục tẩy"
        Icon={Eraser}
        onClick={() => pickTool("eraser")}
      />
      {onPickImage ? (
        <ToolButton
          active={false}
          label={imageUploading ? "Đang tải ảnh..." : "Chèn ảnh"}
          Icon={ImagePlus}
          onClick={() => {
            if (!imageUploading) onPickImage();
          }}
          highlighted={imageUploading}
        />
      ) : null}

      <Divider />

      {/* Color: trigger shows current swatch; expand to choose */}
      <button
        type="button"
        title="Màu"
        aria-label="Chọn màu"
        aria-expanded={open === "color"}
        onClick={() => setOpen(open === "color" ? null : "color")}
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
          open === "color"
            ? "bg-black/10 dark:bg-white/10"
            : "hover:bg-black/10 dark:hover:bg-white/10"
        )}
      >
        <span
          className="h-5 w-5 rounded-full border-2 border-black/20 dark:border-white/20"
          style={{ backgroundColor: strokeColor }}
        />
      </button>
      {open === "color" &&
        presetColors.map((c) => (
          <button
            key={c}
            type="button"
            title={c}
            aria-label={`Màu ${c}`}
            onClick={() => pickColor(c)}
            className={cn(
              "toolbar-pop flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-black/10 dark:hover:bg-white/10"
            )}
          >
            <span
              className={cn(
                "h-5 w-5 rounded-full border-2 transition-transform",
                strokeColor === c
                  ? "scale-110 border-zinc-900 dark:border-white"
                  : "border-black/15 dark:border-white/15"
              )}
              style={{ backgroundColor: c }}
            />
          </button>
        ))}

      {/* Width: trigger shows current width; expand to choose */}
      <button
        type="button"
        title={`Độ dày ${strokeWidth}px`}
        aria-label="Độ dày nét"
        aria-expanded={open === "width"}
        onClick={() => setOpen(open === "width" ? null : "width")}
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
          open === "width"
            ? "bg-black/10 dark:bg-white/10"
            : "hover:bg-black/10 dark:hover:bg-white/10"
        )}
      >
        <WidthDot width={strokeWidth} />
      </button>
      {open === "width" &&
        PRESET_WIDTHS.map((w) => (
          <button
            key={w}
            type="button"
            title={`Độ dày ${w}px`}
            aria-label={`Độ dày ${w}px`}
            onClick={() => pickWidth(w)}
            className={cn(
              "toolbar-pop flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
              strokeWidth === w
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "hover:bg-black/10 dark:hover:bg-white/10"
            )}
          >
            <WidthDot
              width={w}
              color={strokeWidth === w ? undefined : strokeColor}
            />
          </button>
        ))}

      <Divider />

      {/* Grid toggle */}
      <button
        type="button"
        title={gridVisible ? "Ẩn lưới" : "Hiện lưới"}
        aria-label="Bật/tắt lưới"
        aria-pressed={gridVisible}
        onClick={onGridToggle}
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
          gridVisible
            ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
            : "hover:bg-black/10 dark:hover:bg-white/10"
        )}
      >
        <Grid3x3 className="h-4 w-4" />
      </button>
    </div>
  );
}

function ToolButton({
  active,
  highlighted,
  label,
  Icon,
  onClick,
  pop,
}: {
  active: boolean;
  highlighted?: boolean;
  label: string;
  Icon: typeof MousePointer2;
  onClick: () => void;
  pop?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
        active
          ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
          : highlighted
          ? "bg-black/10 dark:bg-white/10"
          : "hover:bg-black/10 dark:hover:bg-white/10",
        pop && "toolbar-pop"
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function Divider() {
  return (
    <div className="my-0.5 mx-0.5 h-5 w-px shrink-0 bg-black/10 dark:bg-white/10 md:my-1 md:mx-0 md:h-px md:w-full" />
  );
}

/**
 * Visual dot representing a stroke width. Diameter scales with width but
 * clamps to a minimum for visibility.
 */
export function WidthDot({
  width,
  color,
  className,
}: {
  width: number;
  color?: string;
  className?: string;
}) {
  const d = Math.max(4, Math.round(width * 1.6));
  return (
    <div
      className={cn("rounded-full", color ? "" : "bg-current", className)}
      style={{ width: d, height: d, backgroundColor: color }}
    />
  );
}
