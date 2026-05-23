"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Pencil, Trash2, ExternalLink, Crown, Eye, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { renameBoardAction, deleteBoardAction } from "@/actions/boards";
import type { BoardRole } from "@/types/database";

interface Props {
  id: string;
  title: string;
  role: BoardRole;
  updatedAt: string;
}

const ROLE_BADGE: Record<BoardRole, { label: string; Icon: typeof Crown }> = {
  owner: { label: "Owner", Icon: Crown },
  editor: { label: "Editor", Icon: Edit3 },
  viewer: { label: "Viewer", Icon: Eye },
};

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function BoardCard({ id, title, role, updatedAt }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const [confirmDel, setConfirmDel] = useState(false);
  const [pending, startTransition] = useTransition();

  const { label, Icon } = ROLE_BADGE[role];
  const canEdit = role === "owner";

  function submitRename(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next = draft.trim();
    if (!next || next === title) {
      setEditing(false);
      setDraft(title);
      return;
    }
    const fd = new FormData();
    fd.set("board_id", id);
    fd.set("title", next);
    startTransition(async () => {
      await renameBoardAction(fd);
      setEditing(false);
    });
  }

  function confirmDelete() {
    const fd = new FormData();
    fd.set("board_id", id);
    startTransition(async () => {
      await deleteBoardAction(fd);
      setConfirmDel(false);
    });
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        {editing ? (
          <form onSubmit={submitRename} className="flex flex-1 gap-2">
            <Input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={120}
              className="h-9"
            />
            <Button type="submit" size="sm" disabled={pending}>
              Lưu
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditing(false);
                setDraft(title);
              }}
            >
              Hủy
            </Button>
          </form>
        ) : (
          <>
            <Link
              href={`/boards/${id}`}
              className="line-clamp-2 text-base font-semibold hover:underline"
            >
              {title}
            </Link>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
              <Icon className="h-3 w-3" />
              {label}
            </span>
          </>
        )}
      </div>

      <p className="text-xs text-zinc-500">Cập nhật: {fmtDate(updatedAt)}</p>

      {!editing ? (
        <div className="mt-1 flex items-center gap-2">
          <Link
            href={`/boards/${id}`}
            className="inline-flex h-8 items-center gap-1 rounded-lg bg-zinc-900 px-3 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Mở
          </Link>
          {canEdit ? (
            <>
              <Button
                size="icon"
                variant="ghost"
                title="Đổi tên"
                onClick={() => setEditing(true)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                title="Xóa"
                onClick={() => setConfirmDel(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          ) : null}
        </div>
      ) : null}

      {confirmDel ? (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setConfirmDel(false)}
        >
          <div
            className="glass-panel max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold">Xóa board "{title}"?</h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Tất cả đối tượng trên board và danh sách thành viên sẽ bị xóa
              theo. Không thể hoàn tác.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmDel(false)}>
                Hủy
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={pending}
              >
                {pending ? "Đang xóa..." : "Xóa"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
