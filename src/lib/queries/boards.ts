import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Board, BoardRole } from "@/types/database";

export interface BoardWithRole extends Board {
  role: BoardRole;
}

// List các board user là member. RLS lọc tự động (boards_select_member),
// JOIN inner với board_members để biết role.
export async function listMyBoards(userId: string): Promise<BoardWithRole[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("boards")
    .select(
      "id, title, owner_id, created_at, updated_at, board_members!inner(role)"
    )
    .eq("board_members.user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  if (!data) return [];

  return data.map((row) => {
    const memberRows = row.board_members as unknown as { role: BoardRole }[];
    const role = memberRows[0]?.role ?? "viewer";
    return {
      id: row.id,
      title: row.title,
      owner_id: row.owner_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      role,
    } satisfies BoardWithRole;
  });
}

export async function getBoardForUser(
  boardId: string,
  userId: string
): Promise<BoardWithRole | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("boards")
    .select(
      "id, title, owner_id, created_at, updated_at, board_members!inner(role)"
    )
    .eq("id", boardId)
    .eq("board_members.user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  const memberRows = data.board_members as unknown as { role: BoardRole }[];
  const role = memberRows[0]?.role ?? "viewer";
  return {
    id: data.id,
    title: data.title,
    owner_id: data.owner_id,
    created_at: data.created_at,
    updated_at: data.updated_at,
    role,
  };
}
