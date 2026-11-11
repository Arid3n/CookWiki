-- 0001_library.sql
-- Purpose: CookWiki library schema. Creates `foods` and `food_variants` with
-- row level security (each user sees and writes only their own rows).
-- Does not touch, alter or drop any existing table. Safe to re-run.
--
-- HOW TO RUN: paste the whole file into the Supabase dashboard SQL editor and run.
--
-- VERIFY afterwards (paste in SQL editor):
--
--   -- 1. RLS enabled on both tables (expect rowsecurity = true for both)
--   select tablename, rowsecurity from pg_tables
--   where schemaname = 'public' and tablename in ('foods', 'food_variants');
--
--   -- 2. One policy per table, role authenticated, cmd ALL (expect 2 rows)
--   select tablename, policyname, roles, cmd, qual, with_check from pg_policies
--   where schemaname = 'public' and tablename in ('foods', 'food_variants');
--
--   -- 3. Triggers and indexes present
--   select tgname, tgrelid::regclass from pg_trigger
--   where not tgisinternal and tgrelid in ('public.foods'::regclass, 'public.food_variants'::regclass);
--   select indexname from pg_indexes
--   where schemaname = 'public' and tablename in ('foods', 'food_variants');
--
--   -- 4. Function present, SECURITY INVOKER (prosecdef = false), search_path set
--   select proname, prosecdef, proconfig from pg_proc
--   where pronamespace = 'public'::regnamespace
--     and proname in ('set_updated_at', 'set_default_variant');
--
-- ISOLATION TEST (SQL editor). The editor runs as a superuser, so switch role
-- inside a transaction. Replace <uuid-A> and <uuid-B> with two real ids from
-- `select id from auth.users limit 2;` (user_id has an FK to auth.users).
-- Everything is rolled back; the last statement is expected to fail.
--
--   begin;
--   set local role authenticated;
--   select set_config('request.jwt.claims', '{"sub":"<uuid-A>","role":"authenticated"}', true);
--   insert into public.foods (kind, name) values ('single', 'iso-test') returning id;  -- note the id
--   select count(*) from public.foods;                -- A sees its own row: 1 or more
--   select set_config('request.jwt.claims', '{"sub":"<uuid-B>","role":"authenticated"}', true);
--   select count(*) from public.foods;                -- B sees none of A's rows: 0
--   insert into public.food_variants (food_id, kcal, protein, carbs, fat)
--     values ('<food-id-from-A>', 1, 1, 1, 1);        -- expected ERROR: row-level security violation
--   rollback;
--
-- Also test in the app: sign in as A, insert a food, sign out, sign in as B,
-- supabase.from('foods').select('*') returns [] and no error.
--
-- APP NOTE: the app repository must promote a default variant with
-- supabase.rpc('set_default_variant', { p_food_id, p_variant_id }), also when
-- promoting a new default after deleting the current default variant. Never set
-- is_default with two separate client updates (unique index would be violated).

-- Tables ---------------------------------------------------------------------

create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id),
  kind text not null check (kind in ('dish', 'single')),
  name text not null check (length(btrim(name)) > 0),
  pinned boolean not null default false,
  tags text[] not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.food_variants (
  id uuid primary key default gen_random_uuid(),
  food_id uuid not null references public.foods (id) on delete cascade,
  user_id uuid not null default auth.uid(),
  label text not null default 'Normal',
  is_default boolean not null default false,
  kcal numeric not null check (kcal >= 0),
  protein numeric not null check (protein >= 0),
  carbs numeric not null check (carbs >= 0),
  fat numeric not null check (fat >= 0),
  sat_fat numeric check (sat_fat >= 0),
  sugar numeric check (sugar >= 0),
  fiber numeric check (fiber >= 0),
  sodium_mg numeric check (sodium_mg >= 0),
  kcal_min numeric,
  kcal_max numeric,
  confidence text check (confidence in ('low', 'medium', 'high')),
  ingredients jsonb,
  updated_at timestamptz default now()
);

-- Indexes --------------------------------------------------------------------

create unique index if not exists food_variants_one_default_per_food
  on public.food_variants (food_id) where is_default;

create index if not exists foods_user_id_updated_at_idx
  on public.foods (user_id, updated_at);

-- updated_at trigger -----------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists foods_set_updated_at on public.foods;
create trigger foods_set_updated_at
  before update on public.foods
  for each row execute function public.set_updated_at();

drop trigger if exists food_variants_set_updated_at on public.food_variants;
create trigger food_variants_set_updated_at
  before update on public.food_variants
  for each row execute function public.set_updated_at();

-- Row level security -----------------------------------------------------------

alter table public.foods enable row level security;
alter table public.food_variants enable row level security;

drop policy if exists foods_owner_all on public.foods;
create policy foods_owner_all on public.foods
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists food_variants_owner_all on public.food_variants;
create policy food_variants_owner_all on public.food_variants
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.foods f
      where f.id = food_id and f.user_id = auth.uid()
    )
  );

-- Default variant promotion ------------------------------------------------------
-- SECURITY INVOKER: RLS applies to the caller. Clears the old default first, then
-- sets the new one, in a single call, so the one-default-per-food index is never
-- violated. Raises (and rolls back the whole call) if the variant is not in the food.

create or replace function public.set_default_variant(p_food_id uuid, p_variant_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.food_variants
    set is_default = false
    where food_id = p_food_id and is_default and id <> p_variant_id;

  update public.food_variants
    set is_default = true
    where id = p_variant_id and food_id = p_food_id;
  get diagnostics v_count = row_count;

  if v_count = 0 then
    raise exception 'variant % does not belong to food %', p_variant_id, p_food_id;
  end if;
end;
$$;

revoke execute on function public.set_default_variant(uuid, uuid) from public, anon;
grant execute on function public.set_default_variant(uuid, uuid) to authenticated;
