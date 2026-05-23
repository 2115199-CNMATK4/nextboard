import { requireProfile } from "@/lib/auth/session";
import { LogoutButton } from "@/components/layout/logout-button";

export default async function DashboardPage() {
  const profile = await requireProfile();

  return (
    <main className="flex flex-1 flex-col px-6 py-10">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between">
        <div>
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-500">
            NextBoard
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Xin chào {profile.display_name ?? profile.email}
          </h1>
        </div>
        <LogoutButton />
      </header>

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
