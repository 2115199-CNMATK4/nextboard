"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BoardObject } from "@/types/database";
import {
  createBoardObjectAction,
  updateBoardObjectAction,
  deleteBoardObjectAction,
} from "@/actions/board-objects";
import type { RemotePatch } from "@/lib/realtime/types";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface LocalChange {
  creates: BoardObject[];
  updates: BoardObject[];
  deletes: string[];
}

interface SyncOptions {
  onLocalChange?: (change: LocalChange) => void;
}

// =====================================================================
// useBoardSync — controlled state cho objects + sync về DB qua diff.
// Mỗi lần `objects` thay đổi (do BoardEditor gọi onChange), hook diff
// với snapshot trước đó và emit create/update/delete tương ứng.
//
// applyRemote() — apply changes đến từ remote (Realtime) mà KHÔNG
//   trigger DB write hay re-broadcast. Trick: cập nhật lastSeen trước
//   khi setState nên khi useEffect chạy diff sẽ thấy không có thay đổi.
//
// onLocalChange — callback khi local diff được detect, dùng để
//   broadcast ra channel (Phase 9).
// =====================================================================
export function useBoardSync(
  boardId: string,
  initial: BoardObject[],
  options?: SyncOptions
) {
  const [objects, setObjects] = useState<BoardObject[]>(initial);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const lastSeen = useRef<Map<string, BoardObject>>(
    new Map(initial.map((o) => [o.id, o]))
  );
  const initialized = useRef(false);
  const onLocalChangeRef = useRef(options?.onLocalChange);
  onLocalChangeRef.current = options?.onLocalChange;

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      return;
    }

    const current = new Map(objects.map((o) => [o.id, o]));
    const tasks: Promise<unknown>[] = [];
    const creates: BoardObject[] = [];
    const updates: BoardObject[] = [];
    const deletes: string[] = [];

    for (const [id, obj] of current) {
      const prev = lastSeen.current.get(id);
      if (!prev) {
        tasks.push(createBoardObjectAction(boardId, obj));
        creates.push(obj);
      } else if (prev !== obj) {
        tasks.push(updateBoardObjectAction(boardId, obj));
        updates.push(obj);
      }
    }
    for (const [id] of lastSeen.current) {
      if (!current.has(id)) {
        tasks.push(deleteBoardObjectAction(boardId, id));
        deletes.push(id);
      }
    }

    if (tasks.length === 0) return;

    lastSeen.current = current;
    setStatus("saving");

    // Broadcast ngay (trước khi chờ DB) để remote nhận nhanh hơn.
    onLocalChangeRef.current?.({ creates, updates, deletes });

    Promise.all(tasks)
      .then((results) => {
        const failed = results.some(
          (r) => r && typeof r === "object" && "ok" in r && r.ok === false
        );
        setStatus(failed ? "error" : "saved");
      })
      .catch(() => setStatus("error"));
  }, [objects, boardId]);

  useEffect(() => {
    if (status !== "saved") return;
    const t = setTimeout(() => setStatus("idle"), 1500);
    return () => clearTimeout(t);
  }, [status]);

  const updateObjects = useCallback(
    (next: BoardObject[] | ((prev: BoardObject[]) => BoardObject[])) => {
      setObjects((prev) =>
        typeof next === "function"
          ? (next as (p: BoardObject[]) => BoardObject[])(prev)
          : next
      );
    },
    []
  );

  // Apply remote changes mà không trigger diff → không persist lại lên DB.
  // Cập nhật lastSeen synchronously trước khi setObjects để khi useEffect
  // chạy, diff thấy prev === obj (same ref) và skip.
  const applyRemote = useCallback(({ creates = [], updates = [], deletes = [] }: RemotePatch) => {
    for (const obj of creates) lastSeen.current.set(obj.id, obj);
    for (const obj of updates) lastSeen.current.set(obj.id, obj);
    for (const id of deletes) lastSeen.current.delete(id);

    setObjects((prev) => {
      const existingIds = new Set(prev.map((o) => o.id));
      let next = prev;
      if (creates.length > 0) {
        const newOnes = creates.filter((o) => !existingIds.has(o.id));
        if (newOnes.length > 0) next = [...next, ...newOnes];
      }
      if (updates.length > 0) {
        const updateMap = new Map(updates.map((o) => [o.id, o]));
        next = next.map((o) => updateMap.get(o.id) ?? o);
      }
      if (deletes.length > 0) {
        const deleteSet = new Set(deletes);
        next = next.filter((o) => !deleteSet.has(o.id));
      }
      return next;
    });
  }, []);

  return { objects, setObjects: updateObjects, status, applyRemote };
}
