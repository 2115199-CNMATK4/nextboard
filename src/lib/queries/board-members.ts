import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { BoardRole } from "@/types/database";

export interface BoardMemberView {
  user_id: string;
  role: BoardRole;
  display_name: string | null;
  email: string | null;
  created_at: string;
}

// Trả về danh sách thành viên board kèm thông tin profile.
// RLS board_members_select_member đảm bảo chỉ member mới đọc được.
// profiles_select_board_peers cho phép đọc profile của các member chung.
export async function listBoardMembers(
  boardId: string
): Promise<BoardMemberView[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("board_members")
    .select("user_id, role, created_at, profiles!inner(display_name, email)")
    .eq("board_id", boardId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  if (!data) return [];

  return data.map((row) => {
    const profile = row.profiles as unknown as {
      display_name: string | null;
      email: string | null;
    };
    return {
      user_id: row.user_id,
      role: row.role as BoardRole,
      display_name: profile?.display_name ?? null,
      email: profile?.email ?? null,
      created_at: row.created_at,
    } satisfies BoardMemberView;
  });
}
