import { Users, LayoutGrid, Smartphone, Shapes } from "lucide-react";
import { getAdminCounts } from "@/lib/queries/admin";

export default async function AdminOverviewPage() {
  const c = await getAdminCounts();
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Users" value={c.users} Icon={Users} />
      <StatCard label="Boards" value={c.boards} Icon={LayoutGrid} />
      <StatCard label="Devices" value={c.devices} Icon={Smartphone} />
      <StatCard label="Objects" value={c.objects} Icon={Shapes} />
    </section>
  );
}

function StatCard({
  label,
  value,
  Icon,
}: {
  label: string;
  value: number;
  Icon: typeof Users;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between text-zinc-500">
        <span className="text-sm font-medium uppercase tracking-wider">
          {label}
        </span>
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-3 text-3xl font-semibold tabular-nums">
        {value.toLocaleString("vi-VN")}
      </div>
    </div>
  );
}
