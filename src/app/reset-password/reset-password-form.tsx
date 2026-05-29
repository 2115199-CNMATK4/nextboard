"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPasswordAction, type ResetFormState } from "@/actions/auth";

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState<ResetFormState, FormData>(
    resetPasswordAction,
    null
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Mật khẩu mới (≥ 6 ký tự)</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirm">Xác nhận mật khẩu</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
        />
      </div>

      {state?.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Đang lưu..." : "Đặt lại mật khẩu"}
      </Button>
    </form>
  );
}
