// Next.js 16: middleware đổi tên thành Proxy. File phải đặt ở root
// (cùng cấp với src/) — không phải trong src/.
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Route công khai (không cần đăng nhập).
const PUBLIC_PATHS = ["/", "/login", "/register", "/guest", "/disabled"];

// Route auth — đã đăng nhập thì redirect khỏi đây.
const AUTH_PATHS = ["/login", "/register"];

function startsWithAny(pathname: string, list: string[]) {
  return list.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

export async function proxy(request: NextRequest) {
  const { user, response } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Đã đăng nhập → không cho vào /login, /register.
  if (user && startsWithAny(pathname, AUTH_PATHS)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Chưa đăng nhập → chặn route protected.
  if (!user && !startsWithAny(pathname, PUBLIC_PATHS)) {
    const url = new URL("/login", request.url);
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Match mọi route trừ static assets + Next internal.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
