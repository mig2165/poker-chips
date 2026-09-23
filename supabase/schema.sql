create table if not exists public.rooms (
  room_code text primary key,
  host_name text not null,
  game_state jsonb not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.rooms enable row level security;

drop policy if exists "Anyone can read rooms" on public.rooms;
create policy "Anyone can read rooms"
on public.rooms for select to anon, authenticated using (true);

drop policy if exists "Signed-in sessions can create rooms" on public.rooms;
create policy "Signed-in sessions can create rooms"
on public.rooms for insert to anon, authenticated with check (true);

drop policy if exists "Signed-in sessions can update rooms" on public.rooms;
create policy "Signed-in sessions can update rooms"
on public.rooms for update to authenticated using (true) with check (true);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'rooms'
  ) then
    alter publication supabase_realtime add table public.rooms;
  end if;
end
$$;

create table if not exists public.room_players (
  room_code text not null references public.rooms(room_code) on delete cascade,
  player_id text not null,
  owner_id uuid not null default auth.uid(),
  player_name text not null,
  hole_cards jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (room_code, player_id)
);

alter table public.room_players enable row level security;

drop policy if exists "Players can read their own private cards" on public.room_players;
create policy "Players can read their own private cards"
on public.room_players for select to authenticated using (auth.uid() = owner_id);

drop policy if exists "Players can write their own private cards" on public.room_players;
create policy "Players can write their own private cards"
on public.room_players for insert to authenticated with check (auth.uid() = owner_id);

drop policy if exists "Players can update their own private cards" on public.room_players;
create policy "Players can update their own private cards"
on public.room_players for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'room_players'
  ) then
    alter publication supabase_realtime add table public.room_players;
  end if;
end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  games_played integer not null default 0,
  total_won integer not null default 0,
  total_lost integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists games_played integer not null default 0;
alter table public.profiles add column if not exists total_won integer not null default 0;
alter table public.profiles add column if not exists total_lost integer not null default 0;
create unique index if not exists profiles_username_lower_idx on public.profiles (lower(username));

alter table public.profiles enable row level security;
drop policy if exists "Profiles are publicly searchable" on public.profiles;
create policy "Profiles are publicly searchable" on public.profiles for select to anon, authenticated using (true);
drop policy if exists "Users manage their own profile" on public.profiles;
create policy "Users manage their own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
drop policy if exists "Users update their own profile" on public.profiles;
create policy "Users update their own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.create_profile_for_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', 'player_' || substr(new.id::text, 1, 8)))
  on conflict (id) do nothing;
  return new;
end;
$$;

create table if not exists public.profile_game_results (
  profile_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null,
  hand_number integer not null,
  net_change integer not null,
  created_at timestamptz not null default now(),
  primary key (profile_id, game_id, hand_number)
);

alter table public.profile_game_results enable row level security;
drop policy if exists "Users can read their own game results" on public.profile_game_results;
create policy "Users can read their own game results"
on public.profile_game_results for select to authenticated using (auth.uid() = profile_id);

create or replace function public.record_profile_game(game_id text, hand_number integer, net_change integer)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profile_game_results (profile_id, game_id, hand_number, net_change)
  values (auth.uid(), game_id, hand_number, net_change)
  on conflict (profile_id, game_id, hand_number) do nothing;

  if not found then
    return;
  end if;

  update public.profiles
  set games_played = games_played + 1,
      total_won = total_won + greatest(net_change, 0),
      total_lost = total_lost + greatest(-net_change, 0)
  where id = auth.uid();
end;
$$;

revoke all on function public.record_profile_game(text, integer, integer) from public;
grant execute on function public.record_profile_game(text, integer, integer) to authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.create_profile_for_user();

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique(sender_id, receiver_id)
);

alter table public.friend_requests enable row level security;
drop policy if exists "Users see their friend requests" on public.friend_requests;
create policy "Users see their friend requests" on public.friend_requests for select to authenticated using (auth.uid() = sender_id or auth.uid() = receiver_id);
drop policy if exists "Users send friend requests" on public.friend_requests;
create policy "Users send friend requests" on public.friend_requests for insert to authenticated with check (auth.uid() = sender_id);
drop policy if exists "Receivers update friend requests" on public.friend_requests;
create policy "Receivers update friend requests" on public.friend_requests for update to authenticated using (auth.uid() = receiver_id) with check (auth.uid() = receiver_id);
