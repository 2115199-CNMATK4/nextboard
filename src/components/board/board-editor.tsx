"use client";

// =====================================================================
// BoardEditor — controlled wrapper. Tái dùng cho guest (Phase 4) và
// board thật (Phase 7+). Konva stage được lazy-loaded để tránh SSR.
// Phase 11.1: viewport state + helpers.
// Phase 11.5: FloatingObjectToolbar.
// Phase 11.6: TextEditorOverlay inline text editing.
// =====================================================================

import { useState } from "react";
import dynamic from "next/dynamic";
import type { BoardObject } from "@/types/database";
import type { RemoteCursor, RemoteStroke } from "@/lib/realtime/types";
import { BoardToolbar } from "./toolbar";
import { RemoteCursors } from "./remote-cursors";
import { FloatingObjectToolbar } from "./floating-toolbar";
import { TextEditorOverlay } from "./text-editor-overlay";
import { useViewport } from "@/hooks/use-viewport";
import {
  bringToFront,
  sendToBack,
  updateObjectStyle,
  type StyleChange,
  type ToolMode,
} from "@/lib/board/objects";
import type { Viewport } from "@/lib/board/viewport";

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
  boardId?: string;
  objects: BoardObject[];
  onChange: (next: BoardObject[] | ((prev: BoardObject[]) => BoardObject[])) => void;
  topSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
  readOnly?: boolean;
  remoteCursors?: RemoteCursor[];
  remoteStrokes?: RemoteStroke[];
  onCursorMove?: (x: number, y: number) => void;
  onStrokeStart?: (strokeId: string, x: number, y: number, stroke: string, strokeWidth: number) => void;
  onStrokePoints?: (strokeId: string, points: [number, number][]) => void;
  onStrokeEnd?: (strokeId: string, obj: BoardObject) => void;
  myDeviceId?: string;
  onLockAcquire?: (objectId: string) => Promise<boolean>;
  onLockRelease?: (objectId: string) => Promise<void>;
}

export function BoardEditor({
  boardId,
  objects,
  onChange,
  topSlot,
  rightSlot,
  readOnly = false,
  remoteCursors = [],
  remoteStrokes = [],
  onCursorMove,
  onStrokeStart,
  onStrokePoints,
  onStrokeEnd,
  myDeviceId,
  onLockAcquire,
  onLockRelease,
}: BoardEditorProps) {
  const [tool, setTool] = useState<ToolMode>("select");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [strokeColor, setStrokeColor] = useState("#0a0a0a");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  const { viewport, setViewport } = useViewport(boardId);

  const effectiveTool: ToolMode = readOnly ? "select" : tool;

  const selectedObject =
    selectedId != null ? (objects.find((o) => o.id === selectedId) ?? null) : null;

  // ---------------------------------------------------------------
  // Shared action functions (used by static toolbar + floating toolbar)
  // ---------------------------------------------------------------
  function handleBringToFront() {
    if (!selectedId) return;
    onChange((prev) => bringToFront(prev, selectedId));
  }

  function handleSendToBack() {
    if (!selectedId) return;
    onChange((prev) => sendToBack(prev, selectedId));
  }

  function handleDeleteSelected() {
    if (readOnly || !selectedId) return;
    onChange((prev) => prev.filter((o) => o.id !== selectedId));
    setSelectedId(null);
  }

  function handleStyleChange(style: StyleChange) {
    if (!selectedId) return;
    onChange((prev) =>
      prev.map((o) => (o.id === selectedId ? updateObjectStyle(o, style) : o))
    );
  }

  // ---------------------------------------------------------------
  // Inline text editing
  // ---------------------------------------------------------------
  async function handleRequestTextEdit(id: string) {
    if (readOnly) return;
    if (onLockAcquire) {
      const ok = await onLockAcquire(id);
      if (!ok) return;
    }
    setEditingTextId(id);
  }

  function handleTextSave(text: string) {
    if (!editingTextId) return;
    const now = new Date().toISOString();
    onChange((prev) =>
      prev.map((o) =>
        o.id === editingTextId && o.type === "text"
          ? { ...o, data: { ...o.data, text }, updated_at: now }
          : o
      )
    );
    void onLockRelease?.(editingTextId);
    setEditingTextId(null);
  }

  function handleTextCancel() {
    if (editingTextId) void onLockRelease?.(editingTextId);
    setEditingTextId(null);
  }

  // Resolve the editing text object for the overlay
  const editingTextObject =
    editingTextId != null
      ? (objects.find((o) => o.id === editingTextId && o.type === "text") as
          | Extract<BoardObject, { type: "text" }>
          | undefined)
      : null;

  return (
    <div
      className="relative flex-1 overflow-hidden bg-zinc-50 dark:bg-zinc-950"
      style={{ overscrollBehavior: "none", touchAction: "none" }}
    >
      {/* Canvas */}
      <BoardStage
        tool={effectiveTool}
        objects={objects}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onChange={onChange}
        onToolReset={() => setTool("select")}
        viewport={viewport}
        onViewportChange={setViewport}
        onCursorMove={readOnly ? undefined : onCursorMove}
        onStrokeStart={readOnly ? undefined : onStrokeStart}
        onStrokePoints={readOnly ? undefined : onStrokePoints}
        onStrokeEnd={readOnly ? undefined : onStrokeEnd}
        remoteStrokes={remoteStrokes}
        myDeviceId={myDeviceId}
        onLockAcquire={readOnly ? undefined : onLockAcquire}
        onLockRelease={readOnly ? undefined : onLockRelease}
        editingTextId={editingTextId}
        onRequestTextEdit={readOnly ? undefined : handleRequestTextEdit}
        readOnly={readOnly}
        strokeColor={strokeColor}
        strokeWidth={strokeWidth}
      />

      {/* Remote cursors overlay */}
      <div className="pointer-events-none absolute inset-0 z-20">
        <RemoteCursors cursors={remoteCursors} viewport={viewport} />
      </div>

      {/* Floating object toolbar */}
      {selectedObject && !readOnly && !editingTextId ? (
        <FloatingObjectToolbar
          selectedObject={selectedObject}
          viewport={viewport}
          onBringToFront={handleBringToFront}
          onSendToBack={handleSendToBack}
          onDelete={handleDeleteSelected}
          onStyleChange={handleStyleChange}
          onEditText={
            selectedObject.type === "text"
              ? () => void handleRequestTextEdit(selectedObject.id)
              : undefined
          }
        />
      ) : null}

      {/* Inline text editing overlay */}
      {editingTextObject ? (
        <TextEditorOverlay
          object={editingTextObject}
          viewport={viewport}
          onSave={handleTextSave}
          onCancel={handleTextCancel}
        />
      ) : null}

      {/* Top slot (title bar + save buttons) */}
      {topSlot ? (
        <div className="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2">
          <div className="pointer-events-auto">{topSlot}</div>
        </div>
      ) : null}

      {/* Left toolbar */}
      {!readOnly ? (
        <div className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2">
          <BoardToolbar
            tool={tool}
            onToolChange={setTool}
            strokeColor={strokeColor}
            onStrokeColorChange={setStrokeColor}
            strokeWidth={strokeWidth}
            onStrokeWidthChange={setStrokeWidth}
            onDeleteSelected={handleDeleteSelected}
            canDelete={!!selectedId && !editingTextId}
          />
        </div>
      ) : null}

      {/* Right slot */}
      {rightSlot ? (
        <div className="pointer-events-none absolute right-4 top-4 z-10">
          <div className="pointer-events-auto">{rightSlot}</div>
        </div>
      ) : null}

      {/* Viewport info (dev hint) — only shown when zoomed */}
      {viewport.scale !== 1 && (
        <div className="pointer-events-none absolute bottom-4 right-4 z-10 rounded-md bg-black/30 px-2 py-1 text-[11px] text-white">
          {Math.round(viewport.scale * 100)}%
        </div>
      )}
    </div>
  );
}
