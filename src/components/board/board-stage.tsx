"use client";

// =====================================================================
// Konva stage — chỉ chạy ở client (react-konva dùng window).
// Component này nhận state từ parent (`BoardEditor`); không tự lưu vào
// localStorage/Supabase. Như vậy có thể tái dùng cho cả guest và board
// thật ở Phase 7.
// =====================================================================

import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Rect, Ellipse, Line, Arrow, Text } from "react-konva";
import type Konva from "konva";
import type { BoardObject } from "@/types/database";
import {
  createArrowObject,
  createEllipseObject,
  createFreehandObject,
  createLineObject,
  createRectObject,
  createTextObject,
  translateObject,
  type ToolMode,
} from "@/lib/board/objects";

export interface BoardStageProps {
  tool: ToolMode;
  objects: BoardObject[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (next: BoardObject[] | ((prev: BoardObject[]) => BoardObject[])) => void;
  onToolReset?: () => void;
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

export function BoardStage({
  tool,
  objects,
  selectedId,
  onSelect,
  onChange,
  onToolReset,
  readOnly = false,
  strokeColor = "#0a0a0a",
  strokeWidth = 3,
}: BoardStageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [draft, setDraft] = useState<DraftShape | null>(null);
  const drawing = useRef(false);

  // Resize observer — Konva Stage cần kích thước pixel cố định.
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

  // Delete phím tắt.
  useEffect(() => {
    if (readOnly) return;
    function handler(e: KeyboardEvent) {
      if (!selectedId) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        // Tránh xóa khi đang focus input.
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

  // ---------------------------------------------------------------
  // Mouse handlers
  // ---------------------------------------------------------------

  function pointerPos(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    const stage = e.target.getStage();
    if (!stage) return null;
    return stage.getPointerPosition();
  }

  function onStageMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {
    if (readOnly) return;
    const pos = pointerPos(e);
    if (!pos) return;

    // Click vào nền (Stage) trong mode select → bỏ chọn.
    const clickedOnStage = e.target === e.target.getStage();
    if (tool === "select") {
      if (clickedOnStage) onSelect(null);
      return;
    }

    if (tool === "text") {
      const text = window.prompt("Nội dung text:", "Text");
      if (text != null && text.trim() !== "") {
        const obj = createTextObject(pos.x, pos.y, text);
        onChange((prev) => [...prev, obj]);
        onSelect(obj.id);
      }
      onToolReset?.();
      return;
    }

    drawing.current = true;
    if (tool === "freehand") {
      setDraft({ kind: "freehand", points: [[pos.x, pos.y]] });
    } else if (tool === "rect" || tool === "ellipse") {
      setDraft({ kind: tool, x0: pos.x, y0: pos.y, x1: pos.x, y1: pos.y });
    } else if (tool === "line" || tool === "arrow") {
      setDraft({ kind: tool, x0: pos.x, y0: pos.y, x1: pos.x, y1: pos.y });
    }
  }

  function onStageMouseMove(e: Konva.KonvaEventObject<MouseEvent>) {
    if (!drawing.current || !draft) return;
    const pos = pointerPos(e);
    if (!pos) return;
    if (draft.kind === "freehand") {
      setDraft({ kind: "freehand", points: [...draft.points, [pos.x, pos.y]] });
    } else {
      setDraft({ ...draft, x1: pos.x, y1: pos.y });
    }
  }

  function onStageMouseUp() {
    if (!drawing.current || !draft) {
      drawing.current = false;
      setDraft(null);
      return;
    }
    drawing.current = false;

    if (draft.kind === "freehand") {
      if (draft.points.length >= 2) {
        const obj = createFreehandObject(draft.points, strokeColor, strokeWidth);
        onChange((prev) => [...prev, obj]);
        onSelect(obj.id);
      }
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
    onToolReset?.();
  }

  // ---------------------------------------------------------------
  // Object drag → translate
  // ---------------------------------------------------------------
  function handleDragEnd(id: string, dx: number, dy: number) {
    onChange((prev) => prev.map((o) => (o.id === id ? translateObject(o, dx, dy) : o)));
  }

  // ---------------------------------------------------------------
  // Render shapes
  // ---------------------------------------------------------------
  function renderShape(obj: BoardObject) {
    const isSelected = obj.id === selectedId;
    const draggable = !readOnly && tool === "select";
    const onClick = () => {
      if (readOnly) return;
      if (tool === "select") onSelect(obj.id);
    };

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
            stroke={isSelected ? "#3b82f6" : obj.data.stroke ?? "#0a0a0a"}
            strokeWidth={isSelected ? 2 : obj.data.strokeWidth ?? 1}
            draggable={draggable}
            onClick={onClick}
            onTap={onClick}
            onDragEnd={(e) => {
              const node = e.target;
              const dx = node.x() - obj.data.x;
              const dy = node.y() - obj.data.y;
              handleDragEnd(obj.id, dx, dy);
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
            stroke={isSelected ? "#3b82f6" : obj.data.stroke ?? "#0a0a0a"}
            strokeWidth={isSelected ? 2 : obj.data.strokeWidth ?? 1}
            draggable={draggable}
            onClick={onClick}
            onTap={onClick}
            onDragEnd={(e) => {
              const node = e.target;
              const dx = node.x() - obj.data.x;
              const dy = node.y() - obj.data.y;
              handleDragEnd(obj.id, dx, dy);
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
            text={obj.data.text}
            fontSize={obj.data.fontSize}
            fill={obj.data.fill}
            draggable={draggable}
            onClick={onClick}
            onTap={onClick}
            onDblClick={() => {
              if (tool !== "select") return;
              const next = window.prompt("Sửa text:", obj.data.text);
              if (next != null) {
                onChange((prev) =>
                  prev.map((o) =>
                    o.id === obj.id && o.type === "text"
                      ? { ...o, data: { ...o.data, text: next } }
                      : o
                  )
                );
              }
            }}
            onDragEnd={(e) => {
              const node = e.target;
              const dx = node.x() - obj.data.x;
              const dy = node.y() - obj.data.y;
              handleDragEnd(obj.id, dx, dy);
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
            draggable={draggable}
            onClick={onClick}
            onTap={onClick}
            onDragEnd={(e) => {
              const node = e.target;
              handleDragEnd(obj.id, node.x(), node.y());
              node.position({ x: 0, y: 0 });
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
            draggable={draggable}
            onClick={onClick}
            onTap={onClick}
            onDragEnd={(e) => {
              const node = e.target;
              handleDragEnd(obj.id, node.x(), node.y());
              node.position({ x: 0, y: 0 });
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
            draggable={draggable}
            onClick={onClick}
            onTap={onClick}
            onDragEnd={(e) => {
              const node = e.target;
              handleDragEnd(obj.id, node.x(), node.y());
              node.position({ x: 0, y: 0 });
            }}
          />
        );
    }
  }

  // Render draft (preview) layer.
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

  return (
    <div ref={containerRef} className="absolute inset-0">
      {size.width > 0 && size.height > 0 ? (
        <Stage
          width={size.width}
          height={size.height}
          onMouseDown={onStageMouseDown}
          onMouseMove={onStageMouseMove}
          onMouseUp={onStageMouseUp}
          onTouchStart={(e) => onStageMouseDown(e as unknown as Konva.KonvaEventObject<MouseEvent>)}
          onTouchMove={(e) => onStageMouseMove(e as unknown as Konva.KonvaEventObject<MouseEvent>)}
          onTouchEnd={onStageMouseUp}
          style={{ cursor: tool === "select" ? "default" : "crosshair" }}
        >
          <Layer>{objects.map(renderShape)}</Layer>
          <Layer listening={false}>{renderDraft()}</Layer>
        </Stage>
      ) : null}
    </div>
  );
}
