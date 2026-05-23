// =====================================================================
// Helpers tạo và thao tác BoardObject ở client.
// Vì guest mode không có server-side id, ta dùng `crypto.randomUUID`.
// =====================================================================

import type {
  ArrowObjectData,
  BoardObject,
  BoardObjectType,
  EllipseObjectData,
  FreehandObjectData,
  LineObjectData,
  RectObjectData,
  TextObjectData,
} from "@/types/database";

export const TOOL_TYPES = [
  "text",
  "rect",
  "ellipse",
  "line",
  "arrow",
  "freehand",
] as const;
export type ToolType = (typeof TOOL_TYPES)[number];
export type ToolMode = "select" | ToolType;

const NOW = () => new Date().toISOString();

function baseFields(id?: string) {
  return {
    id: id ?? crypto.randomUUID(),
    board_id: "",
    version: 1,
    locked_by_user_id: null,
    locked_by_device_id: null,
    locked_until: null,
    created_by: null,
    updated_by: null,
    created_at: NOW(),
    updated_at: NOW(),
  };
}

export function createTextObject(
  x: number,
  y: number,
  text = "Double click to edit",
  fill = "#18181b"
): BoardObject {
  return {
    ...baseFields(),
    type: "text",
    data: { x, y, text, fontSize: 18, fill } satisfies TextObjectData,
  };
}

export function createRectObject(
  x: number,
  y: number,
  width: number,
  height: number,
  fill = "#fde68a"
): BoardObject {
  return {
    ...baseFields(),
    type: "rect",
    data: {
      x,
      y,
      width,
      height,
      fill,
      stroke: "#0a0a0a",
      strokeWidth: 1,
    } satisfies RectObjectData,
  };
}

export function createEllipseObject(
  x: number,
  y: number,
  rx: number,
  ry: number,
  fill = "#bae6fd"
): BoardObject {
  return {
    ...baseFields(),
    type: "ellipse",
    data: {
      x,
      y,
      radiusX: rx,
      radiusY: ry,
      fill,
      stroke: "#0a0a0a",
      strokeWidth: 1,
    } satisfies EllipseObjectData,
  };
}

export function createLineObject(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  stroke = "#0a0a0a"
): BoardObject {
  return {
    ...baseFields(),
    type: "line",
    data: {
      points: [x1, y1, x2, y2],
      stroke,
      strokeWidth: 2,
    } satisfies LineObjectData,
  };
}

export function createArrowObject(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  stroke = "#0a0a0a"
): BoardObject {
  return {
    ...baseFields(),
    type: "arrow",
    data: {
      points: [x1, y1, x2, y2],
      stroke,
      strokeWidth: 2,
    } satisfies ArrowObjectData,
  };
}

export function createFreehandObject(
  points: [number, number][],
  stroke = "#0a0a0a"
): BoardObject {
  return {
    ...baseFields(),
    type: "freehand",
    data: { points, stroke, strokeWidth: 3 } satisfies FreehandObjectData,
  };
}

// Trả về vùng bounding box (cho selection rectangle, future use).
export function getBounds(obj: BoardObject) {
  switch (obj.type) {
    case "rect":
      return {
        x: obj.data.x,
        y: obj.data.y,
        width: obj.data.width,
        height: obj.data.height,
      };
    case "ellipse":
      return {
        x: obj.data.x - obj.data.radiusX,
        y: obj.data.y - obj.data.radiusY,
        width: obj.data.radiusX * 2,
        height: obj.data.radiusY * 2,
      };
    case "text":
      return {
        x: obj.data.x,
        y: obj.data.y,
        width: obj.data.width ?? 120,
        height: obj.data.fontSize * 1.4,
      };
    case "line":
    case "arrow": {
      const [x1, y1, x2, y2] = obj.data.points;
      return {
        x: Math.min(x1, x2),
        y: Math.min(y1, y2),
        width: Math.abs(x2 - x1),
        height: Math.abs(y2 - y1),
      };
    }
    case "freehand": {
      const pts = obj.data.points;
      if (pts.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
      const xs = pts.map((p) => p[0]);
      const ys = pts.map((p) => p[1]);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      return {
        x: minX,
        y: minY,
        width: Math.max(...xs) - minX,
        height: Math.max(...ys) - minY,
      };
    }
  }
}

// Translate (dùng cho drag-move).
export function translateObject(
  obj: BoardObject,
  dx: number,
  dy: number
): BoardObject {
  switch (obj.type) {
    case "rect":
      return {
        ...obj,
        data: { ...obj.data, x: obj.data.x + dx, y: obj.data.y + dy },
        updated_at: NOW(),
      };
    case "ellipse":
      return {
        ...obj,
        data: { ...obj.data, x: obj.data.x + dx, y: obj.data.y + dy },
        updated_at: NOW(),
      };
    case "text":
      return {
        ...obj,
        data: { ...obj.data, x: obj.data.x + dx, y: obj.data.y + dy },
        updated_at: NOW(),
      };
    case "line":
      return {
        ...obj,
        data: {
          ...obj.data,
          points: [
            obj.data.points[0] + dx,
            obj.data.points[1] + dy,
            obj.data.points[2] + dx,
            obj.data.points[3] + dy,
          ],
        },
        updated_at: NOW(),
      };
    case "arrow":
      return {
        ...obj,
        data: {
          ...obj.data,
          points: [
            obj.data.points[0] + dx,
            obj.data.points[1] + dy,
            obj.data.points[2] + dx,
            obj.data.points[3] + dy,
          ],
        },
        updated_at: NOW(),
      };
    case "freehand": {
      const moved: [number, number][] = obj.data.points.map(
        ([x, y]) => [x + dx, y + dy] as [number, number]
      );
      return {
        ...obj,
        data: { ...obj.data, points: moved },
        updated_at: NOW(),
      };
    }
  }
}

export function isToolType(value: string): value is ToolType {
  return (TOOL_TYPES as readonly string[]).includes(value);
}

export function isBoardObjectType(value: string): value is BoardObjectType {
  return (TOOL_TYPES as readonly string[]).includes(value);
}
