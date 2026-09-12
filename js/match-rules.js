'use strict';
const MATCH_RULES={goal:250000,maxPlayers:4,limit:1800000,
 buildings:{factory:{name:'Satellite factory',cost:12000,time:20000,power:2,icon:'layers'},pad:{name:'Launch pad',cost:8000,time:15000,power:2,icon:'trend'},solar:{name:'Solar array',cost:6000,time:12000,power:-6,icon:'bolt'},lab:{name:'Research lab',cost:15000,time:25000,power:2,icon:'radar'}},
 countries:()=>WORLD_DATA.features.filter(f=>f.properties.region!=='Antarctica').sort((a,b)=>a.id.localeCompare(b.id)),
 player(id,name,countryId){const point=baseSystem.landPoint(countryId);if(!point)throw Error('Choose a country for your headquarters.');name=String(name||'').trim().replace(/[<>\x00-\x1f]/g,'').slice(0,32);if(name.length<2)throw Error('Enter a company name of at least 2 characters.');return {id,name,countryId,coordinates:point,money:100000,revenue:0,satellites:1,plots:['hq',null,null,null],building:null,production:null,missions:[],ready:false,forfeit:false};},
 room(player,now=0){return {version:1,status:'waiting',host:player.id,players:[player],offers:[],nextOffer:1,started:0,now,winner:null};},
 offer(room){const id=room.nextOffer++,country=this.countries()[(id*17)%this.countries().length];return {id,countryId:country.id,name:['Weather survey','Mapping contract','Communications relay','Climate research'][id%4],cost:4000+(id%3)*1500,reward:16000+(id%5)*4000,duration:35000+(id%4)*5000};},
 start(room,now){if(room.status!=='waiting'||room.players.length<2||room.players.some(p=>!p.ready))throw Error('At least two players must be ready.');room.status='running';room.started=now;room.now=now;room.offers=Array.from({length:6},()=>this.offer(room));},
 advance(room,now){room.now=Math.max(room.now,now);if(room.status!=='running')return;const end=Math.min(now,room.started+this.limit),events=[];
  for(const p of room.players){if(p.forfeit)continue;if(p.building&&p.building.end<=end){p.plots[p.building.plot]=p.building.type;p.building=null;}if(p.production&&p.production.end<=end){p.satellites++;p.production=null;}for(const m of p.missions)if(m.end<=end)events.push({p,m});}
  events.sort((a,b)=>a.m.end-b.m.end||a.p.id.localeCompare(b.p.id));for(const {p,m} of events){if(room.status!=='running')break;p.money+=m.reward;p.revenue+=m.reward;p.missions=p.missions.filter(j=>j.id!==m.id);if(p.revenue>=this.goal){room.status='finished';room.winner=p.id;}}
  const active=room.players.filter(p=>!p.forfeit);if(room.status==='running'&&active.length===1){room.status='finished';room.winner=active[0].id;}
  if(room.status==='running'&&now>=room.started+this.limit){room.status='finished';room.winner=active.slice().sort((a,b)=>b.revenue-a.revenue||a.id.localeCompare(b.id))[0]?.id||null;}
 },
 power(p){const types=[...p.plots,p.building?.type];return {supply:4+p.plots.filter(t=>t==='solar').length*6,used:types.reduce((n,t)=>n+Math.max(0,this.buildings[t]?.power||0),0)};},
 action(room,id,action,data={},now=room.now){this.advance(room,now);const p=room.players.find(p=>p.id===id);if(!p||p.forfeit)throw Error('You are not an active player.');if(action==='ready'){if(room.status!=='waiting')throw Error('The match already started.');p.ready=!p.ready;return;}if(action==='start'){if(id!==room.host)throw Error('Only the host can start.');this.start(room,now);return;}
  if(room.status!=='running')throw Error('The match is not running.');const pay=cost=>{if(p.money<cost)throw Error('Not enough funds.');p.money-=cost;};
  if(action==='build'){const d=this.buildings[data.type];if(!Object.hasOwn(this.buildings,data.type)||!Number.isInteger(data.plot)||data.plot<0||data.plot>=p.plots.length||p.plots[data.plot]!==null||p.building)throw Error('Choose an empty plot and wait for current construction.');const power=this.power(p);if(d.power>0&&power.used+d.power>power.supply)throw Error('Finish a solar array for more power.');pay(d.cost);p.building={type:data.type,plot:data.plot,end:now+d.time};}
  else if(action==='expand'){if(p.plots.length>=16)throw Error('All plots owned.');pay(4000+(p.plots.length-4)*2000);p.plots.push(null);}
  else if(action==='launch'){if(!p.plots.includes('factory')||!p.plots.includes('pad')||p.production||p.satellites>=12)throw Error('Finish a factory and pad. Only one launch can be prepared at a time.');pay(40000);p.production={end:now+30000};}
  else if(action==='accept'){const m=room.offers.find(o=>o.id===data.id);if(!m)throw Error('Another company already took this contract.');if(p.missions.length>=p.satellites)throw Error('All satellites are busy.');pay(m.cost);p.missions.push({...m,end:now+Math.round(m.duration*(p.plots.includes('lab')?.8:1))});room.offers=room.offers.filter(o=>o.id!==m.id);room.offers.push(this.offer(room));}
  else if(action==='forfeit'){p.forfeit=true;p.missions=[];this.advance(room,now);}
  else throw Error('Unknown match action.');
 },
 bot(room,id,difficulty,now){const p=room.players.find(p=>p.id===id);if(!p||p.forfeit||room.status!=='running')return;const perform=(a,d={})=>{try{this.action(room,id,a,d,now);return true;}catch{return false;}};
  const offers=room.offers.slice();if(difficulty==='hard')offers.sort((a,b)=>(b.reward-b.cost)/b.duration-(a.reward-a.cost)/a.duration);else if(difficulty==='easy')offers.reverse();
  for(const o of offers)if(p.missions.length<p.satellites&&p.money>=o.cost){perform('accept',{id:o.id});if(difficulty==='easy')break;}
  if(!p.building&&p.money>20000){const type=['factory','pad','solar','lab'].find(t=>!p.plots.includes(t));if(type){let plot=p.plots.indexOf(null);if(plot<0){perform('expand');plot=p.plots.indexOf(null);}if(plot>=0)perform('build',{type,plot});}}
  if(p.money>=55000)perform('launch');
 }
};
