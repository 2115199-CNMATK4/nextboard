import Link from "next/link";
import { AuthShell } from "@/components/layout/auth-shell";
import { RegisterForm } from "./register-form";

type SearchParams = Promise<{ next?: string }>;

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { next } = await searchParams;

  return (
    <AuthShell
      title="Đăng ký"
      subtitle="Tạo tài khoản NextBoard miễn phí."
      footer={
        <span className="text-zinc-500">
          Đã có tài khoản?{" "}
          <Link
            href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
            className="font-medium text-zinc-900 dark:text-zinc-100"
          >
            Đăng nhập
          </Link>
        </span>
      }
    >
      <RegisterForm next={next} />
    </AuthShell>
  );
}
