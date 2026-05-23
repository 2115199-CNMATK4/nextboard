"use client";

import { useDevice } from "@/components/layout/device-provider";
import { Monitor, Smartphone, Tablet, HelpCircle } from "lucide-react";

export function DeviceBadge() {
  const { device } = useDevice();

  if (!device) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 px-2.5 py-1 text-xs text-zinc-500 dark:border-zinc-800">
        <HelpCircle className="h-3.5 w-3.5" /> Đang gắn device…
      </span>
    );
  }

  const Icon =
    device.device_type === "mobile"
      ? Smartphone
      : device.device_type === "tablet"
        ? Tablet
        : Monitor;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 px-2.5 py-1 text-xs text-zinc-700 dark:border-zinc-800 dark:text-zinc-200"
      title={`Device profile ID: ${device.id}`}
    >
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ background: device.color ?? "#737373" }}
        aria-hidden
      />
      <Icon className="h-3.5 w-3.5" />
      {device.device_name ?? "Thiết bị này"}
    </span>
  );
}
