-- All fixture rooms and members roll back, including on successful tests.
do $$
declare a jsonb;b jsonb;c jsonb;code text;one text;two text;tok1 text:=encode(extensions.gen_random_bytes(32),'hex');tok2 text:=encode(extensions.gen_random_bytes(32),'hex');bad boolean;nowms bigint;
begin
 begin
 set local role anon;
 a:=public.orbit_pact_lobby('create',tok1,'','{"name":"Test One","countryId":"NLD"}');code:=a->>'code';one:=a->>'self';
 if length(code)<>8 or jsonb_array_length(a->'room'->'players')<>1 then raise exception 'creation failed';end if;
 c:=public.orbit_pact_lobby('create',tok1,'','{"name":"Test One","countryId":"NLD"}');if c->>'code'<>code then raise exception 'create retry not idempotent';end if;
 b:=public.orbit_pact_lobby('join',tok2,code,'{"name":"Test Two","countryId":"USA"}');two:=b->>'self';
 bad:=false;begin perform public.orbit_pact_lobby('start',tok2,code,'{}',1);exception when others then bad:=true;end;if not bad then raise exception 'nonhost start allowed';end if;
 perform public.orbit_pact_lobby('ready',tok1,code,'{}',1);perform public.orbit_pact_lobby('ready',tok2,code,'{}',1);a:=public.orbit_pact_lobby('start',tok1,code,'{}',2);
 if a->'room'->>'status'<>'running' then raise exception 'start failed';end if;
 a:=public.orbit_pact_lobby('accept',tok1,code,'{"id":1}',3);c:=public.orbit_pact_lobby('accept',tok1,code,'{"id":1}',3);
 if a->'room'->'players'->0->>'money'<>c->'room'->'players'->0->>'money' then raise exception 'duplicate charged twice';end if;
 bad:=false;begin perform public.orbit_pact_lobby('accept',tok2,code,'{"id":1}',2);exception when others then bad:=true;end;if not bad then raise exception 'shared offer double claimed';end if;
 bad:=false;begin perform public.orbit_pact_lobby('poll',repeat('f',64),code);exception when others then bad:=true;end;if not bad then raise exception 'unauthorized read';end if;
 bad:=false;begin perform state from public.orbit_pact_rooms;exception when insufficient_privilege then bad:=true;end;if not bad then raise exception 'public table readable';end if;
 reset role;
 nowms:=(a->'room'->>'now')::bigint;
 c:=public.orbit_match_advance(a->'room',nowms+60000);if (c->'players'->0->>'revenue')::int<>20000 then raise exception 'completion reward incorrect';end if;
 c:=public.orbit_match_advance(c,nowms+120000);if (c->'players'->0->>'revenue')::int<>20000 then raise exception 'completion repeated';end if;
 raise exception using errcode='PZ001',message='MATCH TESTS PASSED';
 exception when sqlstate 'PZ001' then null;
 end;
end $$;
select 'Multiplayer create/join, host authority, retries, shared claims, RPC privacy and completion passed. Fixtures rolled back.' as result;
