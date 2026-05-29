"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = {
  error?: string;
  email?: string;
} | null;

// State cho flow quên/đặt lại mật khẩu — có thêm `success` để hiện thông báo.
export type ResetFormState = {
  error?: string;
  success?: string;
  email?: string;
} | null;

// Tối thiểu hoá phụ thuộc — validate inline. Email/password được Supabase
// validate phía server, mình chỉ kiểm tra cơ bản trước khi gọi.
function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ---------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------
function safeNext(value: string | null | undefined): string {
  if (!value) return "/dashboard";
  // Chỉ cho phép path tương đối (chặn open-redirect).
  if (!value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? ""));

  if (!validateEmail(email)) return { error: "Email không hợp lệ.", email };
  if (password.length < 6)
    return { error: "Mật khẩu tối thiểu 6 ký tự.", email };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) return { error: error.message, email };

  // Gate disabled — không cho user bị disabled vào tiếp.
  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", data.user.id)
    .maybeSingle<{ status: "active" | "disabled" }>();

  if (profile?.status === "disabled") {
    await supabase.auth.signOut();
    redirect("/disabled");
  }

  redirect(next);
}

// ---------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------
export async function registerAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim();
  const next = safeNext(String(formData.get("next") ?? ""));

  if (!validateEmail(email)) return { error: "Email không hợp lệ.", email };
  if (password.length < 6)
    return { error: "Mật khẩu tối thiểu 6 ký tự.", email };

  const supabase = await createClient();

  // Trigger handle_new_auth_user (Phase 2) sẽ tự tạo row trong profiles.
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName || email.split("@")[0] },
    },
  });
  if (error) return { error: error.message, email };

  // Nếu project Supabase tắt "Confirm email", user đăng nhập luôn.
  // Nếu bật, sẽ phải xác nhận email; ở MVP bỏ qua flow đó — login lại.
  const { data: signIn } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (signIn.user) redirect(next);

  // Nếu cần xác nhận email, đưa về login với hint.
  redirect(`/login?registered=1${next !== "/dashboard" ? `&next=${encodeURIComponent(next)}` : ""}`);
}

// ---------------------------------------------------------------------
// Forgot password — gửi email chứa link đặt lại mật khẩu
// ---------------------------------------------------------------------
async function getOrigin(): Promise<string> {
  // Ưu tiên biến môi trường (deploy), fallback về header của request.
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");

  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;

  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export async function forgotPasswordAction(
  _prev: ResetFormState,
  formData: FormData
): Promise<ResetFormState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!validateEmail(email)) return { error: "Email không hợp lệ.", email };

  const supabase = await createClient();
  const origin = await getOrigin();

  // Link trong email trỏ về route handler để đổi `code` lấy session,
  // rồi chuyển tiếp sang /reset-password để người dùng đặt mật khẩu mới.
  const redirectTo = `${origin}/api/auth/callback?next=${encodeURIComponent(
    "/reset-password"
  )}`;

  await supabase.auth.resetPasswordForEmail(email, { redirectTo });

  // Luôn báo thành công bất kể email có tồn tại hay không — tránh lộ
  // thông tin tài khoản nào đã đăng ký (account enumeration).
  return {
    success:
      "Nếu email tồn tại trong hệ thống, chúng tôi sẽ gửi link đặt lại mật khẩu. Vui lòng kiểm tra email.",
    email,
  };
}

// ---------------------------------------------------------------------
// Reset password — đặt mật khẩu mới (cần recovery session từ link email)
// ---------------------------------------------------------------------
export async function resetPasswordAction(
  _prev: ResetFormState,
  formData: FormData
): Promise<ResetFormState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 6)
    return { error: "Mật khẩu tối thiểu 6 ký tự." };
  if (password !== confirm)
    return { error: "Mật khẩu xác nhận không khớp." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Không có recovery session → link hỏng/hết hạn.
  if (!user)
    return {
      error:
        "Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu lại.",
    };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  // Đăng xuất recovery session rồi buộc đăng nhập lại bằng mật khẩu mới.
  await supabase.auth.signOut();
  redirect("/login?reset=1");
}

// ---------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------
export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
