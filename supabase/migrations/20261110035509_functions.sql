-- =====================================================================
-- Funções e views — regras de leitura/agregação que rodam no Postgres
-- =====================================================================

-- ---------------------------------------------------------------------
-- Balança de substituições
-- Equivalência pelo macronutriente dominante do grupo:
--   carboidrato/fruta → carboidratos | proteina → proteína
--   gordura → gordura | demais → calorias
-- Ex.: 100 g de arroz (28,1 g carb) ≈ 235 g de batata inglesa (11,9 g carb).
-- ---------------------------------------------------------------------
create or replace function nutri.fn_food_substitutions(p_food_id uuid, p_grams numeric, p_limit int default 8)
returns table (food_id uuid, name text, grams numeric, household text)
language sql stable
set search_path = ''
as $$
  with base as (
    select f.*,
           case f.food_group
             when 'carboidrato' then f.carb_100g
             when 'fruta'       then f.carb_100g
             when 'proteina'    then f.protein_100g
             when 'gordura'     then f.fat_100g
             else f.kcal_100g
           end as ref_value
    from nutri.foods f
    where f.id = p_food_id
  ),
  candidates as (
    select o.id, o.name, o.household_unit, o.household_grams,
           case b.food_group
             when 'carboidrato' then o.carb_100g
             when 'fruta'       then o.carb_100g
             when 'proteina'    then o.protein_100g
             when 'gordura'     then o.fat_100g
             else o.kcal_100g
           end as cand_value,
           b.ref_value * p_grams / 100.0 as target
    from base b
    join nutri.foods o on o.food_group = b.food_group and o.id <> b.id
  )
  select c.id,
         c.name,
         -- arredonda para múltiplos de 5 g (mais fácil de pesar)
         greatest(5, round(c.target * 100.0 / c.cand_value / 5.0) * 5) as grams,
         case when c.household_grams > 0 then
           '≈ ' || replace(rtrim(rtrim(
                     greatest(0.5, round(c.target * 100.0 / c.cand_value / c.household_grams * 2) / 2)::text,
                   '0'), '.'), '.', ',')
             || ' ' || regexp_replace(c.household_unit, '^1\s+', '')
         end as household
  from candidates c
  where c.cand_value > 0
  order by c.name
  limit p_limit
$$;

-- ---------------------------------------------------------------------
-- Registro diário: soma (ou subtrai) água/proteína de forma atômica
-- ---------------------------------------------------------------------
create or replace function nutri.fn_add_daily_log(
  p_patient_id uuid, p_date date, p_water_delta integer, p_protein_delta numeric)
returns table (water_ml integer, protein_g numeric)
language sql volatile
set search_path = ''
as $$
  insert into nutri.daily_logs as d (patient_id, log_date, water_ml, protein_g)
  values (p_patient_id, p_date, greatest(0, p_water_delta), greatest(0, p_protein_delta))
  on conflict (patient_id, log_date) do update
     set water_ml  = greatest(0, d.water_ml + p_water_delta),
         protein_g = greatest(0, d.protein_g + p_protein_delta)
  returning d.water_ml, d.protein_g
$$;

-- ---------------------------------------------------------------------
-- Visão geral dos pacientes (lista da nutricionista)
-- ---------------------------------------------------------------------
create or replace view nutri.v_patient_overview with (security_invoker = true) as
select p.id,
       p.nutritionist_id,
       p.full_name,
       p.email,
       p.phone,
       p.status,
       p.goal,
       p.search_name,
       p.user_id is not null as has_app_access,
       extract(year from age(p.birth_date))::int as age,
       lw.weight_kg as last_weight_kg,
       exists (select 1 from nutri.meal_plans mp where mp.patient_id = p.id and mp.status = 'ativo') as has_active_plan,
       (select count(*) from nutri.check_ins ci where ci.patient_id = p.id and ci.reviewed_at is null)::int as pending_check_ins,
       (select max(ci.week_start) from nutri.check_ins ci where ci.patient_id = p.id) as last_check_in,
       (select min(c.scheduled_at) from nutri.consultations c
         where c.patient_id = p.id and c.status = 'agendada' and c.scheduled_at >= now()) as next_consultation
from nutri.patients p
left join lateral (
  select ci.weight_kg from nutri.check_ins ci
  where ci.patient_id = p.id and ci.weight_kg is not null
  order by ci.week_start desc limit 1
) lw on true;

-- ---------------------------------------------------------------------
-- Painel "Hoje" da nutricionista
-- ---------------------------------------------------------------------
create or replace function nutri.fn_nutritionist_today(p_nutritionist_id uuid, p_day date, p_tz text default 'America/Sao_Paulo')
returns jsonb
language sql stable
set search_path = ''
as $$
  select jsonb_build_object(
    'consultations', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', c.id,
               'patientId', p.id,
               'patientName', p.full_name,
               'scheduledAt', c.scheduled_at,
               'durationMin', c.duration_min,
               'kind', c.kind,
               'status', c.status) order by c.scheduled_at)
      from nutri.consultations c
      join nutri.patients p on p.id = c.patient_id
      where p.nutritionist_id = p_nutritionist_id
        and (c.scheduled_at at time zone p_tz)::date = p_day
        and c.status <> 'cancelada'), '[]'::jsonb),
    'plansToBuild', (
      select count(*) from nutri.patients p
      where p.nutritionist_id = p_nutritionist_id and p.status = 'active'
        and not exists (select 1 from nutri.meal_plans mp where mp.patient_id = p.id and mp.status = 'ativo'))::int,
    'newCheckIns', (
      select count(*) from nutri.check_ins ci
      join nutri.patients p on p.id = ci.patient_id
      where p.nutritionist_id = p_nutritionist_id and ci.reviewed_at is null)::int,
    'activePatients', (
      select count(*) from nutri.patients p
      where p.nutritionist_id = p_nutritionist_id and p.status = 'active')::int,
    'recentCheckIns', coalesce((
      select jsonb_agg(x order by x->>'createdAt' desc) from (
        select jsonb_build_object(
                 'id', ci.id, 'patientId', p.id, 'patientName', p.full_name,
                 'adherence', ci.adherence, 'weightKg', ci.weight_kg,
                 'createdAt', ci.created_at) as x
        from nutri.check_ins ci
        join nutri.patients p on p.id = ci.patient_id
        where p.nutritionist_id = p_nutritionist_id and ci.reviewed_at is null
        order by ci.created_at desc limit 6) s), '[]'::jsonb)
  )
$$;

-- ---------------------------------------------------------------------
-- Evolução do paciente (gráfico de peso, cintura, adesão)
-- ---------------------------------------------------------------------
create or replace function nutri.fn_patient_progress(p_patient_id uuid)
returns jsonb
language sql stable
set search_path = ''
as $$
  with pts as (
    select week_start, weight_kg, waist_cm, adherence,
           row_number() over (order by week_start)      as rn_asc,
           row_number() over (order by week_start desc) as rn_desc
    from nutri.check_ins where patient_id = p_patient_id
  ),
  w as (
    select (array_agg(weight_kg order by week_start) filter (where weight_kg is not null)) as weights,
           (array_agg(waist_cm  order by week_start) filter (where waist_cm  is not null)) as waists
    from pts
  )
  select jsonb_build_object(
    'points', coalesce((select jsonb_agg(jsonb_build_object(
                 'weekStart', week_start, 'weightKg', weight_kg,
                 'waistCm', waist_cm, 'adherence', adherence) order by week_start) from pts), '[]'::jsonb),
    'checkInCount', (select count(*) from pts)::int,
    'weeks', coalesce((select (max(week_start) - min(week_start)) / 7 + 1 from pts), 0),
    'currentWeightKg', (select w.weights[array_length(w.weights, 1)] from w),
    'weightChangeKg', (select w.weights[array_length(w.weights, 1)] - w.weights[1] from w),
    'waistChangeCm',  (select w.waists[array_length(w.waists, 1)]  - w.waists[1]  from w),
    'avgAdherence',   (select round(avg(adherence), 1) from pts),
    'latestNote', (select jsonb_build_object('id', n.id, 'body', n.body, 'createdAt', n.created_at)
                   from nutri.notes n where n.patient_id = p_patient_id
                   order by n.created_at desc limit 1)
  )
$$;

-- ---------------------------------------------------------------------
-- Tela "Hoje" do paciente: refeição do horário, proteína, água
-- ---------------------------------------------------------------------
create or replace function nutri.fn_patient_today(p_patient_id uuid, p_day date, p_now time)
returns jsonb
language sql stable
set search_path = ''
as $$
  with plan as (
    select mp.* from nutri.meal_plans mp
    where mp.patient_id = p_patient_id and mp.status = 'ativo'
  ),
  items as (
    select i.* from nutri.meal_plan_items i join plan on plan.id = i.meal_plan_id
  ),
  current_item as (
    -- última refeição cujo horário já começou (ou a primeira do dia, de madrugada)
    select * from (
      select i.*, 0 as pri from items i where i.meal_time <= p_now
      union all
      select i.*, 1 as pri from items i
    ) x order by pri, case when pri = 0 then meal_time end desc nulls last, meal_time
    limit 1
  ),
  log as (
    select d.water_ml, d.protein_g from nutri.daily_logs d
    where d.patient_id = p_patient_id and d.log_date = p_day
  )
  select jsonb_build_object(
    'firstName', split_part(p.full_name, ' ', 1),
    'weekNumber', (select greatest(1, ((p_day - coalesce(plan.published_at, plan.created_at)::date) / 7) + 1) from plan),
    'currentMeal', (select jsonb_build_object('id', ci.id, 'meal', ci.meal, 'mealTime', to_char(ci.meal_time, 'HH24:MI'),
                                              'description', ci.description, 'tip', ci.tip)
                    from current_item ci),
    'proteinG', coalesce((select protein_g from log), 0),
    'proteinTargetG', p.protein_target_g,
    'waterMl', coalesce((select water_ml from log), 0),
    'waterTargetMl', p.water_target_ml,
    'checkInDone', exists (select 1 from nutri.check_ins c
                           where c.patient_id = p.id and c.week_start = date_trunc('week', p_day)::date),
    'unreadNotes', (select count(*) from nutri.notes n where n.patient_id = p.id and n.read_at is null)::int
  )
  from nutri.patients p
  where p.id = p_patient_id
$$;

-- ---------------------------------------------------------------------
-- Relatório mensal (evolução do mês + recado mais recente)
-- ---------------------------------------------------------------------
create or replace function nutri.fn_monthly_report(p_patient_id uuid, p_month date)
returns jsonb
language sql stable
set search_path = ''
as $$
  with m as (
    select * from nutri.check_ins
    where patient_id = p_patient_id
      and week_start >= date_trunc('month', p_month)::date
      and week_start <  (date_trunc('month', p_month) + interval '1 month')::date
  )
  select jsonb_build_object(
    'month', to_char(p_month, 'YYYY-MM'),
    'checkIns', (select count(*) from m)::int,
    'avgAdherence', (select round(avg(adherence), 1) from m),
    'weightStartKg', (select weight_kg from m where weight_kg is not null order by week_start limit 1),
    'weightEndKg',   (select weight_kg from m where weight_kg is not null order by week_start desc limit 1),
    'hardest', coalesce((select jsonb_agg(jsonb_build_object('item', h, 'count', n) order by n desc)
                         from (select unnest(hardest) h, count(*) n from m group by 1) t), '[]'::jsonb),
    'sleepGood', (select count(*) from m where sleep = 'bem')::int
  )
$$;

revoke all on all functions in schema nutri from anon, authenticated, public;
revoke all on all tables in schema nutri from anon, authenticated;
-- o trigger de auth continua executável pelo GoTrue
grant execute on function nutri.handle_new_auth_user() to supabase_auth_admin;
