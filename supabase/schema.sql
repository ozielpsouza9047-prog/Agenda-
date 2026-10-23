-- =========================================================================
-- Dívida Zero AI - Supabase Production Schema with Row Level Security (RLS)
-- Safe, Idempotent, Zero-DROP Migration Script
-- =========================================================================

-- 1. Enable UUID extension
create extension if not exists "uuid-ossp";

-- 2. Profiles Table (Extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'Usuário Dívida Zero',
  email text,
  avatar_url text,
  currency text not null default 'BRL',
  role text not null default 'user',
  hide_values_on_dashboard boolean not null default false,
  allow_ai_data_analysis boolean not null default true,
  biometric_lock boolean not null default false,
  notification_preferences jsonb not null default '{
    "enabled": true,
    "notify7Days": true,
    "notify3Days": true,
    "notify1Day": true,
    "notifyDueDay": true,
    "notifyOverdue": true,
    "emailSummary": false
  }'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Debts Table (Composite PK (user_id, id) prevents cross-user short ID collisions)
create table if not exists public.debts (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  creditor text not null,
  category text not null default 'Outros',
  total_amount numeric(12, 2) not null default 0,
  remaining_amount numeric(12, 2) not null default 0,
  monthly_payment numeric(12, 2) not null default 0,
  due_date text not null,
  status text not null default 'em_dia',
  installments_total integer not null default 1,
  installments_paid integer not null default 0,
  interest_rate numeric(6, 2) not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, id)
);

-- 4. Installments Table (Composite PK and composite FK to debts(user_id, id))
create table if not exists public.installments (
  id text not null,
  debt_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  installment_number integer not null,
  amount numeric(12, 2) not null,
  due_date text not null,
  status text not null default 'pendente',
  paid_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, id),
  foreign key (user_id, debt_id) references public.debts(user_id, id) on delete cascade
);

-- 5. Payments Table (Composite PK and composite FK to debts(user_id, id))
create table if not exists public.payments (
  id text not null,
  debt_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12, 2) not null,
  payment_date text not null,
  payment_type text not null default 'regular',
  receipt_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, id),
  foreign key (user_id, debt_id) references public.debts(user_id, id) on delete cascade
);

-- 6. Goals Table (Composite PK (user_id, id) prevents cross-user ID collisions)
create table if not exists public.goals (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  monthly_reduction_goal numeric(12, 2) not null default 0,
  extra_payment_goal numeric(12, 2) not null default 0,
  target_payoff_date text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, id)
);

-- 7. Indices for rapid querying by user_id and relationships
create index if not exists idx_debts_user_id on public.debts(user_id);
create index if not exists idx_installments_user_id on public.installments(user_id);
create index if not exists idx_installments_user_debt on public.installments(user_id, debt_id);
create index if not exists idx_payments_user_id on public.payments(user_id);
create index if not exists idx_payments_user_debt on public.payments(user_id, debt_id);
create index if not exists idx_goals_user_id on public.goals(user_id);

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Strict Isolation: users can ONLY select, insert, update and delete their OWN rows
-- =========================================================================

alter table public.profiles enable row level security;
alter table public.debts enable row level security;
alter table public.installments enable row level security;
alter table public.payments enable row level security;
alter table public.goals enable row level security;

do $$
declare
  v_unexpected record;
begin
  -- PROFILES POLICIES
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'Users can view own profile') then
    create policy "Users can view own profile" on public.profiles for select to authenticated using (auth.uid() = id);
  else
    alter policy "Users can view own profile" on public.profiles to authenticated using (auth.uid() = id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'Users can insert own profile') then
    create policy "Users can insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
  else
    alter policy "Users can insert own profile" on public.profiles to authenticated with check (auth.uid() = id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'Users can update own profile') then
    create policy "Users can update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
  else
    alter policy "Users can update own profile" on public.profiles to authenticated using (auth.uid() = id) with check (auth.uid() = id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'Users can delete own profile') then
    create policy "Users can delete own profile" on public.profiles for delete to authenticated using (auth.uid() = id);
  else
    alter policy "Users can delete own profile" on public.profiles to authenticated using (auth.uid() = id);
  end if;

  -- DEBTS POLICIES
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'debts' and policyname = 'Users can view own debts') then
    create policy "Users can view own debts" on public.debts for select to authenticated using (auth.uid() = user_id);
  else
    alter policy "Users can view own debts" on public.debts to authenticated using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'debts' and policyname = 'Users can insert own debts') then
    create policy "Users can insert own debts" on public.debts for insert to authenticated with check (auth.uid() = user_id);
  else
    alter policy "Users can insert own debts" on public.debts to authenticated with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'debts' and policyname = 'Users can update own debts') then
    create policy "Users can update own debts" on public.debts for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
  else
    alter policy "Users can update own debts" on public.debts to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'debts' and policyname = 'Users can delete own debts') then
    create policy "Users can delete own debts" on public.debts for delete to authenticated using (auth.uid() = user_id);
  else
    alter policy "Users can delete own debts" on public.debts to authenticated using (auth.uid() = user_id);
  end if;

  -- INSTALLMENTS POLICIES
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'installments' and policyname = 'Users can view own installments') then
    create policy "Users can view own installments" on public.installments for select to authenticated
      using (auth.uid() = user_id and exists (select 1 from public.debts d where d.user_id = auth.uid() and d.id = debt_id));
  else
    alter policy "Users can view own installments" on public.installments to authenticated
      using (auth.uid() = user_id and exists (select 1 from public.debts d where d.user_id = auth.uid() and d.id = debt_id));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'installments' and policyname = 'Users can insert own installments') then
    create policy "Users can insert own installments" on public.installments for insert to authenticated
      with check (auth.uid() = user_id and exists (select 1 from public.debts d where d.user_id = auth.uid() and d.id = debt_id));
  else
    alter policy "Users can insert own installments" on public.installments to authenticated
      with check (auth.uid() = user_id and exists (select 1 from public.debts d where d.user_id = auth.uid() and d.id = debt_id));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'installments' and policyname = 'Users can update own installments') then
    create policy "Users can update own installments" on public.installments for update to authenticated
      using (auth.uid() = user_id and exists (select 1 from public.debts d where d.user_id = auth.uid() and d.id = debt_id))
      with check (auth.uid() = user_id and exists (select 1 from public.debts d where d.user_id = auth.uid() and d.id = debt_id));
  else
    alter policy "Users can update own installments" on public.installments to authenticated
      using (auth.uid() = user_id and exists (select 1 from public.debts d where d.user_id = auth.uid() and d.id = debt_id))
      with check (auth.uid() = user_id and exists (select 1 from public.debts d where d.user_id = auth.uid() and d.id = debt_id));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'installments' and policyname = 'Users can delete own installments') then
    create policy "Users can delete own installments" on public.installments for delete to authenticated
      using (auth.uid() = user_id and exists (select 1 from public.debts d where d.user_id = auth.uid() and d.id = debt_id));
  else
    alter policy "Users can delete own installments" on public.installments to authenticated
      using (auth.uid() = user_id and exists (select 1 from public.debts d where d.user_id = auth.uid() and d.id = debt_id));
  end if;

  -- PAYMENTS POLICIES
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'payments' and policyname = 'Users can view own payments') then
    create policy "Users can view own payments" on public.payments for select to authenticated
      using (auth.uid() = user_id and exists (select 1 from public.debts d where d.user_id = auth.uid() and d.id = debt_id));
  else
    alter policy "Users can view own payments" on public.payments to authenticated
      using (auth.uid() = user_id and exists (select 1 from public.debts d where d.user_id = auth.uid() and d.id = debt_id));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'payments' and policyname = 'Users can insert own payments') then
    create policy "Users can insert own payments" on public.payments for insert to authenticated
      with check (auth.uid() = user_id and exists (select 1 from public.debts d where d.user_id = auth.uid() and d.id = debt_id));
  else
    alter policy "Users can insert own payments" on public.payments to authenticated
      with check (auth.uid() = user_id and exists (select 1 from public.debts d where d.user_id = auth.uid() and d.id = debt_id));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'payments' and policyname = 'Users can update own payments') then
    create policy "Users can update own payments" on public.payments for update to authenticated
      using (auth.uid() = user_id and exists (select 1 from public.debts d where d.user_id = auth.uid() and d.id = debt_id))
      with check (auth.uid() = user_id and exists (select 1 from public.debts d where d.user_id = auth.uid() and d.id = debt_id));
  else
    alter policy "Users can update own payments" on public.payments to authenticated
      using (auth.uid() = user_id and exists (select 1 from public.debts d where d.user_id = auth.uid() and d.id = debt_id))
      with check (auth.uid() = user_id and exists (select 1 from public.debts d where d.user_id = auth.uid() and d.id = debt_id));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'payments' and policyname = 'Users can delete own payments') then
    create policy "Users can delete own payments" on public.payments for delete to authenticated
      using (auth.uid() = user_id and exists (select 1 from public.debts d where d.user_id = auth.uid() and d.id = debt_id));
  else
    alter policy "Users can delete own payments" on public.payments to authenticated
      using (auth.uid() = user_id and exists (select 1 from public.debts d where d.user_id = auth.uid() and d.id = debt_id));
  end if;

  -- GOALS POLICIES
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'goals' and policyname = 'Users can view own goals') then
    create policy "Users can view own goals" on public.goals for select to authenticated using (auth.uid() = user_id);
  else
    alter policy "Users can view own goals" on public.goals to authenticated using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'goals' and policyname = 'Users can insert own goals') then
    create policy "Users can insert own goals" on public.goals for insert to authenticated with check (auth.uid() = user_id);
  else
    alter policy "Users can insert own goals" on public.goals to authenticated with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'goals' and policyname = 'Users can update own goals') then
    create policy "Users can update own goals" on public.goals for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
  else
    alter policy "Users can update own goals" on public.goals to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'goals' and policyname = 'Users can delete own goals') then
    create policy "Users can delete own goals" on public.goals for delete to authenticated using (auth.uid() = user_id);
  else
    alter policy "Users can delete own goals" on public.goals to authenticated using (auth.uid() = user_id);
  end if;

  -- Audit for unexpected or overly permissive policies on the 5 tables
  for v_unexpected in
    select tablename, policyname, cmd, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles', 'debts', 'installments', 'payments', 'goals')
      and (
        cmd = 'ALL'
        or policyname not in (
          'Users can view own profile', 'Users can insert own profile', 'Users can update own profile', 'Users can delete own profile',
          'Users can view own debts', 'Users can insert own debts', 'Users can update own debts', 'Users can delete own debts',
          'Users can view own installments', 'Users can insert own installments', 'Users can update own installments', 'Users can delete own installments',
          'Users can view own payments', 'Users can insert own payments', 'Users can update own payments', 'Users can delete own payments',
          'Users can view own goals', 'Users can insert own goals', 'Users can update own goals', 'Users can delete own goals'
        )
      )
  loop
    raise exception 'Política RLS divergente ou não autorizada detectada em %.% (cmd=%): USING=% | WITH CHECK=%',
      v_unexpected.tablename, v_unexpected.policyname, v_unexpected.cmd, v_unexpected.qual, v_unexpected.with_check;
  end loop;
end
$$;

-- =========================================================================
-- PROFILE AUTO-CREATION TRIGGER (Hardened SECURITY DEFINER, Zero-DROP)
-- =========================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'name',
      pg_catalog.split_part(new.email, '@', 1),
      'Usuário Dívida Zero'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to postgres, supabase_auth_admin;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_trigger t
    join pg_catalog.pg_class c on c.oid = t.tgrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where not t.tgisinternal
      and n.nspname = 'auth'
      and c.relname = 'users'
      and t.tgname = 'on_auth_user_created'
  ) then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row
      execute function public.handle_new_user();
  end if;
end
$$;

notify pgrst, 'reload schema';
