"use client";

import { useState } from "react";
import { Users, ChevronRight } from "lucide-react";
import type { BoardPresenceState } from "@/lib/realtime/types";

function initials(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (a + b).toUpperCase() || a.toUpperCase();
}

export function PresencePanel({
  members,
  myDeviceId,
}: {
  members: BoardPresenceState[];
  myDeviceId?: string;
}) {
  const [open, setOpen] = useState(false);

  // Self first, others after
  const ordered = [...members].sort((a, b) => {
    const aSelf = a.device_profile_id === myDeviceId ? 0 : 1;
    const bSelf = b.device_profile_id === myDeviceId ? 0 : 1;
    return aSelf - bSelf;
  });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="glass-panel pointer-events-auto flex items-center gap-1.5 px-3 py-2 text-xs font-semibold hover:bg-white/70 dark:hover:bg-zinc-800/70"
        title="Hiện danh sách"
      >
        <Users className="h-4 w-4" />
        {ordered.length}
      </button>
    );
  }

  return (
    <div className="glass-panel flex w-[200px] max-w-[80vw] flex-col gap-2 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
          <Users className="h-3.5 w-3.5" />
          Đang online · {ordered.length}
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-500 hover:bg-black/10 dark:hover:bg-white/10"
          title="Thu gọn"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <ul className="flex max-h-[280px] flex-col gap-1.5 overflow-y-auto">
        {ordered.length === 0 ? (
          <li className="text-xs text-zinc-500">Chỉ có bạn</li>
        ) : (
          ordered.map((m) => {
            const isMe = m.device_profile_id === myDeviceId;
            const color = m.color ?? "#3b82f6";
            return (
              <li
                key={m.device_profile_id}
                className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-black/5 dark:hover:bg-white/5"
              >
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ring-2 ring-white dark:ring-zinc-900"
                  style={{ backgroundColor: color }}
                >
                  {initials(m.user_name)}
                </span>
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate text-xs font-medium">
                    {m.user_name ?? "Người dùng"}
                    {isMe && (
                      <span className="ml-1 text-[10px] font-normal text-zinc-500">
                        (bạn)
                      </span>
                    )}
                  </span>
                  {m.device_name && (
                    <span className="truncate text-[10px] text-zinc-500">
                      {m.device_name}
                    </span>
                  )}
                </span>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
