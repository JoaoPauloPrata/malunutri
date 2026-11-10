-- =====================================================================
-- Malu Nutri — schema base
-- Tudo fica no schema "nutri" (fora do schema "public"), então nada é
-- exposto pela API REST automática do Supabase: o acesso é só pela API .NET.
-- =====================================================================

create schema if not exists nutri;
create schema if not exists extensions;
create extension if not exists citext   with schema extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm  with schema extensions;

-- unaccent() não é IMMUTABLE; este wrapper permite usá-lo em colunas geradas e índices.
create or replace function nutri.f_normalize(p text)
returns text
language sql immutable parallel safe strict
set search_path = ''
as $$ select lower(extensions.unaccent('extensions.unaccent'::regdictionary, p)) $$;

-- Trigger genérica de updated_at
create or replace function nutri.tg_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- Perfis — 1:1 com auth.users (Supabase Auth cuida de senha, convite e recuperação)
-- ---------------------------------------------------------------------
create table nutri.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      extensions.citext not null unique,
  role       text not null check (role in ('nutritionist', 'patient')),
  full_name  text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_profiles_updated before update on nutri.profiles
  for each row execute function nutri.tg_set_updated_at();

-- E-mails autorizados a ter conta de nutricionista.
-- O papel nunca vem do cliente (raw_user_meta_data é editável pelo usuário).
create table nutri.nutritionist_allowlist (
  email      extensions.citext primary key,
  full_name  text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Pacientes
-- ---------------------------------------------------------------------
create table nutri.patients (
  id               uuid primary key default gen_random_uuid(),
  nutritionist_id  uuid not null references nutri.profiles(id) on delete cascade,
  user_id          uuid unique references nutri.profiles(id) on delete set null,
  full_name        text not null,
  email            extensions.citext,
  phone            text,
  birth_date       date,
  sex              text check (sex in ('F', 'M', 'O')),
  height_cm        numeric(5,1) check (height_cm between 50 and 250),
  goal             text,
  notes            text,
  protein_target_g numeric(6,1) not null default 100,
  water_target_ml  integer not null default 2500 check (water_target_ml > 0),
  status           text not null default 'active' check (status in ('active', 'paused', 'archived')),
  search_name      text generated always as (nutri.f_normalize(full_name)) stored,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (nutritionist_id, email)
);
create index ix_patients_nutritionist on nutri.patients (nutritionist_id, status);
create index ix_patients_search on nutri.patients using gin (search_name extensions.gin_trgm_ops);
create trigger trg_patients_updated before update on nutri.patients
  for each row execute function nutri.tg_set_updated_at();

-- ---------------------------------------------------------------------
-- Consultas + transcrição → prontuário
-- ---------------------------------------------------------------------
create table nutri.consultations (
  id                uuid primary key default gen_random_uuid(),
  patient_id        uuid not null references nutri.patients(id) on delete cascade,
  scheduled_at      timestamptz not null,
  duration_min      integer not null default 60 check (duration_min > 0),
  kind              text not null default 'retorno' check (kind in ('primeira', 'retorno')),
  status            text not null default 'agendada' check (status in ('agendada', 'realizada', 'cancelada')),
  transcript        text,
  chief_complaint   text,
  routine           text,
  physical_activity text,
  objective         text,
  clinical_notes    text,
  ai_processed_at   timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index ix_consultations_patient on nutri.consultations (patient_id, scheduled_at desc);
create index ix_consultations_day on nutri.consultations (scheduled_at);
create trigger trg_consultations_updated before update on nutri.consultations
  for each row execute function nutri.tg_set_updated_at();

-- ---------------------------------------------------------------------
-- Alimentos (base da balança de substituições)
-- ---------------------------------------------------------------------
create table nutri.foods (
  id              uuid primary key default gen_random_uuid(),
  name            text not null unique,
  food_group      text not null check (food_group in
                    ('carboidrato', 'proteina', 'leguminosa', 'fruta', 'laticinio', 'gordura', 'vegetal')),
  kcal_100g       numeric(6,1) not null check (kcal_100g >= 0),
  carb_100g       numeric(5,1) not null default 0,
  protein_100g    numeric(5,1) not null default 0,
  fat_100g        numeric(5,1) not null default 0,
  household_unit  text,          -- ex.: "1 pão"
  household_grams numeric(6,1),  -- gramas de 1 medida caseira
  search_name     text generated always as (nutri.f_normalize(name)) stored
);
create index ix_foods_group on nutri.foods (food_group);
create index ix_foods_search on nutri.foods using gin (search_name extensions.gin_trgm_ops);

-- ---------------------------------------------------------------------
-- Plano alimentar
-- ---------------------------------------------------------------------
create table nutri.meal_plans (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid not null references nutri.patients(id) on delete cascade,
  title        text not null default 'Plano alimentar',
  status       text not null default 'rascunho' check (status in ('rascunho', 'ativo', 'arquivado')),
  notes        text,
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
-- No máximo um plano ativo por paciente
create unique index ux_meal_plans_active on nutri.meal_plans (patient_id) where status = 'ativo';
create trigger trg_meal_plans_updated before update on nutri.meal_plans
  for each row execute function nutri.tg_set_updated_at();

create table nutri.meal_plan_items (
  id           uuid primary key default gen_random_uuid(),
  meal_plan_id uuid not null references nutri.meal_plans(id) on delete cascade,
  meal         text not null check (meal in ('cafe', 'lanche_manha', 'almoco', 'lanche_tarde', 'jantar', 'ceia')),
  meal_time    time not null,
  description  text not null,
  tip          text,          -- destaque, ex.: "Dá pra tomar no caminho"
  protein_g    numeric(5,1),  -- proteína estimada da refeição
  sort_order   integer not null default 0
);
create index ix_meal_plan_items_plan on nutri.meal_plan_items (meal_plan_id, meal_time);

-- Alimentos-base de cada refeição (permite a balança de trocas no app do paciente)
create table nutri.meal_plan_item_foods (
  id                uuid primary key default gen_random_uuid(),
  meal_plan_item_id uuid not null references nutri.meal_plan_items(id) on delete cascade,
  food_id           uuid not null references nutri.foods(id),
  grams             numeric(6,1) not null check (grams > 0)
);
create index ix_item_foods_item on nutri.meal_plan_item_foods (meal_plan_item_id);

-- ---------------------------------------------------------------------
-- Exames
-- ---------------------------------------------------------------------
create table nutri.exam_panels (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid not null references nutri.patients(id) on delete cascade,
  collected_at date not null,
  title        text not null default 'Exames laboratoriais',
  attention_note text,   -- "Pra validar": observação clínica
  created_at   timestamptz not null default now()
);
create index ix_exam_panels_patient on nutri.exam_panels (patient_id, collected_at desc);

create table nutri.exam_results (
  id        uuid primary key default gen_random_uuid(),
  panel_id  uuid not null references nutri.exam_panels(id) on delete cascade,
  exam_name text not null,
  value     numeric(10,2) not null,
  unit      text not null,
  ref_min   numeric(10,2),
  ref_max   numeric(10,2),
  -- Classificação automática a partir da faixa de referência
  status    text generated always as (
              case
                when ref_min is not null and value < ref_min then 'baixo'
                when ref_max is not null and value > ref_max then 'alto'
                else 'normal'
              end) stored
);
create index ix_exam_results_panel on nutri.exam_results (panel_id);

-- ---------------------------------------------------------------------
-- Check-in semanal
-- ---------------------------------------------------------------------
create table nutri.check_ins (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references nutri.patients(id) on delete cascade,
  week_start  date not null,
  adherence   smallint not null check (adherence between 1 and 5),
  hunger      text not null check (hunger in ('pouca', 'na_medida', 'muita_a_noite')),
  sleep       text not null check (sleep in ('bem', 'mais_ou_menos', 'mal')),
  hardest     text[] not null default '{}',
  weight_kg   numeric(5,1) check (weight_kg between 20 and 400),
  waist_cm    numeric(5,1) check (waist_cm between 30 and 250),
  comment     text,
  reviewed_at timestamptz,
  created_at  timestamptz not null default now(),
  unique (patient_id, week_start)
);
create index ix_check_ins_pending on nutri.check_ins (patient_id) where reviewed_at is null;

-- Normaliza a semana (segunda-feira) independentemente da data enviada
create or replace function nutri.tg_check_in_week()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.week_start := date_trunc('week', new.week_start)::date;
  return new;
end $$;
create trigger trg_check_ins_week before insert or update on nutri.check_ins
  for each row execute function nutri.tg_check_in_week();

-- ---------------------------------------------------------------------
-- Registro diário (água e proteína)
-- ---------------------------------------------------------------------
create table nutri.daily_logs (
  patient_id uuid not null references nutri.patients(id) on delete cascade,
  log_date   date not null,
  water_ml   integer not null default 0 check (water_ml >= 0),
  protein_g  numeric(6,1) not null default 0 check (protein_g >= 0),
  primary key (patient_id, log_date)
);

-- ---------------------------------------------------------------------
-- Recados da nutricionista
-- ---------------------------------------------------------------------
create table nutri.notes (
  id         uuid primary key default gen_random_uuid(),
  patient_id uuid not null references nutri.patients(id) on delete cascade,
  body       text not null check (length(body) between 1 and 2000),
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index ix_notes_patient on nutri.notes (patient_id, created_at desc);

-- ---------------------------------------------------------------------
-- Novo usuário no Supabase Auth → cria o perfil e vincula ao paciente
-- ---------------------------------------------------------------------
create or replace function nutri.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_role text;
begin
  -- Um erro aqui impediria o cadastro no Supabase Auth; usuários sem e-mail são ignorados.
  if new.email is null then
    return new;
  end if;

  -- search_path vazio: o operador = do citext não é resolvido, então comparamos com lower()
  select a.full_name into v_name from nutri.nutritionist_allowlist a where lower(a.email::text) = lower(new.email);

  if found then
    v_role := 'nutritionist';
  else
    v_role := 'patient';
    select p.full_name into v_name
    from nutri.patients p
    where lower(p.email::text) = lower(new.email) and p.user_id is null
    order by p.created_at desc limit 1;
  end if;

  insert into nutri.profiles (id, email, role, full_name)
  values (new.id, new.email, v_role, coalesce(v_name, split_part(new.email, '@', 1)))
  on conflict do nothing;

  -- só vincula se o perfil foi criado (senão a FK falharia e bloquearia o cadastro)
  if v_role = 'patient' and exists (select 1 from nutri.profiles pr where pr.id = new.id) then
    update nutri.patients set user_id = new.id
    where lower(email::text) = lower(new.email) and user_id is null;
  end if;

  return new;
end $$;

create trigger on_auth_user_created_nutri
  after insert on auth.users
  for each row execute function nutri.handle_new_auth_user();

-- O schema "nutri" não é exposto ao PostgREST: só a API .NET (role postgres) acessa.
revoke all on schema nutri from anon, authenticated;
revoke all on all tables in schema nutri from anon, authenticated;
revoke all on all functions in schema nutri from anon, authenticated, public;

-- O GoTrue (supabase_auth_admin) dispara o trigger acima
grant usage on schema nutri to supabase_auth_admin;
grant execute on function nutri.handle_new_auth_user() to supabase_auth_admin;
