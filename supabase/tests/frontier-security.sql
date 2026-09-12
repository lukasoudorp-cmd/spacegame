-- RPC identities, v2 setup and replay protection. Fixtures always roll back.
do $test$
declare ta text:=encode(extensions.gen_random_bytes(32),'hex');tb text:=encode(extensions.gen_random_bytes(32),'hex');a jsonb;b jsonb;c text;s jsonb;before_money bigint;expected bigint;
begin
 begin
  set local role anon;
  a:=public.orbit_pact_lobby('create',ta,'','{"name":"Frontier host test","countryId":"NLD","version":2}',0);c:=a->>'code';
  if a->'room'->>'version'<>'2' or jsonb_array_length(a->'room'->'nodes')<>12 then raise exception 'V2 initialization failed';end if;
  b:=public.orbit_pact_lobby('join',tb,c,'{"name":"Frontier guest test","countryId":"USA"}',0);
  a:=public.orbit_pact_lobby('ready',ta,c,'{}',1);b:=public.orbit_pact_lobby('ready',tb,c,'{}',1);
  begin perform public.orbit_pact_lobby('start',tb,c,'{}',2);raise exception using errcode='PZ002',message='Guest could start';exception when sqlstate 'P0001' then null;end;
  a:=public.orbit_pact_lobby('start',ta,c,'{}',2);
  a:=public.orbit_pact_lobby('connect',ta,c,'{"countryId":"NLD","money":99999999}',3);before_money:=(a->'room'->'players'->0->>'money')::bigint;
  b:=public.orbit_pact_lobby('connect',ta,c,'{"countryId":"NLD"}',3);if (b->'room'->'players'->0->>'money')::bigint<before_money then raise exception 'Retry charged twice';end if;
  if before_money>100100 then raise exception 'Client controlled funds';end if;
  begin perform public.orbit_pact_lobby('connect',tb,c,'{"countryId":"NLD"}',2);raise exception using errcode='PZ002',message='Duplicate claim accepted';exception when sqlstate 'P0001' then null;end;
  begin perform public.orbit_pact_lobby('sabotage',ta,c,jsonb_build_object('target',b->>'self'),4);raise exception using errcode='PZ002',message='Opening protection bypassed';exception when sqlstate 'P0001' then null;end;
  begin perform public.orbit_strategy_action('{}','a','shield','{}',0);raise exception using errcode='PZ002',message='Private helper accessible';exception when insufficient_privilege then null;end;
  reset role;
  raise exception using errcode='PZ001',message='Rollback fixtures';
 exception when sqlstate 'PZ001' then null;end;
end $test$;
select 'Lobby v2, host authority, claim ownership, command retries, server funds and private helpers passed; fixtures rolled back' as validation;
