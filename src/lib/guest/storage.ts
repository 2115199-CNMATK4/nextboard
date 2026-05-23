// =====================================================================
// Guest board persistence — localStorage adapter.
// MVP dùng localStorage thay vì IndexedDB: payload nhỏ (< vài MB), API
// synchronous, không cần migration phức tạp.
// =====================================================================

import type { BoardObject } from "@/types/database";

const STORAGE_KEY = "nextboard.guest.board.v1";

export interface GuestBoardSnapshot {
  title: string;
  objects: BoardObject[];
  updatedAt: string;
}

function isBrowser() {
  return typeof window !== "undefined";
}

export function loadGuestBoard(): GuestBoardSnapshot | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GuestBoardSnapshot;
    if (!parsed || !Array.isArray(parsed.objects)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveGuestBoard(snapshot: GuestBoardSnapshot) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // QuotaExceeded — bỏ qua, user sẽ thấy thay đổi không persist nhưng
    // còn trong memory state.
  }
}

export function clearGuestBoard() {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* no-op */
  }
}
