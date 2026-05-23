import { requireProfile } from "@/lib/auth/session";
import { DeviceProvider } from "@/components/layout/device-provider";

// Route group `(app)` chứa các trang protected (dashboard / boards / admin).
// Layout này:
//   * Bắt buộc đã đăng nhập + active (requireProfile redirect nếu không).
//   * Mount <DeviceProvider> để mọi Client Component bên dưới truy cập
//     device_profile và profile qua useDevice().
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();
  return <DeviceProvider profile={profile}>{children}</DeviceProvider>;
}
