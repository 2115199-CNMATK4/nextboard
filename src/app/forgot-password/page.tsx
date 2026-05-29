import Link from "next/link";
import { AuthShell } from "@/components/layout/auth-shell";
import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Quên mật khẩu"
      subtitle="Một link để đặt lại mật khẩu sẽ được gửi đến email của bạn."
      footer={
        <span className="text-zinc-500">
          Đã nhớ mật khẩu?{" "}
          <Link
            href="/login"
            className="font-medium text-zinc-900 dark:text-zinc-100"
          >
            Đăng nhập
          </Link>
        </span>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
