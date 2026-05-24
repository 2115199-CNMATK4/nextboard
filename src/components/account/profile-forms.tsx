"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  updateDisplayNameAction,
  updateEmailAction,
  updatePasswordAction,
  type ProfileFormState,
} from "@/actions/profile";

function FormMessage({ state }: { state: ProfileFormState }) {
  if (!state) return null;
  if (state.error)
    return (
      <p className="text-xs text-red-600 dark:text-red-300">{state.error}</p>
    );
  if (state.success)
    return (
      <p className="text-xs text-emerald-600 dark:text-emerald-300">
        {state.success}
      </p>
    );
  return null;
}

export function DisplayNameForm({ initialName }: { initialName: string }) {
  const [state, formAction, pending] = useActionState<
    ProfileFormState,
    FormData
  >(updateDisplayNameAction, null);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="display_name">Tên hiển thị</Label>
        <Input
          id="display_name"
          name="display_name"
          defaultValue={initialName}
          maxLength={80}
          required
        />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Đang lưu..." : "Lưu"}
        </Button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function EmailForm({ currentEmail }: { currentEmail: string }) {
  const [state, formAction, pending] = useActionState<
    ProfileFormState,
    FormData
  >(updateEmailAction, null);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email mới</Label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={currentEmail}
          required
        />
        <p className="text-xs text-zinc-500">
          Email hiện tại: <span className="font-medium">{currentEmail}</span>
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Đang gửi..." : "Đổi email"}
        </Button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, formAction, pending] = useActionState<
    ProfileFormState,
    FormData
  >(updatePasswordAction, null);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Mật khẩu mới</Label>
        <Input
          id="password"
          name="password"
          type="password"
          minLength={6}
          required
          autoComplete="new-password"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirm">Nhập lại mật khẩu</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          minLength={6}
          required
          autoComplete="new-password"
        />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Đang lưu..." : "Đổi mật khẩu"}
        </Button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
