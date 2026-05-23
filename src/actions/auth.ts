"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = {
  error?: string;
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
// Logout
// ---------------------------------------------------------------------
export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
