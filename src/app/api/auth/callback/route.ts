import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Route handler đổi `code` (PKCE) trong link email lấy session.
// Dùng chung cho flow đặt lại mật khẩu (resetPasswordForEmail) và bất kỳ
// magic link nào khác. Sau khi đổi xong → chuyển tiếp tới `next`.
function safeNext(value: string | null): string {
  if (!value) return "/dashboard";
  if (!value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

// Base URL công khai để dựng redirect. KHÔNG dùng request.nextUrl.origin trực
// tiếp — sau reverse proxy nó là host nội bộ (vd 0.0.0.0:3000) nên redirect sẽ
// trỏ về địa chỉ nội bộ. Ưu tiên NEXT_PUBLIC_SITE_URL, fallback X-Forwarded-*.
function resolveBaseUrl(request: NextRequest): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");

  const proto =
    request.headers.get("x-forwarded-proto") ??
    request.nextUrl.protocol.replace(":", "");
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host) return `${proto}://${host}`;

  return request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
  const base = resolveBaseUrl(request);
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNext(request.nextUrl.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(
      `${base}/login?error=${encodeURIComponent("Link không hợp lệ.")}`
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${base}/login?error=${encodeURIComponent(
        "Link đã hết hạn hoặc không hợp lệ."
      )}`
    );
  }

  return NextResponse.redirect(`${base}${next}`);
}
