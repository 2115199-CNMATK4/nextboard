-- =====================================================================
-- NextBoard — Migration 0008: Object type "image" + storage bucket.
--
-- Mục tiêu:
--   * Cho phép upload ảnh thành object trên board.
--   * Object lưu URL (không lưu bytes vào board_objects.data) — file thực
--     nằm trong Supabase Storage bucket "board-images".
--   * RLS bucket: chỉ member của board mới đọc; chỉ editor/owner upload.
--   * Ảnh public URL được dùng trong realtime broadcast → bucket public
--     read là chấp nhận được. Đường dẫn vẫn được scope theo board_id.
--
-- Cấu trúc path: <board_id>/<uuid>.<ext>
--
-- Lưu ý: storage.objects nằm trong schema storage, không phải public.
--   Policies dùng helper public.has_board_role / public.is_board_member
--   đã có từ migration 0002.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Mở CHECK constraint cho 'image'.
--    Drop+recreate vì Postgres không cho ALTER CHECK in-place.
-- ---------------------------------------------------------------------
alter table public.board_objects
  drop constraint if exists board_objects_type_check;

alter table public.board_objects
  add constraint board_objects_type_check
  check (type in ('text', 'rect', 'ellipse', 'line', 'arrow', 'freehand', 'image'));

-- ---------------------------------------------------------------------
-- 2. Tạo storage bucket nếu chưa có.
--    public = true → file truy cập được qua URL không cần signed-url.
--    Policy READ vẫn lọc theo board membership để URL random không bị
--    leak board content (URL chứa board_id ở path).
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('board-images', 'board-images', true)
on conflict (id) do update set public = true;

-- ---------------------------------------------------------------------
-- 3. Storage policies cho bucket 'board-images'.
--    Path format: <board_id>/<filename>. (storage.foldername(name))[1]
--    trả về thư mục đầu tiên trong path.
-- ---------------------------------------------------------------------
drop policy if exists board_images_select on storage.objects;
drop policy if exists board_images_insert on storage.objects;
drop policy if exists board_images_delete on storage.objects;

-- SELECT: member của board đọc được; admin đọc tất cả.
create policy board_images_select
  on storage.objects for select
  using (
    bucket_id = 'board-images'
    and (
      public.is_board_member(
        ((storage.foldername(name))[1])::uuid,
        (select auth.uid())
      )
      or public.is_admin((select auth.uid()))
    )
  );

-- INSERT: chỉ editor/owner upload.
create policy board_images_insert
  on storage.objects for insert
  with check (
    bucket_id = 'board-images'
    and public.has_board_role(
      ((storage.foldername(name))[1])::uuid,
      (select auth.uid()),
      array['owner', 'editor']
    )
  );

-- DELETE: chỉ editor/owner xoá (dùng khi cleanup ảnh mồ côi).
create policy board_images_delete
  on storage.objects for delete
  using (
    bucket_id = 'board-images'
    and (
      public.has_board_role(
        ((storage.foldername(name))[1])::uuid,
        (select auth.uid()),
        array['owner', 'editor']
      )
      or public.is_admin((select auth.uid()))
    )
  );
