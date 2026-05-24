"use client";

import { useState, useTransition } from "react";
import { Lock, Unlock } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { setUserStatusAction } from "@/actions/admin";
import type { ProfileStatus } from "@/types/database";

export function UserStatusToggle({
  userId,
  status,
  disabled,
}: {
  userId: string;
  status: ProfileStatus;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const nextStatus: ProfileStatus = status === "active" ? "disabled" : "active";

  function onClick() {
    setError(null);
    startTransition(async () => {
      const r = await setUserStatusAction(userId, nextStatus);
      if (!r.ok) setError(r.error);
    });
  }

  const Icon = status === "active" ? Lock : Unlock;
  const label = status === "active" ? "Disable" : "Enable";

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={pending || disabled}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs transition-colors",
          "disabled:cursor-not-allowed disabled:opacity-50",
          status === "active"
            ? "border-red-300 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-900/20"
            : "border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/50 dark:text-emerald-300 dark:hover:bg-emerald-900/20"
        )}
      >
        <Icon className="h-3.5 w-3.5" />
        {pending ? "..." : label}
      </button>
      {error ? (
        <span className="text-[10px] text-red-600 dark:text-red-300">
          {error}
        </span>
      ) : null}
    </div>
  );
}
