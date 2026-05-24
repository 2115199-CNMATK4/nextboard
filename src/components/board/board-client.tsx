"use client";

import { useCallback, useRef } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BoardEditor } from "./board-editor";
import { SaveIndicator } from "./save-indicator";
import { useBoardSync } from "@/hooks/use-board-sync";
import { useBoardRealtime } from "@/hooks/use-board-realtime";
import { useObjectLock } from "@/hooks/use-object-lock";
import { useDevice } from "@/components/layout/device-provider";
import { realtimeConfig } from "@/lib/realtime/config";
import type { BoardObject, BoardRole } from "@/types/database";

export interface BoardClientProps {
  boardId: string;
  title: string;
  role: BoardRole;
  initialObjects: BoardObject[];
}

// =====================================================================
// BoardClient — kết hợp useBoardSync, useBoardRealtime, useObjectLock.
//
// Lock flow:
//   onDragStart → handleLockAcquire → acquireLockAction (RPC) + broadcast
//   onDragEnd   → handleLockRelease → releaseLockAction (RPC) + broadcast
//
// Remote lock:
//   lock:acquire → applyRemote({ updates: [objWithLock] })
//   lock:release → applyRemote({ updates: [objWithoutLock] })
// =====================================================================
export function BoardClient({
  boardId,
  title,
  role,
  initialObjects,
}: BoardClientProps) {
  const { profile, device } = useDevice();
  const readOnly = role === "viewer";

  // Stable refs để break circular dependency
  const broadcastRef = useRef({
    create: (_obj: BoardObject) => {},
    update: (_obj: BoardObject) => {},
    delete: (_id: string) => {},
  });
  const applyRemoteRef = useRef((_patch: Parameters<ReturnType<typeof useBoardSync>["applyRemote"]>[0]) => {});
  const objectsRef = useRef<BoardObject[]>(initialObjects);

  const { objects, setObjects, status, applyRemote } = useBoardSync(
    boardId,
    initialObjects,
    {
      onLocalChange: ({ creates, updates, deletes }) => {
        creates.forEach((o) => {
          if (o.type === "freehand") return; // handled via stroke:end
          broadcastRef.current.create(o);
        });
        updates.forEach((o) => broadcastRef.current.update(o));
        deletes.forEach((id) => broadcastRef.current.delete(id));
      },
    }
  );

  applyRemoteRef.current = applyRemote;
  objectsRef.current = objects;

  const lockHook = useObjectLock(boardId, device?.id ?? null);

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
    broadcastLockAcquire,
    broadcastLockRelease,
  } = useBoardRealtime(boardId, device ?? null, profile, {
    onObjectCreate: (obj) => applyRemoteRef.current({ creates: [obj] }),
    onObjectUpdate: (obj) => applyRemoteRef.current({ updates: [obj] }),
    onObjectDelete: (id) => applyRemoteRef.current({ deletes: [id] }),
    onLockAcquire: ({ objectId, lockedByUserId, lockedByDeviceId, lockedUntil }) => {
      const obj = objectsRef.current.find((o) => o.id === objectId);
      if (!obj) return;
      applyRemoteRef.current({
        updates: [{
          ...obj,
          locked_by_user_id: lockedByUserId,
          locked_by_device_id: lockedByDeviceId,
          locked_until: lockedUntil,
        }],
      });
    },
    onLockRelease: (objectId) => {
      const obj = objectsRef.current.find((o) => o.id === objectId);
      if (!obj) return;
      applyRemoteRef.current({
        updates: [{
          ...obj,
          locked_by_user_id: null,
          locked_by_device_id: null,
          locked_until: null,
        }],
      });
    },
  });

  broadcastRef.current = {
    create: broadcastObjectCreate,
    update: broadcastObjectUpdate,
    delete: broadcastObjectDelete,
  };

  const handleLockAcquire = useCallback(
    async (objectId: string): Promise<boolean> => {
      const ok = await lockHook.acquire(objectId);
      if (ok && device) {
        broadcastLockAcquire({
          objectId,
          lockedByUserId: profile.id,
          lockedByDeviceId: device.id,
          lockedUntil: new Date(Date.now() + realtimeConfig.lockDurationMs).toISOString(),
        });
      }
      return ok;
    },
    [lockHook, device, profile.id, broadcastLockAcquire]
  );

  const handleLockRelease = useCallback(
    async (objectId: string): Promise<void> => {
      await lockHook.release(objectId);
      broadcastLockRelease(objectId);
    },
    [lockHook, broadcastLockRelease]
  );

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
      myDeviceId={device?.id}
      onLockAcquire={readOnly ? undefined : handleLockAcquire}
      onLockRelease={readOnly ? undefined : handleLockRelease}
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
