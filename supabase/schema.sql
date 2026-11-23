-- Amader database. Paste this whole file into the Supabase SQL editor and press Run.
-- It is safe to run more than once.
--
-- How privacy works: nobody makes an account. Each phone signs in anonymously,
-- and the rules below only show a phone the families it has joined.
-- The 8 letter family code is the only way in, so treat it like a house key.
-- A phone that types 10 wrong codes in an hour has to wait before trying again.

create extension if not exists pgcrypto;

create table if not exists public.families (
  code text primary key,
  goal_food text not null default 'Rice',
  goal_handfuls int not null default 2 check (goal_handfuls between 1 and 4),
  created_at timestamptz not null default now()
);

-- Photos live in a folder named by this random id, not by the family code. A photo link that
-- gets copied somewhere therefore never gives away the code that lets people join.
alter table public.families add column if not exists folder uuid not null default gen_random_uuid();
create unique index if not exists families_folder on public.families (folder);

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
-- Filled in by food recognition (supabase/functions/recognize-meal).
alter table public.meals add column if not exists dish text;
alter table public.meals add column if not exists parts jsonb;
create index if not exists meals_family_time on public.meals (family_code, eaten_at desc);

create table if not exists public.hearts (
  meal_id uuid not null references public.meals (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (meal_id, member_id)
);

-- Round two (2026-11-17): the whole plate, snacks, fasting, notes, voice and who you ate with.
alter table public.meals drop constraint if exists meals_slot_check;
alter table public.meals add constraint meals_slot_check
  check (slot in ('breakfast', 'lunch', 'dinner', 'snack', 'suhoor', 'iftar', 'fasting'));
alter table public.meals add column if not exists protein int check (protein between 0 and 4);
alter table public.meals add column if not exists veg int check (veg between 0 and 4);
alter table public.meals add column if not exists note text check (note is null or char_length(note) <= 280);
alter table public.meals add column if not exists voice_url text check (voice_url is null or char_length(voice_url) <= 200);
alter table public.meals add column if not exists with_ids uuid[] not null default '{}' check (cardinality(with_ids) <= 8);
alter table public.meals add column if not exists with_others text check (with_others is null or char_length(with_others) <= 80);
alter table public.meals add column if not exists party boolean not null default false;
-- Which grain was on the plate this time, and "I ate this too" for a meal shared by someone at the same table.
alter table public.meals add column if not exists grain text check (grain is null or char_length(grain) <= 24);
-- The dishes on the plate, each with its kind and amount: [{"name":"Dal","kind":"main","amount":1}]. At most 12, kept small.
alter table public.meals add column if not exists items jsonb check (items is null or (jsonb_typeof(items) = 'array' and jsonb_array_length(items) <= 12 and pg_column_size(items) <= 4000));
alter table public.meals add column if not exists same_as uuid references public.meals (id) on delete set null;
-- The other food groups: pieces of fruit and cups of milk, yoghurt or lassi.
alter table public.meals add column if not exists fruit int check (fruit between 0 and 4);
alter table public.meals add column if not exists dairy int check (dairy between 0 and 4);
-- When the meal was shared (eaten_at can be earlier). Used to send "Mom shared lunch" only once, right away.
alter table public.meals add column if not exists created_at timestamptz not null default now();
-- Family quests: this week's theme (null means the app picks by week) and Puti's costumes the family has earned.
alter table public.families add column if not exists quest text check (quest is null or char_length(quest) <= 24);
alter table public.families add column if not exists costumes text[] not null default '{}' check (cardinality(costumes) <= 40);

-- Real-life quest ticks that a photo can't show, like "we walked after dinner". One per person, day and kind.
create table if not exists public.ticks (
  family_code text not null references public.families (code) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  day date not null,
  kind text not null check (char_length(kind) <= 24),
  created_at timestamptz not null default now(),
  primary key (member_id, day, kind)
);
create index if not exists ticks_family_day on public.ticks (family_code, day desc);

-- Where to send "Mom shared lunch". Only the server reads it: no one in the family can select it.
alter table public.members add column if not exists push_token text check (push_token is null or char_length(push_token) <= 200);

-- Notes between family members: "You're doing great, Ammi!"
create table if not exists public.cheers (
  id uuid primary key default gen_random_uuid(),
  family_code text not null references public.families (code) on delete cascade,
  from_id uuid not null references public.members (id) on delete cascade,
  to_id uuid not null references public.members (id) on delete cascade,
  meal_id uuid references public.meals (id) on delete cascade,
  text text not null check (char_length(text) between 1 and 200),
  created_at timestamptz not null default now()
);
create index if not exists cheers_family_time on public.cheers (family_code, created_at desc);

-- The family recipe book.
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  family_code text not null references public.families (code) on delete cascade,
  added_by uuid not null references public.members (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  from_whom text not null default '' check (char_length(from_whom) <= 40),
  ingredients text not null default '' check (char_length(ingredients) <= 3000),
  steps text not null default '' check (char_length(steps) <= 6000),
  story text check (story is null or char_length(story) <= 1000),
  photo_url text check (photo_url is null or char_length(photo_url) <= 200),
  voice_url text check (voice_url is null or char_length(voice_url) <= 200),
  created_at timestamptz not null default now()
);
create index if not exists recipes_family on public.recipes (family_code, created_at desc);

-- Dishes the family taught Amader: what goes in them, as foods from the app's food database.
-- Lets the app judge any home dish by what's in it. Newest wins when a name is taught twice.
create table if not exists public.family_dishes (
  id uuid primary key default gen_random_uuid(),
  family_code text not null references public.families (code) on delete cascade,
  added_by uuid not null references public.members (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  parts jsonb not null check (jsonb_typeof(parts) = 'array' and jsonb_array_length(parts) between 1 and 8 and octet_length(parts::text) <= 1200),
  created_at timestamptz not null default now()
);
create index if not exists family_dishes_family on public.family_dishes (family_code, created_at desc);

-- Keep what a phone can write small and sane, so one bad actor in a family cannot fill the database.
alter table public.families drop constraint if exists families_goal_food_len;
alter table public.families add constraint families_goal_food_len check (char_length(goal_food) between 1 and 30);
alter table public.meals drop constraint if exists meals_dish_len;
alter table public.meals add constraint meals_dish_len check (dish is null or char_length(dish) <= 80);
alter table public.meals drop constraint if exists meals_parts_small;
alter table public.meals add constraint meals_parts_small check (parts is null or pg_column_size(parts) <= 400);
alter table public.meals drop constraint if exists meals_photo_len;
alter table public.meals add constraint meals_photo_len check (photo_url is null or char_length(photo_url) <= 200);

-- Wrong family codes typed by each phone, so codes cannot be guessed by trying many.
-- No rules are written for this table, which means no phone can read or change it directly.
create table if not exists public.code_tries (
  user_id uuid not null,
  tried_at timestamptz not null default now()
);
create index if not exists code_tries_user on public.code_tries (user_id, tried_at);
alter table public.code_tries enable row level security;

-- Photos sent to food recognition by each phone, so nobody can run up the AI bill.
-- Written only by the recognize-meal function. No phone can read or change it directly.
create table if not exists public.recognitions (
  user_id uuid not null,
  at timestamptz not null default now()
);
create index if not exists recognitions_user on public.recognitions (user_id, at);
alter table public.recognitions enable row level security;

-- "Help improve Amader". Off by default. A row is only written for a person who turned it on,
-- one row per meal: what the app guessed and what the person said it really was.
-- The photo itself is not copied. The row points at the family's own photo and is removed with
-- the meal, so deleting a meal or leaving the family takes it out of the dataset as well.
create table if not exists public.examples (
  meal_id uuid primary key references public.meals (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  photo_path text not null,
  goal_food text not null,
  -- What food recognition said, or null when it was off or had no answer.
  guess jsonb,
  -- What the person saved. This is the label.
  handfuls int check (handfuls between 0 and 4),
  -- How they chose it: kept the guess, tapped a number, or measured with their hand.
  chosen_by text not null default 'tap' check (chosen_by in ('guess', 'tap', 'hand')),
  created_at timestamptz not null default now()
);
create index if not exists examples_member on public.examples (member_id);

-- Helpers the rules use. They run with owner rights so the rules don't loop back on themselves.
create or replace function public.my_family_codes() returns setof text
language sql stable security definer set search_path = public as $$
  select family_code from public.members where user_id = auth.uid()
$$;

create or replace function public.my_family_folders() returns setof text
language sql stable security definer set search_path = public as $$
  select f.folder::text from public.families f
  where f.code in (select family_code from public.members where user_id = auth.uid())
$$;

-- The family a meal belongs to, for "I ate this too" links. Only answers for the caller's own families.
create or replace function public.meal_family(m uuid) returns text
language sql stable security definer set search_path = public as $$
  select family_code from public.meals where id = m and family_code in (select family_code from public.members where user_id = auth.uid())
$$;

create or replace function public.my_member_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select id from public.members where user_id = auth.uid()
$$;

alter table public.families enable row level security;
alter table public.members enable row level security;
alter table public.meals enable row level security;
alter table public.hearts enable row level security;
alter table public.examples enable row level security;

-- A person can add, see and take back only their own examples. Nobody else in the app can read them.
drop policy if exists "examples: see my own" on public.examples;
create policy "examples: see my own" on public.examples
  for select to authenticated using (member_id in (select public.my_member_ids()));

drop policy if exists "examples: add my own" on public.examples;
create policy "examples: add my own" on public.examples
  for insert to authenticated
  with check (
    member_id in (select public.my_member_ids())
    and meal_id in (select m.id from public.meals m where m.member_id = examples.member_id)
    -- The row may only point at that meal's own photo.
    and photo_path = (select m.photo_url from public.meals m where m.id = examples.meal_id)
  );

drop policy if exists "examples: take back my own" on public.examples;
create policy "examples: take back my own" on public.examples
  for delete to authenticated using (member_id in (select public.my_member_ids()));

alter table public.cheers enable row level security;
alter table public.recipes enable row level security;
alter table public.family_dishes enable row level security;

drop policy if exists "cheers: family can read" on public.cheers;
create policy "cheers: family can read" on public.cheers
  for select to authenticated using (family_code in (select public.my_family_codes()));

drop policy if exists "cheers: send my own" on public.cheers;
create policy "cheers: send my own" on public.cheers
  for insert to authenticated
  with check (
    from_id in (select public.my_member_ids())
    and family_code in (select m.family_code from public.members m where m.id = from_id)
    and to_id in (select m.id from public.members m where m.family_code = cheers.family_code)
    and (meal_id is null or meal_id in (select x.id from public.meals x where x.family_code = cheers.family_code))
  );

drop policy if exists "cheers: take back my own" on public.cheers;
create policy "cheers: take back my own" on public.cheers
  for delete to authenticated using (from_id in (select public.my_member_ids()));

drop policy if exists "recipes: family can read" on public.recipes;
create policy "recipes: family can read" on public.recipes
  for select to authenticated using (family_code in (select public.my_family_codes()));

drop policy if exists "recipes: add my own" on public.recipes;
create policy "recipes: add my own" on public.recipes
  for insert to authenticated
  with check (
    added_by in (select public.my_member_ids())
    and family_code in (select m.family_code from public.members m where m.id = added_by)
    and (photo_url is null or photo_url = (select f.folder::text from public.families f where f.code = family_code) || '/recipes/' || id || '.jpg')
    and (voice_url is null or voice_url = (select f.folder::text from public.families f where f.code = family_code) || '/recipes/' || id || '.m4a')
  );

drop policy if exists "recipes: remove my own" on public.recipes;
create policy "recipes: remove my own" on public.recipes
  for delete to authenticated using (added_by in (select public.my_member_ids()));

drop policy if exists "family dishes: family can read" on public.family_dishes;
create policy "family dishes: family can read" on public.family_dishes
  for select to authenticated using (family_code in (select public.my_family_codes()));

drop policy if exists "family dishes: add my own" on public.family_dishes;
create policy "family dishes: add my own" on public.family_dishes
  for insert to authenticated
  with check (
    added_by in (select public.my_member_ids())
    and family_code in (select m.family_code from public.members m where m.id = added_by)
  );

drop policy if exists "family dishes: remove my own" on public.family_dishes;
create policy "family dishes: remove my own" on public.family_dishes
  for delete to authenticated using (added_by in (select public.my_member_ids()));

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
    and eaten_at between now() - interval '2 days' and now() + interval '1 day'
    -- A photo may only point into this family's own folder.
    and (photo_url is null or photo_url = (select f.folder::text from public.families f where f.code = family_code) || '/' || id || '.jpg')
    and (voice_url is null or voice_url = (select f.folder::text from public.families f where f.code = family_code) || '/' || id || '.m4a')
    -- Only people from this family can be tagged.
    and with_ids <@ array(select m.id from public.members m where m.family_code = meals.family_code)
    -- "I ate this too" can only point at a meal in the same family.
    and (same_as is null or public.meal_family(same_as) = family_code)
  );

drop policy if exists "meals: delete my own" on public.meals;
create policy "meals: delete my own" on public.meals
  for delete to authenticated using (member_id in (select public.my_member_ids()));

alter table public.ticks enable row level security;
drop policy if exists "ticks: family can read" on public.ticks;
create policy "ticks: family can read" on public.ticks
  for select to authenticated using (family_code in (select public.my_family_codes()));
drop policy if exists "ticks: tick my own" on public.ticks;
create policy "ticks: tick my own" on public.ticks
  for insert to authenticated
  with check (
    member_id in (select public.my_member_ids())
    and family_code in (select m.family_code from public.members m where m.id = member_id)
    and day between current_date - 7 and current_date + 1
  );
drop policy if exists "ticks: untick my own" on public.ticks;
create policy "ticks: untick my own" on public.ticks
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
  if (select count(*) from public.members where user_id = auth.uid()) >= 5 then
    raise exception 'This phone is already in the most families allowed.';
  end if;
  loop
    select string_agg(substr(v_letters, 1 + floor(random() * length(v_letters))::int, 1), '')
      into v_code from generate_series(1, 8);
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

-- Stops a phone that keeps typing wrong codes. Called before every code lookup.
create or replace function public.check_code_tries() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  delete from public.code_tries where tried_at < now() - interval '1 day';
  if (select count(*) from public.code_tries where user_id = auth.uid() and tried_at > now() - interval '1 hour') >= 10 then
    raise exception 'Too many wrong codes. Please wait an hour and try again.';
  end if;
end;
$$;

-- What the join screen shows before someone joins: who invited them and the name saved for them.
create or replace function public.invite_info(p_code text)
returns json language plpgsql volatile security definer set search_path = public as $$
declare
  v_code text := upper(trim(p_code));
begin
  perform public.check_code_tries();
  if not exists (select 1 from public.families where code = v_code) then
    insert into public.code_tries (user_id) values (auth.uid());
    return null;
  end if;
  return json_build_object(
    'parent_name', (select name from public.members where family_code = v_code and role = 'parent' and not joined order by created_at limit 1),
    'from_name', (select name from public.members where family_code = v_code and joined order by created_at limit 1),
    'waiting', (select coalesce(json_agg(name order by created_at), '[]'::json) from public.members where family_code = v_code and role = 'parent' and not joined),
    'helpers', (select coalesce(json_agg(name order by created_at), '[]'::json) from public.members where family_code = v_code and role = 'child' and not joined)
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
  perform public.check_code_tries();
  if not exists (select 1 from public.families where code = v_code) then
    insert into public.code_tries (user_id) values (auth.uid());
    return null;
  end if;
  select id into v_me from public.members where family_code = v_code and user_id = auth.uid() limit 1;
  if v_me is not null then
    return json_build_object('code', v_code, 'me_id', v_me);
  end if;
  if p_role = 'parent' then
    -- Several people can be looked after. Take the seat saved under their name, else the first free one.
    select id into v_me from public.members
      where family_code = v_code and role = 'parent' and not joined
      order by (lower(name) = lower(trim(coalesce(p_name, '')))) desc, created_at limit 1 for update;
  else
    -- A sibling or helper the family added: take the seat saved under their name.
    select id into v_me from public.members
      where family_code = v_code and role = 'child' and not joined and lower(name) = lower(trim(coalesce(p_name, '')))
      order by created_at limit 1 for update;
  end if;
  if v_me is not null then
    update public.members
      set user_id = auth.uid(), joined = true, name = coalesce(nullif(trim(p_name), ''), name)
      where id = v_me;
    return json_build_object('code', v_code, 'me_id', v_me);
  end if;
  if (select count(*) from public.members where user_id = auth.uid()) >= 5 then
    raise exception 'This phone is already in the most families allowed.';
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

-- A new empty seat they take when they join with the family code: someone looked after ('parent'),
-- or someone else at the table, like a sibling who helps ('child').
drop function if exists public.add_person(text, text);
create or replace function public.add_person(p_code text, p_name text, p_role text default 'parent')
returns json language plpgsql security definer set search_path = public as $$
declare
  v_row public.members;
begin
  if not exists (select 1 from public.members where family_code = p_code and user_id = auth.uid() and joined) then
    raise exception 'Not in this family';
  end if;
  if (select count(*) from public.members where family_code = p_code) >= 8 then
    raise exception 'This family table is full';
  end if;
  insert into public.members (family_code, user_id, name, role, tint, joined)
    values (p_code, null, trim(p_name), case when p_role = 'child' then 'child' else 'parent' end, (select count(*) from public.members where family_code = p_code)::int % 4, false)
    returning * into v_row;
  return json_build_object('id', v_row.id, 'name', v_row.name, 'role', v_row.role, 'tint', v_row.tint, 'joined', v_row.joined);
end;
$$;

-- Saves where this phone gets notifications. Only for the caller's own seat.
create or replace function public.save_push_token(p_member uuid, p_token text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.members set push_token = nullif(trim(p_token), '') where id = p_member and user_id = auth.uid();
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
revoke execute on function public.add_person(text, text, text) from public, anon;
revoke execute on function public.save_push_token(uuid, text) from public, anon;
grant execute on function public.add_person(text, text, text) to authenticated;
grant execute on function public.save_push_token(uuid, text) to authenticated;
revoke execute on function public.check_code_tries() from public, anon, authenticated;
grant execute on function public.my_family_codes() to authenticated;
grant execute on function public.meal_family(uuid) to authenticated;
grant execute on function public.my_family_folders() to authenticated;
grant execute on function public.my_member_ids() to authenticated;

-- Meal photos. The bucket is private: a photo only opens for a signed-in phone that belongs to
-- the family, through a link that stops working after an hour. The file path starts with the family's random folder id.
-- Only JPEG photos up to 3 MB are accepted, so the bucket cannot be used to host other files.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('meal-photos', 'meal-photos', false, 3145728, array['image/jpeg'])
  on conflict (id) do update set public = false, file_size_limit = 3145728, allowed_mime_types = array['image/jpeg'];

-- Voice notes on meals and recipes. Same rules as photos: private, family only, short files.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('meal-voice', 'meal-voice', false, 3145728, array['audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/aac', 'audio/webm'])
  on conflict (id) do update set public = false, file_size_limit = 3145728, allowed_mime_types = array['audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/aac', 'audio/webm'];

drop policy if exists "photos: family can add" on storage.objects;
create policy "photos: family can add" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('meal-photos', 'meal-voice') and (storage.foldername(name))[1] in (select public.my_family_folders()));

-- Nobody can swap a photo for another one after it is shared.
drop policy if exists "photos: family can replace" on storage.objects;

drop policy if exists "photos: family can read" on storage.objects;
create policy "photos: family can read" on storage.objects
  for select to authenticated
  using (bucket_id in ('meal-photos', 'meal-voice') and (storage.foldername(name))[1] in (select public.my_family_folders()));

-- Only the person who added a photo can remove it.
drop policy if exists "photos: family can remove" on storage.objects;
drop policy if exists "photos: remove my own" on storage.objects;
create policy "photos: remove my own" on storage.objects
  for delete to authenticated
  using (bucket_id in ('meal-photos', 'meal-voice') and owner_id = (select auth.uid())::text);

-- What a phone may touch at all, on top of the row rules above. Anything not listed here is refused,
-- so a rule left out by mistake later cannot open a table.
revoke all on all tables in schema public from anon, authenticated;
grant select on public.families to authenticated;
grant update (goal_food, goal_handfuls, quest, costumes) on public.families to authenticated;
grant select, insert, delete on public.ticks to authenticated;
-- Not user_id: family members never need each other's sign-in ids.
grant select (id, family_code, name, role, tint, joined, created_at) on public.members to authenticated;
grant select, insert, delete on public.meals to authenticated;
grant select, insert, delete on public.hearts to authenticated;
grant select, insert, delete on public.examples to authenticated;
grant select, insert, delete on public.cheers to authenticated;
grant select, insert, delete on public.recipes to authenticated;
grant select, insert, delete on public.family_dishes to authenticated;
-- A phone that is not signed in can run nothing.
revoke execute on all functions in schema public from anon, public;
