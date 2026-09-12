// Generates a SQL replay of the same commands and states as the local solo rules.
const fs=require('fs'),vm=require('vm');const c=vm.createContext({console});for(const f of ['vendor/d3.min.js','js/world-data.js','js/locale.js','js/config.js','js/base.js','js/match-rules.js','js/strategy-rules.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);const run=s=>vm.runInContext(s,c);
run(`var r=MATCH_RULES.room(MATCH_RULES.player('a','Alpha','NLD'));r.players.push(MATCH_RULES.player('b','Beta','USA'));r.players.forEach(p=>p.ready=true);STRATEGY.upgrade(r,false);STRATEGY.start(r,0);`);
const steps=[
[0,'a','build',{plot:1,type:'factory'}],[0,'b','build',{plot:1,type:'factory'}],[0,'a','connect',{countryId:'NLD'}],[0,'b','connect',{countryId:'USA'}],
[20000,'a','build',{plot:2,type:'pad'}],[20000,'b','build',{plot:2,type:'pad'}],[35000,'a','launch',{type:'relay'}],[35000,'b','launch',{type:'mapper'}],[35000,'a','build',{plot:3,type:'solar'}],
[47000,'a','expand',{}],[47000,'a','build',{plot:4,type:'lab'}],[72000,'a','accept',{id:1}],
[90000,'a','sabotage',{target:'b'}],[91000,'b','shield',{}],[91000,'a','connect',{countryId:'CAN'}],
[120000,'b','connect',{countryId:'NLD'}],[125000,'a','defend-node',{countryId:'NLD'}],[130000,'a','event',{}],
[152000,'a','upgrade-building',{plot:1}],[170000,'a','upgrade-node',{countryId:'NLD'}]
];
let sql=`-- Replay valid actions against server and solo implementations. No persistent fixtures.\ndo $test$\ndeclare s jsonb:=$state$${run('JSON.stringify(r)')}$state$::jsonb; expected jsonb;\nbegin\n`;
for(const [t,id,a,d] of steps){run(`STRATEGY.action(r,${JSON.stringify(id)},${JSON.stringify(a)},${JSON.stringify(d)},${t})`);const expected=JSON.parse(run('JSON.stringify(r)'));delete expected.log;sql+=`s:=public.orbit_match_action(s,'${id}','${a}',$arg$${JSON.stringify(d)}$arg$::jsonb,${t});\nexpected:=$expect$${JSON.stringify(expected)}$expect$::jsonb;\nif s-'log'<>expected then raise exception 'Server/solo mismatch after ${a} at ${t}: % vs %',s-'log',expected;end if;\n`;}
sql+="end $test$;\nselect '20 shared-rule replay states matched' as validation;\n";fs.writeFileSync(__dirname+'/../supabase/tests/frontier-replay.sql',sql);console.log('Generated 20 server/solo replay states');
