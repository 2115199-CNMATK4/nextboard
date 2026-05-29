import Link from "next/link";
import { AuthShell } from "@/components/layout/auth-shell";
import { LoginForm } from "./login-form";

type SearchParams = Promise<{
  registered?: string;
  reset?: string;
  error?: string;
  next?: string;
}>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { registered, reset, error, next } = await searchParams;

  return (
    <AuthShell
      title="Đăng nhập"
      subtitle="Đăng nhập để truy cập các board của bạn."
      footer={
        <span className="text-zinc-500">
          Chưa có tài khoản?{" "}
          <Link
            href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"}
            className="font-medium text-zinc-900 dark:text-zinc-100"
          >
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
      {reset ? (
        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.
        </p>
      ) : null}
      {error ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      ) : null}
      <LoginForm next={next} />
    </AuthShell>
  );
}
