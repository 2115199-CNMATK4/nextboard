import Link from "next/link";
import { AuthShell } from "@/components/layout/auth-shell";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <AuthShell
      title="Đăng ký"
      subtitle="Tạo tài khoản NextBoard miễn phí."
      footer={
        <span className="text-zinc-500">
          Đã có tài khoản?{" "}
          <Link href="/login" className="font-medium text-zinc-900 dark:text-zinc-100">
            Đăng nhập
          </Link>
        </span>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
