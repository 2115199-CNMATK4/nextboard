import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ResetExpiredLocksButton,
  ResetLocksByBoardForm,
} from "@/components/admin/maintenance-actions";

export default function AdminMaintenancePage() {
  return (
    <section className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Reset locks đã hết hạn</CardTitle>
          <CardDescription>
            Xóa các lock có <code>locked_until</code> &lt; now() trên toàn hệ
            thống. An toàn — không ảnh hưởng lock đang active.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResetExpiredLocksButton />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reset toàn bộ locks của board</CardTitle>
          <CardDescription>
            Force-release MỌI lock của board cụ thể (kể cả còn hạn). Dùng khi
            board bị &ldquo;đơ&rdquo; do client crash không release.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResetLocksByBoardForm />
        </CardContent>
      </Card>
    </section>
  );
}
