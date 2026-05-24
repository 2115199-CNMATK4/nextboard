import Link from "next/link";
import { UserCog, ShieldCheck } from "lucide-react";
import { getCurrentProfile, isAdmin } from "@/lib/auth/session";
import { listMyBoards } from "@/lib/queries/boards";
import { LogoutButton } from "@/components/layout/logout-button";
import { DeviceBadge } from "@/components/layout/device-badge";
import { BoardCard } from "@/components/board/board-card";
import { CreateBoardForm } from "@/components/board/create-board-form";

type SearchParams = Promise<{ guest_saved?: string }>;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = (await getCurrentProfile())!;
  const { guest_saved } = await searchParams;
  const [boards, admin] = await Promise.all([
    listMyBoards(profile.id),
    isAdmin(profile.id),
  ]);

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
          {admin ? (
            <Link
              href="/admin"
              title="Admin dashboard"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 text-sm text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/40"
            >
              <ShieldCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          ) : null}
          <Link
            href="/account"
            title="Tài khoản"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 px-3 text-sm transition-colors hover:bg-black/5 dark:border-zinc-800 dark:hover:bg-white/5"
          >
            <UserCog className="h-4 w-4" />
            <span className="hidden sm:inline">Tài khoản</span>
          </Link>
          <LogoutButton />
        </div>
      </header>

      {guest_saved ? (
        <div className="mx-auto mt-6 w-full max-w-5xl">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
            Đã lưu guest board vào tài khoản. Vào{" "}
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
        <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
          Tạo board mới
        </h2>
        <div className="mt-3">
          <CreateBoardForm />
        </div>
      </section>

      <section className="mx-auto mt-10 w-full max-w-5xl">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
            Board của bạn
          </h2>
          <span className="text-xs text-zinc-400">{boards.length} board</span>
        </div>

        {boards.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500 dark:border-zinc-800">
            Bạn chưa có board nào. Tạo board mới ở trên hoặc{" "}
            <Link href="/guest" className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-100">
              thử guest mode
            </Link>
            .
          </div>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {boards.map((b) => (
              <BoardCard
                key={b.id}
                id={b.id}
                title={b.title}
                role={b.role}
                updatedAt={b.updated_at}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
