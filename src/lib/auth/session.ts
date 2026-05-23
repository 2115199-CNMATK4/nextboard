import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

// Trả về auth user (chưa gồm profile row trong public.profiles).
export async function getCurrentAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// Trả về profile (public.profiles) của user hiện tại, null nếu chưa login.
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  return data ?? null;
}

// Bắt buộc đã đăng nhập + active. Dùng ở đầu các trang protected.
export async function requireProfile(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.status === "disabled") redirect("/disabled");
  return profile;
}

export async function isAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await requireProfile();
  const admin = await isAdmin(profile.id);
  if (!admin) redirect("/dashboard");
  return profile;
}
