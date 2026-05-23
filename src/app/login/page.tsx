import Link from "next/link";
import { AuthShell } from "@/components/layout/auth-shell";
import { LoginForm } from "./login-form";

type SearchParams = Promise<{ registered?: string; redirect?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { registered } = await searchParams;

  return (
    <AuthShell
      title="Đăng nhập"
      subtitle="Vào NextBoard để truy cập các bảng cộng tác của bạn."
      footer={
        <span className="text-zinc-500">
          Chưa có tài khoản?{" "}
          <Link href="/register" className="font-medium text-zinc-900 dark:text-zinc-100">
            Đăng ký
          </Link>
        </span>
      }
    >
      {registered ? (
        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          Đăng ký thành công. Vui lòng xác nhận email rồi đăng nhập.
        </p>
      ) : null}
      <LoginForm />
    </AuthShell>
  );
}
