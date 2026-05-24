import Link from "next/link";
import { listAdminBoards } from "@/lib/queries/admin";
import { deleteBoardAdminAction } from "@/actions/admin";
import { DeleteButton } from "@/components/admin/delete-button";

export default async function AdminBoardsPage() {
  const boards = await listAdminBoards();

  return (
    <section className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
      <table className="min-w-full text-sm">
        <thead className="bg-zinc-50 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:bg-zinc-900">
          <tr>
            <th className="px-4 py-3">Title</th>
            <th className="px-4 py-3">Owner</th>
            <th className="px-4 py-3 text-right">Objects</th>
            <th className="px-4 py-3 text-right">Members</th>
            <th className="px-4 py-3">Updated</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {boards.map((b) => (
            <tr key={b.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
              <td className="px-4 py-3">
                <Link
                  href={`/boards/${b.id}`}
                  className="font-medium hover:underline"
                >
                  {b.title}
                </Link>
              </td>
              <td className="px-4 py-3 text-zinc-500">
                {b.owner_name ?? b.owner_email ?? "—"}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {b.object_count}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {b.member_count}
              </td>
              <td className="px-4 py-3 text-zinc-500">
                {new Date(b.updated_at).toLocaleString("vi-VN")}
              </td>
              <td className="px-4 py-3 text-right">
                <DeleteButton
                  id={b.id}
                  action={deleteBoardAdminAction}
                  confirmText="Xóa vĩnh viễn (cascade)"
                />
              </td>
            </tr>
          ))}
          {boards.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                Chưa có board nào.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </section>
  );
}
