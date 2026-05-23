import { AuthShell } from "@/components/layout/auth-shell";
import { LogoutButton } from "@/components/layout/logout-button";

export default function DisabledPage() {
  return (
    <AuthShell
      title="Tài khoản bị vô hiệu hóa"
      subtitle="Vui lòng liên hệ quản trị viên để được hỗ trợ."
    >
      <div className="flex justify-center">
        <LogoutButton />
      </div>
    </AuthShell>
  );
}
