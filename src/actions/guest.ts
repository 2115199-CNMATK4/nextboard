"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { BoardObject, BoardObjectType } from "@/types/database";

export type PersistGuestState = {
  error?: string;
  boardId?: string;
} | null;

const ALLOWED_TYPES: BoardObjectType[] = [
  "text",
  "rect",
  "ellipse",
  "line",
  "arrow",
  "freehand",
];

// Server Action — nhận title + JSON objects, tạo board thật trong DB.
// Dùng pattern useActionState để form có pending UI.
export async function persistGuestBoardAction(
  _prev: PersistGuestState,
  formData: FormData
): Promise<PersistGuestState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/guest");
  }

  const title = String(formData.get("title") || "Board 1").slice(0, 120);
  const objectsJson = String(formData.get("objects") || "[]");

  let parsed: unknown;
  try {
    parsed = JSON.parse(objectsJson);
  } catch {
    return { error: "Dữ liệu guest board bị lỗi (JSON không hợp lệ)." };
  }
  if (!Array.isArray(parsed)) return { error: "Dữ liệu guest board không phải mảng." };

  // Tạo board qua RPC (xem migration 0004) — bypass bug RLS bootstrap.
  const { data: board, error: boardErr } = await supabase
    .rpc("create_board", { p_title: title || "Board 1" })
    .single<{ id: string }>();
  if (boardErr || !board) {
    return { error: boardErr?.message ?? "Không tạo được board." };
  }

  // Insert objects (lọc các field an toàn — chỉ lấy type + data).
  const rows = (parsed as BoardObject[])
    .filter((o) => o && typeof o === "object" && ALLOWED_TYPES.includes(o.type as BoardObjectType))
    .map((o) => ({
      board_id: board.id,
      type: o.type,
      data: o.data,
      created_by: user.id,
      updated_by: user.id,
    }));

  if (rows.length > 0) {
    const { error: objErr } = await supabase.from("board_objects").insert(rows);
    if (objErr) return { error: objErr.message };
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard?guest_saved=${board.id}`);
}
