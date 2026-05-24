import "server-only";

import { createServiceClient } from "@/lib/supabase/server";
import type { ProfileStatus } from "@/types/database";

// Service-role client bypass RLS — admin pages cần đọc TOÀN BỘ data
// (mọi user/board/device). Caller phải gate qua requireAdmin() trước.

export interface AdminCounts {
  users: number;
  boards: number;
  devices: number;
  objects: number;
}

export async function getAdminCounts(): Promise<AdminCounts> {
  const supabase = createServiceClient();
  const [u, b, d, o] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("boards").select("*", { count: "exact", head: true }),
    supabase.from("device_profiles").select("*", { count: "exact", head: true }),
    supabase.from("board_objects").select("*", { count: "exact", head: true }),
  ]);
  return {
    users: u.count ?? 0,
    boards: b.count ?? 0,
    devices: d.count ?? 0,
    objects: o.count ?? 0,
  };
}

export interface AdminUserRow {
  id: string;
  email: string | null;
  display_name: string | null;
  status: ProfileStatus;
  created_at: string;
  board_count: number;
  device_count: number;
  is_admin: boolean;
}

export async function listAdminUsers(): Promise<AdminUserRow[]> {
  const supabase = createServiceClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, display_name, status, created_at")
    .order("created_at", { ascending: false });

  if (!profiles) return [];

  // Counts: lấy 3 query song song, group bằng JS.
  const [bm, dp, ad] = await Promise.all([
    supabase
      .from("board_members")
      .select("user_id")
      .eq("role", "owner"),
    supabase.from("device_profiles").select("user_id"),
    supabase.from("admin_users").select("user_id"),
  ]);

  const boardCounts = new Map<string, number>();
  for (const row of (bm.data ?? []) as Array<{ user_id: string }>) {
    boardCounts.set(row.user_id, (boardCounts.get(row.user_id) ?? 0) + 1);
  }
  const deviceCounts = new Map<string, number>();
  for (const row of (dp.data ?? []) as Array<{ user_id: string }>) {
    deviceCounts.set(row.user_id, (deviceCounts.get(row.user_id) ?? 0) + 1);
  }
  const adminSet = new Set(
    ((ad.data ?? []) as Array<{ user_id: string }>).map((r) => r.user_id)
  );

  return profiles.map((p) => ({
    id: p.id,
    email: p.email,
    display_name: p.display_name,
    status: p.status as ProfileStatus,
    created_at: p.created_at,
    board_count: boardCounts.get(p.id) ?? 0,
    device_count: deviceCounts.get(p.id) ?? 0,
    is_admin: adminSet.has(p.id),
  }));
}

export interface AdminBoardRow {
  id: string;
  title: string;
  owner_id: string;
  owner_name: string | null;
  owner_email: string | null;
  created_at: string;
  updated_at: string;
  object_count: number;
  member_count: number;
}

export async function listAdminBoards(): Promise<AdminBoardRow[]> {
  const supabase = createServiceClient();
  const { data: boards } = await supabase
    .from("boards")
    .select(
      "id, title, owner_id, created_at, updated_at, owner:profiles(display_name, email)"
    )
    .order("updated_at", { ascending: false });
  if (!boards) return [];

  const ids = boards.map((b) => b.id);
  const [obj, mem] = await Promise.all([
    supabase.from("board_objects").select("board_id").in("board_id", ids),
    supabase.from("board_members").select("board_id").in("board_id", ids),
  ]);

  const objCount = new Map<string, number>();
  for (const r of (obj.data ?? []) as Array<{ board_id: string }>) {
    objCount.set(r.board_id, (objCount.get(r.board_id) ?? 0) + 1);
  }
  const memCount = new Map<string, number>();
  for (const r of (mem.data ?? []) as Array<{ board_id: string }>) {
    memCount.set(r.board_id, (memCount.get(r.board_id) ?? 0) + 1);
  }

  type Row = {
    id: string;
    title: string;
    owner_id: string;
    created_at: string;
    updated_at: string;
    owner: { display_name: string | null; email: string | null } | null;
  };

  return (boards as unknown as Row[]).map((b) => ({
    id: b.id,
    title: b.title,
    owner_id: b.owner_id,
    owner_name: b.owner?.display_name ?? null,
    owner_email: b.owner?.email ?? null,
    created_at: b.created_at,
    updated_at: b.updated_at,
    object_count: objCount.get(b.id) ?? 0,
    member_count: memCount.get(b.id) ?? 0,
  }));
}

export interface AdminDeviceRow {
  id: string;
  user_id: string;
  user_email: string | null;
  user_name: string | null;
  device_name: string | null;
  device_type: string | null;
  color: string | null;
  last_seen_at: string;
  created_at: string;
}

export async function listAdminDevices(): Promise<AdminDeviceRow[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("device_profiles")
    .select(
      "id, user_id, device_name, device_type, color, last_seen_at, created_at, owner:profiles(display_name, email)"
    )
    .order("last_seen_at", { ascending: false });
  if (!data) return [];

  type Row = {
    id: string;
    user_id: string;
    device_name: string | null;
    device_type: string | null;
    color: string | null;
    last_seen_at: string;
    created_at: string;
    owner: { display_name: string | null; email: string | null } | null;
  };

  return (data as unknown as Row[]).map((d) => ({
    id: d.id,
    user_id: d.user_id,
    user_name: d.owner?.display_name ?? null,
    user_email: d.owner?.email ?? null,
    device_name: d.device_name,
    device_type: d.device_type,
    color: d.color,
    last_seen_at: d.last_seen_at,
    created_at: d.created_at,
  }));
}

export interface RealtimeConfigSettings {
  drawingBatchIntervalMs: number;
  cursorIntervalMs: number;
  objectMoveIntervalMs: number;
  saveDebounceMs: number;
  lockDurationMs: number;
  lockRefreshMs: number;
}

export const DEFAULT_REALTIME_SETTINGS: RealtimeConfigSettings = {
  drawingBatchIntervalMs: 80,
  cursorIntervalMs: 120,
  objectMoveIntervalMs: 80,
  saveDebounceMs: 500,
  lockDurationMs: 5000,
  lockRefreshMs: 2000,
};

export async function getRealtimeSettings(): Promise<RealtimeConfigSettings> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "realtime_config")
    .maybeSingle<{ value: Partial<RealtimeConfigSettings> }>();
  return { ...DEFAULT_REALTIME_SETTINGS, ...(data?.value ?? {}) };
}
