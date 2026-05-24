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
      className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${COLOR[status]}`}
      aria-live="polite"
      title={LABEL[status]}
    >
      <Icon className={`h-4 w-4 ${spin ? "animate-spin" : ""}`} />
    </span>
  );
}
