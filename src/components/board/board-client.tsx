"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BoardEditor } from "./board-editor";
import { SaveIndicator } from "./save-indicator";
import { useBoardSync } from "@/hooks/use-board-sync";
import { useBoardRealtime } from "@/hooks/use-board-realtime";
import { useDevice } from "@/components/layout/device-provider";
import type { BoardObject, BoardRole } from "@/types/database";

export interface BoardClientProps {
  boardId: string;
  title: string;
  role: BoardRole;
  initialObjects: BoardObject[];
}

// =====================================================================
// BoardClient — kết hợp useBoardSync (DB) và useBoardRealtime (channel).
//
// Circular dependency được xử lý bằng 2 stable refs:
//   broadcastRef  — useBoardSync dùng để emit sau khi detect local diff.
//   applyRemoteRef — useBoardRealtime dùng để apply changes từ remote.
//
// Cả hai ref được cập nhật synchronously sau mỗi render nên luôn trỏ
// đúng function mới nhất mà không cần thêm vào dep array.
// =====================================================================
export function BoardClient({
  boardId,
  title,
  role,
  initialObjects,
}: BoardClientProps) {
  const { profile, device } = useDevice();
  const readOnly = role === "viewer";

  // --- Circular dep refs ---
  const broadcastRef = useRef({
    create: (_obj: BoardObject) => {},
    update: (_obj: BoardObject) => {},
    delete: (_id: string) => {},
  });
  const applyRemoteRef = useRef((_patch: Parameters<ReturnType<typeof useBoardSync>["applyRemote"]>[0]) => {});

  // DB persistence + local state
  const { objects, setObjects, status, applyRemote } = useBoardSync(
    boardId,
    initialObjects,
    {
      onLocalChange: ({ creates, updates, deletes }) => {
        creates.forEach((o) => broadcastRef.current.create(o));
        updates.forEach((o) => broadcastRef.current.update(o));
        deletes.forEach((id) => broadcastRef.current.delete(id));
      },
    }
  );

  // Keep applyRemote ref in sync after each render.
  applyRemoteRef.current = applyRemote;

  // Realtime channel
  const { remoteCursors, broadcastObjectCreate, broadcastObjectUpdate, broadcastObjectDelete, broadcastCursor } =
    useBoardRealtime(boardId, device, profile, {
      onObjectCreate: (obj) => applyRemoteRef.current({ creates: [obj] }),
      onObjectUpdate: (obj) => applyRemoteRef.current({ updates: [obj] }),
      onObjectDelete: (id) => applyRemoteRef.current({ deletes: [id] }),
    });

  // Keep broadcast ref in sync after each render.
  broadcastRef.current = {
    create: broadcastObjectCreate,
    update: broadcastObjectUpdate,
    delete: broadcastObjectDelete,
  };

  return (
    <BoardEditor
      objects={objects}
      onChange={setObjects}
      readOnly={readOnly}
      remoteCursors={remoteCursors}
      onCursorMove={readOnly ? undefined : broadcastCursor}
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
