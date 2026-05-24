import { listAdminDevices } from "@/lib/queries/admin";
import { deleteDeviceAdminAction } from "@/actions/admin";
import { DeleteButton } from "@/components/admin/delete-button";

export default async function AdminDevicesPage() {
  const devices = await listAdminDevices();

  return (
    <section className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
      <table className="min-w-full text-sm">
        <thead className="bg-zinc-50 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:bg-zinc-900">
          <tr>
            <th className="px-4 py-3">User</th>
            <th className="px-4 py-3">Device</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Last seen</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {devices.map((d) => (
            <tr key={d.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {d.color ? (
                    <span
                      className="h-3 w-3 rounded-full border border-black/10 dark:border-white/10"
                      style={{ backgroundColor: d.color }}
                    />
                  ) : null}
                  <span className="font-medium">
                    {d.user_name ?? d.user_email ?? "—"}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-zinc-500">
                {d.device_name ?? "—"}
              </td>
              <td className="px-4 py-3 text-zinc-500">
                {d.device_type ?? "—"}
              </td>
              <td className="px-4 py-3 text-zinc-500">
                <time dateTime={d.last_seen_at}>
                  {new Date(d.last_seen_at).toLocaleString("vi-VN")}
                </time>
              </td>
              <td className="px-4 py-3 text-right">
                <DeleteButton
                  id={d.id}
                  action={deleteDeviceAdminAction}
                  confirmText="Xóa device"
                />
              </td>
            </tr>
          ))}
          {devices.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                Chưa có device nào.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </section>
  );
}
