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
-- ISOLATION TEST: do it in the app, not the SQL editor (the editor runs as a
-- superuser and bypasses RLS). Sign in as user A, insert a food, sign out, sign
-- in as user B, run supabase.from('foods').select('*'): expect [] and no error.
-- With a fresh project and one signed-in user, the same select returns [] too.

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
  with check (user_id = auth.uid());
