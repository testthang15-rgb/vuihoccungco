-- =========================================================================
-- KỊCH BẢN TẠO BẢNG & THIẾT LẬP ROW LEVEL SECURITY (RLS) TRÊN SUPABASE
-- Dự án: Vui Học Cùng Cô (Mầm non)
-- =========================================================================

-- 1. Bật Extension UUID nếu chưa có
create extension if not exists "uuid-ossp";

-- 2. Bảng lưu trữ hồ sơ giáo viên (Profiles) liên kết với auth.users
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  full_name text not null default 'Cô Giáo',
  school_name text default '',
  avatar_url text default '',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tự động kích hoạt RLS cho bảng profiles
alter table public.profiles enable row level security;

-- Chính sách RLS cho profiles:
-- Mọi người có thể đọc profile của giáo viên
create policy "Profiles are viewable by everyone" 
  on public.profiles for select 
  using (true);

-- Chỉ chính giáo viên đó mới được cập nhật profile của mình
create policy "Users can update own profile" 
  on public.profiles for update 
  using (auth.uid() = id);

-- Tự động tạo hồ sơ profile khi có giáo viên mới đăng ký
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', 'Cô Giáo')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger chạy sau khi người dùng đăng ký auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =========================================================================
-- 3. Bảng lưu trữ trò chơi giáo viên (games)
-- =========================================================================
create table if not exists public.games (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  description text default '',
  theme text default 'candy',
  category text default 'chu_cai',
  game_type text default 'multiple_choice',
  target_age text default '5-6 tuổi',
  cover_image text,
  thumbnail_url text,
  questions jsonb not null default '[]'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  play_count integer default 0,
  is_public boolean default false,
  created_at bigint not null,
  updated_at bigint,
  deleted_at bigint
);

-- Bật RLS cho bảng games
alter table public.games enable row level security;

-- CHÍNH SÁCH RLS CHO BẢNG GAMES:
-- 1) SELECT: Người dùng chỉ được xem trò chơi do chính mình tạo HOẶC các trò chơi được công khai (is_public = true)
create policy "Users can view own games or public games"
  on public.games for select
  using (
    auth.uid() = user_id 
    or is_public = true
    or user_id is null -- Cho phép hiển thị game mẫu hệ thống
  );

-- 2) INSERT: KHÁCH CHƯA ĐĂNG NHẬP KHÔNG ĐƯỢC PHÉP GHI DỮ LIỆU. Chỉ người dùng đã xác thực (auth.role() = 'authenticated') mới được tạo game và user_id phải trùng khớp với tài khoản đăng nhập.
create policy "Only authenticated users can insert their own games"
  on public.games for insert
  with check (
    auth.role() = 'authenticated'
    and auth.uid() = user_id
  );

-- 3) UPDATE: Chỉ chính chủ nhân trò chơi mới được cập nhật
create policy "Users can update own games"
  on public.games for update
  using (
    auth.role() = 'authenticated'
    and auth.uid() = user_id
  );

-- 4) DELETE: Chỉ chính chủ nhân trò chơi mới được xóa
create policy "Users can delete own games"
  on public.games for delete
  using (
    auth.role() = 'authenticated'
    and auth.uid() = user_id
  );

-- =========================================================================
-- 4. Bảng lưu trữ lịch sử buổi học (game_history)
-- =========================================================================
create table if not exists public.game_history (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  game_title text not null,
  room_code text not null,
  played_at bigint not null,
  teams_count integer default 0,
  questions_count integer default 0,
  winner_team_name text default '',
  winner_score integer default 0,
  details jsonb default '{}'::jsonb
);

-- Bật RLS cho bảng game_history
alter table public.game_history enable row level security;

-- CHÍNH SÁCH RLS CHO BẢNG GAME_HISTORY:
-- 1) SELECT: Chỉ giáo viên tạo phòng mới xem được lịch sử của mình
create policy "Users can view own history"
  on public.game_history for select
  using (
    auth.role() = 'authenticated'
    and auth.uid() = user_id
  );

-- 2) INSERT: Chỉ giáo viên đã xác thực mới được ghi lại lịch sử phòng chơi
create policy "Authenticated users can insert history"
  on public.game_history for insert
  with check (
    auth.role() = 'authenticated'
    and auth.uid() = user_id
  );

-- Tạo Index để tăng tốc truy vấn theo user_id
create index if not exists idx_games_user_id on public.games(user_id);
create index if not exists idx_history_user_id on public.game_history(user_id);
