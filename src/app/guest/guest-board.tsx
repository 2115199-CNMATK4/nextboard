"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Save, Trash2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BoardEditor } from "@/components/board/board-editor";
import { useGuestBoard } from "@/hooks/use-guest-board";
import { clearGuestBoard } from "@/lib/guest/storage";
import {
  persistGuestBoardAction,
  type PersistGuestState,
} from "@/actions/guest";

export function GuestBoard({ isLoggedIn }: { isLoggedIn: boolean }) {
  const { title, setTitle, objects, setObjects, hydrated, resetGuest } =
    useGuestBoard();

  const [persistState, persistFormAction, persisting] = useActionState<
    PersistGuestState,
    FormData
  >(persistGuestBoardAction, null);

  // Khi save thành công thì xóa local snapshot — server đã có bản thật.
  const lastBoardId = useRef<string | null>(null);
  useEffect(() => {
    if (persistState?.boardId && persistState.boardId !== lastBoardId.current) {
      lastBoardId.current = persistState.boardId;
      clearGuestBoard();
      resetGuest();
    }
  }, [persistState, resetGuest]);

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  return (
    <div className="flex flex-1 flex-col">
      <BoardEditor
        objects={objects}
        onChange={setObjects}
        topSlot={
          <div className="glass-panel flex items-center gap-2 px-3 py-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-9 w-20 bg-transparent border-transparent focus-visible:ring-2"
              placeholder="Tên board…"
            />
            <span className="text-xs text-zinc-500">
              {hydrated ? `${objects.length} khối` : "…"}
            </span>
            <span className="ml-3 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
              <Info className="h-3 w-3" /> guest
            </span>

            {/* Save flow */}
            {isLoggedIn ? (
              <form action={persistFormAction} className="ml-2">
                <input type="hidden" name="title" value={title} />
                <input
                  type="hidden"
                  name="objects"
                  value={JSON.stringify(objects)}
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={persisting || objects.length === 0}
                >
                  <Save className="h-4 w-4" />
                  {persisting ? "Đang lưu..." : "Lưu"}
                </Button>
              </form>
            ) : (
              <Link
                href="/login?next=/guest"
                className="ml-2 inline-flex items-center gap-1 rounded-xl bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                <Save className="h-4 w-4" />
                Lưu
              </Link>
            )}

            <Button
              type="button"
              size="icon"
              variant="ghost"
              title="Xóa toàn bộ board local"
              onClick={() => setShowClearConfirm(true)}
              disabled={objects.length === 0}
            >
              <Trash2 className="h-4 w-4" />
            </Button>

            {persistState?.error ? (
              <p className="ml-2 text-xs text-red-600" role="alert">
                {persistState.error}
              </p>
            ) : null}
          </div>
        }
      />

      {showClearConfirm ? (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setShowClearConfirm(false)}
        >
          <div
            className="glass-panel max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold">Xóa toàn bộ board local?</h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Mọi đối tượng chưa lưu sẽ mất. Hành động này không thể hoàn tác.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowClearConfirm(false)}>
                Hủy
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  clearGuestBoard();
                  resetGuest();
                  setShowClearConfirm(false);
                }}
              >
                Xóa
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
