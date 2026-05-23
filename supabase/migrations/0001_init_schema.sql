-- =====================================================================
-- NextBoard — Phase 2 migration 0001
-- Schema chính: profiles, device_profiles, boards, board_members,
-- board_objects, admin_users, app_settings.
--
-- Lưu ý:
--   * Tất cả primary key là uuid (gen_random_uuid).
--   * jsonb cho object data → giữ payload mềm dẻo, không cần migrate khi
--     thêm tool mới (rect, ellipse, line, arrow, freehand…).
--   * updated_at được trigger tự cập nhật để admin dashboard và lock
--     logic có nguồn tin cậy duy nhất.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- profiles — gắn 1-1 với auth.users
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email        text,
  status       text not null default 'active'
                 check (status in ('active', 'disabled')),
  created_at   timestamptz not null default now()
);

-- Khi auth.users sinh user mới → tự tạo profile tương ứng.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ---------------------------------------------------------------------
-- device_profiles — mỗi tab/browser/thiết bị một bản ghi
-- ---------------------------------------------------------------------
create table if not exists public.device_profiles (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  device_name   text,
  device_type   text,
  color         text,
  last_seen_at  timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

create index if not exists device_profiles_user_idx
  on public.device_profiles (user_id);

-- ---------------------------------------------------------------------
-- boards
-- ---------------------------------------------------------------------
create table if not exists public.boards (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists boards_owner_idx on public.boards (owner_id);

-- ---------------------------------------------------------------------
-- board_members
-- ---------------------------------------------------------------------
create table if not exists public.board_members (
  id         uuid primary key default gen_random_uuid(),
  board_id   uuid not null references public.boards(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       text not null check (role in ('owner', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  unique (board_id, user_id)
);

create index if not exists board_members_board_idx on public.board_members (board_id);
create index if not exists board_members_user_idx  on public.board_members (user_id);

-- Mỗi khi tạo board mới → tự thêm owner vào board_members.
create or replace function public.handle_new_board()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.board_members (board_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (board_id, user_id) do update set role = 'owner';
  return new;
end;
$$;

drop trigger if exists on_board_created on public.boards;
create trigger on_board_created
  after insert on public.boards
  for each row execute function public.handle_new_board();

-- ---------------------------------------------------------------------
-- board_objects
-- ---------------------------------------------------------------------
create table if not exists public.board_objects (
  id                    uuid primary key default gen_random_uuid(),
  board_id              uuid not null references public.boards(id) on delete cascade,
  type                  text not null
                          check (type in ('text','rect','ellipse','line','arrow','freehand')),
  data                  jsonb not null,
  version               int not null default 1,
  locked_by_user_id     uuid references public.profiles(id) on delete set null,
  locked_by_device_id   uuid references public.device_profiles(id) on delete set null,
  locked_until          timestamptz,
  created_by            uuid references public.profiles(id) on delete set null,
  updated_by            uuid references public.profiles(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists board_objects_board_idx on public.board_objects (board_id);
create index if not exists board_objects_lock_idx
  on public.board_objects (locked_until)
  where locked_until is not null;

-- ---------------------------------------------------------------------
-- admin_users
-- ---------------------------------------------------------------------
create table if not exists public.admin_users (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- app_settings — key/value cho admin (broadcast rate, lock duration…)
-- ---------------------------------------------------------------------
create table if not exists public.app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- Seed default realtime config (Phase 9/10/11 sẽ đọc từ đây).
insert into public.app_settings (key, value)
values ('realtime_config', jsonb_build_object(
  'drawingBatchIntervalMs', 80,
  'cursorIntervalMs',       120,
  'objectMoveIntervalMs',   80,
  'saveDebounceMs',         500,
  'lockDurationMs',         5000,
  'lockRefreshMs',          2000
))
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- Tự cập nhật updated_at cho boards / board_objects
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_boards on public.boards;
create trigger set_updated_at_boards
  before update on public.boards
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_board_objects on public.board_objects;
create trigger set_updated_at_board_objects
  before update on public.board_objects
  for each row execute function public.set_updated_at();
