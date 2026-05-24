import { getCurrentProfile } from "@/lib/auth/session";
import { listAdminUsers } from "@/lib/queries/admin";
import { UserStatusToggle } from "@/components/admin/user-actions";

export default async function AdminUsersPage() {
  const current = (await getCurrentProfile())!;
  const users = await listAdminUsers();

  return (
    <section className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
      <table className="min-w-full text-sm">
        <thead className="bg-zinc-50 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:bg-zinc-900">
          <tr>
            <th className="px-4 py-3">Tên</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Trạng thái</th>
            <th className="px-4 py-3 text-right">Boards</th>
            <th className="px-4 py-3 text-right">Devices</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {users.map((u) => (
            <tr key={u.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {u.display_name ?? "—"}
                  </span>
                  {u.is_admin ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                      admin
                    </span>
                  ) : null}
                </div>
              </td>
              <td className="px-4 py-3 text-zinc-500">{u.email ?? "—"}</td>
              <td className="px-4 py-3">
                <StatusBadge status={u.status} />
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {u.board_count}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {u.device_count}
              </td>
              <td className="px-4 py-3 text-right">
                <UserStatusToggle
                  userId={u.id}
                  status={u.status}
                  disabled={u.id === current.id}
                />
              </td>
            </tr>
          ))}
          {users.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                Chưa có user nào.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </section>
  );
}

function StatusBadge({ status }: { status: "active" | "disabled" }) {
  const isActive = status === "active";
  return (
    <span
      className={
        isActive
          ? "inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium uppercase text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
          : "inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium uppercase text-red-700 dark:bg-red-900/40 dark:text-red-300"
      }
    >
      {status}
    </span>
  );
}
