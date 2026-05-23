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
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs ${COLOR[status]}`}
      aria-live="polite"
    >
      <Icon className="h-3.5 w-3.5" />
      {LABEL[status]}
    </span>
  );
}
