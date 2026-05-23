import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server client cho RSC / Server Actions / Route Handlers.
// Next.js 16: `cookies()` là async → phải `await`.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Gọi từ Server Component sẽ throw — bỏ qua, proxy.ts đã
            // refresh cookie cho session rồi.
          }
        },
      },
    }
  );
}

// Service-role client — bypass RLS, chỉ dùng trong Server Action admin.
// Không bao giờ expose ra client.
export function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    }
  );
}
