-- =========================================================================
-- DÍVIDA ZERO AI - SUPABASE DATABASE RECONCILIATION & SECURITY SCHEMA
-- Safe, Idempotent, Zero-DROP, Zero-Overwrite Reconciliation Script
-- =========================================================================

-- 1. Enable UUID extension
create extension if not exists "uuid-ossp";

-- =========================================================================
-- 2. Base Table Creation (For fresh environments; existing tables are
--    reconciled in Sections 3, 4, 5, 6 and 7 below)
-- =========================================================================

-- 2.1 Profiles Table (Extends auth.users)
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
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

-- 2.2 Debts Table (Composite PK (user_id, id) prevents cross-user ID collisions)
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
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  primary key (user_id, id)
);

-- 2.3 Installments Table (Composite PK and composite FK to debts(user_id, id))
create table if not exists public.installments (
  id text not null,
  debt_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  installment_number integer not null,
  amount numeric(12, 2) not null default 0,
  due_date text not null,
  status text not null default 'pendente',
  paid_at timestamp with time zone,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  primary key (user_id, id),
  foreign key (user_id, debt_id) references public.debts(user_id, id) on delete cascade
);

-- 2.4 Payments Table (Composite PK and composite FK to debts(user_id, id))
create table if not exists public.payments (
  id text not null,
  debt_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12, 2) not null default 0,
  payment_date text not null,
  payment_type text not null default 'regular',
  receipt_url text,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  primary key (user_id, id),
  foreign key (user_id, debt_id) references public.debts(user_id, id) on delete cascade
);

-- 2.5 Goals Table (Composite PK (user_id, id) prevents cross-user ID collisions)
create table if not exists public.goals (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  monthly_reduction_goal numeric(12, 2) not null default 0,
  extra_payment_goal numeric(12, 2) not null default 0,
  target_payoff_date text not null,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  primary key (user_id, id)
);

-- =========================================================================
-- 3. Column Reconciliation for Pre-Existing Tables (Zero-Overwrite)
--    Adds any missing required columns, sets safe defaults for future rows,
--    and validates data types and nullability without modifying existing data.
-- =========================================================================

-- 3.1 Add missing columns on public.profiles
alter table public.profiles add column if not exists id uuid;
alter table public.profiles add column if not exists name text default 'Usuário Dívida Zero';
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists currency text default 'BRL';
alter table public.profiles add column if not exists role text default 'user';
alter table public.profiles add column if not exists hide_values_on_dashboard boolean default false;
alter table public.profiles add column if not exists allow_ai_data_analysis boolean default true;
alter table public.profiles add column if not exists biometric_lock boolean default false;
alter table public.profiles add column if not exists notification_preferences jsonb default '{
  "enabled": true,
  "notify7Days": true,
  "notify3Days": true,
  "notify1Day": true,
  "notifyDueDay": true,
  "notifyOverdue": true,
  "emailSummary": false
}'::jsonb;
alter table public.profiles add column if not exists created_at timestamp with time zone default timezone('utc'::text, now());
alter table public.profiles add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now());

-- Enforce defaults on public.profiles (affects only future inserts)
alter table public.profiles alter column name set default 'Usuário Dívida Zero';
alter table public.profiles alter column currency set default 'BRL';
alter table public.profiles alter column role set default 'user';
alter table public.profiles alter column hide_values_on_dashboard set default false;
alter table public.profiles alter column allow_ai_data_analysis set default true;
alter table public.profiles alter column biometric_lock set default false;
alter table public.profiles alter column notification_preferences set default '{
  "enabled": true,
  "notify7Days": true,
  "notify3Days": true,
  "notify1Day": true,
  "notifyDueDay": true,
  "notifyOverdue": true,
  "emailSummary": false
}'::jsonb;
alter table public.profiles alter column created_at set default timezone('utc'::text, now());
alter table public.profiles alter column updated_at set default timezone('utc'::text, now());

-- 3.2 Add missing columns on public.debts
alter table public.debts add column if not exists id text;
alter table public.debts add column if not exists user_id uuid;
alter table public.debts add column if not exists title text;
alter table public.debts add column if not exists creditor text;
alter table public.debts add column if not exists category text default 'Outros';
alter table public.debts add column if not exists total_amount numeric(12, 2) default 0;
alter table public.debts add column if not exists remaining_amount numeric(12, 2) default 0;
alter table public.debts add column if not exists monthly_payment numeric(12, 2) default 0;
alter table public.debts add column if not exists due_date text;
alter table public.debts add column if not exists status text default 'em_dia';
alter table public.debts add column if not exists installments_total integer default 1;
alter table public.debts add column if not exists installments_paid integer default 0;
alter table public.debts add column if not exists interest_rate numeric(6, 2) default 0;
alter table public.debts add column if not exists created_at timestamp with time zone default timezone('utc'::text, now());
alter table public.debts add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now());

-- Enforce defaults on public.debts
alter table public.debts alter column category set default 'Outros';
alter table public.debts alter column total_amount set default 0;
alter table public.debts alter column remaining_amount set default 0;
alter table public.debts alter column monthly_payment set default 0;
alter table public.debts alter column status set default 'em_dia';
alter table public.debts alter column installments_total set default 1;
alter table public.debts alter column installments_paid set default 0;
alter table public.debts alter column interest_rate set default 0;
alter table public.debts alter column created_at set default timezone('utc'::text, now());
alter table public.debts alter column updated_at set default timezone('utc'::text, now());

-- 3.3 Add missing columns on public.installments
alter table public.installments add column if not exists id text;
alter table public.installments add column if not exists debt_id text;
alter table public.installments add column if not exists user_id uuid;
alter table public.installments add column if not exists installment_number integer;
alter table public.installments add column if not exists amount numeric(12, 2) default 0;
alter table public.installments add column if not exists due_date text;
alter table public.installments add column if not exists status text default 'pendente';
alter table public.installments add column if not exists paid_at timestamp with time zone;
alter table public.installments add column if not exists created_at timestamp with time zone default timezone('utc'::text, now());
alter table public.installments add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now());

-- Enforce defaults on public.installments
alter table public.installments alter column amount set default 0;
alter table public.installments alter column status set default 'pendente';
alter table public.installments alter column created_at set default timezone('utc'::text, now());
alter table public.installments alter column updated_at set default timezone('utc'::text, now());

-- 3.4 Add missing columns on public.payments
alter table public.payments add column if not exists id text;
alter table public.payments add column if not exists debt_id text;
alter table public.payments add column if not exists user_id uuid;
alter table public.payments add column if not exists amount numeric(12, 2) default 0;
alter table public.payments add column if not exists payment_date text;
alter table public.payments add column if not exists payment_type text default 'regular';
alter table public.payments add column if not exists receipt_url text;
alter table public.payments add column if not exists created_at timestamp with time zone default timezone('utc'::text, now());
alter table public.payments add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now());

-- Enforce defaults on public.payments
alter table public.payments alter column amount set default 0;
alter table public.payments alter column payment_type set default 'regular';
alter table public.payments alter column created_at set default timezone('utc'::text, now());
alter table public.payments alter column updated_at set default timezone('utc'::text, now());

-- 3.5 Add missing columns on public.goals
alter table public.goals add column if not exists id text;
alter table public.goals add column if not exists user_id uuid;
alter table public.goals add column if not exists title text;
alter table public.goals add column if not exists monthly_reduction_goal numeric(12, 2) default 0;
alter table public.goals add column if not exists extra_payment_goal numeric(12, 2) default 0;
alter table public.goals add column if not exists target_payoff_date text;
alter table public.goals add column if not exists created_at timestamp with time zone default timezone('utc'::text, now());
alter table public.goals add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now());

-- Enforce defaults on public.goals
alter table public.goals alter column monthly_reduction_goal set default 0;
alter table public.goals alter column extra_payment_goal set default 0;
alter table public.goals alter column created_at set default timezone('utc'::text, now());
alter table public.goals alter column updated_at set default timezone('utc'::text, now());

-- 3.6 Audit Column Types & Enforce NOT NULL on Required Columns (Without Overwriting Data)
do $$
declare
  v_col record;
  v_actual_type text;
  v_is_nullable text;
  v_has_nulls boolean;
begin
  for v_col in
    select *
    from (
      values
        -- profiles
        ('profiles', 'id', 'uuid', true),
        ('profiles', 'name', 'text', true),
        ('profiles', 'email', 'text', false),
        ('profiles', 'avatar_url', 'text', false),
        ('profiles', 'currency', 'text', true),
        ('profiles', 'role', 'text', true),
        ('profiles', 'hide_values_on_dashboard', 'boolean', true),
        ('profiles', 'allow_ai_data_analysis', 'boolean', true),
        ('profiles', 'biometric_lock', 'boolean', true),
        ('profiles', 'notification_preferences', 'jsonb', true),
        ('profiles', 'created_at', 'timestamp with time zone', true),
        ('profiles', 'updated_at', 'timestamp with time zone', true),
        -- debts
        ('debts', 'id', 'text', true),
        ('debts', 'user_id', 'uuid', true),
        ('debts', 'title', 'text', true),
        ('debts', 'creditor', 'text', true),
        ('debts', 'category', 'text', true),
        ('debts', 'total_amount', 'numeric', true),
        ('debts', 'remaining_amount', 'numeric', true),
        ('debts', 'monthly_payment', 'numeric', true),
        ('debts', 'due_date', 'text', true),
        ('debts', 'status', 'text', true),
        ('debts', 'installments_total', 'integer', true),
        ('debts', 'installments_paid', 'integer', true),
        ('debts', 'interest_rate', 'numeric', true),
        ('debts', 'created_at', 'timestamp with time zone', true),
        ('debts', 'updated_at', 'timestamp with time zone', true),
        -- installments
        ('installments', 'id', 'text', true),
        ('installments', 'debt_id', 'text', true),
        ('installments', 'user_id', 'uuid', true),
        ('installments', 'installment_number', 'integer', true),
        ('installments', 'amount', 'numeric', true),
        ('installments', 'due_date', 'text', true),
        ('installments', 'status', 'text', true),
        ('installments', 'paid_at', 'timestamp with time zone', false),
        ('installments', 'created_at', 'timestamp with time zone', true),
        ('installments', 'updated_at', 'timestamp with time zone', true),
        -- payments
        ('payments', 'id', 'text', true),
        ('payments', 'debt_id', 'text', true),
        ('payments', 'user_id', 'uuid', true),
        ('payments', 'amount', 'numeric', true),
        ('payments', 'payment_date', 'text', true),
        ('payments', 'payment_type', 'text', true),
        ('payments', 'receipt_url', 'text', false),
        ('payments', 'created_at', 'timestamp with time zone', true),
        ('payments', 'updated_at', 'timestamp with time zone', true),
        -- goals
        ('goals', 'id', 'text', true),
        ('goals', 'user_id', 'uuid', true),
        ('goals', 'title', 'text', true),
        ('goals', 'monthly_reduction_goal', 'numeric', true),
        ('goals', 'extra_payment_goal', 'numeric', true),
        ('goals', 'target_payoff_date', 'text', true),
        ('goals', 'created_at', 'timestamp with time zone', true),
        ('goals', 'updated_at', 'timestamp with time zone', true)
    ) as expected(table_name, column_name, expected_type, must_be_not_null)
  loop
    select c.data_type, c.is_nullable
      into v_actual_type, v_is_nullable
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = v_col.table_name
      and c.column_name = v_col.column_name;

    if v_actual_type is null then
      raise exception 'Coluna obrigatória ausente após reconciliação: public.%.%',
        v_col.table_name, v_col.column_name;
    end if;

    -- Allow character varying when text is expected, or numeric/double precision compatibility check
    if v_actual_type <> v_col.expected_type
       and not (v_col.expected_type = 'text' and v_actual_type = 'character varying') then
      raise exception 'Conflito de tipo em public.%.%: esperado "%", encontrado "%". Requer inspeção manual antes de converter.',
        v_col.table_name, v_col.column_name, v_col.expected_type, v_actual_type;
    end if;

    if v_col.must_be_not_null and v_is_nullable = 'YES' then
      execute format(
        'select exists (select 1 from public.%I where %I is null)',
        v_col.table_name,
        v_col.column_name
      ) into v_has_nulls;

      if v_has_nulls then
        raise exception 'Registros existentes possuem NULL na coluna obrigatória public.%.%. Corrija os registros nulos antes de aplicar NOT NULL (nenhum dado foi sobrescrito).',
          v_col.table_name, v_col.column_name;
      end if;

      execute format(
        'alter table public.%I alter column %I set not null',
        v_col.table_name,
        v_col.column_name
      );
    end if;
  end loop;
end
$$;

-- =========================================================================
-- 4. Primary Keys, UNIQUE Constraints, and Foreign Keys Reconciliation
--    Inspects pg_constraint by actual column composition (not just names).
--    Never drops existing constraints; raises explicit errors on conflicts.
-- =========================================================================

do $$
declare
  v_pk_cols text[];
  v_tbl text;
  v_has_composite_uq boolean;
  v_has_user_fk boolean;
  v_user_fk_deltype "char";
  v_has_debt_fk boolean;
  v_debt_fk_deltype "char";
  v_orphan_count bigint;
  v_dup_count bigint;
begin
  -- 4.1 Reconcile Primary Key on public.profiles (expected: (id))
  select array_agg(a.attname::text order by k.ord)
    into v_pk_cols
  from pg_catalog.pg_constraint co
  join pg_catalog.pg_class cl on cl.oid = co.conrelid
  join pg_catalog.pg_namespace ns on ns.oid = cl.relnamespace
  cross join lateral unnest(co.conkey) with ordinality as k(attnum, ord)
  join pg_catalog.pg_attribute a on a.attrelid = cl.oid and a.attnum = k.attnum
  where ns.nspname = 'public'
    and cl.relname = 'profiles'
    and co.contype = 'p'
  group by co.oid;

  if v_pk_cols is null then
    select count(*) into v_dup_count
    from (
      select id from public.profiles group by id having count(*) > 1
    ) d;
    if v_dup_count > 0 then
      raise exception 'Não é possível adicionar PRIMARY KEY (id) em public.profiles: existem % IDs duplicados.', v_dup_count;
    end if;
    alter table public.profiles add constraint profiles_pkey primary key (id);
  elsif v_pk_cols <> array['id'] then
    raise exception 'Chave primária divergente em public.profiles: esperado (id), encontrado (%).', array_to_string(v_pk_cols, ', ');
  end if;

  -- 4.2 Reconcile Primary Keys and UNIQUE (user_id, id) on debts, installments, payments, goals
  foreach v_tbl in array array['debts', 'installments', 'payments', 'goals']
  loop
    v_pk_cols := null;

    select array_agg(a.attname::text order by k.ord)
      into v_pk_cols
    from pg_catalog.pg_constraint co
    join pg_catalog.pg_class cl on cl.oid = co.conrelid
    join pg_catalog.pg_namespace ns on ns.oid = cl.relnamespace
    cross join lateral unnest(co.conkey) with ordinality as k(attnum, ord)
    join pg_catalog.pg_attribute a on a.attrelid = cl.oid and a.attnum = k.attnum
    where ns.nspname = 'public'
      and cl.relname = v_tbl
      and co.contype = 'p'
    group by co.oid;

    if v_pk_cols is null then
      execute format(
        'select count(*) from (select user_id, id from public.%I group by user_id, id having count(*) > 1) d',
        v_tbl
      ) into v_dup_count;

      if v_dup_count > 0 then
        raise exception 'Não é possível adicionar PRIMARY KEY (user_id, id) em public.%: existem % pares (user_id, id) duplicados.',
          v_tbl, v_dup_count;
      end if;

      execute format(
        'alter table public.%I add constraint %I primary key (user_id, id)',
        v_tbl,
        v_tbl || '_pkey'
      );
      v_pk_cols := array['user_id', 'id'];
    elsif v_pk_cols <> array['user_id', 'id'] and v_pk_cols <> array['id'] then
      raise exception 'Chave primária incompatível em public.%: esperado (user_id, id) ou (id), encontrado (%).',
        v_tbl, array_to_string(v_pk_cols, ', ');
    end if;

    -- Ensure an explicit UNIQUE or PK constraint on exact column order (user_id, id)
    -- Required for composite foreign keys referencing debts(user_id, id) and composite upserts
    select exists (
      select 1
      from pg_catalog.pg_constraint co
      join pg_catalog.pg_class cl on cl.oid = co.conrelid
      join pg_catalog.pg_namespace ns on ns.oid = cl.relnamespace
      where ns.nspname = 'public'
        and cl.relname = v_tbl
        and co.contype in ('p', 'u')
        and (
          select array_agg(a.attname::text order by k.ord)
          from unnest(co.conkey) with ordinality as k(attnum, ord)
          join pg_catalog.pg_attribute a on a.attrelid = cl.oid and a.attnum = k.attnum
        ) = array['user_id', 'id']
    ) into v_has_composite_uq;

    if not v_has_composite_uq then
      execute format(
        'select count(*) from (select user_id, id from public.%I group by user_id, id having count(*) > 1) d',
        v_tbl
      ) into v_dup_count;

      if v_dup_count > 0 then
        raise exception 'Não é possível adicionar UNIQUE (user_id, id) em public.%: existem % pares (user_id, id) duplicados.',
          v_tbl, v_dup_count;
      end if;

      execute format(
        'alter table public.%I add constraint %I unique (user_id, id)',
        v_tbl,
        'uq_' || v_tbl || '_user_id_id'
      );
    end if;
  end loop;

  -- 4.3 Reconcile Foreign Keys to auth.users(id) ON DELETE CASCADE across all 5 tables
  -- 4.3.a profiles(id) -> auth.users(id)
  select true, co.confdeltype
    into v_has_user_fk, v_user_fk_deltype
  from pg_catalog.pg_constraint co
  join pg_catalog.pg_class cl on cl.oid = co.conrelid
  join pg_catalog.pg_namespace ns on ns.oid = cl.relnamespace
  where ns.nspname = 'public'
    and cl.relname = 'profiles'
    and co.contype = 'f'
    and co.confrelid = 'auth.users'::regclass
    and (
      select array_agg(a.attname::text order by k.ord)
      from unnest(co.conkey) with ordinality as k(attnum, ord)
      join pg_catalog.pg_attribute a on a.attrelid = cl.oid and a.attnum = k.attnum
    ) = array['id']
    and (
      select array_agg(af.attname::text order by kf.ord)
      from unnest(co.confkey) with ordinality as kf(attnum, ord)
      join pg_catalog.pg_attribute af on af.attrelid = co.confrelid and af.attnum = kf.attnum
    ) = array['id']
  limit 1;

  if not coalesce(v_has_user_fk, false) then
    select count(*) into v_orphan_count
    from public.profiles p
    where not exists (select 1 from auth.users u where u.id = p.id);

    if v_orphan_count > 0 then
      raise exception 'Não é possível adicionar FK profiles(id) -> auth.users(id): existem % perfis órfãos sem usuário em auth.users.',
        v_orphan_count;
    end if;

    alter table public.profiles
      add constraint fk_profiles_auth_user
      foreign key (id) references auth.users(id) on delete cascade;
  elsif v_user_fk_deltype <> 'c' then
    raise exception 'FK de public.profiles(id) -> auth.users(id) existe, mas não está configurada com ON DELETE CASCADE (confdeltype=%).',
      v_user_fk_deltype;
  end if;

  -- 4.3.b debts, installments, payments, goals (user_id) -> auth.users(id)
  foreach v_tbl in array array['debts', 'installments', 'payments', 'goals']
  loop
    v_has_user_fk := false;
    v_user_fk_deltype := null;

    select true, co.confdeltype
      into v_has_user_fk, v_user_fk_deltype
    from pg_catalog.pg_constraint co
    join pg_catalog.pg_class cl on cl.oid = co.conrelid
    join pg_catalog.pg_namespace ns on ns.oid = cl.relnamespace
    where ns.nspname = 'public'
      and cl.relname = v_tbl
      and co.contype = 'f'
      and co.confrelid = 'auth.users'::regclass
      and (
        select array_agg(a.attname::text order by k.ord)
        from unnest(co.conkey) with ordinality as k(attnum, ord)
        join pg_catalog.pg_attribute a on a.attrelid = cl.oid and a.attnum = k.attnum
      ) = array['user_id']
      and (
        select array_agg(af.attname::text order by kf.ord)
        from unnest(co.confkey) with ordinality as kf(attnum, ord)
        join pg_catalog.pg_attribute af on af.attrelid = co.confrelid and af.attnum = kf.attnum
      ) = array['id']
    limit 1;

    if not coalesce(v_has_user_fk, false) then
      execute format(
        'select count(*) from public.%I t where not exists (select 1 from auth.users u where u.id = t.user_id)',
        v_tbl
      ) into v_orphan_count;

      if v_orphan_count > 0 then
        raise exception 'Não é possível adicionar FK %.user_id -> auth.users(id): existem % registros órfãos sem usuário correspondente.',
          v_tbl, v_orphan_count;
      end if;

      execute format(
        'alter table public.%I add constraint %I foreign key (user_id) references auth.users(id) on delete cascade',
        v_tbl,
        'fk_' || v_tbl || '_auth_user'
      );
    elsif v_user_fk_deltype <> 'c' then
      raise exception 'FK de public.%(user_id) -> auth.users(id) existe, mas não está configurada com ON DELETE CASCADE (confdeltype=%).',
        v_tbl, v_user_fk_deltype;
    end if;
  end loop;

  -- 4.4 Reconcile Composite Foreign Keys (user_id, debt_id) -> public.debts(user_id, id) ON DELETE CASCADE
  foreach v_tbl in array array['installments', 'payments']
  loop
    v_has_debt_fk := false;
    v_debt_fk_deltype := null;

    select true, co.confdeltype
      into v_has_debt_fk, v_debt_fk_deltype
    from pg_catalog.pg_constraint co
    join pg_catalog.pg_class cl on cl.oid = co.conrelid
    join pg_catalog.pg_namespace ns on ns.oid = cl.relnamespace
    where ns.nspname = 'public'
      and cl.relname = v_tbl
      and co.contype = 'f'
      and co.confrelid = 'public.debts'::regclass
      and (
        select array_agg(a.attname::text order by k.ord)
        from unnest(co.conkey) with ordinality as k(attnum, ord)
        join pg_catalog.pg_attribute a on a.attrelid = cl.oid and a.attnum = k.attnum
      ) = array['user_id', 'debt_id']
      and (
        select array_agg(af.attname::text order by kf.ord)
        from unnest(co.confkey) with ordinality as kf(attnum, ord)
        join pg_catalog.pg_attribute af on af.attrelid = co.confrelid and af.attnum = kf.attnum
      ) = array['user_id', 'id']
    limit 1;

    if not coalesce(v_has_debt_fk, false) then
      execute format(
        'select count(*) from public.%I c where not exists (select 1 from public.debts d where d.user_id = c.user_id and d.id = c.debt_id)',
        v_tbl
      ) into v_orphan_count;

      if v_orphan_count > 0 then
        raise exception 'Não é possível adicionar FK composta %.(user_id, debt_id) -> debts(user_id, id): existem % registros órfãos ou vinculados a dívida de outro usuário.',
          v_tbl, v_orphan_count;
      end if;

      execute format(
        'alter table public.%I add constraint %I foreign key (user_id, debt_id) references public.debts(user_id, id) on delete cascade',
        v_tbl,
        'fk_' || v_tbl || '_user_debt'
      );
    elsif v_debt_fk_deltype <> 'c' then
      raise exception 'FK composta de public.%(user_id, debt_id) -> public.debts(user_id, id) existe, mas não possui ON DELETE CASCADE (confdeltype=%).',
        v_tbl, v_debt_fk_deltype;
    end if;
  end loop;
end
$$;

-- =========================================================================
-- 5. Indices for Rapid Querying by user_id and Relationships
-- =========================================================================

create index if not exists idx_debts_user_id on public.debts(user_id);
create index if not exists idx_installments_user_id on public.installments(user_id);
create index if not exists idx_installments_user_debt on public.installments(user_id, debt_id);
create index if not exists idx_payments_user_id on public.payments(user_id);
create index if not exists idx_payments_user_debt on public.payments(user_id, debt_id);
create index if not exists idx_goals_user_id on public.goals(user_id);

-- =========================================================================
-- 6. Schema & Table Permissions (Defense-in-Depth)
--    Revokes table access from public/anon and grants CRUD to authenticated
-- =========================================================================

grant usage on schema public to postgres, anon, authenticated, service_role, supabase_auth_admin;

revoke all on table
  public.profiles,
  public.debts,
  public.installments,
  public.payments,
  public.goals
from public, anon;

grant select, insert, update, delete on table
  public.profiles,
  public.debts,
  public.installments,
  public.payments,
  public.goals
to authenticated;

grant all privileges on table
  public.profiles,
  public.debts,
  public.installments,
  public.payments,
  public.goals
to postgres, service_role, supabase_auth_admin;

do $$
declare
  v_tbl text;
  v_priv text;
begin
  foreach v_tbl in array array['profiles', 'debts', 'installments', 'payments', 'goals']
  loop
    foreach v_priv in array array['SELECT', 'INSERT', 'UPDATE', 'DELETE']
    loop
      if not has_table_privilege('authenticated', 'public.' || v_tbl, v_priv) then
        raise exception 'Permissão % ausente para a role authenticated na tabela public.%.', v_priv, v_tbl;
      end if;

      if has_table_privilege('anon', 'public.' || v_tbl, v_priv) then
        raise exception 'Permissão indevida % concedida para a role anon na tabela public.%.', v_priv, v_tbl;
      end if;
    end loop;
  end loop;
end
$$;

-- =========================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES & STRICT ISOLATION AUDIT
--    Users can ONLY select, insert, update, and delete their OWN rows
-- =========================================================================

alter table public.profiles enable row level security;
alter table public.debts enable row level security;
alter table public.installments enable row level security;
alter table public.payments enable row level security;
alter table public.goals enable row level security;

do $$
declare
  v_tbl text;
  v_rls_enabled boolean;
  v_existing_cmd text;
  v_existing_permissive text;
  v_unexpected record;
  v_policy_count integer;
begin
  -- Verify RLS is enabled on all 5 tables
  foreach v_tbl in array array['profiles', 'debts', 'installments', 'payments', 'goals']
  loop
    select c.relrowsecurity
      into v_rls_enabled
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = v_tbl;

    if not coalesce(v_rls_enabled, false) then
      raise exception 'RLS não está ativo na tabela public.%.', v_tbl;
    end if;
  end loop;

  -- Check that no pre-existing policy with our target names has an incompatible command or restrictive mode
  for v_unexpected in
    select p.tablename, p.policyname, p.cmd, p.permissive, e.expected_cmd
    from pg_catalog.pg_policies p
    join (
      values
        ('profiles', 'Users can view own profile', 'SELECT'),
        ('profiles', 'Users can insert own profile', 'INSERT'),
        ('profiles', 'Users can update own profile', 'UPDATE'),
        ('profiles', 'Users can delete own profile', 'DELETE'),
        ('debts', 'Users can view own debts', 'SELECT'),
        ('debts', 'Users can insert own debts', 'INSERT'),
        ('debts', 'Users can update own debts', 'UPDATE'),
        ('debts', 'Users can delete own debts', 'DELETE'),
        ('installments', 'Users can view own installments', 'SELECT'),
        ('installments', 'Users can insert own installments', 'INSERT'),
        ('installments', 'Users can update own installments', 'UPDATE'),
        ('installments', 'Users can delete own installments', 'DELETE'),
        ('payments', 'Users can view own payments', 'SELECT'),
        ('payments', 'Users can insert own payments', 'INSERT'),
        ('payments', 'Users can update own payments', 'UPDATE'),
        ('payments', 'Users can delete own payments', 'DELETE'),
        ('goals', 'Users can view own goals', 'SELECT'),
        ('goals', 'Users can insert own goals', 'INSERT'),
        ('goals', 'Users can update own goals', 'UPDATE'),
        ('goals', 'Users can delete own goals', 'DELETE')
    ) as e(tablename, policyname, expected_cmd)
      on p.tablename = e.tablename and p.policyname = e.policyname
    where p.schemaname = 'public'
      and (p.cmd <> e.expected_cmd or p.permissive <> 'PERMISSIVE')
  loop
    raise exception 'Política pré-existente %.% possui tipo/comando incompatível (encontrado cmd=%, permissive=%; esperado cmd=%, PERMISSIVE).',
      v_unexpected.tablename, v_unexpected.policyname, v_unexpected.cmd, v_unexpected.permissive, v_unexpected.expected_cmd;
  end loop;

  -- 7.1 PROFILES POLICIES
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

  -- 7.2 DEBTS POLICIES
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

  -- 7.3 INSTALLMENTS POLICIES (validates user_id and parent debt ownership)
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'installments' and policyname = 'Users can view own installments') then
    create policy "Users can view own installments" on public.installments for select to authenticated
      using (auth.uid() = user_id);
  else
    alter policy "Users can view own installments" on public.installments to authenticated
      using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'installments' and policyname = 'Users can insert own installments') then
    create policy "Users can insert own installments" on public.installments for insert to authenticated
      with check (auth.uid() = user_id and exists (select 1 from public.debts d where d.user_id = auth.uid() and d.id = installments.debt_id));
  else
    alter policy "Users can insert own installments" on public.installments to authenticated
      with check (auth.uid() = user_id and exists (select 1 from public.debts d where d.user_id = auth.uid() and d.id = installments.debt_id));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'installments' and policyname = 'Users can update own installments') then
    create policy "Users can update own installments" on public.installments for update to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id and exists (select 1 from public.debts d where d.user_id = auth.uid() and d.id = installments.debt_id));
  else
    alter policy "Users can update own installments" on public.installments to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id and exists (select 1 from public.debts d where d.user_id = auth.uid() and d.id = installments.debt_id));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'installments' and policyname = 'Users can delete own installments') then
    create policy "Users can delete own installments" on public.installments for delete to authenticated
      using (auth.uid() = user_id);
  else
    alter policy "Users can delete own installments" on public.installments to authenticated
      using (auth.uid() = user_id);
  end if;

  -- 7.4 PAYMENTS POLICIES (validates user_id and parent debt ownership)
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'payments' and policyname = 'Users can view own payments') then
    create policy "Users can view own payments" on public.payments for select to authenticated
      using (auth.uid() = user_id);
  else
    alter policy "Users can view own payments" on public.payments to authenticated
      using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'payments' and policyname = 'Users can insert own payments') then
    create policy "Users can insert own payments" on public.payments for insert to authenticated
      with check (auth.uid() = user_id and exists (select 1 from public.debts d where d.user_id = auth.uid() and d.id = payments.debt_id));
  else
    alter policy "Users can insert own payments" on public.payments to authenticated
      with check (auth.uid() = user_id and exists (select 1 from public.debts d where d.user_id = auth.uid() and d.id = payments.debt_id));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'payments' and policyname = 'Users can update own payments') then
    create policy "Users can update own payments" on public.payments for update to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id and exists (select 1 from public.debts d where d.user_id = auth.uid() and d.id = payments.debt_id));
  else
    alter policy "Users can update own payments" on public.payments to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id and exists (select 1 from public.debts d where d.user_id = auth.uid() and d.id = payments.debt_id));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'payments' and policyname = 'Users can delete own payments') then
    create policy "Users can delete own payments" on public.payments for delete to authenticated
      using (auth.uid() = user_id);
  else
    alter policy "Users can delete own payments" on public.payments to authenticated
      using (auth.uid() = user_id);
  end if;

  -- 7.5 GOALS POLICIES
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

  -- 7.6 Audit for unexpected, permissive-role, or FOR ALL policies on the 5 tables
  for v_unexpected in
    select tablename, policyname, cmd, roles, qual, with_check
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename in ('profiles', 'debts', 'installments', 'payments', 'goals')
      and (
        cmd = 'ALL'
        or roles <> array['authenticated']::name[]
        or policyname not in (
          'Users can view own profile', 'Users can insert own profile', 'Users can update own profile', 'Users can delete own profile',
          'Users can view own debts', 'Users can insert own debts', 'Users can update own debts', 'Users can delete own debts',
          'Users can view own installments', 'Users can insert own installments', 'Users can update own installments', 'Users can delete own installments',
          'Users can view own payments', 'Users can insert own payments', 'Users can update own payments', 'Users can delete own payments',
          'Users can view own goals', 'Users can insert own goals', 'Users can update own goals', 'Users can delete own goals'
        )
      )
  loop
    raise exception 'Política RLS divergente ou não autorizada detectada em %.% (cmd=%, roles=%): USING=% | WITH CHECK=%',
      v_unexpected.tablename, v_unexpected.policyname, v_unexpected.cmd, v_unexpected.roles, v_unexpected.qual, v_unexpected.with_check;
  end loop;

  select count(*)
    into v_policy_count
  from pg_catalog.pg_policies
  where schemaname = 'public'
    and tablename in ('profiles', 'debts', 'installments', 'payments', 'goals');

  if v_policy_count <> 20 then
    raise exception 'Total de políticas RLS nas 5 tabelas difere do esperado (esperado: 20, encontrado: %).', v_policy_count;
  end if;
end
$$;

-- =========================================================================
-- 8. PROFILE AUTO-CREATION TRIGGER (Hardened SECURITY DEFINER, Zero-DROP)
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
      nullif(pg_catalog.btrim(new.raw_user_meta_data->>'name'), ''),
      nullif(pg_catalog.btrim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(pg_catalog.split_part(coalesce(new.email, ''), '@', 1), ''),
      'Usuário Dívida Zero'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to postgres, service_role, supabase_auth_admin;

do $$
declare
  v_tg_enabled "char";
  v_tg_func regproc;
  v_tg_type smallint;
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

  -- Verify trigger configuration on auth.users
  select t.tgenabled, t.tgfoid::regproc, t.tgtype
    into v_tg_enabled, v_tg_func, v_tg_type
  from pg_catalog.pg_trigger t
  join pg_catalog.pg_class c on c.oid = t.tgrelid
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where not t.tgisinternal
    and n.nspname = 'auth'
    and c.relname = 'users'
    and t.tgname = 'on_auth_user_created';

  if v_tg_func is null then
    raise exception 'Trigger on_auth_user_created não foi encontrado em auth.users.';
  end if;

  if v_tg_func <> 'public.handle_new_user'::regproc then
    raise exception 'Trigger on_auth_user_created em auth.users aponta para função divergente: % (esperado: public.handle_new_user).',
      v_tg_func;
  end if;

  if v_tg_enabled = 'D' then
    raise exception 'Trigger on_auth_user_created existe em auth.users, porém está desabilitado (tgenabled=D).';
  end if;

  -- Bitmask check: ROW (1=1), BEFORE (2=0 -> AFTER), INSERT (4=4)
  if (v_tg_type & 1) = 0 or (v_tg_type & 2) <> 0 or (v_tg_type & 4) = 0 then
    raise exception 'Trigger on_auth_user_created em auth.users possui evento/timing divergente (tgtype=%). Esperado AFTER INSERT FOR EACH ROW.',
      v_tg_type;
  end if;
end
$$;

notify pgrst, 'reload schema';
