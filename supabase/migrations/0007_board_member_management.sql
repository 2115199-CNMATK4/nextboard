-- =====================================================================
-- NextBoard — Migration 0007: Quản lý thành viên đa người dùng.
--
-- Mục tiêu:
--   * Owner có thể thêm editor/viewer.
--   * Editor có thể thêm viewer (không thể thêm editor/owner).
--   * Viewer không có quyền thêm/đổi/xoá ai.
--   * Thêm bằng email — tra profiles.email → user_id phía server.
--
-- Cách tiếp cận:
--   * RPC SECURITY DEFINER `add_board_member(p_board_id, p_email, p_role)`
--     chứa toàn bộ logic: kiểm tra role caller, tra email, insert/upsert
--     board_members. RLS giữ nguyên owner-only cho direct INSERT —
--     RPC là kênh thêm thành viên duy nhất phía client.
--   * RPC `remove_board_member` cho phép owner xoá member; editor có thể
--     tự rời (đã có policy board_members_delete_self). Owner cuối cùng
--     không thể bị xoá.
--   * RPC `set_board_member_role` cho phép owner đổi role thành viên.
--     Không cho phép có 2 owner — đổi role 'owner' phải qua transfer
--     ownership (ngoài MVP).
-- =====================================================================

-- ---------------------------------------------------------------------
-- add_board_member: thêm thành viên bằng email.
--   Trả về row board_members vừa thêm/cập nhật, hoặc raise exception
--   với mã rõ ràng để Server Action map lại thông báo tiếng Việt.
-- ---------------------------------------------------------------------
create or replace function public.add_board_member(
  p_board_id uuid,
  p_email    text,
  p_role     text
)
returns public.board_members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller       uuid := auth.uid();
  v_caller_role  text;
  v_target_id    uuid;
  v_target_email text;
  v_role         text := lower(trim(coalesce(p_role, '')));
  v_email        text := lower(trim(coalesce(p_email, '')));
  v_existing     public.board_members;
  v_row          public.board_members;
begin
  if v_caller is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  if v_email = '' then
    raise exception 'email_required' using errcode = 'P0001';
  end if;

  if v_role not in ('editor', 'viewer') then
    raise exception 'invalid_role' using errcode = 'P0001';
  end if;

  select role into v_caller_role
  from public.board_members
  where board_id = p_board_id and user_id = v_caller;

  if v_caller_role is null then
    raise exception 'not_member' using errcode = 'P0001';
  end if;

  -- Phân quyền:
  --   owner  → thêm editor/viewer.
  --   editor → chỉ thêm viewer.
  --   viewer → cấm.
  if v_caller_role = 'viewer' then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if v_caller_role = 'editor' and v_role <> 'viewer' then
    raise exception 'forbidden_role' using errcode = 'P0001';
  end if;

  -- Tra email → user_id. Dùng profiles.email (đã được sync khi auth user
  -- tạo profile). Không expose auth.users ra ngoài.
  select id, email into v_target_id, v_target_email
  from public.profiles
  where lower(email) = v_email
  limit 1;

  if v_target_id is null then
    raise exception 'user_not_found' using errcode = 'P0001';
  end if;

  if v_target_id = v_caller then
    raise exception 'self_add' using errcode = 'P0001';
  end if;

  -- Đã là member?
  select * into v_existing
  from public.board_members
  where board_id = p_board_id and user_id = v_target_id;

  if v_existing.id is not null then
    -- Editor chỉ được set viewer; không được hạ owner/editor xuống viewer.
    if v_caller_role = 'editor' and v_existing.role in ('owner', 'editor') then
      raise exception 'already_member' using errcode = 'P0001';
    end if;
    if v_existing.role = 'owner' then
      raise exception 'cannot_modify_owner' using errcode = 'P0001';
    end if;
    update public.board_members
    set role = v_role
    where id = v_existing.id
    returning * into v_row;
    return v_row;
  end if;

  insert into public.board_members (board_id, user_id, role)
  values (p_board_id, v_target_id, v_role)
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.add_board_member(uuid, text, text) from public;
grant execute on function public.add_board_member(uuid, text, text) to authenticated;


-- ---------------------------------------------------------------------
-- set_board_member_role: owner đổi role editor↔viewer.
--   Không cho đổi sang/từ 'owner' để tránh có nhiều owner.
-- ---------------------------------------------------------------------
create or replace function public.set_board_member_role(
  p_board_id uuid,
  p_user_id  uuid,
  p_role     text
)
returns public.board_members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_role   text := lower(trim(coalesce(p_role, '')));
  v_target public.board_members;
  v_row    public.board_members;
begin
  if v_caller is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  if v_role not in ('editor', 'viewer') then
    raise exception 'invalid_role' using errcode = 'P0001';
  end if;

  if not public.has_board_role(p_board_id, v_caller, array['owner']) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;

  select * into v_target
  from public.board_members
  where board_id = p_board_id and user_id = p_user_id;

  if v_target.id is null then
    raise exception 'not_member' using errcode = 'P0001';
  end if;

  if v_target.role = 'owner' then
    raise exception 'cannot_modify_owner' using errcode = 'P0001';
  end if;

  update public.board_members
  set role = v_role
  where id = v_target.id
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.set_board_member_role(uuid, uuid, text) from public;
grant execute on function public.set_board_member_role(uuid, uuid, text) to authenticated;


-- ---------------------------------------------------------------------
-- remove_board_member: owner xoá member; không cho xoá owner.
--   (User tự rời board đã có sẵn policy board_members_delete_self.)
-- ---------------------------------------------------------------------
create or replace function public.remove_board_member(
  p_board_id uuid,
  p_user_id  uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_target public.board_members;
begin
  if v_caller is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  if not public.has_board_role(p_board_id, v_caller, array['owner']) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;

  select * into v_target
  from public.board_members
  where board_id = p_board_id and user_id = p_user_id;

  if v_target.id is null then
    raise exception 'not_member' using errcode = 'P0001';
  end if;

  if v_target.role = 'owner' then
    raise exception 'cannot_remove_owner' using errcode = 'P0001';
  end if;

  delete from public.board_members where id = v_target.id;
end;
$$;

revoke all on function public.remove_board_member(uuid, uuid) from public;
grant execute on function public.remove_board_member(uuid, uuid) to authenticated;
