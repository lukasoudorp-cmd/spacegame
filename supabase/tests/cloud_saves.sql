-- Run as a database administrator. All fixture records are rolled back.
do $$
declare
  code_a text := encode(sha256(convert_to('orbit-pact-sql-test-a-' || clock_timestamp()::text, 'UTF8')), 'hex');
  code_b text := encode(sha256(convert_to('orbit-pact-sql-test-b-' || clock_timestamp()::text, 'UTF8')), 'hex');
  game_data jsonb := '{"version":2,"money":100000,"reputation":10,"research":0,"totalMoneyEarned":0,"totalCosts":0,"completedContracts":0,"playTime":0,"satellites":[{"id":1,"type":"Scout-1"}],"offers":[],"activeContracts":[],"history":[],"log":[],"upgrades":{}}';
  answer jsonb;
  blocked boolean;
begin
 begin
  perform set_config('role', 'anon', true);
  blocked := false;
  begin
    perform * from public.orbit_pact_saves limit 1;
  exception when insufficient_privilege then blocked := true;
  end;
  assert blocked, 'Anonymous callers must not list raw save records';

  answer := public.orbit_pact_store_save(code_a, game_data, 0);
  assert (answer->>'revision')::bigint = 1, 'First upload gets revision 1';
  answer := public.orbit_pact_load_save(code_a);
  assert answer->'state' = game_data, 'The owner code must load its exact state';
  assert public.orbit_pact_load_save(code_b) is null, 'Another code must not see the save';
  answer := public.orbit_pact_store_save(code_a, game_data, 0);
  assert (answer->>'revision')::bigint = 1, 'A lost-response retry must not duplicate revisions';

  blocked := false;
  begin
    perform public.orbit_pact_store_save(code_a, jsonb_set(game_data,'{money}','200000'), 0);
  exception when sqlstate 'PT409' then blocked := true;
  end;
  assert blocked, 'Stale revisions must not overwrite a cloud save';

  blocked := false;
  begin
    perform public.orbit_pact_store_save(code_a, jsonb_set(game_data,'{money}','200000'), 1);
  exception when sqlstate 'PT429' then blocked := true;
  end;
  assert blocked, 'Rapid repeat writes must be throttled';

  blocked := false;
  begin
    perform public.orbit_pact_store_save(code_b, '{}'::jsonb, 0);
  exception when invalid_parameter_value then blocked := true;
  end;
  assert blocked, 'Incomplete saves must be rejected';

  blocked := false;
  begin
    perform public.orbit_pact_load_save('short');
  exception when invalid_parameter_value then blocked := true;
  end;
  assert blocked, 'Malformed recovery codes must be rejected';
  -- Roll back the test fixture and local role inside a subtransaction.
  raise exception using errcode = 'PZ001', message = 'Tests passed; roll back fixtures.';
 exception when sqlstate 'PZ001' then null;
 end;
end;
$$;
