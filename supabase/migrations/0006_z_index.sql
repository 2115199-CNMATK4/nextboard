-- Phase 11.2: add z_index for object render ordering.
alter table board_objects
  add column if not exists z_index integer default 0;

comment on column board_objects.z_index is
  'Render order — higher z_index renders on top.';
