import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { BoardObject } from "@/types/database";

// RLS `board_objects_select_member` đảm bảo chỉ trả về object của board
// mà user là member. Server Component gọi hàm này không cần kiểm thêm.
export async function listBoardObjects(boardId: string): Promise<BoardObject[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("board_objects")
    .select("*")
    .eq("board_id", boardId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as BoardObject[];
}
