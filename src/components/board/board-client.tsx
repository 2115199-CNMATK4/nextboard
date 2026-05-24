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
// Circular dependency giữa hai hooks được xử lý bằng stable refs.
//
// Freehand objects KHÔNG broadcast qua object:create; chúng đã được
// broadcast qua stroke:end. Điều này tránh duplicate khi Tab B nhận
// cả stroke:end lẫn object:create cho cùng một object.
// =====================================================================
export function BoardClient({
  boardId,
  title,
  role,
  initialObjects,
}: BoardClientProps) {
  const { profile, device } = useDevice();
  const readOnly = role === "viewer";

  // Stable refs để break circular dependency giữa useBoardSync và useBoardRealtime
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
        creates.forEach((o) => {
          // Freehand creates đã broadcast qua stroke:end → skip để tránh duplicate
          if (o.type === "freehand") return;
          broadcastRef.current.create(o);
        });
        updates.forEach((o) => broadcastRef.current.update(o));
        deletes.forEach((id) => broadcastRef.current.delete(id));
      },
    }
  );

  applyRemoteRef.current = applyRemote;

  // Realtime channel
  const {
    remoteCursors,
    remoteStrokes,
    broadcastObjectCreate,
    broadcastObjectUpdate,
    broadcastObjectDelete,
    broadcastCursor,
    broadcastStrokeStart,
    broadcastStrokePoints,
    broadcastStrokeEnd,
  } = useBoardRealtime(boardId, device, profile, {
    onObjectCreate: (obj) => applyRemoteRef.current({ creates: [obj] }),
    onObjectUpdate: (obj) => applyRemoteRef.current({ updates: [obj] }),
    onObjectDelete: (id) => applyRemoteRef.current({ deletes: [id] }),
  });

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
      remoteStrokes={remoteStrokes}
      onCursorMove={readOnly ? undefined : broadcastCursor}
      onStrokeStart={readOnly ? undefined : broadcastStrokeStart}
      onStrokePoints={readOnly ? undefined : broadcastStrokePoints}
      onStrokeEnd={readOnly ? undefined : broadcastStrokeEnd}
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
