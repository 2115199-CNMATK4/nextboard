"use client";

import { Wifi, WifiOff, Loader2 } from "lucide-react";
import type { ChannelStatus } from "@/hooks/use-board-realtime";

const ICON: Record<ChannelStatus, typeof Wifi> = {
  connecting: Loader2,
  connected: Wifi,
  reconnecting: Loader2,
  error: WifiOff,
  closed: WifiOff,
};

const LABEL: Record<ChannelStatus, string> = {
  connecting: "Đang kết nối",
  connected: "Đã kết nối",
  reconnecting: "Đang kết nối lại",
  error: "Mất kết nối",
  closed: "Đã ngắt",
};

const COLOR: Record<ChannelStatus, string> = {
  connecting: "text-amber-600 dark:text-amber-300",
  connected: "text-emerald-600 dark:text-emerald-300",
  reconnecting: "text-amber-600 dark:text-amber-300",
  error: "text-red-600 dark:text-red-300",
  closed: "text-zinc-500",
};

export function ConnectionStatus({ status }: { status: ChannelStatus }) {
  const Icon = ICON[status];
  const spin = status === "connecting" || status === "reconnecting";
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs ${COLOR[status]}`}
      aria-live="polite"
      title={LABEL[status]}
    >
      <Icon className={`h-3.5 w-3.5 ${spin ? "animate-spin" : ""}`} />
      <span className="hidden sm:inline">{LABEL[status]}</span>
    </span>
  );
}
