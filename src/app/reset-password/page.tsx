import { AuthShell } from "@/components/layout/auth-shell";
import { ResetPasswordForm } from "./reset-password-form";

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Đặt lại mật khẩu"
      subtitle="Nhập mật khẩu mới cho tài khoản của bạn."
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
