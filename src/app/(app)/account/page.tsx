import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentAuthUser, getCurrentProfile } from "@/lib/auth/session";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  DisplayNameForm,
  EmailForm,
  PasswordForm,
} from "@/components/account/profile-forms";
import { ThemePicker } from "@/components/account/theme-picker";

export default async function AccountPage() {
  const profile = (await getCurrentProfile())!;
  const authUser = (await getCurrentAuthUser())!;
  const currentEmail = authUser.email ?? profile.email ?? "";

  return (
    <main className="flex flex-1 flex-col px-6 py-10">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 transition-colors hover:bg-black/5 dark:border-zinc-800 dark:hover:bg-white/5"
            aria-label="Quay lại dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
              Tài khoản
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">
              Cài đặt cá nhân
            </h1>
          </div>
        </div>
      </header>

      <div className="mx-auto mt-8 flex w-full max-w-3xl flex-col gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Hồ sơ</CardTitle>
            <CardDescription>
              Tên hiển thị sẽ xuất hiện trong presence và các board bạn tham
              gia.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DisplayNameForm initialName={profile.display_name ?? ""} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email</CardTitle>
            <CardDescription>
              Đổi email cần xác nhận qua link gửi đến địa chỉ mới.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmailForm currentEmail={currentEmail} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mật khẩu</CardTitle>
            <CardDescription>
              Tối thiểu 6 ký tự. Bạn sẽ vẫn được đăng nhập sau khi đổi.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PasswordForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Giao diện</CardTitle>
            <CardDescription>
              &ldquo;Hệ thống&rdquo; sẽ theo thiết lập sáng/tối của thiết bị.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ThemePicker />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
