import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getRealtimeSettings } from "@/lib/queries/admin";
import { RealtimeSettingsForm } from "@/components/admin/settings-form";

export default async function AdminSettingsPage() {
  const settings = await getRealtimeSettings();
  return (
    <section>
      <Card>
        <CardHeader>
          <CardTitle>Realtime config</CardTitle>
          <CardDescription>
            Tham số throttle/debounce cho broadcast và lock. Giá trị có giới
            hạn — quá nhỏ có thể spam, quá lớn làm UX lag.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RealtimeSettingsForm initial={settings} />
        </CardContent>
      </Card>
    </section>
  );
}
