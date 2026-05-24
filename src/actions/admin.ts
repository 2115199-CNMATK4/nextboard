"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import type { RealtimeConfigSettings } from "@/lib/queries/admin";

export type AdminActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

// ---------------------------------------------------------------------
// User: toggle status (active <-> disabled)
// ---------------------------------------------------------------------
export async function setUserStatusAction(
  userId: string,
  status: "active" | "disabled"
): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  // Không cho admin tự disable mình
  if (admin.id === userId)
    return { ok: false, error: "Không thể đổi trạng thái tài khoản của chính bạn." };

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("profiles")
    .update({ status })
    .eq("id", userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/users");
  return { ok: true, message: `Đã đổi trạng thái user → ${status}.` };
}

// ---------------------------------------------------------------------
// Board: delete (cascade xóa board_members + board_objects)
// ---------------------------------------------------------------------
export async function deleteBoardAdminAction(
  boardId: string
): Promise<AdminActionResult> {
  await requireAdmin();
  const supabase = createServiceClient();
  const { error } = await supabase.from("boards").delete().eq("id", boardId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/boards");
  revalidatePath("/admin");
  return { ok: true, message: "Đã xóa board." };
}

// ---------------------------------------------------------------------
// Device: delete
// ---------------------------------------------------------------------
export async function deleteDeviceAdminAction(
  deviceId: string
): Promise<AdminActionResult> {
  await requireAdmin();
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("device_profiles")
    .delete()
    .eq("id", deviceId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/devices");
  revalidatePath("/admin");
  return { ok: true, message: "Đã xóa device." };
}

// ---------------------------------------------------------------------
// Maintenance: reset expired locks (global)
// ---------------------------------------------------------------------
export async function resetExpiredLocksAction(): Promise<AdminActionResult> {
  await requireAdmin();
  const supabase = createServiceClient();
  const { error, count } = await supabase
    .from("board_objects")
    .update(
      {
        locked_by_user_id: null,
        locked_by_device_id: null,
        locked_until: null,
      },
      { count: "exact" }
    )
    .lt("locked_until", new Date().toISOString());
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/maintenance");
  return { ok: true, message: `Đã reset ${count ?? 0} lock đã hết hạn.` };
}

// ---------------------------------------------------------------------
// Maintenance: reset all locks of a board (force)
// ---------------------------------------------------------------------
export async function resetLocksByBoardAction(
  boardId: string
): Promise<AdminActionResult> {
  await requireAdmin();
  if (!boardId.trim()) return { ok: false, error: "Thiếu board id." };
  const supabase = createServiceClient();
  const { error, count } = await supabase
    .from("board_objects")
    .update(
      {
        locked_by_user_id: null,
        locked_by_device_id: null,
        locked_until: null,
      },
      { count: "exact" }
    )
    .eq("board_id", boardId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/maintenance");
  return { ok: true, message: `Đã reset ${count ?? 0} lock của board.` };
}

// ---------------------------------------------------------------------
// Settings: realtime_config — đã clamp ở action để đảm bảo bound
// ---------------------------------------------------------------------
const REALTIME_BOUNDS: Record<
  keyof RealtimeConfigSettings,
  { min: number; max: number }
> = {
  drawingBatchIntervalMs: { min: 50, max: 200 },
  cursorIntervalMs: { min: 100, max: 500 },
  objectMoveIntervalMs: { min: 50, max: 200 },
  saveDebounceMs: { min: 300, max: 2000 },
  lockDurationMs: { min: 3000, max: 15000 },
  lockRefreshMs: { min: 1000, max: 5000 },
};

export async function updateRealtimeSettingsAction(
  _prev: AdminActionResult | null,
  formData: FormData
): Promise<AdminActionResult> {
  await requireAdmin();

  const next: Partial<RealtimeConfigSettings> = {};
  for (const key of Object.keys(REALTIME_BOUNDS) as Array<
    keyof RealtimeConfigSettings
  >) {
    const raw = formData.get(key);
    const n = Number(raw);
    if (!Number.isFinite(n))
      return { ok: false, error: `${key} không hợp lệ.` };
    const { min, max } = REALTIME_BOUNDS[key];
    if (n < min || n > max)
      return {
        ok: false,
        error: `${key} phải trong [${min}, ${max}], nhận được ${n}.`,
      };
    next[key] = n;
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key: "realtime_config", value: next }, { onConflict: "key" });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/settings");
  return {
    ok: true,
    message:
      "Đã lưu. Giá trị mới áp dụng cho session mới (refresh trang/board).",
  };
}
