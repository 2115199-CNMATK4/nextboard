import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6">
      <div className="w-full max-w-3xl text-center flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <span className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-500">
            NextBoard
          </span>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">
            Realtime Collaborative Whiteboard
          </h1>
          <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 mx-auto max-w-xl">
            Ghi lại các ý tưởng cùng nhau, thời gian thực, hỗ trợ đa thiết bị
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/login">
            <Button size="lg" className="w-full sm:w-[160px]">
              Đăng nhập
            </Button>
          </Link>
          <Link href="/register">
            <Button size="lg" variant="outline" className="w-full sm:w-[160px]">
              Đăng ký
            </Button>
          </Link>
          <Link href="/guest">
            <Button size="lg" variant="ghost" className="w-full sm:w-[160px]">
              Trải nghiệm ngay
            </Button>
          </Link>
        </div>

        <p className="text-xs text-zinc-500">
          Bạn sẽ cần tài khoản để lưu board.
        </p>
      </div>
    </main>
  );
}
