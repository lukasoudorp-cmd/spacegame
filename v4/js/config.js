'use strict';
const CONFIG = Object.freeze({
  version: 2, monthMs: 1800000, dayMs: 60000, saveInterval: 15000,
  levelThresholds: [0, 100000, 500000, 2000000, 5000000],
  levelNames: ['Starter', 'Ruimtevaartbedrijf', 'Regionale operator', 'Internationale operator', 'Wereldspeler'],
  satelliteTypes: {
    'Scout-1': {name:'Scout-1', role:'VERKENNER', price:75000, quality:1, coverage:30, maintenance:500, efficiency:.8, color:'#75e5d0', description:'Je eerste stap in een baan om de aarde. Geschikt voor weerdata, communicatie en observatie.'},
    'Observer-1': {name:'Observer-1', role:'OBSERVATIE', price:250000, quality:2, coverage:60, maintenance:1500, efficiency:.9, color:'#7cb9ff', description:'Meer detail, een groter bereik. Ontgrendel complexe opdrachten met hogere beloningen.'},
    'Advanced-1': {name:'Advanced-1', role:'GEAVANCEERD', price:1000000, quality:3, coverage:90, maintenance:3000, efficiency:.95, color:'#c7adff', description:'Een complete observatieoplossing. Voer de meest veeleisende opdrachten wereldwijd uit.'}
  },
  upgradeTypes: {
    resolution:{name:'Resolutie',icon:'focus',description:'+10% contractbeloning per niveau.',baseCost:10000,research:8,max:5},
    coverage:{name:'Dekking',icon:'globe',description:'+5 procentpunt dekking en +3% contractbeloning per niveau.',baseCost:12000,research:8,max:5},
    efficiency:{name:'Efficiëntie',icon:'bolt',description:'−10% onderhoud en +4 procentpunt efficiëntie per niveau.',baseCost:8000,research:6,max:5},
    reliability:{name:'Betrouwbaarheid',icon:'shield',description:'Slijtage gedeeld door 1 + 0,4 × niveau.',baseCost:15000,research:10,max:5},
    processing:{name:'Verwerking',icon:'layers',description:'−8% contractduur per niveau.',baseCost:11000,research:8,max:5},
    communication:{name:'Communicatie',icon:'radar',description:'−8% contractstartkosten per niveau.',baseCost:9000,research:6,max:5}
  },
  contractTypes:[
    {name:'Weersobservatie',client:'WeatherSat',reward:15000,cost:5000,rep:2,icon:'cloud',description:'Verzamel atmosferische meetgegevens voor betere weersverwachtingen.'},
    {name:'Kaartgegevens',client:'Global Mapping',reward:20000,cost:8000,rep:3,icon:'globe',description:'Breng veranderingen in het landschap in kaart.'},
    {name:'Scheepvaartmonitoring',client:'Maritime Solutions',reward:25000,cost:7000,rep:2,icon:'radar',description:'Lever positiegegevens voor de planning van scheepvaartroutes.'},
    {name:'Communicatiesupport',client:'Orbit Connect',reward:18000,cost:6000,rep:2,icon:'satellite',description:'Ondersteun een regionaal communicatienetwerk vanuit de ruimte.'},
    {name:'Milieuonderzoek',client:'Earth Research',reward:22000,cost:9000,rep:4,icon:'layers',description:'Monitor vegetatie en watergebieden voor milieuonderzoek.'},
    {name:'Rampenmonitoring',client:'Disaster Response',reward:30000,cost:10000,rep:5,icon:'shield',description:'Lever overzichtsbeelden aan hulpverleners in rampgebieden.'},
    {name:'Grensmonitoring',client:'Regional Survey',reward:28000,cost:8000,rep:3,icon:'focus',description:'Actualiseer cartografische gegevens in grensgebieden.'},
    {name:'Strategische ondersteuning',client:'Infrastructure Lab',reward:35000,cost:12000,rep:3,icon:'briefcase',description:'Verzamel terrein- en infrastructuurgegevens voor regionale planning.'}
  ]
});
const Utils = {
  money:n=>new Intl.NumberFormat('nl-NL',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number.isFinite(n)?n:0),
  time:ms=>{const s=Math.max(0,Math.ceil(ms/1000));return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;},
  clock:ms=>{const s=Math.floor(ms/1000);return [Math.floor(s/3600),Math.floor(s/60)%60,s%60].map(v=>String(v).padStart(2,'0')).join(':');},
  clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),
  escape:v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
  country:id=>WORLD_DATA.features.find(f=>f.id===id),
  level:earned=>CONFIG.levelThresholds.reduce((level,amount,i)=>earned>=amount?i+1:level,1),
  progress:state=>{const level=Utils.level(state.totalMoneyEarned);if(level===5)return {percent:100,remaining:0,next:0};const min=CONFIG.levelThresholds[level-1],next=CONFIG.levelThresholds[level];return {percent:Utils.clamp((state.totalMoneyEarned-min)/(next-min)*100,0,100),remaining:Math.max(0,next-state.totalMoneyEarned),next};}
};
