"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPasswordAction, type ResetFormState } from "@/actions/auth";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<ResetFormState, FormData>(
    forgotPasswordAction,
    null
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={state?.email ?? ""}
          required
        />
      </div>

      {state?.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.success ? (
        <p
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
          role="status"
        >
          {state.success}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Đang gửi..." : "Gửi link đặt lại mật khẩu"}
      </Button>
    </form>
  );
}
