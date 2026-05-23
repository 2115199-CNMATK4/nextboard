import Link from "next/link";
import { getCurrentAuthUser } from "@/lib/auth/session";
import { GuestBoard } from "./guest-board";

export default async function GuestPage() {
  const user = await getCurrentAuthUser();

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-2 text-sm dark:border-zinc-800">
        <Link href="/" className="font-semibold tracking-tight">
          NextBoard
        </Link>
        <div className="flex items-center gap-3 text-zinc-500">
          {user ? (
            <Link
              href="/dashboard"
              className="font-medium text-zinc-900 dark:text-zinc-100"
            >
              Dashboard →
            </Link>
          ) : (
            <>
              <Link href="/login" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                Đăng nhập
              </Link>
              <Link
                href="/register"
                className="hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Đăng ký
              </Link>
            </>
          )}
        </div>
      </header>

      <GuestBoard isLoggedIn={!!user} />
    </div>
  );
}
