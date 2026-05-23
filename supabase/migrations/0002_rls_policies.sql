-- =====================================================================
-- NextBoard — Phase 2 migration 0002
-- Bật Row Level Security và policy.
--
-- Nguyên tắc:
--   * Mọi truy cập từ client (anon/authenticated) đều phải qua RLS.
--   * Helper function bọc trong `security definer` để policy không bị
--     loop khi truy cập bảng khác trong cùng phép kiểm tra.
--   * Service-role bypass RLS mặc định — dùng cho admin actions phía
--     server (Phase 13).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------

-- True nếu user là admin (có row trong admin_users).
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = uid);
$$;

-- True nếu user có bất kỳ role nào trong board.
create or replace function public.is_board_member(bid uuid, uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.board_members
    where board_id = bid and user_id = uid
  );
$$;

-- True nếu user có role thuộc danh sách roles (owner/editor/viewer).
create or replace function public.has_board_role(bid uuid, uid uuid, roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.board_members
    where board_id = bid and user_id = uid and role = any(roles)
  );
$$;

-- ---------------------------------------------------------------------
-- Bật RLS
-- ---------------------------------------------------------------------
alter table public.profiles        enable row level security;
alter table public.device_profiles enable row level security;
alter table public.boards          enable row level security;
alter table public.board_members   enable row level security;
alter table public.board_objects   enable row level security;
alter table public.admin_users     enable row level security;
alter table public.app_settings    enable row level security;

-- ---------------------------------------------------------------------
-- profiles
--   * User đọc/sửa profile của chính mình.
--   * Admin đọc tất cả + sửa status (enable/disable).
--   * INSERT do trigger handle_new_auth_user thực hiện (security definer).
-- ---------------------------------------------------------------------
drop policy if exists profiles_select_self        on public.profiles;
drop policy if exists profiles_select_admin       on public.profiles;
drop policy if exists profiles_select_board_peers on public.profiles;
drop policy if exists profiles_update_self        on public.profiles;
drop policy if exists profiles_update_admin       on public.profiles;

create policy profiles_select_self
  on public.profiles for select
  using (id = (select auth.uid()));

create policy profiles_select_admin
  on public.profiles for select
  using (public.is_admin((select auth.uid())));

-- Cho phép xem display_name/email của các thành viên chung board (presence).
create policy profiles_select_board_peers
  on public.profiles for select
  using (
    exists (
      select 1
      from public.board_members m1
      join public.board_members m2 on m1.board_id = m2.board_id
      where m1.user_id = (select auth.uid())
        and m2.user_id = public.profiles.id
    )
  );

create policy profiles_update_self
  on public.profiles for update
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()) and status = 'active');
  -- ↑ user thường không tự đổi status thành 'disabled' rồi bypass.

create policy profiles_update_admin
  on public.profiles for update
  using (public.is_admin((select auth.uid())))
  with check (public.is_admin((select auth.uid())));

-- ---------------------------------------------------------------------
-- device_profiles
--   * User thấy + quản device của chính mình.
--   * User thấy device của thành viên cùng board (cho presence panel).
--   * Admin thấy tất cả.
-- ---------------------------------------------------------------------
drop policy if exists device_profiles_select_self        on public.device_profiles;
drop policy if exists device_profiles_select_board_peers on public.device_profiles;
drop policy if exists device_profiles_select_admin       on public.device_profiles;
drop policy if exists device_profiles_insert_self        on public.device_profiles;
drop policy if exists device_profiles_update_self        on public.device_profiles;
drop policy if exists device_profiles_delete_self        on public.device_profiles;
drop policy if exists device_profiles_delete_admin       on public.device_profiles;

create policy device_profiles_select_self
  on public.device_profiles for select
  using (user_id = (select auth.uid()));

create policy device_profiles_select_board_peers
  on public.device_profiles for select
  using (
    exists (
      select 1
      from public.board_members m1
      join public.board_members m2 on m1.board_id = m2.board_id
      where m1.user_id = (select auth.uid())
        and m2.user_id = public.device_profiles.user_id
    )
  );

create policy device_profiles_select_admin
  on public.device_profiles for select
  using (public.is_admin((select auth.uid())));

create policy device_profiles_insert_self
  on public.device_profiles for insert
  with check (user_id = (select auth.uid()));

create policy device_profiles_update_self
  on public.device_profiles for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy device_profiles_delete_self
  on public.device_profiles for delete
  using (user_id = (select auth.uid()));

create policy device_profiles_delete_admin
  on public.device_profiles for delete
  using (public.is_admin((select auth.uid())));

-- ---------------------------------------------------------------------
-- boards
-- ---------------------------------------------------------------------
drop policy if exists boards_select_member on public.boards;
drop policy if exists boards_select_admin  on public.boards;
drop policy if exists boards_insert_self   on public.boards;
drop policy if exists boards_update_owner  on public.boards;
drop policy if exists boards_delete_owner  on public.boards;
drop policy if exists boards_delete_admin  on public.boards;

create policy boards_select_member
  on public.boards for select
  using (public.is_board_member(id, (select auth.uid())));

create policy boards_select_admin
  on public.boards for select
  using (public.is_admin((select auth.uid())));

-- Tạo board: user phải tạo cho chính mình (owner_id = auth.uid()).
-- Trigger on_board_created sẽ tự thêm row vào board_members.
create policy boards_insert_self
  on public.boards for insert
  with check (owner_id = (select auth.uid()));

create policy boards_update_owner
  on public.boards for update
  using (public.has_board_role(id, (select auth.uid()), array['owner']))
  with check (public.has_board_role(id, (select auth.uid()), array['owner']));

create policy boards_delete_owner
  on public.boards for delete
  using (public.has_board_role(id, (select auth.uid()), array['owner']));

create policy boards_delete_admin
  on public.boards for delete
  using (public.is_admin((select auth.uid())));

-- ---------------------------------------------------------------------
-- board_members
--   * Owner toàn quyền quản lý.
--   * Member xem được danh sách member trong board của mình (presence/UI).
--   * Admin đọc tất cả.
-- ---------------------------------------------------------------------
drop policy if exists board_members_select_member on public.board_members;
drop policy if exists board_members_select_admin  on public.board_members;
drop policy if exists board_members_insert_owner  on public.board_members;
drop policy if exists board_members_update_owner  on public.board_members;
drop policy if exists board_members_delete_owner  on public.board_members;
drop policy if exists board_members_delete_self   on public.board_members;

create policy board_members_select_member
  on public.board_members for select
  using (public.is_board_member(board_id, (select auth.uid())));

create policy board_members_select_admin
  on public.board_members for select
  using (public.is_admin((select auth.uid())));

create policy board_members_insert_owner
  on public.board_members for insert
  with check (public.has_board_role(board_id, (select auth.uid()), array['owner']));

create policy board_members_update_owner
  on public.board_members for update
  using (public.has_board_role(board_id, (select auth.uid()), array['owner']))
  with check (public.has_board_role(board_id, (select auth.uid()), array['owner']));

create policy board_members_delete_owner
  on public.board_members for delete
  using (public.has_board_role(board_id, (select auth.uid()), array['owner']));

-- Cho phép user tự rời board của mình (delete row của chính mình
-- trừ khi mình là owner — owner phải chuyển quyền trước).
create policy board_members_delete_self
  on public.board_members for delete
  using (
    user_id = (select auth.uid())
    and role <> 'owner'
  );

-- ---------------------------------------------------------------------
-- board_objects
--   * Member xem object.
--   * Editor/owner insert/update/delete.
--   * Viewer chỉ select.
-- ---------------------------------------------------------------------
drop policy if exists board_objects_select_member on public.board_objects;
drop policy if exists board_objects_select_admin  on public.board_objects;
drop policy if exists board_objects_insert_writer on public.board_objects;
drop policy if exists board_objects_update_writer on public.board_objects;
drop policy if exists board_objects_delete_writer on public.board_objects;
drop policy if exists board_objects_delete_admin  on public.board_objects;

create policy board_objects_select_member
  on public.board_objects for select
  using (public.is_board_member(board_id, (select auth.uid())));

create policy board_objects_select_admin
  on public.board_objects for select
  using (public.is_admin((select auth.uid())));

create policy board_objects_insert_writer
  on public.board_objects for insert
  with check (
    public.has_board_role(board_id, (select auth.uid()), array['owner','editor'])
  );

create policy board_objects_update_writer
  on public.board_objects for update
  using (
    public.has_board_role(board_id, (select auth.uid()), array['owner','editor'])
  )
  with check (
    public.has_board_role(board_id, (select auth.uid()), array['owner','editor'])
  );

create policy board_objects_delete_writer
  on public.board_objects for delete
  using (
    public.has_board_role(board_id, (select auth.uid()), array['owner','editor'])
  );

create policy board_objects_delete_admin
  on public.board_objects for delete
  using (public.is_admin((select auth.uid())));

-- ---------------------------------------------------------------------
-- admin_users
--   * Self-select để client biết mình có phải admin.
--   * Chỉ admin (đã tồn tại) mới được tạo admin khác — bootstrap admin
--     đầu tiên phải làm bằng service-role/SQL trực tiếp.
-- ---------------------------------------------------------------------
drop policy if exists admin_users_select_self  on public.admin_users;
drop policy if exists admin_users_select_admin on public.admin_users;
drop policy if exists admin_users_insert_admin on public.admin_users;
drop policy if exists admin_users_delete_admin on public.admin_users;

create policy admin_users_select_self
  on public.admin_users for select
  using (user_id = (select auth.uid()));

create policy admin_users_select_admin
  on public.admin_users for select
  using (public.is_admin((select auth.uid())));

create policy admin_users_insert_admin
  on public.admin_users for insert
  with check (public.is_admin((select auth.uid())));

create policy admin_users_delete_admin
  on public.admin_users for delete
  using (public.is_admin((select auth.uid())));

-- ---------------------------------------------------------------------
-- app_settings
--   * Bất kỳ user đăng nhập nào cũng đọc được (client cần realtime config).
--   * Chỉ admin được update/insert.
-- ---------------------------------------------------------------------
drop policy if exists app_settings_select_auth on public.app_settings;
drop policy if exists app_settings_insert_admin on public.app_settings;
drop policy if exists app_settings_update_admin on public.app_settings;

create policy app_settings_select_auth
  on public.app_settings for select
  to authenticated
  using (true);

create policy app_settings_insert_admin
  on public.app_settings for insert
  with check (public.is_admin((select auth.uid())));

create policy app_settings_update_admin
  on public.app_settings for update
  using (public.is_admin((select auth.uid())))
  with check (public.is_admin((select auth.uid())));
