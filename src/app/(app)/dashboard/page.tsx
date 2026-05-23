import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth/session";
import { LogoutButton } from "@/components/layout/logout-button";
import { DeviceBadge } from "@/components/layout/device-badge";

type SearchParams = Promise<{ guest_saved?: string }>;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  // requireProfile() đã chạy ở (app)/layout.tsx → page chỉ cần đọc.
  const profile = (await getCurrentProfile())!;
  const { guest_saved } = await searchParams;

  return (
    <main className="flex flex-1 flex-col px-6 py-10">
      <header className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-500">
            NextBoard
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Xin chào {profile.display_name ?? profile.email}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <DeviceBadge />
          <LogoutButton />
        </div>
      </header>

      {guest_saved ? (
        <div className="mx-auto mt-6 w-full max-w-5xl">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
            Đã lưu guest board ({guest_saved}) vào tài khoản của bạn. Vào{" "}
            <Link
              href={`/boards/${guest_saved}`}
              className="font-medium underline-offset-4 hover:underline"
            >
              board ngay
            </Link>
            .
          </div>
        </div>
      ) : null}

      <section className="mx-auto mt-10 w-full max-w-5xl">
        <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 p-10 text-center">
          <p className="text-sm text-zinc-500">
            Dashboard CRUD board sẽ được triển khai ở Phase 6.
          </p>
        </div>
      </section>
    </main>
  );
}
