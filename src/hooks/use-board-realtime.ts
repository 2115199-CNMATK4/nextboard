"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { realtimeConfig } from "@/lib/realtime/config";
import type {
  BoardPresenceState,
  CursorUpdatePayload,
  ObjectCreatePayload,
  ObjectDeletePayload,
  ObjectUpdatePayload,
  RemoteCursor,
  RemoteStroke,
  StrokeEndPayload,
  StrokePointsPayload,
  StrokeStartPayload,
} from "@/lib/realtime/types";
import type { BoardObject, DeviceProfile, Profile } from "@/types/database";

interface RealtimeOptions {
  onObjectCreate: (obj: BoardObject) => void;
  onObjectUpdate: (obj: BoardObject) => void;
  onObjectDelete: (id: string) => void;
}

// =====================================================================
// useBoardRealtime — subscribe channel `board:{boardId}` và quản lý:
//   • Broadcast object:create/update/delete (emit + receive).
//   • Broadcast cursor:update (throttled).
//   • Presence track (device_profile_id, user, device, color).
//   • Stroke batch: stroke:start / stroke:points / stroke:end (Phase 10).
//
// Self-echo được lọc bằng field `_from` trong mỗi payload.
// =====================================================================
export function useBoardRealtime(
  boardId: string,
  deviceProfile: DeviceProfile | null,
  profile: Profile,
  options: RealtimeOptions
) {
  const [remoteCursors, setRemoteCursors] = useState<RemoteCursor[]>([]);
  const [presence, setPresence] = useState<BoardPresenceState[]>([]);
  // Map strokeId → RemoteStroke cho O(1) update
  const [remoteStrokesMap, setRemoteStrokesMap] = useState<Map<string, RemoteStroke>>(new Map());

  const channelRef = useRef<RealtimeChannel | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const lastCursorTs = useRef(0);

  const selfRef = useRef({
    deviceId: deviceProfile?.id ?? "",
    displayName: profile.display_name,
    color: deviceProfile?.color ?? null,
  });
  selfRef.current = {
    deviceId: deviceProfile?.id ?? "",
    displayName: profile.display_name,
    color: deviceProfile?.color ?? null,
  };

  useEffect(() => {
    if (!deviceProfile) return;

    const supabase = createClient();
    const myId = deviceProfile.id;

    const channel = supabase.channel(`board:${boardId}`, {
      config: { presence: { key: myId } },
    });

    channel
      // --- Object events ---
      .on("broadcast", { event: "object:create" }, ({ payload }: { payload: ObjectCreatePayload }) => {
        if (!payload || payload._from === myId) return;
        optionsRef.current.onObjectCreate(payload.object);
      })
      .on("broadcast", { event: "object:update" }, ({ payload }: { payload: ObjectUpdatePayload }) => {
        if (!payload || payload._from === myId) return;
        optionsRef.current.onObjectUpdate(payload.object);
      })
      .on("broadcast", { event: "object:delete" }, ({ payload }: { payload: ObjectDeletePayload }) => {
        if (!payload || payload._from === myId) return;
        optionsRef.current.onObjectDelete(payload.id);
      })
      // --- Cursor ---
      .on("broadcast", { event: "cursor:update" }, ({ payload }: { payload: CursorUpdatePayload }) => {
        if (!payload || payload._from === myId) return;
        setRemoteCursors((prev) => {
          const filtered = prev.filter((c) => c.deviceId !== payload._from);
          return [
            ...filtered,
            {
              deviceId: payload._from,
              user_name: payload.user_name,
              color: payload.color ?? "#3b82f6",
              x: payload.x,
              y: payload.y,
            },
          ];
        });
      })
      // --- Stroke batch (Phase 10) ---
      .on("broadcast", { event: "stroke:start" }, ({ payload }: { payload: StrokeStartPayload }) => {
        if (!payload || payload._from === myId) return;
        setRemoteStrokesMap((prev) => {
          const next = new Map(prev);
          next.set(payload.strokeId, {
            strokeId: payload.strokeId,
            deviceId: payload._from,
            points: [[payload.x, payload.y]],
            stroke: payload.stroke,
            strokeWidth: payload.strokeWidth,
          });
          return next;
        });
      })
      .on("broadcast", { event: "stroke:points" }, ({ payload }: { payload: StrokePointsPayload }) => {
        if (!payload || payload._from === myId) return;
        setRemoteStrokesMap((prev) => {
          const existing = prev.get(payload.strokeId);
          if (!existing) return prev;
          const next = new Map(prev);
          next.set(payload.strokeId, {
            ...existing,
            points: [...existing.points, ...payload.points],
          });
          return next;
        });
      })
      .on("broadcast", { event: "stroke:end" }, ({ payload }: { payload: StrokeEndPayload }) => {
        if (!payload || payload._from === myId) return;
        // Xóa remote draft, thêm object hoàn chỉnh
        setRemoteStrokesMap((prev) => {
          const next = new Map(prev);
          next.delete(payload.strokeId);
          return next;
        });
        optionsRef.current.onObjectCreate(payload.object);
      })
      // --- Presence ---
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<BoardPresenceState>();
        const all = Object.values(state).flat();
        setPresence(all);
        const presentIds = new Set(all.map((p) => p.device_profile_id));
        setRemoteCursors((prev) => prev.filter((c) => presentIds.has(c.deviceId)));
      })
      .on("presence", { event: "leave" }, ({ leftPresences }: { leftPresences: BoardPresenceState[] }) => {
        const leftIds = new Set(leftPresences.map((p) => p.device_profile_id));
        setPresence((prev) => prev.filter((p) => !leftIds.has(p.device_profile_id)));
        setRemoteCursors((prev) => prev.filter((c) => !leftIds.has(c.deviceId)));
        // Xóa stroke draft của device đã rời
        setRemoteStrokesMap((prev) => {
          const next = new Map(prev);
          for (const [id, rs] of prev) {
            if (leftIds.has(rs.deviceId)) next.delete(id);
          }
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status !== "SUBSCRIBED") return;
        await channel.track({
          device_profile_id: deviceProfile.id,
          user_name: profile.display_name,
          device_name: deviceProfile.device_name,
          color: deviceProfile.color,
        } satisfies BoardPresenceState);
      });

    channelRef.current = channel;

    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [boardId, deviceProfile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Broadcast helpers (tất cả stable, dùng selfRef) ---

  const broadcastObjectCreate = useCallback((obj: BoardObject) => {
    channelRef.current?.send({
      type: "broadcast",
      event: "object:create",
      payload: { _from: selfRef.current.deviceId, object: obj } satisfies ObjectCreatePayload,
    });
  }, []);

  const broadcastObjectUpdate = useCallback((obj: BoardObject) => {
    channelRef.current?.send({
      type: "broadcast",
      event: "object:update",
      payload: { _from: selfRef.current.deviceId, object: obj } satisfies ObjectUpdatePayload,
    });
  }, []);

  const broadcastObjectDelete = useCallback((id: string) => {
    channelRef.current?.send({
      type: "broadcast",
      event: "object:delete",
      payload: { _from: selfRef.current.deviceId, id } satisfies ObjectDeletePayload,
    });
  }, []);

  const broadcastCursor = useCallback((x: number, y: number) => {
    const now = Date.now();
    if (now - lastCursorTs.current < realtimeConfig.cursorIntervalMs) return;
    lastCursorTs.current = now;
    channelRef.current?.send({
      type: "broadcast",
      event: "cursor:update",
      payload: {
        _from: selfRef.current.deviceId,
        user_name: selfRef.current.displayName,
        color: selfRef.current.color,
        x,
        y,
      } satisfies CursorUpdatePayload,
    });
  }, []);

  const broadcastStrokeStart = useCallback(
    (strokeId: string, x: number, y: number, stroke: string, strokeWidth: number) => {
      channelRef.current?.send({
        type: "broadcast",
        event: "stroke:start",
        payload: { _from: selfRef.current.deviceId, strokeId, x, y, stroke, strokeWidth } satisfies StrokeStartPayload,
      });
    },
    []
  );

  const broadcastStrokePoints = useCallback((strokeId: string, points: [number, number][]) => {
    channelRef.current?.send({
      type: "broadcast",
      event: "stroke:points",
      payload: { _from: selfRef.current.deviceId, strokeId, points } satisfies StrokePointsPayload,
    });
  }, []);

  const broadcastStrokeEnd = useCallback((strokeId: string, obj: BoardObject) => {
    channelRef.current?.send({
      type: "broadcast",
      event: "stroke:end",
      payload: { _from: selfRef.current.deviceId, strokeId, object: obj } satisfies StrokeEndPayload,
    });
  }, []);

  return {
    remoteCursors,
    remoteStrokes: [...remoteStrokesMap.values()],
    presence,
    broadcastObjectCreate,
    broadcastObjectUpdate,
    broadcastObjectDelete,
    broadcastCursor,
    broadcastStrokeStart,
    broadcastStrokePoints,
    broadcastStrokeEnd,
  };
}
