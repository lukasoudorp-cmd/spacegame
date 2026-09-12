'use strict';
// Fictional management rules. Time is simulated game time, never wall-clock time.
const BASE_BUILDINGS=Object.freeze({
  hq:{name:'Headquarters',price:0,time:0,power:0,icon:'briefcase',description:'Your company headquarters. Includes a small grid connection providing 4 power.'},
  solar:{name:'Solar array',price:6000,time:15000,power:-8,icon:'bolt',description:'Produces 8 power. Keeps your growing spaceport running.'},
  factory:{name:'Satellite factory',price:12000,time:30000,power:3,icon:'layers',description:'Manufacture satellites for 70% of the external purchase price. Each factory works on one order.'},
  pad:{name:'Launch pad',price:8000,time:20000,power:1,icon:'trend',description:'Launch a finished satellite into orbit. Each pad handles one launch at a time.'},
  lab:{name:'Research campus',price:15000,time:40000,power:2,icon:'radar',description:'Generates one research point per game minute. Research progress is saved.'},
  control:{name:'Mission control',price:10000,time:25000,power:1,icon:'satellite',description:'Each control centre reduces factory time by 15%, up to 45%.'}
});
const baseSystem={
  fresh(){return {name:'My space company',site:null,plots:[],jobs:[],nextJob:1,researchTime:0,launches:0};},
  get(s){return s.spaceport||(s.spaceport=this.fresh());},
  count(s,type){return this.get(s).plots.filter(p=>p.type===type&&p.remaining===0).length;},
  power(s){const plots=this.get(s).plots;return {supply:4+plots.filter(p=>p.type==='solar'&&p.remaining===0).length*8,used:plots.reduce((n,p)=>n+Math.max(0,BASE_BUILDINGS[p.type]?.power||0),0)};},
  claim(s,name,countryId,coordinates){
    const b=this.get(s),f=Utils.country(countryId);
    name=typeof name==='string'?name.trim().replace(/[\x00-\x1f<>]/g,'').slice(0,40):'';
    if(b.site)return {error:'Your company already owns a spaceport.'};
    if(name.length<2)return {error:'Enter a company name of 2 to 40 characters.'};
    if(!f||f.properties.region==='Antarctica'||!Array.isArray(coordinates)||coordinates.length!==2||!coordinates.every(Number.isFinite)||Math.abs(coordinates[0])>180||Math.abs(coordinates[1])>85||!d3.geoContains(f,coordinates))return {error:'Choose a point on land on the world map.'};
    b.name=name;b.site={countryId,coordinates:coordinates.slice()};b.plots=[6,7,11,12].map(id=>({id,type:id===6?'hq':null,remaining:0}));
    return {message:'Company founded. Your starter land and headquarters are free.'};
  },
  adjacent(s,id){return this.get(s).plots.some(p=>Math.abs(p.id%5-id%5)+Math.abs(Math.floor(p.id/5)-Math.floor(id/5))===1);},
  landPrice(s){return 4000+Math.max(0,this.get(s).plots.length-4)*2000;},
  spend(s,cost){if(s.money<cost)return false;s.money-=cost;s.totalCosts+=cost;return true;},
  expand(s,id){const b=this.get(s);if(!b.site||!Number.isInteger(id)||id<0||id>24||b.plots.some(p=>p.id===id)||!this.adjacent(s,id))return {error:'Choose an unowned plot beside your land.'};if(!this.spend(s,this.landPrice(s)))return {error:'Not enough funds for this plot.'};b.plots.push({id,type:null,remaining:0});return {message:'Land purchased. Select the new plot to build.'};},
  build(s,id,type){const p=this.get(s).plots.find(p=>p.id===id),def=Object.hasOwn(BASE_BUILDINGS,type)?BASE_BUILDINGS[type]:null;if(!p||p.type||!def||type==='hq')return {error:'Choose an empty plot on your land.'};const power=this.power(s);if(def.power>0&&power.used+def.power>power.supply)return {error:'Build a solar array first. This building needs more power.'};if(!this.spend(s,def.price))return {error:'Not enough funds for construction.'};p.type=type;p.remaining=def.time;return {message:`Construction started: ${def.name}.`};},
  order(s,type){const b=this.get(s),def=Object.hasOwn(CONFIG.satelliteTypes,type)?CONFIG.satelliteTypes[type]:null;if(!b.site||!def||!satelliteSystem.isUnlocked(s,type))return {error:'This satellite is not unlocked.'};if(b.jobs.filter(j=>j.stage==='building').length>=this.count(s,'factory'))return {error:'Build a factory or wait for its current order to finish.'};if(b.jobs.length>=20||s.satellites.length+b.jobs.length>=1000)return {error:'Launch your waiting satellites before ordering more.'};const cost=Math.round(def.price*.7);if(!this.spend(s,cost))return {error:'Not enough funds for this order.'};const duration=Math.round(60000*def.quality*(1-.15*Math.min(3,this.count(s,'control'))));b.jobs.push({id:b.nextJob++,type,stage:'building',remaining:duration,duration});return {message:`Manufacturing ${type}. Launch is included in the price.`};},
  launch(s,id){const b=this.get(s),j=b.jobs.find(j=>j.id===id);if(!j||j.stage!=='ready')return {error:'Choose a completed satellite.'};if(b.jobs.filter(j=>j.stage==='launching').length>=this.count(s,'pad'))return {error:'Build a launch pad or wait for the current launch.'};j.stage='launching';j.duration=20000;j.remaining=j.duration;return {message:`${j.type} launch countdown started.`};},
  update(s,dt){const b=this.get(s);if(!b.site||!Number.isFinite(dt)||dt<=0||s.paused)return [];const events=[];
    // Buildings completed in this tick begin producing on the next tick.
    const labs=this.count(s,'lab');
    for(const p of b.plots)if(p.remaining>0){p.remaining=Math.max(0,p.remaining-dt);if(!p.remaining)events.push(`${BASE_BUILDINGS[p.type].name} is ready.`);}
    for(const j of b.jobs)if(j.stage!=='ready'){j.remaining=Math.max(0,j.remaining-dt);if(!j.remaining){if(j.stage==='building'){j.stage='ready';events.push(`${j.type} is ready to launch.`);}else{s.satellites.push(satelliteSystem.create(s,j.type));b.launches++;j.stage='done';events.push(`${j.type} reached orbit and joined your fleet.`);}}}
    b.jobs=b.jobs.filter(j=>j.stage!=='done');b.researchTime+=labs*dt;const points=Math.floor(b.researchTime/60000);if(points){s.research+=points;b.researchTime%=60000;}
    return events;
  },
  validate(raw){if(raw==null)return this.fresh();const fail=()=>{throw new Error('Invalid spaceport save.');};if(typeof raw!=='object')return fail();const b=this.fresh();
    if(typeof raw.name!=='string'||raw.name.length>40)return fail();b.name=raw.name.replace(/[\x00-\x1f<>]/g,'');
    if(raw.site!=null){const f=Utils.country(raw.site.countryId),ll=raw.site.coordinates;if(!f||f.properties.region==='Antarctica'||!Array.isArray(ll)||ll.length!==2||!ll.every(Number.isFinite)||Math.abs(ll[0])>180||Math.abs(ll[1])>85||!d3.geoContains(f,ll))return fail();b.site={countryId:f.id,coordinates:ll.slice()};}
    if(!Array.isArray(raw.plots)||raw.plots.length>25||!Array.isArray(raw.jobs)||raw.jobs.length>20)return fail();
    const ids=new Set();for(const p of raw.plots){if(!p||!Number.isInteger(p.id)||p.id<0||p.id>24||ids.has(p.id)||(p.type!==null&&!Object.hasOwn(BASE_BUILDINGS,p.type))||!Number.isFinite(p.remaining)||p.remaining<0||p.remaining>(BASE_BUILDINGS[p.type]?.time||0))return fail();ids.add(p.id);b.plots.push({id:p.id,type:p.type,remaining:p.remaining});}
    if(b.site?(b.plots.filter(p=>p.type==='hq').length!==1||b.plots.length<4):(b.plots.length||raw.jobs.length))return fail();
    const jobs=new Set();for(const j of raw.jobs){if(!j||!Number.isSafeInteger(j.id)||j.id<1||j.id>1e9||jobs.has(j.id)||!Object.hasOwn(CONFIG.satelliteTypes,j.type)||!['building','ready','launching'].includes(j.stage)||!Number.isFinite(j.duration)||j.duration<=0||j.duration>180000||!Number.isFinite(j.remaining)||j.remaining<0||j.remaining>j.duration)return fail();jobs.add(j.id);b.jobs.push({id:j.id,type:j.type,stage:j.stage,duration:j.duration,remaining:j.stage==='ready'?0:j.remaining});}
    if(!Number.isFinite(raw.researchTime)||raw.researchTime<0||raw.researchTime>=60000||!Number.isSafeInteger(raw.launches)||raw.launches<0)return fail();b.researchTime=raw.researchTime;b.launches=raw.launches;b.nextJob=Math.max(0,...jobs)+1;return b;
  }
};
