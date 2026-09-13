'use strict';
const strategySystem={
  colors:{player:'#79f2cf',helios:'#ffb35c',kepler:'#67b7ff',zenith:'#ca8cff',aurora:'#ff6f91'},
  objectiveTypes:{
    influence:{name:'Orbital Dominance',description:'Reach 60% orbital influence.',target:60,unit:'%'},
    economy:{name:'Economic Victory',description:'Build a company worth €2,000,000.',target:2000000,unit:'€'},
    network:{name:'Network Victory',description:'Control 18 ground relays.',target:18,unit:' relays'},
    score:{name:'Pact Score',description:'Reach 1,000 score through contracts, research and infrastructure.',target:1000,unit:' pts'}
  },
  researchNodes:{
    observation:[
      {id:'synthetic-aperture',name:'Synthetic Aperture',cost:12,text:'+10% contract rewards.'},
      {id:'predictive-imaging',name:'Predictive Imaging',cost:26,text:'Reveals every rival project.'},
      {id:'quantum-sensors',name:'Quantum Sensors',cost:45,text:'+20 orbital influence.'}
    ],
    communications:[
      {id:'laser-links',name:'Laser Links',cost:10,text:'Relays cost 15% less.'},
      {id:'mesh-routing',name:'Mesh Routing',cost:24,text:'Relays produce passive income.'},
      {id:'deep-band',name:'Deep Band',cost:42,text:'+25% alliance project power.'}
    ],
    security:[
      {id:'signal-hardening',name:'Signal Hardening',cost:10,text:'Reduces sabotage damage by 35%.'},
      {id:'counter-intelligence',name:'Counter Intelligence',cost:25,text:'Raises countermeasure strength.'},
      {id:'zero-trust-orbit',name:'Zero Trust Orbit',cost:44,text:'First hostile action is blocked.'}
    ],
    navigation:[
      {id:'precision-orbits',name:'Precision Orbits',cost:11,text:'Satellites add more influence.'},
      {id:'autonomous-routing',name:'Autonomous Routing',cost:25,text:'Contracts finish 12% faster.'},
      {id:'orbital-swarm',name:'Orbital Swarm',cost:46,text:'Relays add +2 orbital influence.'}
    ],
    deepSpace:[
      {id:'lunar-telemetry',name:'Lunar Telemetry',cost:14,text:'+5 research from completed contracts.'},
      {id:'solar-infrastructure',name:'Solar Infrastructure',cost:30,text:'+€8,000 passive income per cycle.'},
      {id:'pact-beacon',name:'Pact Beacon',cost:50,text:'+150 Pact Score.'}
    ]
  },
  ensure(state){
    if(!state.strategy)state.strategy={objective:'influence',ended:false,winner:null,lastBotTick:0,lastIncomeTick:0,selectedAction:'relay',defense:0,score:0,unlocked:[],control:{},rivals:{}};
    const s=state.strategy;s.unlocked=Array.isArray(s.unlocked)?s.unlocked:[];s.control=s.control||{};s.rivals=s.rivals||{};
    const starts={helios:['USA','CAN','MEX'],kepler:['GBR','FRA','DEU'],zenith:['CHN','JPN','KOR'],aurora:['BRA','ARG','ZAF']};
    for(const r of diplomacySystem.rivals){if(!s.rivals[r.id])s.rivals[r.id]={money:650000+r.power*3500,influence:8+Math.floor(r.power/12),satellites:2,relays:3,score:180+r.power,lastAction:0};for(const id of starts[r.id]||[])if(!s.control[id])s.control[id]=r.id;}
    for(const p of state.orbitalProjects||[])if(p.countryId)s.control[p.countryId]='player';
    return s;
  },
  has(state,id){return Boolean(state.strategy?.unlocked?.includes(id));},
  research(state,nodeId){const s=this.ensure(state);let branch,index,node;for(const [key,nodes] of Object.entries(this.researchNodes)){const i=nodes.findIndex(n=>n.id===nodeId);if(i>=0){branch=key;index=i;node=nodes[i];break;}}if(!node)return {error:'Unknown research project.'};if(s.unlocked.includes(nodeId))return {error:'Research already completed.'};if(index>0&&!s.unlocked.includes(this.researchNodes[branch][index-1].id))return {error:'Complete the previous research first.'};if(state.research<node.cost)return {error:'Not enough research points.'};state.research-=node.cost;s.unlocked.push(nodeId);s.score+=Math.round(node.cost*2.5);return {success:true,node};},
  relayCost(state){return this.has(state,'laser-links')?106250:125000;},
  playerStats(state){const s=this.ensure(state),relays=(state.orbitalProjects||[]).filter(p=>p.owner!=='rival').length,sats=state.satellites.length,research=s.unlocked.length;const worth=Math.max(0,state.money)+relays*125000+state.satellites.reduce((sum,sat)=>sum+(CONFIG.satelliteTypes[sat.type]?.price||0),0);const influence=Math.min(100,Math.round(4+sats*(this.has(state,'precision-orbits')?3.8:2.8)+relays*(this.has(state,'orbital-swarm')?5.5:3.5)+research*1.8+(this.has(state,'quantum-sensors')?20:0)));const score=Math.round(s.score+state.completedContracts*28+relays*35+sats*18+state.reputation*2+(this.has(state,'pact-beacon')?150:0));return {relays,sats,research,worth,influence,score};},
  scoreboard(state){const p=this.playerStats(state),rows=[{id:'player',name:'You',color:this.colors.player,money:state.money,influence:p.influence,relays:p.relays,satellites:p.sats,score:p.score}];for(const r of diplomacySystem.rivals){const a=this.ensure(state).rivals[r.id];rows.push({id:r.id,name:r.name,color:this.colors[r.id],...a});}return rows.sort((a,b)=>b.score-a.score);},
  progress(state){const objective=this.objectiveTypes[this.ensure(state).objective]||this.objectiveTypes.influence,p=this.playerStats(state);const value=objective===this.objectiveTypes.influence?p.influence:objective===this.objectiveTypes.economy?p.worth:objective===this.objectiveTypes.network?p.relays:p.score;return {objective,value,target:objective.target,percent:Utils.clamp(value/objective.target*100,0,100)};},
  chooseObjective(state,id){if(!this.objectiveTypes[id])return false;this.ensure(state).objective=id;return true;},
  update(state){const s=this.ensure(state),now=state.playTime;if(s.ended)return null;let changed=false;
    if(now-s.lastIncomeTick>=30000){const cycles=Math.floor((now-s.lastIncomeTick)/30000);s.lastIncomeTick+=cycles*30000;if(this.has(state,'mesh-routing'))state.money+=cycles*this.playerStats(state).relays*1800;if(this.has(state,'solar-infrastructure'))state.money+=cycles*8000;changed=true;}
    if(now-s.lastBotTick>=15000){const cycles=Math.min(6,Math.floor((now-s.lastBotTick)/15000));s.lastBotTick+=cycles*15000;changed=true;for(let c=0;c<cycles;c++)for(const rival of diplomacySystem.rivals){const a=s.rivals[rival.id],difficulty={easy:.65,normal:1,hard:1.3,expert:1.65}[state.difficulty]||1;a.money+=Math.round((9000+rival.power*80)*difficulty);a.score+=Math.round((7+rival.power/20)*difficulty);if((a.score+Math.floor(now/1000)+rival.power)%4===0){a.relays++;a.influence=Math.min(95,a.influence+2);a.money=Math.max(0,a.money-90000);const choices=WORLD_DATA.features.filter(f=>f.properties.region!=='Antarctica'&&!s.control[f.id]);if(choices.length){const country=choices[(a.relays*37+rival.power)%choices.length];s.control[country.id]=rival.id;}}if(a.score%5===0)a.satellites++;}}
    if(state.matchSettings?.sabotage!==false&&now>=180000&&now-(s.lastThreatTick||0)>=180000){s.lastThreatTick=now;const rival=diplomacySystem.rivals.find(r=>state.diplomacy?.relations?.[r.id]?.status!=='allied');if(rival){const loss=this.receiveOperation(state,6000);state.log.push({time:now,type:loss?'warning':'success',message:loss?`${rival.name} disrupted the network. Recovery cost: ${Utils.money(loss)}.`:'Orbital defenses blocked a rival disruption.'});state.log=state.log.slice(-100);changed=true;}}
    const result=this.progress(state);if(s.endless)return changed?{changed:true}:null;if(result.value>=result.target){s.ended=true;s.winner='player';return {winner:'player',objective:result.objective};}
    const rivalWin=this.scoreboard(state).find(r=>r.id!=='player'&&({influence:r.influence,economy:r.money+r.relays*125000+r.satellites*75000,network:r.relays,score:r.score}[s.objective]||0)>=result.target);if(rivalWin){s.ended=true;s.winner=rivalWin.id;return {winner:rivalWin.id,objective:result.objective};}return changed?{changed:true}:null;
  },
  keepExploring(state){const s=this.ensure(state);s.ended=false;s.endless=true;state.paused=false;},
  defend(state){const s=this.ensure(state),cost=30000;if(state.money<cost)return {error:'You need €30,000 for orbital defenses.'};state.money-=cost;state.totalCosts+=cost;s.defense=Math.min(100,s.defense+25+(this.has(state,'counter-intelligence')?15:0));s.score+=12;return {success:true,value:s.defense};},
  jointProject(state,id){const s=this.ensure(state),rel=state.diplomacy?.relations?.[id],cost=75000;if(!rel||rel.status!=='allied')return {error:'You need an active alliance.'};if(state.money<cost)return {error:'You need €75,000.'};if(rel.jointProject)return {error:'A joint project is already active.'};state.money-=cost;state.totalCosts+=cost;rel.jointProject={startedAt:state.playTime,power:100+(this.has(state,'deep-band')?25:0)};rel.trust=Math.min(100,rel.trust+12);s.score+=Math.round(80*rel.jointProject.power/100);state.research+=Math.round(12*rel.jointProject.power/100);return {success:true};},
  receiveOperation(state,power){const s=this.ensure(state);if(this.has(state,'zero-trust-orbit')&&!s.zeroTrustUsed){s.zeroTrustUsed=true;return 0;}const reduction=(this.has(state,'signal-hardening')?.65:1)*(1-Math.min(100,s.defense||0)/100);const loss=Math.min(state.money,Math.round(Math.max(0,power)*reduction));state.money-=loss;state.totalCosts+=loss;return loss;},
  revealOwner(state,countryId){const s=this.ensure(state),owner=s.control[countryId];if(!owner)return null;if(!state.matchSettings?.fog||owner==='player'||this.has(state,'predictive-imaging'))return owner;const rel=state.diplomacy?.relations?.[owner];return rel?.status==='allied'?owner:'unknown';}
};
