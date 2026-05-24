import type { BoardObject } from "@/types/database";

// Presence state mỗi device track khi join channel.
export interface BoardPresenceState {
  device_profile_id: string;
  user_name: string | null;
  device_name: string | null;
  color: string | null;
}

// Cursor của remote user (có position).
export interface RemoteCursor {
  deviceId: string;
  user_name: string | null;
  color: string;
  x: number;
  y: number;
}

// Broadcast payloads — tất cả đều có _from để filter self-echo.
export interface ObjectCreatePayload {
  _from: string;
  object: BoardObject;
}

export interface ObjectUpdatePayload {
  _from: string;
  object: BoardObject;
}

export interface ObjectDeletePayload {
  _from: string;
  id: string;
}

export interface CursorUpdatePayload {
  _from: string;
  user_name: string | null;
  color: string | null;
  x: number;
  y: number;
}

export interface RemotePatch {
  creates?: BoardObject[];
  updates?: BoardObject[];
  deletes?: string[];
}

// --- Phase 10: stroke batch ---

export interface StrokeStartPayload {
  _from: string;
  strokeId: string;
  x: number;
  y: number;
  stroke: string;
  strokeWidth: number;
}

export interface StrokePointsPayload {
  _from: string;
  strokeId: string;
  points: [number, number][];
}

export interface StrokeEndPayload {
  _from: string;
  strokeId: string;
  object: BoardObject;
}

// --- Phase 11: object lock ---

export interface LockAcquirePayload {
  _from: string;
  objectId: string;
  lockedByUserId: string;
  lockedByDeviceId: string;
  lockedUntil: string; // ISO timestamp
}

export interface LockReleasePayload {
  _from: string;
  objectId: string;
}

// Stroke đang được vẽ realtime bởi remote user (chưa commit vào DB).
export interface RemoteStroke {
  strokeId: string;
  deviceId: string;
  points: [number, number][];
  stroke: string;
  strokeWidth: number;
}
