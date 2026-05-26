"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Crown, Edit3, Eye, UserPlus, Trash2, X, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addBoardMemberAction,
  changeMemberRoleAction,
  removeBoardMemberAction,
  leaveBoardAction,
  type MemberActionState,
} from "@/actions/board-members";
import type { BoardRole } from "@/types/database";
import type { BoardMemberView } from "@/lib/queries/board-members";

const ROLE_LABEL: Record<BoardRole, string> = {
  owner: "Chủ sở hữu",
  editor: "Editor",
  viewer: "Viewer",
};

const ROLE_ICON: Record<BoardRole, typeof Crown> = {
  owner: Crown,
  editor: Edit3,
  viewer: Eye,
};

export function MembersDialog({
  boardId,
  myRole,
  myUserId,
  members,
  onClose,
}: {
  boardId: string;
  myRole: BoardRole;
  myUserId: string;
  members: BoardMemberView[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const initialState: MemberActionState = null;
  const [addState, addAction] = useActionState(
    addBoardMemberAction,
    initialState
  );

  // Vai trò caller có thể thêm:
  //   owner  → editor + viewer
  //   editor → viewer
  //   viewer → không hiện form
  const canAddEditor = myRole === "owner";
  const canAddAny = myRole === "owner" || myRole === "editor";
  const canManage = myRole === "owner";

  const [newRole, setNewRole] = useState<BoardRole>("viewer");

  // Sau khi add thành công, refresh để load lại members.
  useEffect(() => {
    if (addState?.success) router.refresh();
  }, [addState?.success, router]);

  function handleChangeRole(userId: string, role: BoardRole) {
    const fd = new FormData();
    fd.set("board_id", boardId);
    fd.set("user_id", userId);
    fd.set("role", role);
    startTransition(async () => {
      await changeMemberRoleAction(fd);
      router.refresh();
    });
  }

  function handleRemove(userId: string) {
    const fd = new FormData();
    fd.set("board_id", boardId);
    fd.set("user_id", userId);
    startTransition(async () => {
      await removeBoardMemberAction(fd);
      router.refresh();
    });
  }

  function handleLeave() {
    if (!confirm("Bạn chắc chắn muốn rời board này?")) return;
    const fd = new FormData();
    fd.set("board_id", boardId);
    startTransition(async () => {
      await leaveBoardAction(fd);
      // Sau khi rời thì user không còn quyền vào board → về dashboard.
      router.push("/dashboard");
    });
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="glass-panel flex max-h-[85vh] w-full max-w-md flex-col gap-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Thành viên board</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-black/10 dark:hover:bg-white/10"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {canAddAny ? (
          <form action={addAction} className="flex flex-col gap-2">
            <input type="hidden" name="board_id" value={boardId} />
            <label className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Thêm thành viên bằng email
            </label>
            <div className="flex gap-2">
              <Input
                type="email"
                name="email"
                required
                placeholder="email@vidu.com"
                defaultValue={addState?.email ?? ""}
                className="h-9 flex-1"
              />
              <select
                name="role"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as BoardRole)}
                className="h-9 rounded-xl border border-zinc-200 bg-white px-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              >
                <option value="viewer">Viewer</option>
                {canAddEditor ? <option value="editor">Editor</option> : null}
              </select>
              <Button type="submit" size="sm" className="h-9">
                <UserPlus className="h-4 w-4" />
                Thêm
              </Button>
            </div>
            {addState?.error ? (
              <p className="text-xs text-red-600">{addState.error}</p>
            ) : null}
            {addState?.success ? (
              <p className="text-xs text-emerald-600">{addState.success}</p>
            ) : null}
            {myRole === "editor" ? (
              <p className="text-[11px] text-zinc-500">
                Editor chỉ có thể thêm Viewer.
              </p>
            ) : null}
          </form>
        ) : (
          <p className="text-xs text-zinc-500">
            Bạn là viewer và không thể thêm thành viên.
          </p>
        )}

        <div className="flex flex-col gap-1 overflow-y-auto">
          <p className="px-1 text-xs font-medium uppercase tracking-wider text-zinc-500">
            Danh sách · {members.length}
          </p>
          <ul className="flex flex-col gap-1">
            {members.map((m) => {
              const Icon = ROLE_ICON[m.role];
              const isMe = m.user_id === myUserId;
              const isOwner = m.role === "owner";
              return (
                <li
                  key={m.user_id}
                  className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <Icon className="h-4 w-4 shrink-0 text-zinc-500" />
                  <div className="flex min-w-0 flex-1 flex-col leading-tight">
                    <span className="truncate text-sm font-medium">
                      {m.display_name ?? "Người dùng"}
                      {isMe ? (
                        <span className="ml-1 text-[10px] font-normal text-zinc-500">
                          (bạn)
                        </span>
                      ) : null}
                    </span>
                    <span className="truncate text-[11px] text-zinc-500">
                      {m.email ?? ""}
                    </span>
                  </div>

                  {canManage && !isOwner && !isMe ? (
                    <>
                      <select
                        value={m.role}
                        onChange={(e) =>
                          handleChangeRole(m.user_id, e.target.value as BoardRole)
                        }
                        disabled={pending}
                        className="h-7 rounded-md border border-zinc-200 bg-white px-1 text-xs dark:border-zinc-800 dark:bg-zinc-950"
                      >
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                      </select>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Xoá khỏi board"
                        onClick={() => handleRemove(m.user_id)}
                        disabled={pending}
                        className="h-7 w-7"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                      {ROLE_LABEL[m.role]}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {myRole !== "owner" ? (
          <div className="border-t border-zinc-200 pt-3 dark:border-zinc-800">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLeave}
              disabled={pending}
              className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
            >
              <LogOut className="h-3.5 w-3.5" />
              Rời board
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
