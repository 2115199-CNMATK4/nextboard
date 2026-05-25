"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BoardObject } from "@/types/database";
import {
  loadGuestBoard,
  saveGuestBoard,
  type GuestBoardSnapshot,
} from "@/lib/guest/storage";

export interface UseGuestBoard {
  title: string;
  setTitle: (t: string) => void;
  objects: BoardObject[];
  setObjects: (next: BoardObject[] | ((prev: BoardObject[]) => BoardObject[])) => void;
  hydrated: boolean;
  resetGuest: () => void;
}

const DEFAULT_TITLE = "Board 1";

export function useGuestBoard(): UseGuestBoard {
  const [hydrated, setHydrated] = useState(false);
  const [title, setTitleState] = useState(DEFAULT_TITLE);
  const [objects, setObjectsState] = useState<BoardObject[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate từ localStorage một lần (sau khi mount).
  useEffect(() => {
    const snapshot = loadGuestBoard();
    if (snapshot) {
      setTitleState(snapshot.title || DEFAULT_TITLE);
      setObjectsState(snapshot.objects ?? []);
    }
    setHydrated(true);
  }, []);

  // Debounce persist 300ms.
  useEffect(() => {
    if (!hydrated) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const snap: GuestBoardSnapshot = {
        title,
        objects,
        updatedAt: new Date().toISOString(),
      };
      saveGuestBoard(snap);
    }, 300);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [title, objects, hydrated]);

  const setObjects = useCallback<UseGuestBoard["setObjects"]>((next) => {
    setObjectsState((prev) =>
      typeof next === "function"
        ? (next as (p: BoardObject[]) => BoardObject[])(prev)
        : next
    );
  }, []);

  const setTitle = useCallback((t: string) => setTitleState(t), []);

  const resetGuest = useCallback(() => {
    setTitleState(DEFAULT_TITLE);
    setObjectsState([]);
  }, []);

  return { title, setTitle, objects, setObjects, hydrated, resetGuest };
}
