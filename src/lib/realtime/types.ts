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
