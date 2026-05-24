"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  resetExpiredLocksAction,
  resetLocksByBoardAction,
} from "@/actions/admin";

function Message({
  result,
}: {
  result: { ok: boolean; message?: string; error?: string } | null;
}) {
  if (!result) return null;
  if (result.ok) {
    return (
      <p className="text-xs text-emerald-600 dark:text-emerald-300">
        {result.message}
      </p>
    );
  }
  return (
    <p className="text-xs text-red-600 dark:text-red-300">{result.error}</p>
  );
}

export function ResetExpiredLocksButton() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<
    { ok: true; message?: string } | { ok: false; error: string } | null
  >(null);

  function onClick() {
    startTransition(async () => {
      setResult(await resetExpiredLocksAction());
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" onClick={onClick} disabled={pending}>
        {pending ? "Đang chạy..." : "Reset locks đã hết hạn"}
      </Button>
      <Message result={result} />
    </div>
  );
}

export function ResetLocksByBoardForm() {
  const [pending, startTransition] = useTransition();
  const [boardId, setBoardId] = useState("");
  const [result, setResult] = useState<
    { ok: true; message?: string } | { ok: false; error: string } | null
  >(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      setResult(await resetLocksByBoardAction(boardId.trim()));
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <Input
        type="text"
        placeholder="Board ID (UUID)"
        value={boardId}
        onChange={(e) => setBoardId(e.target.value)}
      />
      <Button type="submit" disabled={pending || !boardId.trim()}>
        {pending ? "Đang chạy..." : "Reset locks của board"}
      </Button>
      <Message result={result} />
    </form>
  );
}
