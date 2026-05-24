"use client";

import { useCallback, useEffect, useRef } from "react";
import { acquireLockAction, releaseLockAction } from "@/actions/object-lock";
import { realtimeConfig } from "@/lib/realtime/config";

// =====================================================================
// useObjectLock — acquire/release lock cho board objects.
// Lock tự refresh mỗi lockRefreshMs để không expire khi đang thao tác.
// Cleanup khi unmount: release tất cả lock đang giữ.
// =====================================================================
export function useObjectLock(boardId: string, deviceId: string | null) {
  // objectId → refresh timer
  const timers = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  const acquire = useCallback(
    async (objectId: string): Promise<boolean> => {
      if (!deviceId) return false;
      const result = await acquireLockAction(objectId, boardId, deviceId);
      if (!result.ok) return false;

      // Clear stale timer nếu có (re-acquire)
      const stale = timers.current.get(objectId);
      if (stale) clearInterval(stale);

      // Refresh lock định kỳ để không expire khi kéo dài
      const timer = setInterval(async () => {
        const r = await acquireLockAction(objectId, boardId, deviceId);
        if (!r.ok) {
          clearInterval(timers.current.get(objectId));
          timers.current.delete(objectId);
        }
      }, realtimeConfig.lockRefreshMs);

      timers.current.set(objectId, timer);
      return true;
    },
    [boardId, deviceId]
  );

  const release = useCallback(
    async (objectId: string): Promise<void> => {
      if (!deviceId) return;
      const timer = timers.current.get(objectId);
      if (timer) {
        clearInterval(timer);
        timers.current.delete(objectId);
      }
      await releaseLockAction(objectId, deviceId);
    },
    [deviceId]
  );

  // Release tất cả lock khi unmount (navigate away giữa chừng drag)
  useEffect(() => {
    const currentDeviceId = deviceId;
    return () => {
      for (const [objectId, timer] of timers.current) {
        clearInterval(timer);
        if (currentDeviceId) void releaseLockAction(objectId, currentDeviceId);
      }
      timers.current.clear();
    };
  }, [deviceId]);

  return { acquire, release };
}
