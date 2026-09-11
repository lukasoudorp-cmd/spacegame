'use strict';
const CONFIG = Object.freeze({
  version: 2, monthMs: 1800000, dayMs: 60000, saveInterval: 15000,
  levelThresholds: [0, 100000, 500000, 2000000, 5000000],
  levelNames: ['Starter', 'Space company', 'Regional operator', 'International operator', 'Global operator'],
  specialties: {
    general:{name:'Generalist',icon:'globe'},
    observation:{name:'Observation',icon:'focus'},
    communications:{name:'Communications',icon:'radar'},
    climate:{name:'Weather & environment',icon:'cloud'},
    all:{name:'All specialties',icon:'layers'}
  },
  specialtyBonus: {reward:.2,duration:.85},
  contractModes: {
    quick:{name:'Quick scan',reward:.65,cost:.8,duration:.5,reputation:.75,description:'A short assignment that frees your satellite quickly.'},
    standard:{name:'Standard mission',reward:1,cost:1,duration:1,reputation:1,description:'A balanced assignment with a standard payout.'},
    extended:{name:'Long-term contract',reward:3.4,cost:2,duration:3,reputation:2,unlockContracts:5,description:'Commit a satellite for longer to earn a larger payout.'}
  },
  satelliteTypes: {
    'Scout-1': {name:'Scout-1', role:'SCOUT', specialty:'general', price:75000, quality:1, coverage:30, maintenance:500, efficiency:.8, color:'#75e5d0', description:'A flexible starter for any class 1 contract. No specialty bonus, with the lowest running costs.'},
    'Relay-1': {name:'Relay-1', role:'COMMUNICATIONS', specialty:'communications', unlockContracts:3, price:140000, quality:1, coverage:65, maintenance:800, efficiency:.85, color:'#e9c184', description:'A dedicated relay for communications support and maritime monitoring. Earn more on matching assignments.'},
    'Nimbus-1': {name:'Nimbus-1', role:'WEATHER & ENVIRONMENT', specialty:'climate', unlockContracts:3, price:135000, quality:1, coverage:55, maintenance:750, efficiency:.85, color:'#a8c8ff', description:'Atmospheric sensors built for weather, environmental research and disaster monitoring.'},
    'Observer-1': {name:'Observer-1', role:'OBSERVATION', specialty:'observation', price:250000, quality:2, coverage:60, maintenance:1500, efficiency:.9, color:'#7cb9ff', description:'Detailed imaging for mapping and infrastructure surveys. Supports contracts up to class 2.'},
    'Advanced-1': {name:'Advanced-1', role:'ADVANCED', specialty:'all', price:1000000, quality:3, coverage:90, maintenance:3000, efficiency:.95, color:'#c7adff', description:'A complete sensor platform. Receives the specialty bonus on every assignment, up to class 3.'}
  },
  objectives: [
    {id:'first_signal',name:'First signal',description:'Complete your first contract.',metric:'contracts',target:1,money:15000,research:6,page:'contracts',action:'Find a contract'},
    {id:'specialist_license',name:'Specialist license',description:'Complete 3 contracts.',metric:'contracts',target:3,money:15000,research:10,unlock:'Relay-1 and Nimbus-1',page:'contracts',action:'Find a contract'},
    {id:'trusted_operator',name:'Trusted operator',description:'Complete 5 contracts.',metric:'contracts',target:5,money:20000,research:12,unlock:'Long-term contracts',page:'contracts',action:'Find a contract'},
    {id:'fleet_builder',name:'Fleet builder',description:'Own 3 satellites at the same time.',metric:'fleet',target:3,money:25000,research:20,page:'fleet',action:'Expand your fleet'},
    {id:'lab_online',name:'Lab online',description:'Buy 3 research upgrade levels.',metric:'upgrades',target:3,money:20000,research:15,page:'upgrades',action:'Develop upgrades'},
    {id:'global_reach',name:'Global reach',description:'Complete contracts in 5 different countries.',metric:'countries',target:5,money:30000,research:20,page:'contracts',action:'Explore contracts'},
    {id:'proven_partner',name:'Proven partner',description:'Complete 25 contracts.',metric:'contracts',target:25,money:60000,research:40,page:'contracts',action:'Find a contract'}
  ],
  upgradeTypes: {
    resolution:{name:'Resolution',icon:'focus',description:'+10% contract reward per level.',baseCost:10000,research:8,max:5},
    coverage:{name:'Coverage',icon:'globe',description:'+5 percentage points of coverage and +3% contract reward per level.',baseCost:12000,research:8,max:5},
    efficiency:{name:'Efficiency',icon:'bolt',description:'−10% maintenance and +4 percentage points of efficiency per level.',baseCost:8000,research:6,max:5},
    reliability:{name:'Reliability',icon:'shield',description:'Wear divided by 1 + 0.4 × level.',baseCost:15000,research:10,max:5},
    processing:{name:'Processing',icon:'layers',description:'−8% contract duration per level.',baseCost:11000,research:8,max:5},
    communication:{name:'Communication',icon:'radar',description:'−8% contract start cost per level.',baseCost:9000,research:6,max:5}
  },
  contractTypes:[
    {name:'Weather observation',specialty:'climate',client:'WeatherSat',reward:15000,cost:5000,rep:2,icon:'cloud',description:'Collect atmospheric measurements to improve weather forecasts.'},
    {name:'Mapping data',specialty:'observation',client:'Global Mapping',reward:20000,cost:8000,rep:3,icon:'globe',description:'Map changes in the landscape.'},
    {name:'Maritime monitoring',specialty:'communications',client:'Maritime Solutions',reward:25000,cost:7000,rep:2,icon:'radar',description:'Provide location data to help plan shipping routes.'},
    {name:'Communications support',specialty:'communications',client:'Orbit Connect',reward:18000,cost:6000,rep:2,icon:'satellite',description:'Support a regional communications network from space.'},
    {name:'Environmental research',specialty:'climate',client:'Earth Research',reward:22000,cost:9000,rep:4,icon:'layers',description:'Monitor vegetation and bodies of water for environmental research.'},
    {name:'Disaster monitoring',specialty:'climate',client:'Disaster Response',reward:30000,cost:10000,rep:5,icon:'shield',description:'Provide overview imagery to emergency teams in disaster areas.'},
    {name:'Border mapping',specialty:'observation',client:'Regional Survey',reward:28000,cost:8000,rep:3,icon:'focus',description:'Update mapping data in border regions.'},
    {name:'Strategic support',specialty:'observation',client:'Infrastructure Lab',reward:35000,cost:12000,rep:3,icon:'briefcase',description:'Collect terrain and infrastructure data for regional planning.'}
  ]
});
const Utils = {
  money:n=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number.isFinite(n)?n:0),
  time:ms=>{const s=Math.max(0,Math.ceil(ms/1000));return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;},
  clock:ms=>{const s=Math.floor(ms/1000);return [Math.floor(s/3600),Math.floor(s/60)%60,s%60].map(v=>String(v).padStart(2,'0')).join(':');},
  clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),
  escape:v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
  country:id=>WORLD_DATA.features.find(f=>f.id===id),
  level:earned=>CONFIG.levelThresholds.reduce((level,amount,i)=>earned>=amount?i+1:level,1),
  progress:state=>{const level=Utils.level(state.totalMoneyEarned);if(level===5)return {percent:100,remaining:0,next:0};const min=CONFIG.levelThresholds[level-1],next=CONFIG.levelThresholds[level];return {percent:Utils.clamp((state.totalMoneyEarned-min)/(next-min)*100,0,100),remaining:Math.max(0,next-state.totalMoneyEarned),next};}
};
