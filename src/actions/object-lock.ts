"use server";

import { createClient } from "@/lib/supabase/server";
import { realtimeConfig } from "@/lib/realtime/config";

export async function acquireLockAction(
  objectId: string,
  boardId: string,
  deviceId: string
): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { data, error } = await supabase.rpc("acquire_object_lock", {
    p_object_id: objectId,
    p_board_id: boardId,
    p_user_id: user.id,
    p_device_id: deviceId,
    p_duration_ms: realtimeConfig.lockDurationMs,
  });

  if (error) return { ok: false };
  return { ok: data === true };
}

export async function releaseLockAction(
  objectId: string,
  deviceId: string
): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("release_object_lock", {
    p_object_id: objectId,
    p_device_id: deviceId,
  });
}
