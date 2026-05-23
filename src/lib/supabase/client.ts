"use client";

import { createBrowserClient } from "@supabase/ssr";

// Browser client — dùng trong Client Components, hooks, useEffect.
// Anon key public, RLS bảo vệ dữ liệu.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
