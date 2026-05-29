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

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("Link không hợp lệ.")}`
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(
        "Link đã hết hạn hoặc không hợp lệ."
      )}`
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
