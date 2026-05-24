// =====================================================================
// NextBoard — Database types khớp với supabase/migrations/0001
// Có thể replace bằng output của `supabase gen types typescript` nếu muốn.
// =====================================================================

export type ProfileStatus = "active" | "disabled";

export type BoardRole = "owner" | "editor" | "viewer";

export type BoardObjectType =
  | "text"
  | "rect"
  | "ellipse"
  | "line"
  | "arrow"
  | "freehand";

export interface Profile {
  id: string;
  display_name: string | null;
  email: string | null;
  status: ProfileStatus;
  created_at: string;
}

export interface DeviceProfile {
  id: string;
  user_id: string;
  device_name: string | null;
  device_type: string | null;
  color: string | null;
  last_seen_at: string;
  created_at: string;
}

export interface Board {
  id: string;
  title: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface BoardMember {
  id: string;
  board_id: string;
  user_id: string;
  role: BoardRole;
  created_at: string;
}

// data jsonb — hình thái cụ thể tuỳ `type`.
export interface BoardObjectBase<T extends BoardObjectType, D> {
  id: string;
  board_id: string;
  type: T;
  data: D;
  z_index: number;
  version: number;
  locked_by_user_id: string | null;
  locked_by_device_id: string | null;
  locked_until: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TextObjectData {
  x: number;
  y: number;
  width?: number;
  height?: number;
  text: string;
  fontSize: number;
  fill: string;
  background?: string;
}

export interface RectObjectData {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
}

export interface EllipseObjectData {
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
}

export interface LineObjectData {
  points: [number, number, number, number];
  stroke: string;
  strokeWidth: number;
}

export interface ArrowObjectData {
  points: [number, number, number, number];
  stroke: string;
  strokeWidth: number;
}

export interface FreehandObjectData {
  points: [number, number][];
  stroke: string;
  strokeWidth: number;
}

export type BoardObject =
  | BoardObjectBase<"text", TextObjectData>
  | BoardObjectBase<"rect", RectObjectData>
  | BoardObjectBase<"ellipse", EllipseObjectData>
  | BoardObjectBase<"line", LineObjectData>
  | BoardObjectBase<"arrow", ArrowObjectData>
  | BoardObjectBase<"freehand", FreehandObjectData>;

export interface AdminUser {
  user_id: string;
  created_at: string;
}

export interface RealtimeConfig {
  drawingBatchIntervalMs: number;
  cursorIntervalMs: number;
  objectMoveIntervalMs: number;
  saveDebounceMs: number;
  lockDurationMs: number;
  lockRefreshMs: number;
}

export interface AppSetting<T = unknown> {
  key: string;
  value: T;
  updated_by: string | null;
  updated_at: string;
}
