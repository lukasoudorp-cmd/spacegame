-- Orbit Pact: private, code-protected cloud saves. No player email is required.
-- The public application key alone grants no direct access to save rows.
begin;

create table if not exists public.orbit_pact_saves (
  code_hash text primary key check (code_hash ~ '^[a-f0-9]{64}$'),
  state jsonb not null check (jsonb_typeof(state) = 'object'),
  revision bigint not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.orbit_pact_saves enable row level security;
revoke all on table public.orbit_pact_saves from public, anon, authenticated;

create or replace function public.orbit_pact_load_save(p_code text)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare result jsonb;
begin
  if p_code is null or p_code !~ '^[a-f0-9]{64}$' then
    raise exception using errcode = '22023', message = 'Invalid recovery code.';
  end if;
  select jsonb_build_object('state', s.state, 'revision', s.revision, 'updated_at', s.updated_at)
    into result from public.orbit_pact_saves s
    where s.code_hash = encode(sha256(convert_to(p_code, 'UTF8')), 'hex');
  return result;
end;
$$;

create or replace function public.orbit_pact_store_save(p_code text, p_state jsonb, p_revision bigint)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  save_hash text;
  current_save public.orbit_pact_saves%rowtype;
  result jsonb;
  field_name text;
begin
  if p_code is null or p_code !~ '^[a-f0-9]{64}$' or p_revision is null or p_revision < 0 then
    raise exception using errcode = '22023', message = 'Invalid cloud save request.';
  end if;
  if p_state is null or jsonb_typeof(p_state) is distinct from 'object'
     or p_state->'version' is distinct from '2'::jsonb
     or octet_length(p_state::text) > 2097152 then
    raise exception using errcode = '22023', message = 'Invalid or oversized game data.';
  end if;
  foreach field_name in array array['money','reputation','research','totalMoneyEarned','totalCosts','completedContracts','playTime'] loop
    if jsonb_typeof(p_state->field_name) is distinct from 'number' then
      raise exception using errcode = '22023', message = 'Missing game statistics.';
    end if;
    if (p_state->>field_name)::numeric < 0 or (p_state->>field_name)::numeric > 1000000000000 then
      raise exception using errcode = '22023', message = 'Invalid game statistics.';
    end if;
  end loop;
  foreach field_name in array array['satellites','offers','activeContracts','history','log'] loop
    if jsonb_typeof(p_state->field_name) is distinct from 'array' then
      raise exception using errcode = '22023', message = 'Incomplete game data.';
    end if;
    if jsonb_array_length(p_state->field_name) > 1000 then
      raise exception using errcode = '22023', message = 'Too many game records.';
    end if;
  end loop;
  if jsonb_array_length(p_state->'satellites') < 1 or jsonb_typeof(p_state->'upgrades') is distinct from 'object' then
    raise exception using errcode = '22023', message = 'Incomplete fleet data.';
  end if;

  save_hash := encode(sha256(convert_to(p_code, 'UTF8')), 'hex');
  -- Serialize requests for this save, including concurrent first uploads.
  perform pg_advisory_xact_lock(hashtextextended(save_hash, 0));
  select * into current_save from public.orbit_pact_saves where code_hash = save_hash for update;
  if found then
    -- A repeated request after a lost response must not create a second revision.
    if current_save.state = p_state and current_save.revision in (p_revision, p_revision + 1) then
      return jsonb_build_object('revision', current_save.revision, 'updated_at', current_save.updated_at);
    end if;
    if current_save.revision <> p_revision then
      raise exception using errcode = 'PT409', message = 'Cloud save changed. Load it before uploading again.';
    end if;
    if current_save.updated_at > clock_timestamp() - interval '5 seconds' then
      raise exception using errcode = 'PT429', message = 'Wait a few seconds before saving online again.';
    end if;
    update public.orbit_pact_saves set state = p_state, revision = revision + 1, updated_at = clock_timestamp()
      where code_hash = save_hash returning jsonb_build_object('revision', revision, 'updated_at', updated_at) into result;
  else
    if p_revision <> 0 then
      raise exception using errcode = 'PT409', message = 'Cloud save is missing. Create a new cloud save.';
    end if;
    insert into public.orbit_pact_saves(code_hash, state) values (save_hash, p_state)
      returning jsonb_build_object('revision', revision, 'updated_at', updated_at) into result;
  end if;
  return result;
end;
$$;

revoke all on function public.orbit_pact_load_save(text) from public;
revoke all on function public.orbit_pact_store_save(text,jsonb,bigint) from public;
grant execute on function public.orbit_pact_load_save(text) to anon, authenticated;
grant execute on function public.orbit_pact_store_save(text,jsonb,bigint) to anon, authenticated;
comment on table public.orbit_pact_saves is 'Orbit Pact cloud saves. Only hashed recovery codes are stored. Access is limited to the two code-verifying RPC functions.';
notify pgrst, 'reload schema';
commit;
