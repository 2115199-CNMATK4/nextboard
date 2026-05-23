"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BoardEditor } from "./board-editor";
import { SaveIndicator } from "./save-indicator";
import { useBoardSync } from "@/hooks/use-board-sync";
import type { BoardObject, BoardRole } from "@/types/database";

export interface BoardClientProps {
  boardId: string;
  title: string;
  role: BoardRole;
  initialObjects: BoardObject[];
}

export function BoardClient({
  boardId,
  title,
  role,
  initialObjects,
}: BoardClientProps) {
  const { objects, setObjects, status } = useBoardSync(boardId, initialObjects);
  const readOnly = role === "viewer";

  return (
    <BoardEditor
      objects={objects}
      onChange={setObjects}
      readOnly={readOnly}
      topSlot={
        <div className="glass-panel flex items-center gap-3 px-3 py-2">
          <Link
            href="/dashboard"
            title="Quay lại dashboard"
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-black/10 dark:hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold">{title}</span>
            <span className="text-[10px] uppercase tracking-wider text-zinc-500">
              {role}
              {readOnly ? " • chỉ xem" : ""}
            </span>
          </div>
          <div className="ml-3 border-l border-zinc-300/60 pl-3 dark:border-zinc-700/60">
            <SaveIndicator status={status} />
          </div>
        </div>
      }
    />
  );
}
