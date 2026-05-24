import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { AdminTabs } from "@/components/admin/admin-tabs";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Chỉ admin truy cập được; user thường sẽ redirect về /dashboard.
  await requireAdmin();

  return (
    <main className="flex flex-1 flex-col px-6 py-10">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
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
              Admin
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">
              Bảng điều khiển
            </h1>
          </div>
        </div>
      </header>

      <nav className="mx-auto mt-6 w-full max-w-6xl">
        <AdminTabs />
      </nav>

      <div className="mx-auto mt-6 w-full max-w-6xl">{children}</div>
    </main>
  );
}
