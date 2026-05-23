-- =====================================================================
-- NextBoard — Migration 0004: workaround dứt điểm bootstrap board.
--
-- Tại sao cần:
--   * Trên Supabase Cloud, function SECURITY DEFINER chạy như owner.
--     Owner mặc định trong SQL Editor là postgres / supabase_admin;
--     trong nhiều setup các role này KHÔNG có thuộc tính BYPASSRLS.
--     Khi đó SECURITY DEFINER không bypass RLS như tài liệu hứa.
--   * Hậu quả: trigger AFTER INSERT `on_board_created` fail ở
--     `INSERT INTO board_members` (vì bootstrap chưa có row owner) →
--     toàn transaction rollback → PostgREST trả error ở table gốc
--     (`boards`) dù policy `boards_insert_self` không phải nguyên nhân.
--
-- Cách sửa:
--   * Drop trigger `on_board_created`.
--   * Thay bằng RPC `public.create_board(p_title text)` chạy
--     SECURITY DEFINER. RPC tự lo insert cả `boards` lẫn `board_members`
--     trong một transaction. Tất cả Server Action chuyển sang gọi RPC
--     thay vì .insert() trực tiếp.
--   * RLS trên 2 bảng vẫn bật → write từ client thường vẫn bị kiểm tra.
--     RPC là kênh write hợp pháp duy nhất khi cần ghi cross-table có
--     phụ thuộc bootstrap.
-- =====================================================================

-- Bỏ trigger bootstrap cũ — RPC sẽ chịu trách nhiệm.
drop trigger if exists on_board_created on public.boards;

-- RPC tạo board + thêm owner.
create or replace function public.create_board(p_title text)
returns public.boards
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_title text := trim(coalesce(p_title, ''));
  v_board public.boards;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = 'P0001';
  end if;
  if length(v_title) = 0 then
    raise exception 'title required' using errcode = 'P0001';
  end if;
  if length(v_title) > 120 then
    v_title := left(v_title, 120);
  end if;

  insert into public.boards (title, owner_id)
  values (v_title, v_uid)
  returning * into v_board;

  insert into public.board_members (board_id, user_id, role)
  values (v_board.id, v_uid, 'owner');

  return v_board;
end;
$$;

revoke all on function public.create_board(text) from public;
grant execute on function public.create_board(text) to authenticated;
