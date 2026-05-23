import { Button } from "@/components/ui/button";
import { logoutAction } from "@/actions/auth";

// Form action — không cần "use client", form sẽ submit bằng JS hoặc
// fallback HTTP POST.
export function LogoutButton({
  label = "Đăng xuất",
  variant = "outline",
}: {
  label?: string;
  variant?: "outline" | "default" | "ghost" | "destructive";
}) {
  return (
    <form action={logoutAction}>
      <Button type="submit" variant={variant} size="sm">
        {label}
      </Button>
    </form>
  );
}
