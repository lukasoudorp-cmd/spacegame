'use strict';
const saveSystem = {
  key:'orbitalPact_preview4_save_v2',legacyKey:'orbitalPact_preview4_legacy',message:null,
  fresh(){return {version:2,money:100000,reputation:10,research:0,level:1,totalMoneyEarned:0,totalCosts:0,completedContracts:0,playTime:0,satellites:[],offers:[],activeContracts:[],history:[],log:[],upgrades:Object.fromEntries(Object.keys(CONFIG.upgradeTypes).map(k=>[k,0])),nextSatelliteId:1,nextContractId:1,paused:false,speed:1,mode:'solo',difficulty:'normal',matchSettings:{fog:true,alliances:true,sabotage:true,pace:'standard',objective:'influence'},diplomacy:{relations:{},cooldowns:{},requests:[]},worldEvents:[],nextEventAt:90000,orbitalProjects:[],strategy:{objective:'influence',ended:false,winner:null,lastBotTick:0,lastIncomeTick:0,selectedAction:'relay',defense:0,score:0,unlocked:[],control:{},rivals:{}}};},
  save(state){try{localStorage.setItem(this.key,JSON.stringify({...state,version:2,savedAt:Date.now()}));return true;}catch(e){return false;}},
  load(){
    try{
      const raw=localStorage.getItem(this.key);
      if(raw){const parsed=JSON.parse(raw);if(parsed.version!==2)throw new Error('Onbekende versie');return this.validate(parsed);}
      const legacy=localStorage.getItem(this.legacyKey);if(legacy){const old=JSON.parse(legacy);if(old.version!==1)throw new Error('Onbekende versie');this.message='Je oude bedrijf is overgezet. Oude actieve contracten zijn vrijgegeven; het oude opslagbestand blijft bewaard.';return this.migrate(old);}
    }catch(e){this.message='De opgeslagen voortgang kon niet worden gelezen. Er is een nieuw bedrijf gestart.';}
    return null;
  },
  migrate(old){const state=this.fresh();for(const key of ['money','reputation','research','totalMoneyEarned','playTime'])if(Number.isFinite(old[key])&&old[key]>=0)state[key]=old[key];state.level=Utils.level(state.totalMoneyEarned);for(const s of (Array.isArray(old.satellites)?old.satellites:[])){if(CONFIG.satelliteTypes[s.type]){const sat=satelliteSystem.create(state,s.type);sat.health=Utils.clamp(Number.isFinite(s.health)?s.health:100,0,100);state.satellites.push(sat);}}if(!state.satellites.length)state.satellites.push(satelliteSystem.create(state,'Scout-1'));contractSystem.generate(state);return state;},
  validate(input){
    const state=this.fresh();
    for(const key of ['money','reputation','research','totalMoneyEarned','totalCosts','completedContracts','playTime']){if(!Number.isFinite(input[key])||input[key]<0)throw new Error(`Ongeldig veld: ${key}`);state[key]=input[key];}
    if(!Array.isArray(input.satellites)||!input.satellites.length||input.satellites.length>1000)throw new Error('Ongeldige vloot');
    const ids=new Set();state.satellites=input.satellites.map(s=>{if(!CONFIG.satelliteTypes[s.type]||!Number.isSafeInteger(s.id)||s.id<1||ids.has(s.id))throw new Error('Ongeldige satelliet');ids.add(s.id);return {id:s.id,type:s.type,name:typeof s.name==='string'?s.name.slice(0,60):`${s.type} / ${s.id}`,health:Utils.clamp(Number.isFinite(s.health)?s.health:100,0,100),activeContract:null,age:Number.isFinite(s.age)&&s.age>=0?s.age:0,phase:Number.isFinite(s.phase)?s.phase%1:(s.id*.618)%1};});
    state.nextSatelliteId=Math.max(...ids)+1;
    for(const key in state.upgrades){const value=input.upgrades?.[key];state.upgrades[key]=Number.isFinite(value)?Utils.clamp(Math.floor(value),0,CONFIG.upgradeTypes[key].max):0;}
    const contractIds=new Set();
    const validContract=c=>c&&Number.isSafeInteger(c.id)&&c.id>0&&!contractIds.has(c.id)&&Number.isInteger(c.typeIndex)&&CONFIG.contractTypes[c.typeIndex]&&Utils.country(c.countryId)&&Number.isInteger(c.requiredQuality)&&c.requiredQuality>=1&&c.requiredQuality<=3&&['baseReward','baseCost','baseDuration','reputation'].every(k=>Number.isFinite(c[k])&&c[k]>0);
    for(const m of (Array.isArray(input.activeContracts)?input.activeContracts:[])){const sat=state.satellites.find(s=>s.id===m.satelliteId);if(!validContract(m)||!sat||sat.activeContract!==null||!['reward','cost','duration'].every(k=>Number.isFinite(m[k])&&m[k]>0)||!Number.isFinite(m.elapsed)||m.elapsed<0)continue;contractIds.add(m.id);sat.activeContract=m.id;state.activeContracts.push({...m,elapsed:Math.min(m.duration,m.elapsed)});}
    for(const c of (Array.isArray(input.offers)?input.offers:[])){if(validContract(c)){contractIds.add(c.id);state.offers.push(c);}}
    state.nextContractId=Math.max(0,...contractIds,Number.isSafeInteger(input.nextContractId)?input.nextContractId-1:0)+1;
    state.history=(Array.isArray(input.history)?input.history:[]).filter(c=>c&&CONFIG.contractTypes[c.typeIndex]&&Utils.country(c.countryId)&&['reward','profit','time'].every(k=>Number.isFinite(c[k]))).slice(0,30);
    state.log=(Array.isArray(input.log)?input.log:[]).filter(l=>l&&typeof l.message==='string'&&Number.isFinite(l.time)).slice(-100).map(l=>({message:l.message.slice(0,500),time:Math.max(0,l.time),type:['success','warning','info'].includes(l.type)?l.type:'info'}));
    state.level=Utils.level(state.totalMoneyEarned);state.paused=Boolean(input.paused);state.speed=input.speed===3?3:1;state.mode=['solo','multiplayer'].includes(input.mode)?input.mode:'solo';state.difficulty=['easy','normal','hard','expert'].includes(input.difficulty)?input.difficulty:'normal';state.matchSettings={...state.matchSettings,...(input.matchSettings||{})};state.diplomacy=input.diplomacy&&typeof input.diplomacy==='object'?input.diplomacy:{relations:{},cooldowns:{},requests:[]};state.worldEvents=Array.isArray(input.worldEvents)?input.worldEvents.slice(0,8):[];state.nextEventAt=Number.isFinite(input.nextEventAt)?input.nextEventAt:90000;state.orbitalProjects=Array.isArray(input.orbitalProjects)?input.orbitalProjects.slice(0,80):[];state.strategy=input.strategy&&typeof input.strategy==='object'?input.strategy:state.strategy;return state;
  }
};
