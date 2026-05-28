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
  ImageObjectData,
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
  "image",
] as const;
export type ToolType = (typeof TOOL_TYPES)[number];
export type ToolMode = "select" | "eraser" | ToolType;

export interface StyleChange {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  fontSize?: number;
  background?: string | null; // null = clear background
}

const NOW = () => new Date().toISOString();

function baseFields(id?: string) {
  return {
    id: id ?? crypto.randomUUID(),
    board_id: "",
    z_index: 0,
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
  fill = "#0a0a0a",
  fontSize = 18,
  width?: number,
  height?: number,
  background?: string
): BoardObject {
  return {
    ...baseFields(),
    type: "text",
    data: {
      x,
      y,
      text,
      fontSize,
      fill,
      ...(width !== undefined ? { width } : {}),
      ...(height !== undefined ? { height } : {}),
      ...(background !== undefined ? { background } : {}),
    } satisfies TextObjectData,
  };
}

export function createRectObject(
  x: number,
  y: number,
  width: number,
  height: number,
  fill = "#fde68a",
  stroke = "#0a0a0a"
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
      stroke,
      strokeWidth: 1,
    } satisfies RectObjectData,
  };
}

export function createEllipseObject(
  x: number,
  y: number,
  rx: number,
  ry: number,
  fill = "#bae6fd",
  stroke = "#0a0a0a"
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
      stroke,
      strokeWidth: 1,
    } satisfies EllipseObjectData,
  };
}

export function createLineObject(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  stroke = "#0a0a0a",
  strokeWidth = 2
): BoardObject {
  return {
    ...baseFields(),
    type: "line",
    data: {
      points: [x1, y1, x2, y2],
      stroke,
      strokeWidth,
    } satisfies LineObjectData,
  };
}

export function createArrowObject(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  stroke = "#0a0a0a",
  strokeWidth = 2
): BoardObject {
  return {
    ...baseFields(),
    type: "arrow",
    data: {
      points: [x1, y1, x2, y2],
      stroke,
      strokeWidth,
    } satisfies ArrowObjectData,
  };
}

export function createImageObject(
  x: number,
  y: number,
  width: number,
  height: number,
  src: string,
  naturalRatio: number,
  id?: string
): BoardObject {
  return {
    ...baseFields(id),
    type: "image",
    data: { x, y, width, height, src, naturalRatio } satisfies ImageObjectData,
  };
}

export function createFreehandObject(
  points: [number, number][],
  stroke = "#0a0a0a",
  strokeWidth = 3,
  id?: string
): BoardObject {
  return {
    ...baseFields(id),
    type: "freehand",
    data: { points, stroke, strokeWidth } satisfies FreehandObjectData,
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
        height: obj.data.height ?? obj.data.fontSize * 1.4,
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
    case "image":
      return {
        x: obj.data.x,
        y: obj.data.y,
        width: obj.data.width,
        height: obj.data.height,
      };
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
    case "image":
      return {
        ...obj,
        data: { ...obj.data, x: obj.data.x + dx, y: obj.data.y + dy },
        updated_at: NOW(),
      };
  }
}

export function isToolType(value: string): value is ToolType {
  return (TOOL_TYPES as readonly string[]).includes(value);
}

export function isBoardObjectType(value: string): value is BoardObjectType {
  return (TOOL_TYPES as readonly string[]).includes(value);
}

// ---------------------------------------------------------------
// Z-index ordering
// ---------------------------------------------------------------

export function bringToFront(objects: BoardObject[], id: string): BoardObject[] {
  const maxZ = objects.reduce((m, o) => Math.max(m, o.z_index ?? 0), 0);
  return objects.map((o) =>
    o.id === id ? { ...o, z_index: maxZ + 1, updated_at: NOW() } : o
  );
}

export function sendToBack(objects: BoardObject[], id: string): BoardObject[] {
  const minZ = objects.reduce((m, o) => Math.min(m, o.z_index ?? 0), 0);
  return objects.map((o) =>
    o.id === id ? { ...o, z_index: minZ - 1, updated_at: NOW() } : o
  );
}

// ---------------------------------------------------------------
// Style change — shared action for static + floating toolbar
// ---------------------------------------------------------------

export function updateObjectStyle(
  obj: BoardObject,
  style: StyleChange
): BoardObject {
  const now = NOW();
  switch (obj.type) {
    case "rect":
      return {
        ...obj,
        data: {
          ...obj.data,
          ...(style.fill !== undefined && { fill: style.fill }),
          ...(style.stroke !== undefined && { stroke: style.stroke }),
          ...(style.strokeWidth !== undefined && { strokeWidth: style.strokeWidth }),
        },
        updated_at: now,
      };
    case "ellipse":
      return {
        ...obj,
        data: {
          ...obj.data,
          ...(style.fill !== undefined && { fill: style.fill }),
          ...(style.stroke !== undefined && { stroke: style.stroke }),
          ...(style.strokeWidth !== undefined && { strokeWidth: style.strokeWidth }),
        },
        updated_at: now,
      };
    case "text": {
      const data = { ...obj.data };
      if (style.fill !== undefined) data.fill = style.fill;
      if (style.fontSize !== undefined) data.fontSize = style.fontSize;
      if (style.background !== undefined) {
        if (style.background === null) delete data.background;
        else data.background = style.background;
      }
      return { ...obj, data, updated_at: now };
    }
    case "line":
      return {
        ...obj,
        data: {
          ...obj.data,
          ...(style.stroke !== undefined && { stroke: style.stroke }),
          ...(style.strokeWidth !== undefined && { strokeWidth: style.strokeWidth }),
        },
        updated_at: now,
      };
    case "arrow":
      return {
        ...obj,
        data: {
          ...obj.data,
          ...(style.stroke !== undefined && { stroke: style.stroke }),
          ...(style.strokeWidth !== undefined && { strokeWidth: style.strokeWidth }),
        },
        updated_at: now,
      };
    case "freehand":
      return {
        ...obj,
        data: {
          ...obj.data,
          ...(style.stroke !== undefined && { stroke: style.stroke }),
          ...(style.strokeWidth !== undefined && { strokeWidth: style.strokeWidth }),
        },
        updated_at: now,
      };
    case "image":
      // Image không có style fill/stroke — chỉ giữ nguyên data.
      return { ...obj, updated_at: now };
  }
}

// ---------------------------------------------------------------
// Normalize Konva Transformer output → clean data (Phase 11.3)
// Call after onTransformEnd. nodeX/Y are node.x()/y() after transform;
// scaleX/Y are node.scaleX()/scaleY(). Resets scale to 1 in caller.
// ---------------------------------------------------------------

export function normalizeObjectTransform(
  obj: BoardObject,
  nodeX: number,
  nodeY: number,
  scaleX: number,
  scaleY: number
): BoardObject {
  const now = NOW();
  switch (obj.type) {
    case "rect":
      return {
        ...obj,
        data: {
          ...obj.data,
          x: nodeX,
          y: nodeY,
          width: Math.max(1, obj.data.width * scaleX),
          height: Math.max(1, obj.data.height * scaleY),
        },
        updated_at: now,
      };
    case "ellipse":
      return {
        ...obj,
        data: {
          ...obj.data,
          x: nodeX,
          y: nodeY,
          radiusX: Math.max(1, obj.data.radiusX * scaleX),
          radiusY: Math.max(1, obj.data.radiusY * scaleY),
        },
        updated_at: now,
      };
    case "text":
      return {
        ...obj,
        data: {
          ...obj.data,
          x: nodeX,
          y: nodeY,
          width: Math.max(20, (obj.data.width ?? 120) * scaleX),
          height:
            obj.data.height !== undefined
              ? Math.max(16, obj.data.height * scaleY)
              : undefined,
          fontSize: Math.max(8, Math.round(obj.data.fontSize * scaleY)),
        },
        updated_at: now,
      };
    case "line": {
      const [x1, y1, x2, y2] = obj.data.points;
      return {
        ...obj,
        data: {
          ...obj.data,
          points: [
            x1 * scaleX + nodeX,
            y1 * scaleY + nodeY,
            x2 * scaleX + nodeX,
            y2 * scaleY + nodeY,
          ] as [number, number, number, number],
        },
        updated_at: now,
      };
    }
    case "arrow": {
      const [x1, y1, x2, y2] = obj.data.points;
      return {
        ...obj,
        data: {
          ...obj.data,
          points: [
            x1 * scaleX + nodeX,
            y1 * scaleY + nodeY,
            x2 * scaleX + nodeX,
            y2 * scaleY + nodeY,
          ] as [number, number, number, number],
        },
        updated_at: now,
      };
    }
    case "freehand": {
      const pts = obj.data.points.map(
        ([px, py]) => [px * scaleX + nodeX, py * scaleY + nodeY] as [number, number]
      );
      return {
        ...obj,
        data: { ...obj.data, points: pts },
        updated_at: now,
      };
    }
    case "image": {
      // Image dùng Transformer `keepRatio` ở UI nên scaleX ≈ scaleY,
      // nhưng vẫn snap về cùng scale (lấy max) để chống drift số học
      // làm sai naturalRatio sau nhiều lần resize.
      const s = Math.max(scaleX, scaleY);
      return {
        ...obj,
        data: {
          ...obj.data,
          x: nodeX,
          y: nodeY,
          width: Math.max(8, obj.data.width * s),
          height: Math.max(8, obj.data.height * s),
        },
        updated_at: now,
      };
    }
  }
}
