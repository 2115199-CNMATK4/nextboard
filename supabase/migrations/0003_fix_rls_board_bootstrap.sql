-- =====================================================================
-- NextBoard — Migration 0003: defensive fix cho flow tạo board.
--
-- Triệu chứng cần fix:
--   "new row violates row-level security policy for table 'boards'"
--   khi user (đã đăng nhập) gọi createBoardAction.
--
-- Nguyên nhân:
--   Trigger on_board_created chạy INSERT vào board_members, nhưng
--   policy board_members_insert_owner yêu cầu user đã là owner —
--   bootstrap thì chưa có row, SECURITY DEFINER trong một số setup
--   Supabase không bypass RLS (owner function khác `postgres`).
--   PG rollback toàn transaction; PostgREST trả message tại table gốc.
--
-- Lưu ý: migration này thêm "bootstrap path" cho board_members. Trong
-- thực tế trên Supabase Cloud (xác nhận qua test), điều đó vẫn không
-- đủ — `0004_create_board_rpc.sql` là fix dứt điểm (thay trigger bằng
-- RPC SECURITY DEFINER). Migration 0003 vẫn nên apply để policy
-- board_members "đúng đắn" cho các flow sau (admin thêm member, …).
-- =====================================================================

-- 1) boards_insert_self
drop policy if exists boards_insert_self on public.boards;
create policy boards_insert_self
  on public.boards
  for insert
  to authenticated
  with check ( owner_id = (select auth.uid()) );

-- 2) board_members_insert_owner với bootstrap path
drop policy if exists board_members_insert_owner on public.board_members;
create policy board_members_insert_owner
  on public.board_members
  for insert
  to authenticated
  with check (
    -- Path thường: đã là owner board → thêm bất kỳ member nào.
    public.has_board_role(board_id, (select auth.uid()), array['owner'])
    or (
      -- Bootstrap path: tự thêm mình làm owner của board mình vừa tạo.
      user_id = (select auth.uid())
      and role  = 'owner'
      and exists (
        select 1 from public.boards b
        where b.id = board_id
          and b.owner_id = (select auth.uid())
      )
    )
  );
