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

export function BoardToolbar({
  tool,
  onToolChange,
  onDeleteSelected,
  canDelete,
}: {
  tool: ToolMode;
  onToolChange: (m: ToolMode) => void;
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
