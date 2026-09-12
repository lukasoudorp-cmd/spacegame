-- Dedicated match tables. Existing cloud saves are not modified.
begin;
create table if not exists public.orbit_pact_match_countries(id text primary key, coordinates jsonb not null);
create table if not exists public.orbit_pact_rooms(code text primary key, state jsonb not null, created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '48 hours');
create index if not exists orbit_pact_rooms_expiry on public.orbit_pact_rooms(expires_at);
create table if not exists public.orbit_pact_members(token_hash text primary key, room_code text not null references public.orbit_pact_rooms(code) on delete cascade, player_id text not null, seq bigint not null default 0);
alter table public.orbit_pact_match_countries enable row level security;
alter table public.orbit_pact_rooms enable row level security;
alter table public.orbit_pact_members enable row level security;
revoke all on public.orbit_pact_match_countries,public.orbit_pact_rooms,public.orbit_pact_members from public,anon,authenticated;
insert into public.orbit_pact_match_countries(id,coordinates) values
('FJI','[177.975427,-17.826099]'::jsonb),
('TZA','[34.959183,-6.051866]'::jsonb),
('SAH','[-12.630304,23.967592]'::jsonb),
('CAN','[-101.9107,60.324287]'::jsonb),
('USA','[-97.482602,39.538479]'::jsonb),
('KAZ','[68.685548,49.054149]'::jsonb),
('UZB','[64.005429,41.693603]'::jsonb),
('PNG','[143.910216,-5.695285]'::jsonb),
('IDN','[101.892949,-0.954404]'::jsonb),
('ARG','[-64.173331,-33.501159]'::jsonb),
('CHL','[-72.318871,-38.151771]'::jsonb),
('COD','[23.458829,-1.858167]'::jsonb),
('SOM','[45.19238,3.568925]'::jsonb),
('KEN','[37.907632,0.549043]'::jsonb),
('SDN','[29.260657,16.330746]'::jsonb),
('TCD','[18.645041,15.142959]'::jsonb),
('HTI','[-72.224051,19.263784]'::jsonb),
('DOM','[-70.653998,19.104137]'::jsonb),
('RUS','[44.686469,58.249357]'::jsonb),
('BHS','[-77.146688,26.401789]'::jsonb),
('FLK','[-58.738602,-51.608913]'::jsonb),
('NOR','[9.679975,61.357092]'::jsonb),
('GRL','[-39.335251,74.319387]'::jsonb),
('ATF','[69.122136,-49.303721]'::jsonb),
('TLS','[125.854679,-8.803705]'::jsonb),
('ZAF','[23.665734,-29.708776]'::jsonb),
('LSO','[28.246639,-29.480158]'::jsonb),
('MEX','[-102.289448,23.919988]'::jsonb),
('URY','[-55.966942,-32.961127]'::jsonb),
('BRA','[-49.55945,-12.098687]'::jsonb),
('BOL','[-64.593433,-16.666015]'::jsonb),
('PER','[-72.90016,-12.976679]'::jsonb),
('COL','[-73.174347,3.373111]'::jsonb),
('PAN','[-80.352106,8.72198]'::jsonb),
('CRI','[-84.077922,10.0651]'::jsonb),
('NIC','[-85.069347,12.670697]'::jsonb),
('HND','[-86.887604,14.794801]'::jsonb),
('SLV','[-88.890124,13.685371]'::jsonb),
('GTM','[-90.497134,14.982133]'::jsonb),
('BLZ','[-88.712962,17.202068]'::jsonb),
('VEN','[-64.599381,7.182476]'::jsonb),
('GUY','[-58.942643,5.124317]'::jsonb),
('SUR','[-55.91094,4.143987]'::jsonb),
('FRA','[2.552275,46.696113]'::jsonb),
('ECU','[-78.188375,-1.259076]'::jsonb),
('PRI','[-66.481065,18.234668]'::jsonb),
('JAM','[-77.318767,18.137124]'::jsonb),
('CUB','[-77.975855,21.334024]'::jsonb),
('ZWE','[29.925444,-18.91164]'::jsonb),
('BWA','[24.179216,-22.102634]'::jsonb),
('NAM','[17.108166,-20.575298]'::jsonb),
('SEN','[-14.778586,15.138125]'::jsonb),
('MLI','[-2.038455,18.692713]'::jsonb),
('MRT','[-9.740299,19.587062]'::jsonb),
('BEN','[2.352018,10.324775]'::jsonb),
('NER','[9.504356,17.446195]'::jsonb),
('NGA','[7.50322,9.439799]'::jsonb),
('CMR','[12.473488,4.585041]'::jsonb),
('TGO','[1.058113,8.80722]'::jsonb),
('GHA','[-1.036941,7.717639]'::jsonb),
('CIV','[-5.568618,7.49139]'::jsonb),
('GIN','[-10.016402,10.618516]'::jsonb),
('GNB','[-14.52413,12.163712]'::jsonb),
('LBR','[-9.460379,6.447177]'::jsonb),
('SLE','[-11.763677,8.617449]'::jsonb),
('BFA','[-1.36388,12.673048]'::jsonb),
('CAF','[20.906897,6.989681]'::jsonb),
('COG','[15.9005,0.142331]'::jsonb),
('GAB','[11.835939,-0.437739]'::jsonb),
('GNQ','[10.366003745243594,1.6459675575343957]'::jsonb),
('ZMB','[26.395298,-14.660804]'::jsonb),
('MWI','[33.608082,-13.386737]'::jsonb),
('MOZ','[37.83789,-13.94323]'::jsonb),
('SWZ','[31.467264,-26.533676]'::jsonb),
('AGO','[17.984249,-12.182762]'::jsonb),
('BDI','[29.917086,-3.332836]'::jsonb),
('ISR','[34.847915,30.911148]'::jsonb),
('LBN','[35.992892,34.133368]'::jsonb),
('MDG','[46.704241,-18.628288]'::jsonb),
('PSX','[35.291341,32.047431]'::jsonb),
('GMB','[-14.998318,13.641721]'::jsonb),
('TUN','[9.007881,33.687263]'::jsonb),
('DZA','[2.808241,27.397406]'::jsonb),
('JOR','[36.375991,30.805025]'::jsonb),
('ARE','[54.547256,23.466285]'::jsonb),
('QAT','[51.143509,25.237383]'::jsonb),
('KWT','[47.313999,29.413628]'::jsonb),
('IRQ','[43.26181,33.09403]'::jsonb),
('OMN','[57.336553,22.120427]'::jsonb),
('VUT','[166.908762,-15.37153]'::jsonb),
('KHM','[104.50487,12.647584]'::jsonb),
('THA','[101.073198,15.45974]'::jsonb),
('LAO','[102.533912,19.431821]'::jsonb),
('MMR','[95.804497,21.573855]'::jsonb),
('VNM','[105.387292,21.715416]'::jsonb),
('PRK','[126.444516,39.885252]'::jsonb),
('KOR','[128.129504,36.384924]'::jsonb),
('MNG','[104.150405,45.997488]'::jsonb),
('IND','[79.358105,22.686852]'::jsonb),
('BGD','[89.684963,24.214956]'::jsonb),
('BTN','[90.040294,27.536685]'::jsonb),
('NPL','[83.639914,28.297925]'::jsonb),
('PAK','[68.545632,29.328389]'::jsonb),
('AFG','[66.496586,34.164262]'::jsonb),
('TJK','[72.587276,38.199835]'::jsonb),
('KGZ','[74.532637,41.66854]'::jsonb),
('TKM','[58.676647,39.855246]'::jsonb),
('IRN','[54.931495,32.166225]'::jsonb),
('SYR','[38.277783,35.006636]'::jsonb),
('ARM','[44.800564,40.459077]'::jsonb),
('SWE','[19.01705,65.85918]'::jsonb),
('BLR','[28.417701,53.821888]'::jsonb),
('UKR','[32.140865,49.724739]'::jsonb),
('POL','[19.490468,51.990316]'::jsonb),
('AUT','[14.130515,47.518859]'::jsonb),
('HUN','[19.447867,47.086841]'::jsonb),
('MDA','[28.487904,47.434999]'::jsonb),
('ROU','[24.972624,45.733237]'::jsonb),
('LTU','[24.089932,55.103703]'::jsonb),
('LVA','[25.458723,57.066872]'::jsonb),
('EST','[25.867126,58.724865]'::jsonb),
('DEU','[9.678348,50.961733]'::jsonb),
('BGR','[25.15709,42.508785]'::jsonb),
('GRC','[21.72568,39.492763]'::jsonb),
('TUR','[34.508268,39.345388]'::jsonb),
('ALB','[20.11384,40.654855]'::jsonb),
('HRV','[16.37241,45.805799]'::jsonb),
('CHE','[7.463965,46.719114]'::jsonb),
('LUX','[6.07762,49.733732]'::jsonb),
('BEL','[4.800448,50.785392]'::jsonb),
('NLD','[5.61144,52.422211]'::jsonb),
('PRT','[-8.271754,39.606675]'::jsonb),
('ESP','[-3.464718,40.090953]'::jsonb),
('IRL','[-7.798588,53.078726]'::jsonb),
('NCL','[165.084004,-21.064697]'::jsonb),
('SLB','[159.170468,-8.029548]'::jsonb),
('NZL','[172.9507899966019,-41.55162883237275]'::jsonb),
('AUS','[134.04972,-24.129522]'::jsonb),
('LKA','[80.704823,7.581097]'::jsonb),
('CHN','[106.337289,32.498178]'::jsonb),
('TWN','[120.868204,23.652408]'::jsonb),
('ITA','[11.076907,44.732482]'::jsonb),
('DNK','[9.018163,55.966965]'::jsonb),
('GBR','[-2.116346,54.402739]'::jsonb),
('ISL','[-18.673711,64.779286]'::jsonb),
('AZE','[47.210994,40.402387]'::jsonb),
('GEO','[43.735724,41.870087]'::jsonb),
('PHL','[122.465,11.198]'::jsonb),
('MYS','[113.83708,2.528667]'::jsonb),
('BRN','[114.551943,4.448298]'::jsonb),
('SVN','[14.915312,46.06076]'::jsonb),
('FIN','[27.276449,63.252361]'::jsonb),
('SVK','[19.049868,48.734044]'::jsonb),
('CZE','[15.377555,49.882364]'::jsonb),
('ERI','[38.285566,15.787401]'::jsonb),
('JPN','[138.44217,36.142538]'::jsonb),
('PRY','[-60.146394,-21.674509]'::jsonb),
('YEM','[45.874383,15.328226]'::jsonb),
('SAU','[44.6996,23.806908]'::jsonb),
('CYN','[33.692434,35.216071]'::jsonb),
('CYP','[33.084182,34.913329]'::jsonb),
('MAR','[-7.187296,31.650723]'::jsonb),
('EGY','[29.445837,26.186173]'::jsonb),
('LBY','[18.011015,26.638944]'::jsonb),
('ETH','[39.0886,8.032795]'::jsonb),
('DJI','[42.498825,11.976343]'::jsonb),
('SOL','[46.731595,9.443889]'::jsonb),
('UGA','[32.948555,1.972589]'::jsonb),
('RWA','[30.103894,-1.897196]'::jsonb),
('BIH','[18.06841,44.091051]'::jsonb),
('MKD','[21.555839,41.558223]'::jsonb),
('SRB','[20.787989,44.189919]'::jsonb),
('MNE','[19.143727,42.803101]'::jsonb),
('KOS','[20.860719,42.593587]'::jsonb),
('TTO','[-61.33050527274443,10.428272992893323]'::jsonb),
('SDS','[30.390151,7.230477]'::jsonb)
on conflict(id) do update set coordinates=excluded.coordinates;
create or replace function public.orbit_match_offer(s jsonb) returns jsonb language plpgsql set search_path=public,pg_temp as $$
declare n int:=(s->>'nextOffer')::int; c text; o jsonb;
begin
 select id into c from public.orbit_pact_match_countries order by id offset ((n*17)%(select count(*) from public.orbit_pact_match_countries)) limit 1;
 o:=jsonb_build_object('id',n,'countryId',c,'name',(array['Weather survey','Mapping contract','Communications relay','Climate research'])[n%4+1],'cost',4000+(n%3)*1500,'reward',16000+(n%5)*4000,'duration',35000+(n%4)*5000);
 return jsonb_set(jsonb_set(s,'{offers}',(s->'offers')||jsonb_build_array(o)),'{nextOffer}',to_jsonb(n+1));
end $$;
create or replace function public.orbit_match_advance(s jsonb,t bigint) returns jsonb language plpgsql set search_path=public,pg_temp as $$
declare p jsonb; ev record; i int; cutoff bigint; active_count int; winner text;
begin
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
   s:=jsonb_build_object('version',1,'status','waiting','host',pid,'players','[]'::jsonb,'offers','[]'::jsonb,'nextOffer',1,'started',0,'now',t,'winner',null);
   insert into public.orbit_pact_rooms(code,state) values(c,s);
  elsif c!~'^[A-F0-9]{8}$' then raise exception 'Enter the eight-character lobby code.';end if;
  select * into r from public.orbit_pact_rooms where code=c and expires_at>now() for update;if not found then raise exception 'Lobby not found or expired.';end if;s:=r.state;
  if s->>'status'<>'waiting' or jsonb_array_length(s->'players')>=4 then raise exception 'This lobby has started or is full.';end if;
  if exists(select 1 from jsonb_array_elements(s->'players') x where x->>'countryId'=country) then raise exception 'Another company selected this country. Choose another.';end if;
  pid:=coalesce(pid,gen_random_uuid()::text);p:=jsonb_build_object('id',pid,'name',nm,'countryId',country,'coordinates',ll,'money',100000,'revenue',0,'satellites',1,'plots','["hq",null,null,null]'::jsonb,'building',null,'production',null,'missions','[]'::jsonb,'ready',false,'forfeit',false);
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
notify pgrst,'reload schema';
commit;
