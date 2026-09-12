'use strict';
// Competitive network rules. Legacy rooms keep their original v1 rule set.
const STRATEGY = {
 nodes:['USA','CAN','BRA','GBR','NLD','FRA','EGY','ZAF','IND','CHN','JPN','AUS'],
 target:7, hold:45000, grace:90000,
 buildings:{...MATCH_RULES.buildings,guard:{name:'Signal defense',cost:18000,time:18000,power:2,icon:'radar'},station:{name:'Orbital station',cost:90000,time:45000,power:4,icon:'globe'}},
 blueprints:{scout:{name:'Scout',cost:18000,time:18000,description:'Affordable fleet capacity. Two network regions per satellite.'},relay:{name:'Relay',cost:28000,time:24000,description:'Adds €200 to network income every 5 seconds.'},mapper:{name:'Mapper',cost:32000,time:28000,description:'+10% contract payouts, up to +30% with three Mappers.'}},
 upgrade(r,endless=false){if(r.version===2)return r;r.version=2;r.endless=endless;r.status=r.status==='finished'&&endless?'running':r.status;r.winner=null;r.nodes=this.nodes.map(countryId=>({countryId,owner:null,level:0,claim:null,protectedUntil:0}));r.log=[];
  for(const p of r.players)Object.assign(p,{fleet:{scout:p.satellites,relay:0,mapper:0},levels:p.plots.map(x=>x?1:0),shieldUntil:0,jamUntil:0,jamCooldown:0,immuneUntil:0,lastLaunch:0,incomeRemainder:0,dominanceSince:null,lastEvent:-1});return r;},
 start(r,t){MATCH_RULES.start(r,t);for(const p of r.players){p.immuneUntil=t+this.grace;p.shieldUntil=0;}this.log(r,'Network frontier opened. Build, connect and defend.');},
 log(r,text){r.log=[{time:r.now,text},...(r.log||[])].slice(0,8);},
 level(p,type){return Math.max(0,...p.plots.map((v,i)=>v===type?(p.levels[i]||1):0));},
 power(p){const types=p.plots.slice();if(p.building&&!types[p.building.plot])types.push(p.building.type);return {supply:4+p.plots.reduce((sum,t,i)=>sum+(t==='solar'?6*(p.levels[i]||1):0),0),used:types.reduce((sum,t)=>sum+Math.max(0,this.buildings[t]?.power||0),0)};},
 owned(r,id){return r.nodes.filter(n=>n.owner===id);},
 income(r,p,t=r.now){if(p.forfeit)return 0;return 300+(p.jamUntil>t?0:this.owned(r,p.id).reduce((a,n)=>a+n.level*600,0)+p.fleet.relay*200+this.level(p,'station')*2000);},
 event(r){const elapsed=Math.max(0,r.now-r.started),cycle=Math.floor(elapsed/90000),type=cycle%3;return {cycle,type,active:elapsed%90000<45000,end:r.started+cycle*90000+45000,name:['Emergency weather coverage','Rapid mapping request','Festival communications'][type],reward:24000+type*4000};},
 advance(r,t){if(r.version!==2){MATCH_RULES.advance(r,t);return;}t=Math.max(r.now,t);if(r.status!=='running'){r.now=t;return;}
  const cuts=new Set([t]);for(const p of r.players)for(const v of [p.building?.end,p.production?.end,p.jamUntil,p.dominanceSince===null?null:p.dominanceSince+this.hold])if(v>r.now&&v<=t)cuts.add(v);
  for(const n of r.nodes)for(const v of [n.claim?.end,n.claim?n.claim.end+this.hold:null])if(v>r.now&&v<=t)cuts.add(v);
  // Finish state transitions at their real timestamps, so reconnecting cannot backdate income.
  for(const end of [...cuts].sort((a,b)=>a-b)){
   for(const p of r.players){if(p.forfeit)continue;const funds=(end-r.now)*this.income(r,p,r.now)+(p.incomeRemainder||0);p.money+=Math.floor(funds/5000);p.incomeRemainder=funds%5000;}
   r.now=end;
   for(const p of r.players){if(p.forfeit)continue;
    if(p.building&&p.building.end<=end){const b=p.building;p.plots[b.plot]=b.type;p.levels[b.plot]=b.level||1;p.building=null;this.log(r,p.name+' completed '+this.buildings[b.type].name+'.');}
    if(p.production&&p.production.end<=end){const type=p.production.type||'scout';p.fleet[type]++;p.satellites++;p.lastLaunch=p.production.end;p.production=null;this.log(r,p.name+' launched a '+this.blueprints[type].name+'.');}
    for(const m of p.missions.filter(m=>m.end<=end)){p.money+=m.reward;p.revenue+=m.reward;this.log(r,p.name+' completed '+m.name+'.');}p.missions=p.missions.filter(m=>m.end>end);
   }
   for(const n of r.nodes)if(n.claim&&n.claim.end<=end){const p=r.players.find(p=>p.id===n.claim.by);n.owner=p&&!p.forfeit?p.id:null;n.level=n.owner?1:0;n.claim=null;n.protectedUntil=end+20000;if(n.owner)this.log(r,p.name+' connected '+Utils.country(n.countryId).properties.name+'.');}
   for(const p of r.players){if(this.owned(r,p.id).length>=this.target){if(p.dominanceSince===null)p.dominanceSince=end;}else p.dominanceSince=null;}
   const leader=r.players.filter(p=>!p.forfeit&&p.dominanceSince!==null&&end-p.dominanceSince>=this.hold).sort((a,b)=>a.dominanceSince-b.dominanceSince||a.id.localeCompare(b.id))[0];
   if(!r.endless&&leader){r.status='finished';r.winner=leader.id;return;}
  }
 },
 action(r,id,a,d={},t=r.now){if(r.version!==2)return MATCH_RULES.action(r,id,a,d,t);this.advance(r,t);t=r.now;const p=r.players.find(p=>p.id===id);if(!p||p.forfeit)throw Error('You are not an active player.');
  if(a==='ready'){if(r.status!=='waiting')throw Error('The match already started.');p.ready=!p.ready;return;}
  if(a==='start'){if(r.host!==id)throw Error('Only the host can start.');this.start(r,t);return;}
  if(r.status!=='running')throw Error('The match is not running.');const pay=cost=>{if(p.money<cost)throw Error('Not enough funds.');p.money-=cost;};
  if(a==='build'||a==='upgrade-building'){const plot=Number(d.plot),old=p.plots[plot],type=a==='build'?d.type:old,def=this.buildings[type],level=a==='build'?1:(p.levels[plot]||1)+1;
   if(!Object.hasOwn(this.buildings,type)||!Number.isInteger(plot)||plot<0||plot>=p.plots.length||p.building||(a==='build'?old!==null:!old)||level>3)throw Error('Select an available site. Finish current construction first.');
   if(type==='station'&&(this.level(p,'lab')<2||this.level(p,'factory')<2||p.satellites<6))throw Error('Station requires a level 2 lab, level 2 factory and six satellites.');
   const power=this.power(p);if(a==='build'&&def.power>0&&power.used+def.power>power.supply)throw Error('Build or upgrade a solar array for more power.');
   pay(a==='build'?def.cost:Math.round(def.cost*(level-1)*.75));p.building={type,plot,level,start:t,end:t+(a==='build'?def.time:12000)};
  }else if(a==='expand'){if(p.plots.length>=16)throw Error('All land owned.');pay(4000+(p.plots.length-4)*2000);p.plots.push(null);p.levels.push(0);
  }else if(a==='launch'){const type=d.type||'scout';if(!Object.hasOwn(this.blueprints,type)||!this.level(p,'factory')||!this.level(p,'pad')||p.production||p.satellites>=24)throw Error('Finish a factory and launch pad. Maximum 24 satellites.');const b=this.blueprints[type];pay(b.cost);p.production={type,start:t,end:t+Math.round(b.time*(1-.15*(this.level(p,'pad')-1)))};
  }else if(a==='accept'||a==='event'){const ev=this.event(r),o=a==='event'?{id:900000+ev.cycle,countryId:p.countryId,name:ev.name,cost:3000,reward:ev.reward,duration:20000}:r.offers.find(o=>o.id===Number(d.id));
   if(!o)throw Error('Another company already took this contract.');if(a==='event'&&(!ev.active||p.lastEvent===ev.cycle))throw Error('This request is no longer available.');if(p.missions.length>=p.satellites)throw Error('All satellites are busy.');pay(o.cost);
   p.missions.push({...o,reward:Math.round(o.reward*(1+.1*Math.min(3,p.fleet.mapper))),start:t,end:t+Math.round(o.duration*(1-.1*this.level(p,'lab')))});
   if(a==='event')p.lastEvent=ev.cycle;else{r.offers=r.offers.filter(x=>x.id!==o.id);r.offers.push(MATCH_RULES.offer(r));}
  }else if(['connect','upgrade-node','defend-node'].includes(a)){const n=r.nodes.find(n=>n.countryId===d.countryId);if(!n)throw Error('Choose a network region on the map.');
   if(a==='connect'){if(p.jamUntil>t)throw Error('Your signal is disrupted. Deploy a shield or wait.');if(n.owner===id||n.claim||r.nodes.some(x=>x.claim?.by===id))throw Error('Finish your current connection or choose another region.');if(this.owned(r,id).length>=p.satellites*2)throw Error('Launch a satellite to support more regions.');const rival=r.players.find(q=>q.id===n.owner);
    if(rival&&(t-r.started<this.grace||rival.shieldUntil>t||n.protectedUntil>t))throw Error('This region is protected.');if(rival&&p.satellites<n.level+1)throw Error('You need more satellites than the region level.');pay(rival?12000+n.level*4000:6000);n.claim={by:id,start:t,end:t+(rival?20000:10000)};this.log(r,p.name+' is connecting '+Utils.country(n.countryId).properties.name+'.');
   }else if(a==='upgrade-node'){if(n.owner!==id||n.level>=3||n.claim)throw Error('Select your uncontested region below level 3.');pay(n.level*6000);n.level++;
   }else{if(n.owner!==id||!n.claim)throw Error('This region is not under contest.');pay(4000);n.claim=null;n.protectedUntil=t+30000;this.log(r,p.name+' defended '+Utils.country(n.countryId).properties.name+'.');}
  }else if(a==='shield'){if(p.shieldUntil>t)throw Error('Your shield is already active.');pay(6000);p.shieldUntil=t+60000;p.jamUntil=t;this.log(r,p.name+' activated a signal shield.');
  }else if(a==='sabotage'){const q=r.players.find(q=>q.id===d.target);if(!q||q.id===id||q.forfeit)throw Error('Choose another active company.');if(t-r.started<this.grace||p.jamCooldown>t||q.shieldUntil>t||q.immuneUntil>t)throw Error('Sabotage is cooling down or this company is protected.');if(!this.level(p,'lab'))throw Error('Build a research lab to disrupt signals.');pay(10000);q.jamUntil=t+(this.level(q,'guard')?10000:20000);q.immuneUntil=t+60000;p.jamCooldown=t+60000;this.log(r,p.name+' disrupted '+q.name+'. A shield restores the signal.');
  }else if(a==='forfeit'){p.forfeit=true;p.missions=[];for(const n of r.nodes){if(n.owner===id){n.owner=null;n.level=0;}if(n.claim?.by===id)n.claim=null;}const left=r.players.filter(q=>!q.forfeit);if(!r.endless&&left.length===1){r.status='finished';r.winner=left[0].id;}
  }else throw Error('Unknown match action.');
 },
 bot(r,id,difficulty,t){if(r.version!==2)return MATCH_RULES.bot(r,id,difficulty,t);const p=r.players.find(p=>p.id===id);if(!p||p.forfeit||r.status!=='running')return;const act=(a,d={})=>{try{this.action(r,id,a,d,t);return true;}catch{return false;}};
  if(p.jamUntil>t&&p.money>12000)act('shield');for(const n of this.owned(r,id))if(n.claim&&p.money>10000)act('defend-node',{countryId:n.countryId});
  if(this.event(r).active&&p.missions.length<p.satellites)act('event');const offers=r.offers.slice().sort((a,b)=>difficulty==='hard'?(b.reward-b.cost)/b.duration-(a.reward-a.cost)/a.duration:a.id-b.id);for(const o of offers)if(p.missions.length<p.satellites&&p.money>o.cost+6000){act('accept',{id:o.id});if(difficulty==='easy')break;}
  if(!p.building&&p.money>20000){let type=['factory','pad','solar','lab','guard'].find(x=>!this.level(p,x));if(!type&&p.satellites>=6&&this.level(p,'lab')>=2&&this.level(p,'factory')>=2&&!this.level(p,'station'))type='station';if(type){if(this.power(p).used+this.buildings[type].power>this.power(p).supply)type='solar';let plot=p.plots.indexOf(null);if(plot<0){act('expand');plot=p.plots.indexOf(null);}if(plot>=0)act('build',{type,plot});}else if(p.money>80000){const plot=p.plots.findIndex((x,i)=>['factory','lab','pad','solar'].includes(x)&&p.levels[i]<2);if(plot>=0)act('upgrade-building',{plot});}}
  if(p.money>38000&&p.satellites<24)act('launch',{type:p.satellites%3===0?'relay':p.satellites%3===1?'mapper':'scout'});
  if(p.money>14000&&!r.nodes.some(n=>n.claim?.by===id)){const neutral=r.nodes.filter(n=>!n.owner&&!n.claim),enemy=r.nodes.filter(n=>n.owner&&n.owner!==id&&!n.claim).sort((a,b)=>a.level-b.level);const options=neutral.length?neutral:enemy;for(const n of options)if(act('connect',{countryId:n.countryId}))break;}
  if(p.money>30000){const n=this.owned(r,id).find(n=>n.level<3&&!n.claim);if(n)act('upgrade-node',{countryId:n.countryId});}
  if(difficulty!=='easy'&&p.money>65000){const rival=r.players.filter(q=>q.id!==id&&!q.forfeit).sort((a,b)=>this.owned(r,b.id).length-this.owned(r,a.id).length)[0];if(rival)act('sabotage',{target:rival.id});}
 }
};
