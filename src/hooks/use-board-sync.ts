"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { BoardObject } from "@/types/database";
import {
  createBoardObjectAction,
  updateBoardObjectAction,
  deleteBoardObjectAction,
} from "@/actions/board-objects";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

// useBoardSync — controlled state cho objects + sync về DB qua diff.
// Mỗi lần `objects` thay đổi (do BoardEditor gọi onChange), hook diff
// với snapshot trước đó và emit create/update/delete tương ứng.
// Phase 9 sẽ thêm channel broadcast song song với write DB.
export function useBoardSync(boardId: string, initial: BoardObject[]) {
  const [objects, setObjects] = useState<BoardObject[]>(initial);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const lastSeen = useRef<Map<string, BoardObject>>(
    new Map(initial.map((o) => [o.id, o]))
  );
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      return;
    }

    const current = new Map(objects.map((o) => [o.id, o]));
    const tasks: Promise<unknown>[] = [];

    // Creates + updates
    for (const [id, obj] of current) {
      const prev = lastSeen.current.get(id);
      if (!prev) {
        tasks.push(createBoardObjectAction(boardId, obj));
      } else if (prev !== obj) {
        tasks.push(updateBoardObjectAction(boardId, obj));
      }
    }
    // Deletes
    for (const [id] of lastSeen.current) {
      if (!current.has(id)) {
        tasks.push(deleteBoardObjectAction(boardId, id));
      }
    }

    if (tasks.length === 0) return;

    lastSeen.current = current;
    setStatus("saving");
    Promise.all(tasks)
      .then((results) => {
        const failed = results.some(
          (r) => r && typeof r === "object" && "ok" in r && r.ok === false
        );
        setStatus(failed ? "error" : "saved");
      })
      .catch(() => setStatus("error"));
  }, [objects, boardId]);

  // Reset 'saved' về 'idle' sau 1.5s để UI bớt nhiễu.
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

  return { objects, setObjects: updateObjects, status };
}
