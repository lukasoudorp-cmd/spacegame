'use strict';
const CONFIG = Object.freeze({
  version: 2, monthMs: 1800000, dayMs: 60000, saveInterval: 15000,
  levelThresholds: [0, 100000, 500000, 2000000, 5000000],
  levelNames: ['Starter', 'Space company', 'Regional operator', 'International operator', 'Global operator'],
  satelliteTypes: {
    'Scout-1': {name:'Scout-1', role:'SCOUT', price:75000, quality:1, coverage:30, maintenance:500, efficiency:.8, color:'#75e5d0', description:'Your first step into Earth orbit. Built for weather data, communications and observation.'},
    'Observer-1': {name:'Observer-1', role:'OBSERVATION', price:250000, quality:2, coverage:60, maintenance:1500, efficiency:.9, color:'#7cb9ff', description:'More detail and greater coverage. Unlock complex assignments with higher rewards.'},
    'Advanced-1': {name:'Advanced-1', role:'ADVANCED', price:1000000, quality:3, coverage:90, maintenance:3000, efficiency:.95, color:'#c7adff', description:'A complete observation platform. Carry out the most demanding assignments worldwide.'}
  },
  upgradeTypes: {
    resolution:{name:'Resolution',icon:'focus',description:'+10% contract reward per level.',baseCost:10000,research:8,max:5},
    coverage:{name:'Coverage',icon:'globe',description:'+5 percentage points of coverage and +3% contract reward per level.',baseCost:12000,research:8,max:5},
    efficiency:{name:'Efficiency',icon:'bolt',description:'−10% maintenance and +4 percentage points of efficiency per level.',baseCost:8000,research:6,max:5},
    reliability:{name:'Reliability',icon:'shield',description:'Wear divided by 1 + 0.4 × level.',baseCost:15000,research:10,max:5},
    processing:{name:'Processing',icon:'layers',description:'−8% contract duration per level.',baseCost:11000,research:8,max:5},
    communication:{name:'Communication',icon:'radar',description:'−8% contract start cost per level.',baseCost:9000,research:6,max:5}
  },
  contractTypes:[
    {name:'Weather observation',client:'WeatherSat',reward:15000,cost:5000,rep:2,icon:'cloud',description:'Collect atmospheric measurements to improve weather forecasts.'},
    {name:'Mapping data',client:'Global Mapping',reward:20000,cost:8000,rep:3,icon:'globe',description:'Map changes in the landscape.'},
    {name:'Maritime monitoring',client:'Maritime Solutions',reward:25000,cost:7000,rep:2,icon:'radar',description:'Provide location data to help plan shipping routes.'},
    {name:'Communications support',client:'Orbit Connect',reward:18000,cost:6000,rep:2,icon:'satellite',description:'Support a regional communications network from space.'},
    {name:'Environmental research',client:'Earth Research',reward:22000,cost:9000,rep:4,icon:'layers',description:'Monitor vegetation and bodies of water for environmental research.'},
    {name:'Disaster monitoring',client:'Disaster Response',reward:30000,cost:10000,rep:5,icon:'shield',description:'Provide overview imagery to emergency teams in disaster areas.'},
    {name:'Border mapping',client:'Regional Survey',reward:28000,cost:8000,rep:3,icon:'focus',description:'Update mapping data in border regions.'},
    {name:'Strategic support',client:'Infrastructure Lab',reward:35000,cost:12000,rep:3,icon:'briefcase',description:'Collect terrain and infrastructure data for regional planning.'}
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

