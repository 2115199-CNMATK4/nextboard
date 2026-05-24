-- =====================================================================
-- NextBoard — Migration 0005: Temporary object lock RPCs
--
-- Tại sao dùng RPC thay vì UPDATE trực tiếp:
--   * acquire_object_lock cần điều kiện WHERE phức tạp để tránh race:
--     chỉ lock nếu (không ai lock) OR (lock hết hạn) OR (chính device này).
--     SELECT rồi UPDATE riêng biệt không atomic → 2 user có thể đều thấy
--     "chưa lock" và cả 2 đều thắng.
--   * SECURITY DEFINER cho phép RPC update locked_by_* mà không cần
--     thêm policy riêng (policy hiện tại đã cho editor UPDATE board_objects).
-- =====================================================================

-- acquire_object_lock: lock object nếu:
--   1. Không ai đang lock (locked_by_device_id IS NULL), HOẶC
--   2. Lock đã hết hạn (locked_until < now()), HOẶC
--   3. Chính device này đang refresh lock.
-- Returns: true nếu lock thành công, false nếu bị chặn.
create or replace function public.acquire_object_lock(
  p_object_id  uuid,
  p_board_id   uuid,
  p_user_id    uuid,
  p_device_id  uuid,
  p_duration_ms int default 5000
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_interval interval := (p_duration_ms || ' milliseconds')::interval;
begin
  -- Chỉ cho phép editor/owner
  if not public.has_board_role(p_board_id, p_user_id, array['owner', 'editor']) then
    return false;
  end if;

  update public.board_objects
  set
    locked_by_user_id   = p_user_id,
    locked_by_device_id = p_device_id,
    locked_until        = now() + v_interval,
    updated_at          = now()
  where id        = p_object_id
    and board_id  = p_board_id
    and (
      locked_by_device_id is null
      or locked_until < now()
      or locked_by_device_id = p_device_id
    );

  return found;
end;
$$;

revoke all on function public.acquire_object_lock(uuid, uuid, uuid, uuid, int) from public;
grant execute on function public.acquire_object_lock(uuid, uuid, uuid, uuid, int) to authenticated;


-- release_object_lock: chỉ device đang giữ lock mới có thể release.
create or replace function public.release_object_lock(
  p_object_id uuid,
  p_device_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.board_objects
  set
    locked_by_user_id   = null,
    locked_by_device_id = null,
    locked_until        = null,
    updated_at          = now()
  where id                  = p_object_id
    and locked_by_device_id = p_device_id;
end;
$$;

revoke all on function public.release_object_lock(uuid, uuid) from public;
grant execute on function public.release_object_lock(uuid, uuid) to authenticated;
