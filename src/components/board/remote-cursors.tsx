"use client";

import type { RemoteCursor } from "@/lib/realtime/types";

// Overlay hiển thị cursor của remote users trên canvas.
// Positions là canvas coordinates (pixel offset từ top-left của Stage).
export function RemoteCursors({ cursors }: { cursors: RemoteCursor[] }) {
  if (cursors.length === 0) return null;
  return (
    <>
      {cursors.map((cursor) => (
        <div
          key={cursor.deviceId}
          className="pointer-events-none absolute z-20"
          style={{ left: cursor.x, top: cursor.y }}
        >
          {/* Cursor arrow */}
          <svg
            width="14"
            height="18"
            viewBox="0 0 14 18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0.5 0.5V14L4 10.5L6.5 17L8.5 16L6 9.5H10.5L0.5 0.5Z"
              fill={cursor.color}
              stroke="white"
              strokeWidth="1"
              strokeLinejoin="round"
            />
          </svg>
          {/* Name label */}
          {cursor.user_name && (
            <div
              className="mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold leading-tight text-white"
              style={{ backgroundColor: cursor.color }}
            >
              {cursor.user_name}
            </div>
          )}
        </div>
      ))}
    </>
  );
}
