create table if not exists public.rooms (
  room_code text primary key,
  host_name text not null,
  game_state jsonb not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.rooms enable row level security;

create policy "Anyone can read rooms"
on public.rooms for select to anon, authenticated using (true);

create policy "Signed-in sessions can create rooms"
on public.rooms for insert to anon, authenticated with check (true);

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

create policy "Players can read their own private cards"
on public.room_players for select to authenticated using (auth.uid() = owner_id);

create policy "Players can write their own private cards"
on public.room_players for insert to authenticated with check (auth.uid() = owner_id);

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
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "Profiles are publicly searchable" on public.profiles for select to anon, authenticated using (true);
create policy "Users manage their own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
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
create policy "Users see their friend requests" on public.friend_requests for select to authenticated using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy "Users send friend requests" on public.friend_requests for insert to authenticated with check (auth.uid() = sender_id);
create policy "Receivers update friend requests" on public.friend_requests for update to authenticated using (auth.uid() = receiver_id) with check (auth.uid() = receiver_id);
