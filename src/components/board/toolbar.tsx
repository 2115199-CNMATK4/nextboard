"use client";

import {
  MousePointer2,
  Type,
  Square,
  Circle,
  Minus,
  ArrowRight,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import type { ToolMode } from "@/lib/board/objects";

const TOOL_BUTTONS: Array<{ mode: ToolMode; label: string; Icon: typeof MousePointer2 }> = [
  { mode: "select", label: "Chọn", Icon: MousePointer2 },
  { mode: "text", label: "Text", Icon: Type },
  { mode: "rect", label: "Chữ nhật", Icon: Square },
  { mode: "ellipse", label: "Ellipse", Icon: Circle },
  { mode: "line", label: "Đường thẳng", Icon: Minus },
  { mode: "arrow", label: "Mũi tên", Icon: ArrowRight },
  { mode: "freehand", label: "Vẽ tự do", Icon: Pencil },
];

export const PRESET_COLORS = [
  "#0a0a0a",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
] as const;

export const PRESET_WIDTHS = [2, 4, 8] as const;
export type PresetWidth = (typeof PRESET_WIDTHS)[number];

export function BoardToolbar({
  tool,
  onToolChange,
  strokeColor,
  onStrokeColorChange,
  strokeWidth,
  onStrokeWidthChange,
  onDeleteSelected,
  canDelete,
}: {
  tool: ToolMode;
  onToolChange: (m: ToolMode) => void;
  strokeColor: string;
  onStrokeColorChange: (c: string) => void;
  strokeWidth: number;
  onStrokeWidthChange: (w: number) => void;
  onDeleteSelected: () => void;
  canDelete: boolean;
}) {
  return (
    <div className="glass-panel pointer-events-auto flex flex-col gap-1 p-2">
      {TOOL_BUTTONS.map(({ mode, label, Icon }) => (
        <button
          key={mode}
          type="button"
          title={label}
          aria-label={label}
          onClick={() => onToolChange(mode)}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
            tool === mode
              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
              : "hover:bg-black/10 dark:hover:bg-white/10"
          )}
        >
          <Icon className="h-5 w-5" />
        </button>
      ))}

      <div className="my-1 h-px bg-black/10 dark:bg-white/10" />

      {/* Stroke color presets */}
      <div className="grid grid-cols-2 gap-1">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            title={c}
            aria-label={`Màu ${c}`}
            onClick={() => onStrokeColorChange(c)}
            className={cn(
              "h-5 w-5 rounded-full border-2 transition-transform hover:scale-110",
              strokeColor === c
                ? "border-zinc-900 dark:border-white scale-110"
                : "border-transparent"
            )}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      <div className="my-1 h-px bg-black/10 dark:bg-white/10" />

      {/* Stroke width */}
      <div className="flex flex-col gap-1">
        {PRESET_WIDTHS.map((w) => (
          <button
            key={w}
            type="button"
            title={`Độ dày ${w}px`}
            aria-label={`Độ dày ${w}px`}
            onClick={() => onStrokeWidthChange(w)}
            className={cn(
              "flex h-7 w-10 items-center justify-center rounded-lg transition-colors",
              strokeWidth === w
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "hover:bg-black/10 dark:hover:bg-white/10"
            )}
          >
            <div
              className="w-6 rounded-full"
              style={{
                height: w,
                backgroundColor: strokeWidth === w ? "currentColor" : strokeColor,
              }}
            />
          </button>
        ))}
      </div>

      <div className="my-1 h-px bg-black/10 dark:bg-white/10" />

      <Button
        type="button"
        size="icon"
        variant="ghost"
        title="Xóa đối tượng đang chọn (Del)"
        disabled={!canDelete}
        onClick={onDeleteSelected}
      >
        <Trash2 className="h-5 w-5" />
      </Button>
    </div>
  );
}
