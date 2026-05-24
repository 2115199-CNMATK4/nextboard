"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ProfileFormState = {
  error?: string;
  success?: string;
} | null;

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ---------------------------------------------------------------------
// Update display name (profiles.display_name)
// ---------------------------------------------------------------------
export async function updateDisplayNameAction(
  _prev: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const displayName = String(formData.get("display_name") ?? "").trim();
  if (!displayName) return { error: "Tên không được để trống." };
  if (displayName.length > 80)
    return { error: "Tên tối đa 80 ký tự." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Phiên đăng nhập đã hết." };

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/account");
  revalidatePath("/dashboard");
  return { success: "Đã cập nhật tên." };
}

// ---------------------------------------------------------------------
// Update email (Supabase Auth — sends confirmation to new address)
// ---------------------------------------------------------------------
export async function updateEmailAction(
  _prev: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!validateEmail(email)) return { error: "Email không hợp lệ." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Phiên đăng nhập đã hết." };
  if (email === user.email)
    return { error: "Email mới trùng với email hiện tại." };

  const { error } = await supabase.auth.updateUser({ email });
  if (error) return { error: error.message };

  // Cũng cập nhật profiles.email cho consistency (sẽ chỉ effective sau confirm).
  return {
    success:
      "Đã gửi link xác nhận đến email mới. Email sẽ đổi sau khi bạn xác nhận.",
  };
}

// ---------------------------------------------------------------------
// Update password
// ---------------------------------------------------------------------
export async function updatePasswordAction(
  _prev: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 6) return { error: "Mật khẩu tối thiểu 6 ký tự." };
  if (password !== confirm) return { error: "Mật khẩu xác nhận không khớp." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Phiên đăng nhập đã hết." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  return { success: "Đã đổi mật khẩu." };
}
