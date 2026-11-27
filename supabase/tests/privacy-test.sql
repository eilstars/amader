-- Privacy and data-flow checks for supabase/schema.sql, run against a throwaway local Postgres (16+).
-- It stubs Supabase's auth and storage, loads the schema twice, then acts as different phones.
-- Run from the repo root:  psql -q -f supabase/tests/privacy-test.sql
-- Lines marked "must fail next" should be followed by an ERROR. Everything else should say t or the row count it names.

drop database if exists amtest;
create database amtest;
\c amtest
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin; exception when duplicate_object then null; end $$;
create schema auth; create schema storage;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text, owner_id text);
alter table storage.objects enable row level security;
grant select, insert, delete on storage.objects to authenticated;
create function storage.foldername(name text) returns text[] language sql as $$ select string_to_array(name, '/') $$;
grant usage on schema auth, storage, public to authenticated;
\set ON_ERROR_STOP 0
\set QUIET on
\i supabase/schema.sql
\i supabase/schema.sql
\set QUIET off
set role authenticated;
set test.uid = '11111111-1111-1111-1111-111111111111';
select public.create_family('Nadia','Ammi','Rice',2) as fam \gset
select (:'fam'::json->>'code') as code, (:'fam'::json->>'me_id') as me \gset
select 'T1 code is 8 safe letters', :'code' ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$';
select folder as folder from families \gset
set test.uid = '22222222-2222-2222-2222-222222222222';
select public.join_family(:'code', 'Ammi', 'parent') as j \gset
select (:'j'::json->>'me_id') as ammi \gset
-- Ammi uploads a photo from her old phone and shares the meal
insert into storage.objects (bucket_id, name, owner_id) values ('meal-photos', :'folder' || '/aaaaaaaa-0000-0000-0000-0000000000a1.jpg', '22222222-2222-2222-2222-222222222222');
insert into meals (id, family_code, member_id, slot, handfuls, grain, photo_url) values ('aaaaaaaa-0000-0000-0000-0000000000a1', :'code', :'ammi', 'dinner', 2.5, 'Rice', :'folder' || '/aaaaaaaa-0000-0000-0000-0000000000a1.jpg');
select 'T2 cannot share a meal as someone else (must fail next)';
insert into meals (family_code, member_id, slot) values (:'code', :'me', 'lunch');
select 'T3 cannot edit path directly (must fail next)';
update families set path = '{}'::jsonb;
-- Nadia makes a link for Ammi
set test.uid = '11111111-1111-1111-1111-111111111111';
select public.make_rejoin(:'code', :'ammi'::uuid) as tok \gset
select 'T4 token is 12 safe letters', :'tok' ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{12}$';
select 'T5 maker cannot claim it (must fail next)';
select public.claim_rejoin(:'tok');
select 'T6 Nadia cannot delete Ammi''s photo (0 rows)';
delete from storage.objects where name like '%a1.jpg';
-- Ammi on a new phone
set test.uid = '55555555-5555-5555-5555-555555555555';
select 'T7 claim works', public.claim_rejoin(:'tok') is not null;
select 'T8 new phone can delete the old phone''s photo (1 row)';
delete from storage.objects where name like '%a1.jpg';
-- outsider
set test.uid = '99999999-9999-9999-9999-999999999999';
select 'T9 outsider sees nothing', (select count(*) from meals), (select count(*) from members), (select count(*) from families), (select count(*) from hearts), (select count(*) from cheers), (select count(*) from storage.objects);
select 'T10 nobody reads sign-in ids or push addresses (must fail next)';
set test.uid = '11111111-1111-1111-1111-111111111111';
select user_id from members;
select push_token from members;
select 'T11 phones cannot read tokens, events, metrics, dataset, counters (5 failures next)';
select * from rejoin_tokens;
select * from events;
select * from pilot_metrics;
select * from dataset;
select * from code_tries;
select 'T12 phones cannot call internal helpers (2 failures next)';
select public.random_code(8);
select * from public.stale_families(now());
reset role;
select 'T13 dataset takes halves', (insert_ok) from (select true as insert_ok) x;
insert into dataset (id, goal_food, handfuls, chosen_by, shared_month) values (gen_random_uuid(), 'Rice', 2.5, 'tap', '2026-11');
select 'T14 metrics label is not the code', family <> :'code' and length(family) = 8 from pilot_metrics;
