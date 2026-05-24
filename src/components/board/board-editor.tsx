"use client";

// =====================================================================
// BoardEditor — controlled wrapper. Tái dùng cho guest (Phase 4) và
// board thật (Phase 7). Konva stage được lazy-loaded để tránh SSR.
// =====================================================================

import { useState } from "react";
import dynamic from "next/dynamic";
import type { BoardObject } from "@/types/database";
import { BoardToolbar } from "./toolbar";
import type { ToolMode } from "@/lib/board/objects";

const BoardStage = dynamic(
  () => import("./board-stage").then((m) => m.BoardStage),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center text-sm text-zinc-400">
        Đang tải canvas...
      </div>
    ),
  }
);

export interface BoardEditorProps {
  objects: BoardObject[];
  onChange: (next: BoardObject[] | ((prev: BoardObject[]) => BoardObject[])) => void;
  topSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
  readOnly?: boolean;
}

export function BoardEditor({
  objects,
  onChange,
  topSlot,
  rightSlot,
  readOnly = false,
}: BoardEditorProps) {
  const [tool, setTool] = useState<ToolMode>("select");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [strokeColor, setStrokeColor] = useState("#0a0a0a");
  const [strokeWidth, setStrokeWidth] = useState(3);

  const effectiveTool: ToolMode = readOnly ? "select" : tool;

  function deleteSelected() {
    if (readOnly || !selectedId) return;
    onChange((prev) => prev.filter((o) => o.id !== selectedId));
    setSelectedId(null);
  }

  return (
    <div className="relative flex-1 overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      {/* Canvas */}
      <BoardStage
        tool={effectiveTool}
        objects={objects}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onChange={onChange}
        onToolReset={() => setTool("select")}
        readOnly={readOnly}
        strokeColor={strokeColor}
        strokeWidth={strokeWidth}
      />

      {/* Top slot (title bar + save buttons) */}
      {topSlot ? (
        <div className="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2">
          <div className="pointer-events-auto">{topSlot}</div>
        </div>
      ) : null}

      {/* Toolbar bên trái — ẩn ở chế độ read-only. */}
      {!readOnly ? (
        <div className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2">
          <BoardToolbar
            tool={tool}
            onToolChange={setTool}
            strokeColor={strokeColor}
            onStrokeColorChange={setStrokeColor}
            strokeWidth={strokeWidth}
            onStrokeWidthChange={setStrokeWidth}
            onDeleteSelected={deleteSelected}
            canDelete={!!selectedId}
          />
        </div>
      ) : null}

      {/* Right slot (presence panel sau này) */}
      {rightSlot ? (
        <div className="pointer-events-none absolute right-4 top-4 z-10">
          <div className="pointer-events-auto">{rightSlot}</div>
        </div>
      ) : null}
    </div>
  );
}
