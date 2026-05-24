"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  LayoutGrid,
  Smartphone,
  Wrench,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Tab = {
  href: string;
  label: string;
  Icon: typeof LayoutDashboard;
  exact?: boolean;
};

const TABS: Tab[] = [
  { href: "/admin", label: "Tổng quan", Icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Users", Icon: Users },
  { href: "/admin/boards", label: "Boards", Icon: LayoutGrid },
  { href: "/admin/devices", label: "Devices", Icon: Smartphone },
  { href: "/admin/maintenance", label: "Bảo trì", Icon: Wrench },
  { href: "/admin/settings", label: "Cấu hình", Icon: Settings },
];

export function AdminTabs() {
  const pathname = usePathname();
  return (
    <div className="glass-panel flex flex-row gap-0.5 overflow-x-auto p-1">
      {TABS.map(({ href, label, Icon, exact }) => {
        const active = exact
          ? pathname === href
          : pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm transition-colors",
              active
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "text-zinc-600 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/10"
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </Link>
        );
      })}
    </div>
  );
}
