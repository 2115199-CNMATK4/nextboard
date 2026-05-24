"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  updateRealtimeSettingsAction,
  type AdminActionResult,
} from "@/actions/admin";
import type { RealtimeConfigSettings } from "@/lib/queries/admin";

interface FieldDef {
  key: keyof RealtimeConfigSettings;
  label: string;
  hint: string;
  min: number;
  max: number;
}

const FIELDS: FieldDef[] = [
  {
    key: "drawingBatchIntervalMs",
    label: "drawingBatchIntervalMs",
    hint: "Khoảng thời gian gộp điểm freehand trước khi broadcast (50–200 ms)",
    min: 50,
    max: 200,
  },
  {
    key: "cursorIntervalMs",
    label: "cursorIntervalMs",
    hint: "Tần suất broadcast vị trí cursor (100–500 ms)",
    min: 100,
    max: 500,
  },
  {
    key: "objectMoveIntervalMs",
    label: "objectMoveIntervalMs",
    hint: "Throttle object move broadcast (50–200 ms)",
    min: 50,
    max: 200,
  },
  {
    key: "saveDebounceMs",
    label: "saveDebounceMs",
    hint: "Debounce trước khi gọi save action (300–2000 ms)",
    min: 300,
    max: 2000,
  },
  {
    key: "lockDurationMs",
    label: "lockDurationMs",
    hint: "Thời hạn lock object (3000–15000 ms)",
    min: 3000,
    max: 15000,
  },
  {
    key: "lockRefreshMs",
    label: "lockRefreshMs",
    hint: "Tần suất refresh lock (1000–5000 ms)",
    min: 1000,
    max: 5000,
  },
];

export function RealtimeSettingsForm({
  initial,
}: {
  initial: RealtimeConfigSettings;
}) {
  const [state, formAction, pending] = useActionState<
    AdminActionResult | null,
    FormData
  >(updateRealtimeSettingsAction, null);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        {FIELDS.map(({ key, label, hint, min, max }) => (
          <div key={key} className="flex flex-col gap-1.5">
            <Label htmlFor={key}>{label}</Label>
            <Input
              id={key}
              name={key}
              type="number"
              defaultValue={initial[key]}
              min={min}
              max={max}
              required
            />
            <p className="text-xs text-zinc-500">{hint}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Đang lưu..." : "Lưu cấu hình"}
        </Button>
        {state?.ok ? (
          <p className="text-xs text-emerald-600 dark:text-emerald-300">
            {state.message}
          </p>
        ) : null}
        {state && state.ok === false ? (
          <p className="text-xs text-red-600 dark:text-red-300">
            {state.error}
          </p>
        ) : null}
      </div>
    </form>
  );
}
