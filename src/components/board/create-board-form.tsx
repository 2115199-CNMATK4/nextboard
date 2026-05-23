"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createBoardAction, type CreateBoardState } from "@/actions/boards";

export function CreateBoardForm() {
  const [state, action, pending] = useActionState<CreateBoardState, FormData>(
    createBoardAction,
    null
  );

  return (
    <form action={action} className="flex flex-col gap-2 sm:flex-row sm:items-start">
      <div className="flex-1">
        <Input
          name="title"
          placeholder="Tên board mới..."
          defaultValue={state?.title ?? ""}
          maxLength={120}
          required
        />
        {state?.error ? (
          <p className="mt-1 text-xs text-red-600" role="alert">
            {state.error}
          </p>
        ) : null}
      </div>
      <Button type="submit" disabled={pending}>
        <Plus className="h-4 w-4" />
        {pending ? "Đang tạo..." : "Tạo board"}
      </Button>
    </form>
  );
}
