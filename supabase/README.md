# Supabase — NextBoard

## Áp dụng migration

Hai cách:

### 1) Supabase Dashboard (đơn giản nhất)

1. Vào project Supabase → **SQL Editor** → **New query**.
2. Chạy lần lượt từng file theo thứ tự:
   - `migrations/0001_init_schema.sql`
   - `migrations/0002_rls_policies.sql`

### 2) Supabase CLI

```bash
# Cài CLI: https://supabase.com/docs/guides/cli
supabase link --project-ref <your-ref>
supabase db push        # nếu đang dùng workflow remote
# hoặc với local:
supabase start
supabase db reset       # apply tất cả migrations trong supabase/migrations/
```

## Bootstrap admin đầu tiên

`admin_users` được bảo vệ bởi RLS: chỉ admin mới được thêm admin. Để tạo
admin đầu tiên, chạy SQL bằng tài khoản service-role / SQL Editor:

```sql
insert into public.admin_users (user_id)
values ('<uuid-của-user-trên-bảng-profiles>');
```

## Realtime

Sau khi chạy migration, vào **Database → Replication** và bật Realtime
cho bảng `board_objects` (Phase 9 dùng broadcast nên không bắt buộc, nhưng
nếu muốn dùng `postgres_changes` thì cần bật).
