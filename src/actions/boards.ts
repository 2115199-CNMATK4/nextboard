"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CreateBoardState = { error?: string; title?: string } | null;

// ---------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------
export async function createBoardAction(
  _prev: CreateBoardState,
  formData: FormData
): Promise<CreateBoardState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  if (!title) return { error: "Tên board không được để trống.", title };

  // Dùng RPC `create_board` (SECURITY DEFINER) thay vì .insert() trực
  // tiếp — xem migration 0004 để biết lý do. RPC insert cả boards lẫn
  // board_members trong cùng transaction nên không có race với trigger.
  const { data, error } = await supabase
    .rpc("create_board", { p_title: title })
    .single<{ id: string }>();
  if (error || !data)
    return { error: error?.message ?? "Tạo board thất bại.", title };

  revalidatePath("/dashboard");
  redirect(`/boards/${data.id}`);
}

// ---------------------------------------------------------------------
// Rename
// ---------------------------------------------------------------------
export async function renameBoardAction(formData: FormData) {
  const boardId = String(formData.get("board_id") ?? "");
  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  if (!boardId || !title) return;

  const supabase = await createClient();
  // RLS boards_update_owner sẽ chặn nếu user không phải owner.
  await supabase.from("boards").update({ title }).eq("id", boardId);
  revalidatePath("/dashboard");
  revalidatePath(`/boards/${boardId}`);
}

// ---------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------
export async function deleteBoardAction(formData: FormData) {
  const boardId = String(formData.get("board_id") ?? "");
  if (!boardId) return;

  const supabase = await createClient();
  // RLS boards_delete_owner chặn nếu không phải owner.
  // board_objects và board_members cascade qua FK on delete cascade.
  await supabase.from("boards").delete().eq("id", boardId);
  revalidatePath("/dashboard");
}
