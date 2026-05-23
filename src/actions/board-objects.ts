"use server";

import { createClient } from "@/lib/supabase/server";
import type { BoardObject } from "@/types/database";

// =====================================================================
// Persist các thao tác trên board_objects.
// RLS đã chặn viewer ở DB; ở đây chỉ chuyển dữ liệu xuống.
// Phase 9 sẽ thêm realtime broadcast PARALLEL với các action này.
// =====================================================================

export async function createBoardObjectAction(
  boardId: string,
  obj: BoardObject
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase.from("board_objects").insert({
    id: obj.id,
    board_id: boardId,
    type: obj.type,
    data: obj.data,
    created_by: user.id,
    updated_by: user.id,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updateBoardObjectAction(
  boardId: string,
  obj: BoardObject
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("board_objects")
    .update({
      data: obj.data,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", obj.id)
    .eq("board_id", boardId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteBoardObjectAction(
  boardId: string,
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("board_objects")
    .delete()
    .eq("id", id)
    .eq("board_id", boardId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
