"use client";

// =====================================================================
// Konva stage — chỉ chạy ở client (react-konva dùng window).
// Phase 11.1: viewport transform (scale/pan) áp dụng vào Stage.
// Phase 11.2: sort objects by z_index.
// Phase 11.3: Konva Transformer cho visual resize.
// Phase 11.7: wheel zoom, space+drag pan.
// =====================================================================

import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Rect, Ellipse, Line, Arrow, Text, Transformer } from "react-konva";
import type Konva from "konva";
import type { BoardObject } from "@/types/database";
import type { RemoteStroke } from "@/lib/realtime/types";
import { realtimeConfig } from "@/lib/realtime/config";
import {
  createArrowObject,
  createEllipseObject,
  createFreehandObject,
  createLineObject,
  createRectObject,
  createTextObject,
  getBounds,
  normalizeObjectTransform,
  translateObject,
  type ToolMode,
} from "@/lib/board/objects";
import { zoomViewport, type Viewport } from "@/lib/board/viewport";

export interface BoardStageProps {
  tool: ToolMode;
  objects: BoardObject[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (next: BoardObject[] | ((prev: BoardObject[]) => BoardObject[])) => void;
  onToolReset?: () => void;
  viewport: Viewport;
  onViewportChange: (vp: Viewport) => void;
  onCursorMove?: (x: number, y: number) => void;
  onStrokeStart?: (strokeId: string, x: number, y: number, stroke: string, strokeWidth: number) => void;
  onStrokePoints?: (strokeId: string, points: [number, number][]) => void;
  onStrokeEnd?: (strokeId: string, obj: BoardObject) => void;
  remoteStrokes?: RemoteStroke[];
  myDeviceId?: string;
  onLockAcquire?: (objectId: string) => Promise<boolean>;
  onLockRelease?: (objectId: string) => Promise<void>;
  editingTextId?: string | null;
  onRequestTextEdit?: (id: string) => void;
  readOnly?: boolean;
  strokeColor?: string;
  strokeWidth?: number;
}

type DraftShape =
  | { kind: "rect" | "ellipse"; x0: number; y0: number; x1: number; y1: number }
  | { kind: "line" | "arrow"; x0: number; y0: number; x1: number; y1: number }
  | { kind: "freehand"; points: [number, number][] };

function flattenPoints(points: [number, number][]): number[] {
  const flat: number[] = [];
  for (const p of points) flat.push(p[0], p[1]);
  return flat;
}

function isLockedByOther(obj: BoardObject, myDeviceId: string | undefined): boolean {
  if (!obj.locked_by_device_id || !obj.locked_until) return false;
  if (obj.locked_by_device_id === myDeviceId) return false;
  return new Date(obj.locked_until) > new Date();
}

export function BoardStage({
  tool,
  objects,
  selectedId,
  onSelect,
  onChange,
  onToolReset,
  viewport,
  onViewportChange,
  onCursorMove,
  onStrokeStart,
  onStrokePoints,
  onStrokeEnd,
  remoteStrokes = [],
  myDeviceId,
  onLockAcquire,
  onLockRelease,
  editingTextId,
  onRequestTextEdit,
  readOnly = false,
  strokeColor = "#0a0a0a",
  strokeWidth = 3,
}: BoardStageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [draft, setDraft] = useState<DraftShape | null>(null);
  const drawing = useRef(false);

  // Phase 11.7: pan state (desktop space+drag / middle mouse)
  const [spacePressed, setSpacePressed] = useState(false);
  const spacePressedRef = useRef(false);
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ mouseX: number; mouseY: number; vpX: number; vpY: number } | null>(null);

  // Mobile: pinch/two-finger pan state
  const pinchRef = useRef<
    | {
        startDist: number;
        startScale: number;
        startCenterStage: { x: number; y: number };
        startVpX: number;
        startVpY: number;
      }
    | null
  >(null);

  // Phase 10: stroke batch
  const strokeIdRef = useRef<string | null>(null);
  const pendingPointsRef = useRef<[number, number][]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Cleanup flush timer on unmount
  useEffect(() => {
    return () => {
      if (flushTimerRef.current) clearInterval(flushTimerRef.current);
    };
  }, []);

  // Phase 11.7: space key tracking
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === "Space" && !e.repeat) {
        const t = e.target as HTMLElement | null;
        if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable))
          return;
        e.preventDefault();
        spacePressedRef.current = true;
        setSpacePressed(true);
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code === "Space") {
        spacePressedRef.current = false;
        setSpacePressed(false);
        isPanningRef.current = false;
        panStartRef.current = null;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // Delete keyboard shortcut
  useEffect(() => {
    if (readOnly) return;
    function handler(e: KeyboardEvent) {
      if (!selectedId) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        const t = e.target as HTMLElement | null;
        if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable))
          return;
        e.preventDefault();
        onChange((prev) => prev.filter((o) => o.id !== selectedId));
        onSelect(null);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedId, onChange, onSelect, readOnly]);

  // Phase 11.3: attach Transformer to selected node
  useEffect(() => {
    const tr = transformerRef.current;
    const stage = stageRef.current;
    if (!tr || !stage) return;

    if (!selectedId || readOnly) {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
      return;
    }
    const obj = objects.find((o) => o.id === selectedId);
    if (obj && isLockedByOther(obj, myDeviceId)) {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
      return;
    }
    const node = stage.findOne(`#${selectedId}`);
    if (node) {
      tr.nodes([node]);
      tr.getLayer()?.batchDraw();
    } else {
      tr.nodes([]);
    }
  }, [selectedId, objects, myDeviceId, readOnly]);

  // ---------------------------------------------------------------
  // Pointer position helper — returns canvas coordinates via
  // Stage.getRelativePointerPosition() which accounts for viewport.
  // ---------------------------------------------------------------
  function pointerPos(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    const stage = e.target.getStage();
    if (!stage) return null;
    return stage.getRelativePointerPosition();
  }

  // ---------------------------------------------------------------
  // Phase 11.7: wheel zoom
  // ---------------------------------------------------------------
  function onStageWheel(e: Konva.KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    if (!stage) return;
    const pointer = stage.getPointerPosition(); // screen coords for focal point
    if (!pointer) return;

    const scaleBy = 1.1;
    const newScale =
      e.evt.deltaY < 0
        ? viewport.scale * scaleBy
        : viewport.scale / scaleBy;
    onViewportChange(zoomViewport(viewport, newScale, pointer.x, pointer.y));
  }

  // ---------------------------------------------------------------
  // Mobile: two-finger pinch/zoom + pan
  // ---------------------------------------------------------------
  function touchCenterStage(touches: TouchList): { x: number; y: number } | null {
    const stage = stageRef.current;
    if (!stage || touches.length < 2) return null;
    const rect = stage.container().getBoundingClientRect();
    const t0 = touches[0];
    const t1 = touches[1];
    return {
      x: (t0.clientX + t1.clientX) / 2 - rect.left,
      y: (t0.clientY + t1.clientY) / 2 - rect.top,
    };
  }

  function touchDistance(touches: TouchList): number {
    if (touches.length < 2) return 0;
    const dx = touches[1].clientX - touches[0].clientX;
    const dy = touches[1].clientY - touches[0].clientY;
    return Math.hypot(dx, dy);
  }

  function cancelInFlightDrawing() {
    drawing.current = false;
    setDraft(null);
    strokeIdRef.current = null;
    pendingPointsRef.current = [];
    if (flushTimerRef.current) {
      clearInterval(flushTimerRef.current);
      flushTimerRef.current = null;
    }
  }

  function onStageTouchStart(e: Konva.KonvaEventObject<TouchEvent>) {
    const touches = e.evt.touches;
    if (touches.length >= 2) {
      const center = touchCenterStage(touches);
      if (!center) return;
      cancelInFlightDrawing();
      pinchRef.current = {
        startDist: touchDistance(touches),
        startScale: viewport.scale,
        startCenterStage: center,
        startVpX: viewport.x,
        startVpY: viewport.y,
      };
      return;
    }
    onStageMouseDown(e as unknown as Konva.KonvaEventObject<MouseEvent>);
  }

  function onStageTouchMove(e: Konva.KonvaEventObject<TouchEvent>) {
    const touches = e.evt.touches;
    if (pinchRef.current && touches.length >= 2) {
      const dist = touchDistance(touches);
      const center = touchCenterStage(touches);
      if (!center || dist === 0) return;
      const p = pinchRef.current;
      const newScale = p.startScale * (dist / p.startDist);
      // Zoom from initial start state toward initial center, then pan by center delta.
      const zoomed = zoomViewport(
        { scale: p.startScale, x: p.startVpX, y: p.startVpY },
        newScale,
        p.startCenterStage.x,
        p.startCenterStage.y
      );
      const dx = center.x - p.startCenterStage.x;
      const dy = center.y - p.startCenterStage.y;
      onViewportChange({ scale: zoomed.scale, x: zoomed.x + dx, y: zoomed.y + dy });
      return;
    }
    onStageMouseMove(e as unknown as Konva.KonvaEventObject<MouseEvent>);
  }

  function onStageTouchEnd(e: Konva.KonvaEventObject<TouchEvent>) {
    if (pinchRef.current) {
      if (e.evt.touches.length < 2) {
        pinchRef.current = null;
      }
      return;
    }
    onStageMouseUp(e as unknown as Konva.KonvaEventObject<MouseEvent>);
  }

  // ---------------------------------------------------------------
  // Mouse handlers
  // ---------------------------------------------------------------
  function onStageMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {
    // Middle mouse button (button=1) or space+drag → pan
    if (e.evt.button === 1 || spacePressedRef.current) {
      isPanningRef.current = true;
      panStartRef.current = {
        mouseX: e.evt.clientX,
        mouseY: e.evt.clientY,
        vpX: viewport.x,
        vpY: viewport.y,
      };
      return;
    }

    if (readOnly) return;
    const pos = pointerPos(e);
    if (!pos) return;

    const clickedOnStage = e.target === e.target.getStage();
    if (tool === "select") {
      if (clickedOnStage) onSelect(null);
      return;
    }

    if (tool === "text") {
      // Create text and immediately enter inline edit mode
      const obj = createTextObject(pos.x, pos.y, "Text");
      onChange((prev) => [...prev, obj]);
      onSelect(obj.id);
      onRequestTextEdit?.(obj.id);
      onToolReset?.();
      return;
    }

    drawing.current = true;
    if (tool === "freehand") {
      const sid = crypto.randomUUID();
      strokeIdRef.current = sid;
      pendingPointsRef.current = [[pos.x, pos.y]];
      setDraft({ kind: "freehand", points: [[pos.x, pos.y]] });
      onStrokeStart?.(sid, pos.x, pos.y, strokeColor, strokeWidth);

      flushTimerRef.current = setInterval(() => {
        const pts = pendingPointsRef.current.splice(0);
        if (pts.length > 0 && strokeIdRef.current) {
          onStrokePoints?.(strokeIdRef.current, pts);
        }
      }, realtimeConfig.drawingBatchIntervalMs);
    } else if (tool === "rect" || tool === "ellipse") {
      setDraft({ kind: tool, x0: pos.x, y0: pos.y, x1: pos.x, y1: pos.y });
    } else if (tool === "line" || tool === "arrow") {
      setDraft({ kind: tool, x0: pos.x, y0: pos.y, x1: pos.x, y1: pos.y });
    }
  }

  function onStageMouseMove(e: Konva.KonvaEventObject<MouseEvent>) {
    // Pan mode
    if (isPanningRef.current && panStartRef.current) {
      const dx = e.evt.clientX - panStartRef.current.mouseX;
      const dy = e.evt.clientY - panStartRef.current.mouseY;
      onViewportChange({
        ...viewport,
        x: panStartRef.current.vpX + dx,
        y: panStartRef.current.vpY + dy,
      });
      return;
    }

    const pos = pointerPos(e); // canvas coords
    if (pos) onCursorMove?.(pos.x, pos.y);
    if (!drawing.current || !draft) return;
    if (!pos) return;
    if (draft.kind === "freehand") {
      pendingPointsRef.current.push([pos.x, pos.y]);
      setDraft({ kind: "freehand", points: [...draft.points, [pos.x, pos.y]] });
    } else {
      setDraft({ ...draft, x1: pos.x, y1: pos.y });
    }
  }

  function onStageMouseUp(e: Konva.KonvaEventObject<MouseEvent>) {
    // End pan
    if (isPanningRef.current) {
      isPanningRef.current = false;
      panStartRef.current = null;
      return;
    }

    if (!drawing.current || !draft) {
      drawing.current = false;
      setDraft(null);
      return;
    }
    drawing.current = false;

    if (draft.kind === "freehand") {
      if (flushTimerRef.current) {
        clearInterval(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      if (draft.points.length >= 2) {
        const obj = createFreehandObject(
          draft.points,
          strokeColor,
          strokeWidth,
          strokeIdRef.current ?? undefined
        );
        const remaining = pendingPointsRef.current.splice(0);
        if (remaining.length > 0) {
          onStrokePoints?.(obj.id, remaining);
        }
        onStrokeEnd?.(obj.id, obj);
        onChange((prev) => [...prev, obj]);
        onSelect(obj.id);
      }
      strokeIdRef.current = null;
    } else if (draft.kind === "rect") {
      const x = Math.min(draft.x0, draft.x1);
      const y = Math.min(draft.y0, draft.y1);
      const w = Math.abs(draft.x1 - draft.x0);
      const h = Math.abs(draft.y1 - draft.y0);
      if (w > 3 && h > 3) {
        const obj = createRectObject(x, y, w, h);
        onChange((prev) => [...prev, obj]);
        onSelect(obj.id);
      }
    } else if (draft.kind === "ellipse") {
      const cx = (draft.x0 + draft.x1) / 2;
      const cy = (draft.y0 + draft.y1) / 2;
      const rx = Math.abs(draft.x1 - draft.x0) / 2;
      const ry = Math.abs(draft.y1 - draft.y0) / 2;
      if (rx > 2 && ry > 2) {
        const obj = createEllipseObject(cx, cy, rx, ry);
        onChange((prev) => [...prev, obj]);
        onSelect(obj.id);
      }
    } else if (draft.kind === "line") {
      const obj = createLineObject(draft.x0, draft.y0, draft.x1, draft.y1, strokeColor, strokeWidth);
      onChange((prev) => [...prev, obj]);
      onSelect(obj.id);
    } else if (draft.kind === "arrow") {
      const obj = createArrowObject(draft.x0, draft.y0, draft.x1, draft.y1, strokeColor, strokeWidth);
      onChange((prev) => [...prev, obj]);
      onSelect(obj.id);
    }

    setDraft(null);
    if (tool !== "freehand") onToolReset?.();
  }

  // ---------------------------------------------------------------
  // Phase 11.3: normalize Transformer output
  // ---------------------------------------------------------------
  function handleTransformEnd(e: Konva.KonvaEventObject<Event>) {
    const node = e.target;
    const id = node.id();
    const obj = objects.find((o) => o.id === id);
    if (!obj) return;

    const sx = node.scaleX();
    const sy = node.scaleY();
    const nx = node.x();
    const ny = node.y();

    // Reset scale before re-render
    node.scaleX(1);
    node.scaleY(1);
    // For line/arrow/freehand: position is encoded in points — reset to origin
    if (obj.type === "line" || obj.type === "arrow" || obj.type === "freehand") {
      node.x(0);
      node.y(0);
    }

    const updated = normalizeObjectTransform(obj, nx, ny, sx, sy);
    onChange((prev) => prev.map((o) => (o.id === id ? updated : o)));
    void onLockRelease?.(id);
  }

  // ---------------------------------------------------------------
  // Object drag → translate
  // ---------------------------------------------------------------
  function handleDragEnd(id: string, dx: number, dy: number) {
    onChange((prev) => prev.map((o) => (o.id === id ? translateObject(o, dx, dy) : o)));
  }

  // ---------------------------------------------------------------
  // Render shapes — sorted by z_index (Phase 11.2)
  // ---------------------------------------------------------------
  const objectsSorted = [...objects].sort(
    (a, b) => (a.z_index ?? 0) - (b.z_index ?? 0)
  );

  function renderShape(obj: BoardObject) {
    // Hide text node when inline editing
    if (obj.id === editingTextId && obj.type === "text") return null;

    const isSelected = obj.id === selectedId;
    const lockedByOther = isLockedByOther(obj, myDeviceId);
    const draggable = !readOnly && tool === "select" && !lockedByOther;
    const onClick = () => {
      if (readOnly) return;
      if (tool === "select") onSelect(obj.id);
    };

    function makeDragStart(node: Konva.Node, originalX: number, originalY: number) {
      return () => {
        if (!onLockAcquire) return;
        onLockAcquire(obj.id).then((ok) => {
          if (!ok) {
            node.stopDrag?.();
            node.position({ x: originalX, y: originalY });
            node.getLayer()?.batchDraw();
          }
        });
      };
    }

    switch (obj.type) {
      case "rect":
        return (
          <Rect
            key={obj.id}
            id={obj.id}
            x={obj.data.x}
            y={obj.data.y}
            width={obj.data.width}
            height={obj.data.height}
            fill={obj.data.fill}
            stroke={isSelected ? "#3b82f6" : (obj.data.stroke ?? "#0a0a0a")}
            strokeWidth={isSelected ? 2 : (obj.data.strokeWidth ?? 1)}
            opacity={lockedByOther ? 0.55 : 1}
            draggable={draggable}
            onClick={onClick}
            onTap={onClick}
            onDragStart={(e) => makeDragStart(e.target, obj.data.x, obj.data.y)()}
            onDragEnd={(e) => {
              const node = e.target;
              const dx = node.x() - obj.data.x;
              const dy = node.y() - obj.data.y;
              handleDragEnd(obj.id, dx, dy);
              void onLockRelease?.(obj.id);
            }}
          />
        );
      case "ellipse":
        return (
          <Ellipse
            key={obj.id}
            id={obj.id}
            x={obj.data.x}
            y={obj.data.y}
            radiusX={obj.data.radiusX}
            radiusY={obj.data.radiusY}
            fill={obj.data.fill}
            stroke={isSelected ? "#3b82f6" : (obj.data.stroke ?? "#0a0a0a")}
            strokeWidth={isSelected ? 2 : (obj.data.strokeWidth ?? 1)}
            opacity={lockedByOther ? 0.55 : 1}
            draggable={draggable}
            onClick={onClick}
            onTap={onClick}
            onDragStart={(e) => makeDragStart(e.target, obj.data.x, obj.data.y)()}
            onDragEnd={(e) => {
              const node = e.target;
              const dx = node.x() - obj.data.x;
              const dy = node.y() - obj.data.y;
              handleDragEnd(obj.id, dx, dy);
              void onLockRelease?.(obj.id);
            }}
          />
        );
      case "text":
        return (
          <Text
            key={obj.id}
            id={obj.id}
            x={obj.data.x}
            y={obj.data.y}
            width={obj.data.width}
            text={obj.data.text}
            fontSize={obj.data.fontSize}
            fill={obj.data.fill}
            opacity={lockedByOther ? 0.55 : 1}
            draggable={draggable}
            onClick={onClick}
            onTap={onClick}
            onDblClick={() => {
              if (tool !== "select" || lockedByOther) return;
              onRequestTextEdit?.(obj.id);
            }}
            onDblTap={() => {
              if (tool !== "select" || lockedByOther) return;
              onRequestTextEdit?.(obj.id);
            }}
            onDragStart={(e) => makeDragStart(e.target, obj.data.x, obj.data.y)()}
            onDragEnd={(e) => {
              const node = e.target;
              const dx = node.x() - obj.data.x;
              const dy = node.y() - obj.data.y;
              handleDragEnd(obj.id, dx, dy);
              void onLockRelease?.(obj.id);
            }}
          />
        );
      case "line":
        return (
          <Line
            key={obj.id}
            id={obj.id}
            points={obj.data.points}
            stroke={isSelected ? "#3b82f6" : obj.data.stroke}
            strokeWidth={isSelected ? obj.data.strokeWidth + 1 : obj.data.strokeWidth}
            opacity={lockedByOther ? 0.55 : 1}
            draggable={draggable}
            onClick={onClick}
            onTap={onClick}
            onDragStart={(e) => makeDragStart(e.target, 0, 0)()}
            onDragEnd={(e) => {
              const node = e.target;
              handleDragEnd(obj.id, node.x(), node.y());
              node.position({ x: 0, y: 0 });
              void onLockRelease?.(obj.id);
            }}
          />
        );
      case "arrow":
        return (
          <Arrow
            key={obj.id}
            id={obj.id}
            points={obj.data.points}
            stroke={isSelected ? "#3b82f6" : obj.data.stroke}
            fill={isSelected ? "#3b82f6" : obj.data.stroke}
            strokeWidth={isSelected ? obj.data.strokeWidth + 1 : obj.data.strokeWidth}
            opacity={lockedByOther ? 0.55 : 1}
            draggable={draggable}
            onClick={onClick}
            onTap={onClick}
            onDragStart={(e) => makeDragStart(e.target, 0, 0)()}
            onDragEnd={(e) => {
              const node = e.target;
              handleDragEnd(obj.id, node.x(), node.y());
              node.position({ x: 0, y: 0 });
              void onLockRelease?.(obj.id);
            }}
          />
        );
      case "freehand":
        return (
          <Line
            key={obj.id}
            id={obj.id}
            points={flattenPoints(obj.data.points)}
            stroke={isSelected ? "#3b82f6" : obj.data.stroke}
            strokeWidth={isSelected ? obj.data.strokeWidth + 1 : obj.data.strokeWidth}
            tension={0.4}
            lineCap="round"
            lineJoin="round"
            opacity={lockedByOther ? 0.55 : 1}
            draggable={draggable}
            onClick={onClick}
            onTap={onClick}
            onDragStart={(e) => makeDragStart(e.target, 0, 0)()}
            onDragEnd={(e) => {
              const node = e.target;
              handleDragEnd(obj.id, node.x(), node.y());
              node.position({ x: 0, y: 0 });
              void onLockRelease?.(obj.id);
            }}
          />
        );
    }
  }

  function renderLockOverlays() {
    return objects
      .filter((o) => isLockedByOther(o, myDeviceId))
      .map((o) => {
        const b = getBounds(o);
        const pad = 6;
        return (
          <Rect
            key={`lock-${o.id}`}
            x={b.x - pad}
            y={b.y - pad}
            width={b.width + pad * 2}
            height={b.height + pad * 2}
            stroke="#ef4444"
            strokeWidth={1.5}
            dash={[5, 3]}
            fill="rgba(239, 68, 68, 0.06)"
            cornerRadius={4}
            listening={false}
          />
        );
      });
  }

  function renderRemoteStrokes() {
    return remoteStrokes.map((rs) => (
      <Line
        key={rs.strokeId}
        points={flattenPoints(rs.points)}
        stroke={rs.stroke}
        strokeWidth={rs.strokeWidth}
        tension={0.4}
        lineCap="round"
        lineJoin="round"
        opacity={0.85}
        listening={false}
      />
    ));
  }

  function renderDraft() {
    if (!draft) return null;
    if (draft.kind === "freehand") {
      return (
        <Line
          points={flattenPoints(draft.points)}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          tension={0.4}
          lineCap="round"
          lineJoin="round"
        />
      );
    }
    if (draft.kind === "rect") {
      const x = Math.min(draft.x0, draft.x1);
      const y = Math.min(draft.y0, draft.y1);
      const w = Math.abs(draft.x1 - draft.x0);
      const h = Math.abs(draft.y1 - draft.y0);
      return <Rect x={x} y={y} width={w} height={h} fill="#fde68a" stroke={strokeColor} strokeWidth={1} dash={[4, 4]} />;
    }
    if (draft.kind === "ellipse") {
      const cx = (draft.x0 + draft.x1) / 2;
      const cy = (draft.y0 + draft.y1) / 2;
      const rx = Math.abs(draft.x1 - draft.x0) / 2;
      const ry = Math.abs(draft.y1 - draft.y0) / 2;
      return <Ellipse x={cx} y={cy} radiusX={rx} radiusY={ry} fill="#bae6fd" stroke={strokeColor} strokeWidth={1} dash={[4, 4]} />;
    }
    if (draft.kind === "line") {
      return <Line points={[draft.x0, draft.y0, draft.x1, draft.y1]} stroke={strokeColor} strokeWidth={strokeWidth} dash={[4, 4]} />;
    }
    if (draft.kind === "arrow") {
      return <Arrow points={[draft.x0, draft.y0, draft.x1, draft.y1]} stroke={strokeColor} fill={strokeColor} strokeWidth={strokeWidth} dash={[4, 4]} />;
    }
    return null;
  }

  const cursorStyle = isPanningRef.current
    ? "grabbing"
    : spacePressed
    ? "grab"
    : tool === "select"
    ? "default"
    : "crosshair";

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{ overscrollBehavior: "none", touchAction: "none" }}
    >
      {size.width > 0 && size.height > 0 ? (
        <Stage
          ref={stageRef}
          width={size.width}
          height={size.height}
          x={viewport.x}
          y={viewport.y}
          scaleX={viewport.scale}
          scaleY={viewport.scale}
          onMouseDown={onStageMouseDown}
          onMouseMove={onStageMouseMove}
          onMouseUp={onStageMouseUp}
          onWheel={onStageWheel}
          onTouchStart={onStageTouchStart}
          onTouchMove={onStageTouchMove}
          onTouchEnd={onStageTouchEnd}
          onContextMenu={(e) => e.evt.preventDefault()}
          style={{ cursor: cursorStyle }}
        >
          {/* Objects layer + Transformer */}
          <Layer>
            {objectsSorted.map(renderShape)}
            {!readOnly && (
              <Transformer
                ref={transformerRef}
                keepRatio={false}
                rotateEnabled={false}
                anchorSize={14 / viewport.scale}
                anchorStroke="#3b82f6"
                anchorFill="#ffffff"
                anchorStrokeWidth={1.5 / viewport.scale}
                borderStroke="#3b82f6"
                borderStrokeWidth={1.5 / viewport.scale}
                boundBoxFunc={(oldBox, newBox) => {
                  if (newBox.width < 5 || newBox.height < 5) return oldBox;
                  return newBox;
                }}
                onTransformStart={(e) => {
                  const id = e.target.id();
                  void onLockAcquire?.(id);
                }}
                onTransformEnd={handleTransformEnd}
              />
            )}
          </Layer>
          <Layer listening={false}>{renderLockOverlays()}</Layer>
          <Layer listening={false}>{renderRemoteStrokes()}</Layer>
          <Layer listening={false}>{renderDraft()}</Layer>
        </Stage>
      ) : null}
    </div>
  );
}
