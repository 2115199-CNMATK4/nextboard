"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type DeleteAction = (id: string) => Promise<
  { ok: true; message?: string } | { ok: false; error: string }
>;

export function DeleteButton({
  id,
  action,
  confirmText,
  label = "Xóa",
}: {
  id: string;
  action: DeleteAction;
  confirmText: string;
  label?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  function onClick() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setError(null);
    startTransition(async () => {
      const r = await action(id);
      if (!r.ok) {
        setError(r.error);
        setConfirming(false);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        onBlur={() => setConfirming(false)}
        disabled={pending}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs transition-colors",
          "disabled:cursor-not-allowed disabled:opacity-50",
          confirming
            ? "border-red-600 bg-red-600 text-white hover:bg-red-700"
            : "border-red-300 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-900/20"
        )}
        title={confirming ? confirmText : label}
      >
        <Trash2 className="h-3.5 w-3.5" />
        {pending ? "..." : confirming ? "Xác nhận" : label}
      </button>
      {error ? (
        <span className="text-[10px] text-red-600 dark:text-red-300">
          {error}
        </span>
      ) : null}
    </div>
  );
}
