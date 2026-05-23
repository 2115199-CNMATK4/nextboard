import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/session";
import { getBoardForUser } from "@/lib/queries/boards";

type Params = Promise<{ boardId: string }>;

export default async function BoardPage({ params }: { params: Params }) {
  const { boardId } = await params;
  const profile = (await getCurrentProfile())!;
  const board = await getBoardForUser(boardId, profile.id);
  if (!board) notFound();

  return (
    <main className="flex flex-1 flex-col px-6 py-10">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between">
        <div>
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-500">
            <Link href="/dashboard" className="hover:text-zinc-700 dark:hover:text-zinc-300">
              Dashboard
            </Link>{" "}
            / Board
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">{board.title}</h1>
          <p className="mt-1 text-xs text-zinc-500">
            Vai trò: <strong>{board.role}</strong>
          </p>
        </div>
      </header>

      <section className="mx-auto mt-10 w-full max-w-5xl">
        <div className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500 dark:border-zinc-800">
          Canvas board sẽ được triển khai ở Phase 7.
        </div>
      </section>
    </main>
  );
}
