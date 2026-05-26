"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { BoardRole } from "@/types/database";

export type MemberActionState = {
  error?: string;
  success?: string;
  email?: string;
  role?: BoardRole;
} | null;

// Map error code từ RPC sang thông báo tiếng Việt cho người dùng.
function mapMemberError(code: string | null | undefined, fallback: string): string {
  switch (code) {
    case "not_authenticated":
      return "Phiên đăng nhập đã hết. Hãy đăng nhập lại.";
    case "email_required":
      return "Vui lòng nhập email.";
    case "invalid_role":
      return "Vai trò không hợp lệ.";
    case "not_member":
      return "Bạn không phải thành viên board này.";
    case "forbidden":
      return "Bạn không có quyền thực hiện thao tác này.";
    case "forbidden_role":
      return "Editor chỉ có thể thêm Viewer.";
    case "user_not_found":
      return "Không tìm thấy tài khoản với email này.";
    case "self_add":
      return "Bạn đã là thành viên của board.";
    case "already_member":
      return "Người này đã là thành viên với vai trò bằng/cao hơn.";
    case "cannot_modify_owner":
      return "Không thể đổi vai trò chủ sở hữu.";
    case "cannot_remove_owner":
      return "Không thể xoá chủ sở hữu khỏi board.";
    default:
      return fallback;
  }
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateUuid(id: string): boolean {
  return /^[0-9a-fA-F-]{36}$/.test(id);
}

// ---------------------------------------------------------------------
// Add member by email
// ---------------------------------------------------------------------
export async function addBoardMemberAction(
  _prev: MemberActionState,
  formData: FormData
): Promise<MemberActionState> {
  const boardId = String(formData.get("board_id") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const role = String(formData.get("role") ?? "viewer").trim() as BoardRole;

  if (!validateUuid(boardId)) return { error: "Board không hợp lệ.", email, role };
  if (!validateEmail(email)) return { error: "Email không hợp lệ.", email, role };
  if (role !== "editor" && role !== "viewer")
    return { error: "Vai trò không hợp lệ.", email, role };

  const supabase = await createClient();
  const { error } = await supabase.rpc("add_board_member", {
    p_board_id: boardId,
    p_email: email,
    p_role: role,
  });

  if (error) {
    return {
      error: mapMemberError(error.message, error.message ?? "Thêm thành viên thất bại."),
      email,
      role,
    };
  }

  revalidatePath(`/boards/${boardId}`);
  revalidatePath(`/boards/${boardId}/members`);
  return { success: "Đã thêm thành viên.", role };
}

// ---------------------------------------------------------------------
// Change role (owner only)
// ---------------------------------------------------------------------
export async function changeMemberRoleAction(formData: FormData) {
  const boardId = String(formData.get("board_id") ?? "").trim();
  const userId = String(formData.get("user_id") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();

  if (!validateUuid(boardId) || !validateUuid(userId)) return;
  if (role !== "editor" && role !== "viewer") return;

  const supabase = await createClient();
  await supabase.rpc("set_board_member_role", {
    p_board_id: boardId,
    p_user_id: userId,
    p_role: role,
  });

  revalidatePath(`/boards/${boardId}`);
  revalidatePath(`/boards/${boardId}/members`);
}

// ---------------------------------------------------------------------
// Remove member (owner) — hoặc tự rời (member tự xoá bản thân, đã được
// policy board_members_delete_self cho phép, không cần RPC).
// ---------------------------------------------------------------------
export async function removeBoardMemberAction(formData: FormData) {
  const boardId = String(formData.get("board_id") ?? "").trim();
  const userId = String(formData.get("user_id") ?? "").trim();

  if (!validateUuid(boardId) || !validateUuid(userId)) return;

  const supabase = await createClient();
  await supabase.rpc("remove_board_member", {
    p_board_id: boardId,
    p_user_id: userId,
  });

  revalidatePath(`/boards/${boardId}`);
  revalidatePath(`/boards/${boardId}/members`);
}

// ---------------------------------------------------------------------
// Leave board (member tự rời) — viewer/editor có thể tự rời.
// ---------------------------------------------------------------------
export async function leaveBoardAction(formData: FormData) {
  const boardId = String(formData.get("board_id") ?? "").trim();
  if (!validateUuid(boardId)) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // RLS board_members_delete_self chặn nếu mình là owner.
  await supabase
    .from("board_members")
    .delete()
    .eq("board_id", boardId)
    .eq("user_id", user.id);

  revalidatePath("/dashboard");
}
