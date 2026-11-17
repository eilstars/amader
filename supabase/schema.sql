-- Amader database. Paste this whole file into the Supabase SQL editor and press Run.
-- It is safe to run more than once.
--
-- How privacy works: nobody makes an account. Each phone signs in anonymously,
-- and the rules below only show a phone the families it has joined.
-- The 6 letter family code is the only way in, so treat it like a house key.

create extension if not exists pgcrypto;

create table if not exists public.families (
  code text primary key,
  goal_food text not null default 'Rice',
  goal_handfuls int not null default 2 check (goal_handfuls between 1 and 4),
  created_at timestamptz not null default now()
);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  family_code text not null references public.families (code) on delete cascade,
  user_id uuid,
  name text not null check (char_length(name) between 1 and 40),
  role text not null check (role in ('parent', 'child')),
  tint int not null default 0,
  joined boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists members_family on public.members (family_code);
create index if not exists members_user on public.members (user_id);

create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  family_code text not null references public.families (code) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  eaten_at timestamptz not null default now(),
  slot text not null check (slot in ('breakfast', 'lunch', 'dinner')),
  photo_url text,
  handfuls int check (handfuls between 0 and 4)
);
create index if not exists meals_family_time on public.meals (family_code, eaten_at desc);

create table if not exists public.hearts (
  meal_id uuid not null references public.meals (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (meal_id, member_id)
);

-- Helpers the rules use. They run with owner rights so the rules don't loop back on themselves.
create or replace function public.my_family_codes() returns setof text
language sql stable security definer set search_path = public as $$
  select family_code from public.members where user_id = auth.uid()
$$;

create or replace function public.my_member_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select id from public.members where user_id = auth.uid()
$$;

alter table public.families enable row level security;
alter table public.members enable row level security;
alter table public.meals enable row level security;
alter table public.hearts enable row level security;

drop policy if exists "family: members can read" on public.families;
create policy "family: members can read" on public.families
  for select to authenticated using (code in (select public.my_family_codes()));

drop policy if exists "family: members can change the goal" on public.families;
create policy "family: members can change the goal" on public.families
  for update to authenticated
  using (code in (select public.my_family_codes()))
  with check (code in (select public.my_family_codes()));

drop policy if exists "members: family can read" on public.members;
create policy "members: family can read" on public.members
  for select to authenticated using (family_code in (select public.my_family_codes()));

drop policy if exists "meals: family can read" on public.meals;
create policy "meals: family can read" on public.meals
  for select to authenticated using (family_code in (select public.my_family_codes()));

drop policy if exists "meals: add my own" on public.meals;
create policy "meals: add my own" on public.meals
  for insert to authenticated
  with check (
    member_id in (select public.my_member_ids())
    and family_code in (select m.family_code from public.members m where m.id = member_id)
  );

drop policy if exists "meals: delete my own" on public.meals;
create policy "meals: delete my own" on public.meals
  for delete to authenticated using (member_id in (select public.my_member_ids()));

drop policy if exists "hearts: family can read" on public.hearts;
create policy "hearts: family can read" on public.hearts
  for select to authenticated using (meal_id in (select id from public.meals));

drop policy if exists "hearts: send my own" on public.hearts;
create policy "hearts: send my own" on public.hearts
  for insert to authenticated
  with check (member_id in (select public.my_member_ids()) and meal_id in (select id from public.meals));

drop policy if exists "hearts: take back my own" on public.hearts;
create policy "hearts: take back my own" on public.hearts
  for delete to authenticated using (member_id in (select public.my_member_ids()));

-- The adult child sets the table. Makes the family, their own seat, and an empty seat for the parent.
create or replace function public.create_family(p_my_name text, p_parent_name text, p_goal_food text, p_goal_handfuls int)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_code text;
  v_me uuid;
  v_letters constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  loop
    select string_agg(substr(v_letters, 1 + floor(random() * length(v_letters))::int, 1), '')
      into v_code from generate_series(1, 6);
    exit when not exists (select 1 from public.families where code = v_code);
  end loop;
  insert into public.families (code, goal_food, goal_handfuls)
    values (v_code, coalesce(nullif(trim(p_goal_food), ''), 'Rice'), least(4, greatest(1, coalesce(p_goal_handfuls, 2))));
  insert into public.members (family_code, user_id, name, role, tint, joined)
    values (v_code, null, trim(p_parent_name), 'parent', 0, false);
  insert into public.members (family_code, user_id, name, role, tint, joined)
    values (v_code, auth.uid(), trim(p_my_name), 'child', 1, true)
    returning id into v_me;
  return json_build_object('code', v_code, 'me_id', v_me);
end;
$$;

-- What the join screen shows before someone joins: who invited them and the name saved for them.
create or replace function public.invite_info(p_code text)
returns json language plpgsql stable security definer set search_path = public as $$
declare
  v_code text := upper(trim(p_code));
begin
  if not exists (select 1 from public.families where code = v_code) then
    return null;
  end if;
  return json_build_object(
    'parent_name', (select name from public.members where family_code = v_code and role = 'parent' and not joined order by created_at limit 1),
    'from_name', (select name from public.members where family_code = v_code and joined order by created_at limit 1)
  );
end;
$$;

-- Someone opened an invite. A parent takes the seat saved for them; anyone else gets a new seat.
create or replace function public.join_family(p_code text, p_name text, p_role text)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_code text := upper(trim(p_code));
  v_me uuid;
  v_count int;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  if not exists (select 1 from public.families where code = v_code) then
    return null;
  end if;
  select id into v_me from public.members where family_code = v_code and user_id = auth.uid() limit 1;
  if v_me is not null then
    return json_build_object('code', v_code, 'me_id', v_me);
  end if;
  if p_role = 'parent' then
    select id into v_me from public.members
      where family_code = v_code and role = 'parent' and not joined
      order by created_at limit 1 for update;
    if v_me is not null then
      update public.members
        set user_id = auth.uid(), joined = true, name = coalesce(nullif(trim(p_name), ''), name)
        where id = v_me;
      return json_build_object('code', v_code, 'me_id', v_me);
    end if;
  end if;
  select count(*) into v_count from public.members where family_code = v_code;
  if v_count >= 8 then
    raise exception 'This family table is full';
  end if;
  insert into public.members (family_code, user_id, name, role, tint, joined)
    values (v_code, auth.uid(), trim(p_name), case when p_role = 'parent' then 'parent' else 'child' end, v_count % 3, true)
    returning id into v_me;
  return json_build_object('code', v_code, 'me_id', v_me);
end;
$$;

-- "Delete my meals and leave." Removes the person, their meals and their hearts.
create or replace function public.delete_me(p_member uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_code text;
begin
  delete from public.members where id = p_member and user_id = auth.uid() returning family_code into v_code;
  -- When the last real person leaves, the family goes too.
  if v_code is not null and not exists (select 1 from public.members where family_code = v_code and joined) then
    delete from public.families where code = v_code;
  end if;
end;
$$;

revoke execute on function public.create_family(text, text, text, int) from public, anon;
revoke execute on function public.invite_info(text) from public, anon;
revoke execute on function public.join_family(text, text, text) from public, anon;
revoke execute on function public.delete_me(uuid) from public, anon;
grant execute on function public.create_family(text, text, text, int) to authenticated;
grant execute on function public.invite_info(text) to authenticated;
grant execute on function public.join_family(text, text, text) to authenticated;
grant execute on function public.delete_me(uuid) to authenticated;
grant execute on function public.my_family_codes() to authenticated;
grant execute on function public.my_member_ids() to authenticated;

-- Meal photos. The bucket is public-read so photos load fast, but each file name is a
-- long random id that only the family ever receives. Only family members can add or remove files.
insert into storage.buckets (id, name, public) values ('meal-photos', 'meal-photos', true)
  on conflict (id) do nothing;

drop policy if exists "photos: family can add" on storage.objects;
create policy "photos: family can add" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'meal-photos' and (storage.foldername(name))[1] in (select public.my_family_codes()));

drop policy if exists "photos: family can replace" on storage.objects;
create policy "photos: family can replace" on storage.objects
  for update to authenticated
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] in (select public.my_family_codes()));

drop policy if exists "photos: family can read" on storage.objects;
create policy "photos: family can read" on storage.objects
  for select to authenticated
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] in (select public.my_family_codes()));

drop policy if exists "photos: family can remove" on storage.objects;
create policy "photos: family can remove" on storage.objects
  for delete to authenticated
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] in (select public.my_family_codes()));
