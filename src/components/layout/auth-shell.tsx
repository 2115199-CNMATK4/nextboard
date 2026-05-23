import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <div className={cn("w-full max-w-md", className)}>
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            NextBoard
          </Link>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle ? (
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>
          ) : null}
        </div>
        {children}
        {footer ? <div className="mt-6 text-center text-sm">{footer}</div> : null}
      </div>
    </main>
  );
}
