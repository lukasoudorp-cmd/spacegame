-- Additive v2 rules. Existing v1 rooms and cloud saves are unchanged.
begin;
create or replace function public.orbit_strategy_config() returns jsonb language sql immutable set search_path=public,pg_temp as $config$ select $data${"buildings":{"factory":{"name":"Satellite factory","cost":12000,"time":20000,"power":2,"icon":"layers"},"pad":{"name":"Launch pad","cost":8000,"time":15000,"power":2,"icon":"trend"},"solar":{"name":"Solar array","cost":6000,"time":12000,"power":-6,"icon":"bolt"},"lab":{"name":"Research lab","cost":15000,"time":25000,"power":2,"icon":"radar"},"guard":{"name":"Signal defense","cost":18000,"time":18000,"power":2,"icon":"radar"},"station":{"name":"Orbital station","cost":90000,"time":45000,"power":4,"icon":"globe"}},"blueprints":{"scout":{"name":"Scout","cost":18000,"time":18000,"description":"Affordable fleet capacity. Two network regions per satellite."},"relay":{"name":"Relay","cost":28000,"time":24000,"description":"Adds €200 to network income every 5 seconds."},"mapper":{"name":"Mapper","cost":32000,"time":28000,"description":"+10% contract payouts, up to +30% with three Mappers."}}}$data$::jsonb; $config$;
create or replace function public.orbit_strategy_level(p jsonb,typ text) returns int language sql immutable set search_path=public,pg_temp as $$
 select coalesce(max(coalesce((p->'levels'->>((x.ordinality-1)::int))::int,1)),0) from jsonb_array_elements_text(p->'plots') with ordinality x(value,ordinality) where x.value=typ;
$$;
create or replace function public.orbit_strategy_log(s jsonb,msg text) returns jsonb language sql immutable set search_path=public,pg_temp as $$
 select jsonb_set(s,'{log}',jsonb_build_array(jsonb_build_object('time',s->'now','text',msg))||coalesce((select jsonb_agg(x.value order by x.ordinality) from jsonb_array_elements(coalesce(s->'log','[]')) with ordinality x(value,ordinality) where x.ordinality<=7),'[]'));
$$;
create or replace function public.orbit_strategy_player(p jsonb) returns jsonb language sql immutable set search_path=public,pg_temp as $$
 select p||jsonb_build_object('fleet',jsonb_build_object('scout',(p->>'satellites')::int,'relay',0,'mapper',0),'levels',(select jsonb_agg(case when x='null'::jsonb then 0 else 1 end) from jsonb_array_elements(p->'plots') x),'shieldUntil',0,'jamUntil',0,'jamCooldown',0,'immuneUntil',0,'lastLaunch',0,'incomeRemainder',0,'dominanceSince',null,'lastEvent',-1);
$$;
create or replace function public.orbit_strategy_nodes() returns jsonb language sql immutable set search_path=public,pg_temp as $$
 select jsonb_agg(jsonb_build_object('countryId',x,'owner',null,'level',0,'claim',null,'protectedUntil',0)) from unnest(array['USA','CAN','BRA','GBR','NLD','FRA','EGY','ZAF','IND','CHN','JPN','AUS']) x;
$$;
create or replace function public.orbit_strategy_income(s jsonb,p jsonb,t bigint) returns bigint language sql immutable set search_path=public,pg_temp as $$
 select case when (p->>'forfeit')::boolean then 0 else 300+case when (p->>'jamUntil')::bigint>t then 0 else coalesce((select sum((x->>'level')::int*600) from jsonb_array_elements(s->'nodes') x where x->>'owner'=p->>'id'),0)+(p->'fleet'->>'relay')::int*200+public.orbit_strategy_level(p,'station')*2000 end end;
$$;
create or replace function public.orbit_strategy_advance(s jsonb,t bigint) returns jsonb language plpgsql set search_path=public,pg_temp as $$
declare p jsonb;n jsonb;b jsonb;m jsonb;idx int;j int;stamp bigint;prev bigint;funds bigint;cuts bigint[];typ text;winner text;pid text;owned int;
begin
 t:=greatest(t,(s->>'now')::bigint);if s->>'status'<>'running' then return jsonb_set(s,'{now}',to_jsonb(t));end if;
 prev:=(s->>'now')::bigint;cuts:=array[t];
 for p in select value from jsonb_array_elements(s->'players') loop
  cuts:=cuts||array[(p->'building'->>'end')::bigint,(p->'production'->>'end')::bigint,(p->>'jamUntil')::bigint,(p->>'dominanceSince')::bigint+45000];
 end loop;
 for n in select value from jsonb_array_elements(s->'nodes') loop cuts:=cuts||array[(n->'claim'->>'end')::bigint,(n->'claim'->>'end')::bigint+45000];end loop;
 for stamp in select distinct v from unnest(cuts) v where v>=prev and v<=t order by v loop
  for idx in 0..jsonb_array_length(s->'players')-1 loop
   p:=s->'players'->idx;if (p->>'forfeit')::boolean then continue;end if;
   funds:=(stamp-prev)*public.orbit_strategy_income(s,p,prev)+coalesce((p->>'incomeRemainder')::bigint,0);
   p:=p||jsonb_build_object('money',(p->>'money')::bigint+funds/5000,'incomeRemainder',funds%5000);s:=jsonb_set(s,array['players',idx::text],p);
  end loop;
  s:=jsonb_set(s,'{now}',to_jsonb(stamp));prev:=stamp;
  for idx in 0..jsonb_array_length(s->'players')-1 loop
   p:=s->'players'->idx;if (p->>'forfeit')::boolean then continue;end if;
   if p->'building'<>'null'::jsonb and (p->'building'->>'end')::bigint<=stamp then
    b:=p->'building';p:=jsonb_set(p,array['plots',b->>'plot'],b->'type');p:=jsonb_set(p,array['levels',b->>'plot'],coalesce(b->'level','1'));p:=p||'{"building":null}'::jsonb;s:=public.orbit_strategy_log(s,(p->>'name')||' completed '||(public.orbit_strategy_config()->'buildings'->(b->>'type')->>'name')||'.');
   end if;
   if p->'production'<>'null'::jsonb and (p->'production'->>'end')::bigint<=stamp then
    typ:=coalesce(p->'production'->>'type','scout');p:=jsonb_set(p,array['fleet',typ],to_jsonb((p->'fleet'->>typ)::int+1));p:=p||jsonb_build_object('satellites',(p->>'satellites')::int+1,'lastLaunch',(p->'production'->>'end')::bigint,'production',null);s:=public.orbit_strategy_log(s,(p->>'name')||' launched a '||(public.orbit_strategy_config()->'blueprints'->typ->>'name')||'.');
   end if;
   for m in select value from jsonb_array_elements(p->'missions') where (value->>'end')::bigint<=stamp loop
    p:=p||jsonb_build_object('money',(p->>'money')::bigint+(m->>'reward')::bigint,'revenue',(p->>'revenue')::bigint+(m->>'reward')::bigint);s:=public.orbit_strategy_log(s,(p->>'name')||' completed '||(m->>'name')||'.');
   end loop;
   p:=jsonb_set(p,'{missions}',coalesce((select jsonb_agg(x) from jsonb_array_elements(p->'missions') x where (x->>'end')::bigint>stamp),'[]'));s:=jsonb_set(s,array['players',idx::text],p);
  end loop;
  for j in 0..jsonb_array_length(s->'nodes')-1 loop
   n:=s->'nodes'->j;if n->'claim'<>'null'::jsonb and (n->'claim'->>'end')::bigint<=stamp then
    select x into p from jsonb_array_elements(s->'players') x where x->>'id'=n->'claim'->>'by' and not (x->>'forfeit')::boolean;
    n:=n||jsonb_build_object('owner',p->'id','level',case when p is null then 0 else 1 end,'claim',null,'protectedUntil',stamp+20000);s:=jsonb_set(s,array['nodes',j::text],n);
    if p is not null then s:=public.orbit_strategy_log(s,(p->>'name')||' connected '||(n->>'countryId')||'.');end if;
   end if;
  end loop;
  for idx in 0..jsonb_array_length(s->'players')-1 loop
   p:=s->'players'->idx;select count(*) into owned from jsonb_array_elements(s->'nodes') x where x->>'owner'=p->>'id';
   if owned>=7 then if p->'dominanceSince'='null'::jsonb then p:=jsonb_set(p,'{dominanceSince}',to_jsonb(stamp));end if;else p:=jsonb_set(p,'{dominanceSince}','null');end if;s:=jsonb_set(s,array['players',idx::text],p);
  end loop;
  select x->>'id' into winner from jsonb_array_elements(s->'players') x where not (x->>'forfeit')::boolean and x->'dominanceSince'<>'null'::jsonb and stamp-(x->>'dominanceSince')::bigint>=45000 order by (x->>'dominanceSince')::bigint,x->>'id' limit 1;
  if winner is not null then return s||jsonb_build_object('status','finished','winner',winner);end if;
 end loop;return s;
end $$;
create or replace function public.orbit_strategy_action(s jsonb,pid text,a text,d jsonb,t bigint) returns jsonb language plpgsql set search_path=public,pg_temp as $$
declare p jsonb;q jsonb;n jsonb;o jsonb;def jsonb;cfg jsonb:=public.orbit_strategy_config();i int;j int;k int;cost bigint:=0;dur int;typ text;plot int;old text;lvl int;used int;supply int;num int;cycle int;ev int;reward bigint;
begin
 s:=public.orbit_strategy_advance(s,t);t:=(s->>'now')::bigint;
 select (x.ordinality-1)::int,x.value into i,p from jsonb_array_elements(s->'players') with ordinality x(value,ordinality) where x.value->>'id'=pid;
 if p is null or (p->>'forfeit')::boolean then raise exception 'You are not an active player.';end if;
 if a='ready' then
  if s->>'status'<>'waiting' then raise exception 'The match already started.';end if;
  return jsonb_set(s,array['players',i::text],p||jsonb_build_object('ready',not (p->>'ready')::boolean));
 elsif a='start' then
  if s->>'host'<>pid then raise exception 'Only the host can start.';end if;
  if s->>'status'<>'waiting' or jsonb_array_length(s->'players')<2 or exists(select 1 from jsonb_array_elements(s->'players') x where not (x->>'ready')::boolean) then raise exception 'At least two players must be ready.';end if;
  s:=s||jsonb_build_object('status','running','started',t,'now',t);for j in 1..6 loop s:=public.orbit_match_offer(s);end loop;
  for j in 0..jsonb_array_length(s->'players')-1 loop s:=jsonb_set(s,array['players',j::text,'immuneUntil'],to_jsonb(t+90000));end loop;return public.orbit_strategy_log(s,'Network frontier opened. Build, connect and defend.');
 end if;
 if s->>'status'<>'running' then raise exception 'The match is not running.';end if;
 if a in ('build','upgrade-building') then
  plot:=(d->>'plot')::int;old:=p->'plots'->>plot;typ:=case when a='build' then d->>'type' else old end;def:=cfg->'buildings'->typ;lvl:=case when a='build' then 1 else coalesce((p->'levels'->>plot)::int,1)+1 end;
  if def is null or plot is null or plot<0 or plot>=jsonb_array_length(p->'plots') or p->'building'<>'null'::jsonb or (a='build' and old is not null) or (a='upgrade-building' and old is null) or lvl>3 then raise exception 'Select an available site. Finish current construction first.';end if;
  if typ='station' and (public.orbit_strategy_level(p,'lab')<2 or public.orbit_strategy_level(p,'factory')<2 or (p->>'satellites')::int<6) then raise exception 'Station requires a level 2 lab, level 2 factory and six satellites.';end if;
  select 4+coalesce(sum(case when x.value='solar' then 6*coalesce((p->'levels'->>((x.ordinality-1)::int))::int,1) else 0 end),0),coalesce(sum(greatest(0,(cfg->'buildings'->x.value->>'power')::int)),0) into supply,used from jsonb_array_elements_text(p->'plots') with ordinality x(value,ordinality);
  if a='build' and (def->>'power')::int>0 and used+(def->>'power')::int>supply then raise exception 'Build or upgrade a solar array for more power.';end if;
  cost:=case when a='build' then (def->>'cost')::int else round((def->>'cost')::numeric*(lvl-1)*.75) end;dur:=case when a='build' then (def->>'time')::int else 12000 end;
  p:=p||jsonb_build_object('building',jsonb_build_object('type',typ,'plot',plot,'level',lvl,'start',t,'end',t+dur));
 elsif a='expand' then
  num:=jsonb_array_length(p->'plots');if num>=16 then raise exception 'All land owned.';end if;cost:=4000+(num-4)*2000;p:=p||jsonb_build_object('plots',(p->'plots')||'[null]'::jsonb,'levels',(p->'levels')||'[0]'::jsonb);
 elsif a='launch' then
  typ:=coalesce(d->>'type','scout');def:=cfg->'blueprints'->typ;
  if def is null or public.orbit_strategy_level(p,'factory')=0 or public.orbit_strategy_level(p,'pad')=0 or p->'production'<>'null'::jsonb or (p->>'satellites')::int>=24 then raise exception 'Finish a factory and launch pad. Maximum 24 satellites.';end if;
  cost:=(def->>'cost')::int;dur:=round((def->>'time')::numeric*(1-.15*(public.orbit_strategy_level(p,'pad')-1)));p:=p||jsonb_build_object('production',jsonb_build_object('type',typ,'start',t,'end',t+dur));
 elsif a in ('accept','event') then
  cycle:=floor((t-(s->>'started')::bigint)::numeric/90000);ev:=cycle%3;
  if a='event' then
   if (t-(s->>'started')::bigint)%90000>=45000 or (p->>'lastEvent')::int=cycle then raise exception 'This request is no longer available.';end if;
   o:=jsonb_build_object('id',900000+cycle,'countryId',p->>'countryId','name',(array['Emergency weather coverage','Rapid mapping request','Festival communications'])[ev+1],'cost',3000,'reward',24000+ev*4000,'duration',20000);
  else select x into o from jsonb_array_elements(s->'offers') x where x->>'id'=d->>'id';end if;
  if o is null then raise exception 'Another company already took this contract.';end if;if jsonb_array_length(p->'missions')>=(p->>'satellites')::int then raise exception 'All satellites are busy.';end if;
  cost:=(o->>'cost')::int;dur:=round((o->>'duration')::numeric*(1-.1*public.orbit_strategy_level(p,'lab')));reward:=round((o->>'reward')::numeric*(1+.1*least(3,(p->'fleet'->>'mapper')::int)));
  p:=jsonb_set(p,'{missions}',(p->'missions')||jsonb_build_array(o||jsonb_build_object('reward',reward,'start',t,'end',t+dur)));
  if a='event' then p:=jsonb_set(p,'{lastEvent}',to_jsonb(cycle));else s:=jsonb_set(s,'{offers}',coalesce((select jsonb_agg(x) from jsonb_array_elements(s->'offers') x where x->>'id'<>o->>'id'),'[]'));s:=public.orbit_match_offer(s);end if;
 elsif a in ('connect','upgrade-node','defend-node') then
  select (x.ordinality-1)::int,x.value into j,n from jsonb_array_elements(s->'nodes') with ordinality x(value,ordinality) where x.value->>'countryId'=d->>'countryId';if n is null then raise exception 'Choose a network region on the map.';end if;
  if a='connect' then
   if (p->>'jamUntil')::bigint>t then raise exception 'Your signal is disrupted. Deploy a shield or wait.';end if;
   if n->>'owner'=pid or n->'claim'<>'null'::jsonb or exists(select 1 from jsonb_array_elements(s->'nodes') x where x->'claim'->>'by'=pid) then raise exception 'Finish your current connection or choose another region.';end if;
   if (select count(*) from jsonb_array_elements(s->'nodes') x where x->>'owner'=pid)>=(p->>'satellites')::int*2 then raise exception 'Launch a satellite to support more regions.';end if;
   select x into q from jsonb_array_elements(s->'players') x where x->>'id'=n->>'owner';
   if q is not null and (t-(s->>'started')::bigint<90000 or (q->>'shieldUntil')::bigint>t or (n->>'protectedUntil')::bigint>t) then raise exception 'This region is protected.';end if;
   if q is not null and (p->>'satellites')::int<(n->>'level')::int+1 then raise exception 'You need more satellites than the region level.';end if;
   cost:=case when q is null then 6000 else 12000+(n->>'level')::int*4000 end;dur:=case when q is null then 10000 else 20000 end;n:=n||jsonb_build_object('claim',jsonb_build_object('by',pid,'start',t,'end',t+dur));s:=public.orbit_strategy_log(s,(p->>'name')||' is connecting '||(n->>'countryId')||'.');
  elsif a='upgrade-node' then
   if n->>'owner' is distinct from pid or (n->>'level')::int>=3 or n->'claim'<>'null'::jsonb then raise exception 'Select your uncontested region below level 3.';end if;cost:=(n->>'level')::int*6000;n:=jsonb_set(n,'{level}',to_jsonb((n->>'level')::int+1));
  else
   if n->>'owner' is distinct from pid or n->'claim'='null'::jsonb then raise exception 'This region is not under contest.';end if;cost:=4000;n:=n||jsonb_build_object('claim',null,'protectedUntil',t+30000);s:=public.orbit_strategy_log(s,(p->>'name')||' defended '||(n->>'countryId')||'.');
  end if;s:=jsonb_set(s,array['nodes',j::text],n);
 elsif a='shield' then
  if (p->>'shieldUntil')::bigint>t then raise exception 'Your shield is already active.';end if;cost:=6000;p:=p||jsonb_build_object('shieldUntil',t+60000,'jamUntil',t);s:=public.orbit_strategy_log(s,(p->>'name')||' activated a signal shield.');
 elsif a='sabotage' then
  select (x.ordinality-1)::int,x.value into j,q from jsonb_array_elements(s->'players') with ordinality x(value,ordinality) where x.value->>'id'=d->>'target';
  if q is null or q->>'id'=pid or (q->>'forfeit')::boolean then raise exception 'Choose another active company.';end if;
  if t-(s->>'started')::bigint<90000 or (p->>'jamCooldown')::bigint>t or (q->>'shieldUntil')::bigint>t or (q->>'immuneUntil')::bigint>t then raise exception 'Sabotage is cooling down or this company is protected.';end if;
  if public.orbit_strategy_level(p,'lab')=0 then raise exception 'Build a research lab to disrupt signals.';end if;
  cost:=10000;q:=q||jsonb_build_object('jamUntil',t+case when public.orbit_strategy_level(q,'guard')>0 then 10000 else 20000 end,'immuneUntil',t+60000);p:=p||jsonb_build_object('jamCooldown',t+60000);s:=jsonb_set(s,array['players',j::text],q);s:=public.orbit_strategy_log(s,(p->>'name')||' disrupted '||(q->>'name')||'. A shield restores the signal.');
 elsif a='forfeit' then
  p:=p||'{"forfeit":true,"missions":[]}'::jsonb;s:=jsonb_set(s,array['players',i::text],p);
  for j in 0..jsonb_array_length(s->'nodes')-1 loop n:=s->'nodes'->j;if n->>'owner'=pid then n:=n||'{"owner":null,"level":0}'::jsonb;end if;if n->'claim'->>'by'=pid then n:=jsonb_set(n,'{claim}','null');end if;s:=jsonb_set(s,array['nodes',j::text],n);end loop;
  if (select count(*) from jsonb_array_elements(s->'players') x where not (x->>'forfeit')::boolean)=1 then select x into q from jsonb_array_elements(s->'players') x where not (x->>'forfeit')::boolean;s:=s||jsonb_build_object('status','finished','winner',q->'id');end if;return s;
 else raise exception 'Unknown match action.';end if;
 if (p->>'money')::bigint<cost then raise exception 'Not enough funds.';end if;p:=jsonb_set(p,'{money}',to_jsonb((p->>'money')::bigint-cost));return jsonb_set(s,array['players',i::text],p);
end $$;

create or replace function public.orbit_match_advance(s jsonb,t bigint) returns jsonb language plpgsql set search_path=public,pg_temp as $$
declare p jsonb; ev record; i int; cutoff bigint; active_count int; winner text;
begin
 if s->>'version'='2' then return public.orbit_strategy_advance(s,t);end if;
 t:=greatest(t,(s->>'now')::bigint);s:=jsonb_set(s,'{now}',to_jsonb(t));if s->>'status'<>'running' then return s;end if;
 cutoff:=least(t,(s->>'started')::bigint+1800000);
 for i in 0..jsonb_array_length(s->'players')-1 loop
  p:=s->'players'->i;if (p->>'forfeit')::boolean then continue;end if;
  if p->'building'<>'null'::jsonb and (p->'building'->>'end')::bigint<=cutoff then p:=jsonb_set(p,array['plots',p->'building'->>'plot'],p->'building'->'type');p:=jsonb_set(p,'{building}','null');end if;
  if p->'production'<>'null'::jsonb and (p->'production'->>'end')::bigint<=cutoff then p:=jsonb_set(p,'{satellites}',to_jsonb((p->>'satellites')::int+1));p:=jsonb_set(p,'{production}','null');end if;
  s:=jsonb_set(s,array['players',i::text],p);
 end loop;
 for ev in select (pp.ordinality-1)::int idx, mm.value m from jsonb_array_elements(s->'players') with ordinality pp(value,ordinality) cross join lateral jsonb_array_elements(pp.value->'missions') mm(value) where not (pp.value->>'forfeit')::boolean and (mm.value->>'end')::bigint<=cutoff order by (mm.value->>'end')::bigint,pp.value->>'id' loop
  p:=s->'players'->ev.idx;p:=jsonb_set(p,'{money}',to_jsonb((p->>'money')::int+(ev.m->>'reward')::int));p:=jsonb_set(p,'{revenue}',to_jsonb((p->>'revenue')::int+(ev.m->>'reward')::int));
  p:=jsonb_set(p,'{missions}',coalesce((select jsonb_agg(m) from jsonb_array_elements(p->'missions') m where m->>'id'<>ev.m->>'id'),'[]'));
  s:=jsonb_set(s,array['players',ev.idx::text],p);
  if (p->>'revenue')::int>=250000 then s:=jsonb_set(jsonb_set(s,'{status}','"finished"'),'{winner}',p->'id');return s;end if;
 end loop;
 select count(*),min(q->>'id') into active_count,winner from jsonb_array_elements(s->'players') q where not (q->>'forfeit')::boolean;
 if active_count=1 or t>=(s->>'started')::bigint+1800000 then
  select q->>'id' into winner from jsonb_array_elements(s->'players') q where not (q->>'forfeit')::boolean order by (q->>'revenue')::int desc,q->>'id' limit 1;
  s:=jsonb_set(jsonb_set(s,'{status}','"finished"'),'{winner}',coalesce(to_jsonb(winner),'null'));
 end if;return s;
end $$;
create or replace function public.orbit_match_action(s jsonb,pid text,a text,d jsonb,t bigint) returns jsonb language plpgsql set search_path=public,pg_temp as $$
declare p jsonb;i int;cost int;duration int;power int;used int;supply int;plot int;typ text;o jsonb;j int;
begin
 if s->>'version'='2' then return public.orbit_strategy_action(s,pid,a,d,t);end if;
 s:=public.orbit_match_advance(s,t);
 select (ordinality-1)::int,value into i,p from jsonb_array_elements(s->'players') with ordinality where value->>'id'=pid;
 if p is null or (p->>'forfeit')::boolean then raise exception 'You are not an active player.';end if;
 if a='ready' then
  if s->>'status'<>'waiting' then raise exception 'The match already started.';end if;
  p:=jsonb_set(p,'{ready}',to_jsonb(not (p->>'ready')::boolean));return jsonb_set(s,array['players',i::text],p);
 elsif a='start' then
  if s->>'host'<>pid then raise exception 'Only the host can start.';end if;
  if s->>'status'<>'waiting' or jsonb_array_length(s->'players')<2 or exists(select 1 from jsonb_array_elements(s->'players') x where not (x->>'ready')::boolean) then raise exception 'At least two players must be ready.';end if;
  s:=jsonb_set(jsonb_set(s,'{status}','"running"'),'{started}',to_jsonb(t));for j in 1..6 loop s:=public.orbit_match_offer(s);end loop;return s;
 end if;
 if s->>'status'<>'running' then raise exception 'The match is not running.';end if;
 if a='build' then
  typ:=d->>'type';plot:=(d->>'plot')::int;
  if typ is null or typ not in ('factory','pad','solar','lab') or plot is null or plot<0 or plot>=jsonb_array_length(p->'plots') or p->'plots'->plot<>'null'::jsonb or p->'building'<>'null'::jsonb then raise exception 'Choose an empty plot and wait for current construction.';end if;
  cost:=case typ when 'factory' then 12000 when 'pad' then 8000 when 'solar' then 6000 else 15000 end;
  duration:=case typ when 'factory' then 20000 when 'pad' then 15000 when 'solar' then 12000 else 25000 end;
  select 4+count(*) filter(where x='"solar"')*6, count(*) filter(where x in ('"factory"','"pad"','"lab"'))*2 into supply,used from jsonb_array_elements(p->'plots') x;
  if typ<>'solar' and used+2>supply then raise exception 'Finish a solar array for more power.';end if;
  p:=jsonb_set(p,'{building}',jsonb_build_object('type',typ,'plot',plot,'end',t+duration));
 elsif a='expand' then
  if jsonb_array_length(p->'plots')>=16 then raise exception 'All plots owned.';end if;
  cost:=4000+(jsonb_array_length(p->'plots')-4)*2000;p:=jsonb_set(p,'{plots}',(p->'plots')||'[null]'::jsonb);
 elsif a='launch' then
  if not (p->'plots' @> '["factory","pad"]'::jsonb) or p->'production'<>'null'::jsonb or (p->>'satellites')::int>=12 then raise exception 'Finish a factory and pad. Only one launch can be prepared at a time.';end if;
  cost:=40000;p:=jsonb_set(p,'{production}',jsonb_build_object('end',t+30000));
 elsif a='accept' then
  select x into o from jsonb_array_elements(s->'offers') x where x->>'id'=d->>'id';if o is null then raise exception 'Another company already took this contract.';end if;
  if jsonb_array_length(p->'missions')>=(p->>'satellites')::int then raise exception 'All satellites are busy.';end if;
  cost:=(o->>'cost')::int;duration:=round((o->>'duration')::numeric*(case when p->'plots' @> '["lab"]' then 0.8 else 1 end));
  p:=jsonb_set(p,'{missions}',(p->'missions')||jsonb_build_array(o||jsonb_build_object('end',t+duration)));
  s:=jsonb_set(s,'{offers}',coalesce((select jsonb_agg(x) from jsonb_array_elements(s->'offers') x where x->>'id'<>o->>'id'),'[]'));s:=public.orbit_match_offer(s);
 elsif a='forfeit' then
  p:=jsonb_set(jsonb_set(p,'{forfeit}','true'),'{missions}','[]');return public.orbit_match_advance(jsonb_set(s,array['players',i::text],p),t);
 else raise exception 'Unknown match action.';end if;
 if (p->>'money')::int<cost then raise exception 'Not enough funds.';end if;
 p:=jsonb_set(p,'{money}',to_jsonb((p->>'money')::int-cost));return jsonb_set(s,array['players',i::text],p);
end $$;
create or replace function public.orbit_pact_lobby(p_action text,p_token text,p_code text default '',p_data jsonb default '{}',p_seq bigint default 0) returns jsonb language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare h text;c text;r public.orbit_pact_rooms%rowtype;m public.orbit_pact_members%rowtype;s jsonb;p jsonb;pid text;ll jsonb;nm text;country text;t bigint:=floor(extract(epoch from clock_timestamp())*1000)::bigint;
begin
 if p_token is null or p_token!~'^[a-f0-9]{64}$' then raise exception 'Invalid player session.';end if;
 if p_data is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>2048 then raise exception 'Invalid request.';end if;
 h:=encode(extensions.digest(p_token,'sha256'),'hex');c:=upper(trim(p_code));
 -- A token may own one membership only. Serialise retries of create/join.
 perform pg_advisory_xact_lock(hashtextextended(h,0));select * into m from public.orbit_pact_members where token_hash=h;
 if p_action in ('create','join') and m.token_hash is null then
  nm:=left(regexp_replace(trim(coalesce(p_data->>'name','')),'[<>[:cntrl:]]','','g'),32);country:=p_data->>'countryId';select coordinates into ll from public.orbit_pact_match_countries where id=country;
  if length(nm)<2 or ll is null then raise exception 'Enter a company name and choose a country.';end if;
  if p_action='create' then
   if (select count(*) from public.orbit_pact_rooms where expires_at>now())>=1000 then raise exception 'Lobby capacity reached. Please try again later.';end if;
   c:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));pid:=gen_random_uuid()::text;
   s:=jsonb_build_object('version',case when p_data->>'version'='2' then 2 else 1 end,'status','waiting','host',pid,'players','[]'::jsonb,'offers','[]'::jsonb,'nextOffer',1,'started',0,'now',t,'winner',null);
   if s->>'version'='2' then s:=s||jsonb_build_object('nodes',public.orbit_strategy_nodes(),'log','[]'::jsonb,'endless',false);end if;
   insert into public.orbit_pact_rooms(code,state) values(c,s);
  elsif c!~'^[A-F0-9]{8}$' then raise exception 'Enter the eight-character lobby code.';end if;
  select * into r from public.orbit_pact_rooms where code=c and expires_at>now() for update;if not found then raise exception 'Lobby not found or expired.';end if;s:=r.state;
  if s->>'status'<>'waiting' or jsonb_array_length(s->'players')>=4 then raise exception 'This lobby has started or is full.';end if;
  if exists(select 1 from jsonb_array_elements(s->'players') x where x->>'countryId'=country) then raise exception 'Another company selected this country. Choose another.';end if;
  pid:=coalesce(pid,gen_random_uuid()::text);p:=jsonb_build_object('id',pid,'name',nm,'countryId',country,'coordinates',ll,'money',100000,'revenue',0,'satellites',1,'plots','["hq",null,null,null]'::jsonb,'building',null,'production',null,'missions','[]'::jsonb,'ready',false,'forfeit',false);
  if s->>'version'='2' then p:=public.orbit_strategy_player(p);end if;
  s:=jsonb_set(s,'{players}',(s->'players')||jsonb_build_array(p));update public.orbit_pact_rooms set state=s where code=c;
  insert into public.orbit_pact_members(token_hash,room_code,player_id) values(h,c,pid) returning * into m;
 else
  if m.token_hash is null then raise exception 'Player session not found. Join with a lobby code.';end if;
  if c<>m.room_code and p_action<>'create' then raise exception 'Player session belongs to another lobby.';end if;c:=m.room_code;
  select * into r from public.orbit_pact_rooms where code=c and expires_at>now() for update;if not found then raise exception 'Lobby expired. Create a new one.';end if;s:=public.orbit_match_advance(r.state,t);
  if p_action not in ('create','join','poll') then
   if p_seq=m.seq then null; -- Lost response: return current state without repeating the command.
   elsif p_seq=m.seq+1 then s:=public.orbit_match_action(s,m.player_id,p_action,p_data,t);update public.orbit_pact_members set seq=p_seq where token_hash=h returning * into m;
   else raise exception 'Session changed. Refresh before your next action.';end if;
  end if;
  update public.orbit_pact_rooms set state=s where code=c;
 end if;
 return jsonb_build_object('code',c,'self',m.player_id,'seq',m.seq,'room',s);
end $$;
revoke all on function public.orbit_match_offer(jsonb),public.orbit_match_advance(jsonb,bigint),public.orbit_match_action(jsonb,text,text,jsonb,bigint) from public,anon,authenticated;
revoke all on function public.orbit_pact_lobby(text,text,text,jsonb,bigint) from public;
grant execute on function public.orbit_pact_lobby(text,text,text,jsonb,bigint) to anon,authenticated;
revoke all on function public.orbit_strategy_config(),public.orbit_strategy_level(jsonb,text),public.orbit_strategy_log(jsonb,text),public.orbit_strategy_player(jsonb),public.orbit_strategy_nodes(),public.orbit_strategy_income(jsonb,jsonb,bigint),public.orbit_strategy_advance(jsonb,bigint),public.orbit_strategy_action(jsonb,text,text,jsonb,bigint) from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
