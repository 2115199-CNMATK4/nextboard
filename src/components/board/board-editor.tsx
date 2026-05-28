"use client";

// =====================================================================
// BoardEditor — controlled wrapper. Tái dùng cho guest (Phase 4) và
// board thật (Phase 7+). Konva stage được lazy-loaded để tránh SSR.
// Phase 11.1: viewport state + helpers.
// Phase 11.5: FloatingObjectToolbar.
// Phase 11.6: TextEditorOverlay inline text editing.
// =====================================================================

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { BoardObject } from "@/types/database";
import type { RemoteCursor, RemoteStroke } from "@/lib/realtime/types";
import { BoardToolbar } from "./toolbar";
import { RemoteCursors } from "./remote-cursors";
import { FloatingObjectToolbar } from "./floating-toolbar";
import { TextEditorOverlay } from "./text-editor-overlay";
import { useViewport } from "@/hooks/use-viewport";
import { useInkColor } from "@/hooks/use-dark-mode";
import { cn } from "@/lib/utils/cn";
import {
  bringToFront,
  createImageObject,
  sendToBack,
  updateObjectStyle,
  type StyleChange,
  type ToolMode,
} from "@/lib/board/objects";
import { uploadBoardImageAction } from "@/actions/board-images";
import { screenToCanvas } from "@/lib/board/viewport";

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
  const ink = useInkColor();
  const [tool, setTool] = useState<ToolMode>("select");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [strokeColor, setStrokeColor] = useState(ink);
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [gridVisible, setGridVisible] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [dropOver, setDropOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Bộ đếm dragenter/dragleave để hover state không nhấp nháy khi pointer
  // đi qua các child element (children fire dragleave trước dragenter mới).
  const dragDepthRef = useRef(0);

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

  // ---------------------------------------------------------------
  // Image upload — opens file picker, uploads to Supabase Storage,
  // then drops a new image object at the viewport center keeping the
  // image's original aspect ratio.
  // ---------------------------------------------------------------
  function handlePickImage() {
    if (readOnly || !boardId || imageUploading) return;
    fileInputRef.current?.click();
  }

  function loadImageDims(file: File): Promise<{
    width: number;
    height: number;
  }> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new window.Image();
      img.onload = () => {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        URL.revokeObjectURL(url);
        if (!w || !h) reject(new Error("Không đọc được kích thước ảnh."));
        else resolve({ width: w, height: h });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Ảnh hỏng hoặc định dạng không hỗ trợ."));
      };
      img.src = url;
    });
  }

  // Pipeline chung: do dimensions, upload, đặt object ở vị trí (screenX,
  // screenY) trên container — nếu thiếu thì rơi vào tâm viewport.
  async function uploadAndPlaceFile(
    file: File,
    screenX?: number,
    screenY?: number
  ) {
    if (!boardId) return;
    setImageUploading(true);
    try {
      const dims = await loadImageDims(file);

      const rect = containerRef.current?.getBoundingClientRect();
      const fallbackX = rect ? rect.width / 2 : 0;
      const fallbackY = rect ? rect.height / 2 : 0;
      const dropX = screenX ?? fallbackX;
      const dropY = screenY ?? fallbackY;
      const dropCanvas = screenToCanvas(dropX, dropY, viewport);

      // Giới hạn kích thước ban đầu để ảnh khổng lồ không che cả board,
      // nhưng giữ nguyên ratio gốc.
      const MAX_INITIAL = 480;
      const ratio = dims.width / dims.height;
      let w = dims.width;
      let h = dims.height;
      if (w > MAX_INITIAL || h > MAX_INITIAL) {
        if (w >= h) {
          w = MAX_INITIAL;
          h = MAX_INITIAL / ratio;
        } else {
          h = MAX_INITIAL;
          w = MAX_INITIAL * ratio;
        }
      }

      const fd = new FormData();
      fd.set("board_id", boardId);
      fd.set("width", String(dims.width));
      fd.set("height", String(dims.height));
      fd.set("file", file);
      const res = await uploadBoardImageAction(fd);
      if (!res.ok) {
        alert(res.error);
        return;
      }

      const obj = createImageObject(
        dropCanvas.x - w / 2,
        dropCanvas.y - h / 2,
        w,
        h,
        res.src,
        ratio
      );
      onChange((prev) => [...prev, obj]);
      setSelectedId(obj.id);
      setTool("select");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Tải ảnh thất bại.");
    } finally {
      setImageUploading(false);
    }
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset để picker chấp nhận lại cùng file
    if (!file) return;
    await uploadAndPlaceFile(file);
  }

  // ---------------------------------------------------------------
  // Drag-and-drop ảnh từ OS / browser khác vào canvas.
  // Chỉ xử lý khi event chứa file (dataTransfer.types includes "Files")
  // — để drag Konva object nội bộ không trigger.
  // ---------------------------------------------------------------
  function eventHasFiles(e: React.DragEvent): boolean {
    const types = e.dataTransfer?.types;
    if (!types) return false;
    for (let i = 0; i < types.length; i++) {
      if (types[i] === "Files") return true;
    }
    return false;
  }

  function handleDragEnter(e: React.DragEvent<HTMLDivElement>) {
    if (readOnly || !boardId) return;
    if (!eventHasFiles(e)) return;
    e.preventDefault();
    dragDepthRef.current += 1;
    setDropOver(true);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    if (readOnly || !boardId) return;
    if (!eventHasFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    if (readOnly || !boardId) return;
    if (!eventHasFiles(e)) return;
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setDropOver(false);
  }

  async function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    if (readOnly || !boardId) return;
    if (!eventHasFiles(e)) return;
    e.preventDefault();
    dragDepthRef.current = 0;
    setDropOver(false);

    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/")
    );
    if (files.length === 0) return;

    const rect = containerRef.current?.getBoundingClientRect();
    const baseX = rect ? e.clientX - rect.left : undefined;
    const baseY = rect ? e.clientY - rect.top : undefined;

    // Nếu thả nhiều ảnh: lệch nhẹ mỗi ảnh để không chồng khít.
    for (let i = 0; i < files.length; i++) {
      const offset = i * 24;
      await uploadAndPlaceFile(
        files[i],
        baseX !== undefined ? baseX + offset : undefined,
        baseY !== undefined ? baseY + offset : undefined
      );
    }
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
      ref={containerRef}
      className="relative flex-1 overflow-hidden bg-zinc-50 dark:bg-zinc-950"
      style={{ overscrollBehavior: "none", touchAction: "none" }}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleFileSelected}
      />
      {dropOver ? (
        <div className="pointer-events-none absolute inset-2 z-30 flex items-center justify-center rounded-2xl border-2 border-dashed border-blue-500 bg-blue-500/10">
          <div className="rounded-xl bg-blue-500/90 px-4 py-2 text-sm font-medium text-white shadow-lg">
            Thả ảnh để chèn vào board
          </div>
        </div>
      ) : null}
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
        gridVisible={gridVisible}
      />

      {/* Remote cursors overlay */}
      <div className="pointer-events-none absolute inset-0 z-20">
        <RemoteCursors cursors={remoteCursors} viewport={viewport} />
      </div>

      {/* Floating object toolbar */}
      {selectedObject && !readOnly && !editingTextId && tool === "select" ? (
        <FloatingObjectToolbar
          selectedObject={selectedObject}
          viewport={viewport}
          onBringToFront={handleBringToFront}
          onSendToBack={handleSendToBack}
          onDelete={handleDeleteSelected}
          onStyleChange={handleStyleChange}
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

      {/* Toolbar — bottom-horizontal on mobile, left-vertical on desktop */}
      {!readOnly ? (
        <div
          className={cn(
            "pointer-events-none absolute z-10",
            "bottom-4 left-1/2 -translate-x-1/2",
            "md:bottom-auto md:top-1/2 md:left-4 md:translate-x-0 md:-translate-y-1/2"
          )}
        >
          <BoardToolbar
            tool={tool}
            onToolChange={setTool}
            strokeColor={strokeColor}
            onStrokeColorChange={setStrokeColor}
            strokeWidth={strokeWidth}
            onStrokeWidthChange={setStrokeWidth}
            gridVisible={gridVisible}
            onGridToggle={() => setGridVisible((g) => !g)}
            onPickImage={boardId ? handlePickImage : undefined}
            imageUploading={imageUploading}
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
