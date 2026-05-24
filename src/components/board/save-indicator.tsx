"use client";

import { Check, CloudUpload, AlertTriangle, Cloud } from "lucide-react";
import type { SaveStatus } from "@/hooks/use-board-sync";

const ICON: Record<SaveStatus, typeof Cloud> = {
  idle: Cloud,
  saving: CloudUpload,
  saved: Check,
  error: AlertTriangle,
};

const LABEL: Record<SaveStatus, string> = {
  idle: "Đã đồng bộ",
  saving: "Đang lưu...",
  saved: "Đã lưu",
  error: "Lỗi đồng bộ",
};

const COLOR: Record<SaveStatus, string> = {
  idle: "text-zinc-500",
  saving: "text-amber-600 dark:text-amber-300",
  saved: "text-emerald-600 dark:text-emerald-300",
  error: "text-red-600 dark:text-red-300",
};

export function SaveIndicator({ status }: { status: SaveStatus }) {
  const Icon = ICON[status];
  const pulse = status === "saving";
  return (
    <span
      className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${COLOR[status]}`}
      aria-live="polite"
      title={LABEL[status]}
    >
      <Icon className={`h-4 w-4 ${pulse ? "animate-pulse" : ""}`} />
    </span>
  );
}
