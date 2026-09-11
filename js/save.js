'use strict';
const saveSystem = {
  key:'spaceCorp_save_v2',legacyKey:'spaceCorp_save',backupKey:'orbitPact_before_import',maxImportBytes:2*1024*1024,message:null,
  fresh(){return {version:2,money:100000,reputation:10,research:0,level:1,totalMoneyEarned:0,totalCosts:0,completedContracts:0,playTime:0,satellites:[],offers:[],activeContracts:[],history:[],log:[],servedCountries:[],claimedObjectives:[],upgrades:Object.fromEntries(Object.keys(CONFIG.upgradeTypes).map(k=>[k,0])),nextSatelliteId:1,nextContractId:1,paused:false,speed:1};},
  save(state){try{localStorage.setItem(this.key,JSON.stringify({...state,version:2,savedAt:Date.now()}));return true;}catch(e){return false;}},
  load(){
    this.message=null;
    try{
      const raw=localStorage.getItem(this.key);
      if(raw){const parsed=JSON.parse(raw);if(parsed.version!==2)throw new Error('Unknown version');return this.validate(parsed);}
      const legacy=localStorage.getItem(this.legacyKey);if(legacy){const old=JSON.parse(legacy);if(old.version!==1)throw new Error('Unknown version');this.message='Your old company has been imported. Previous active contracts have been released; the original save is preserved.';return this.migrate(old);}
    }catch(e){this.message='Your saved progress could not be read. A new company has been started.';}
    return null;
  },
  migrate(old){const state=this.fresh();for(const key of ['money','reputation','research','totalMoneyEarned','playTime'])if(Number.isFinite(old[key])&&old[key]>=0)state[key]=old[key];state.level=Utils.level(state.totalMoneyEarned);for(const s of (Array.isArray(old.satellites)?old.satellites:[])){if(CONFIG.satelliteTypes[s.type]){const sat=satelliteSystem.create(state,s.type);sat.health=Utils.clamp(Number.isFinite(s.health)?s.health:100,0,100);state.satellites.push(sat);}}if(!state.satellites.length)state.satellites.push(satelliteSystem.create(state,'Scout-1'));contractSystem.generate(state);return state;},
  validate(input){
    if(!input||typeof input!=='object'||input.version!==2)throw new Error('Not a supported Orbit Pact save.');
    const state=this.fresh();
    for(const key of ['money','reputation','research','totalMoneyEarned','totalCosts','completedContracts','playTime']){if(!Number.isFinite(input[key])||input[key]<0||input[key]>1e12)throw new Error(`Invalid field: ${key}`);state[key]=input[key];}
    if(!Array.isArray(input.satellites)||!input.satellites.length||input.satellites.length>1000)throw new Error('Invalid fleet');
    const ids=new Set();state.satellites=input.satellites.map(s=>{if(!s||!Object.hasOwn(CONFIG.satelliteTypes,s.type)||!Number.isSafeInteger(s.id)||s.id<1||s.id>1e9||ids.has(s.id))throw new Error('Invalid satellite');ids.add(s.id);return {id:s.id,type:s.type,name:typeof s.name==='string'?s.name.slice(0,60):`${s.type} / ${s.id}`,health:Utils.clamp(Number.isFinite(s.health)?s.health:100,0,100),activeContract:null,age:Number.isFinite(s.age)&&s.age>=0&&s.age<=1e12?s.age:0,phase:Number.isFinite(s.phase)?s.phase%1:(s.id*.618)%1};});
    state.nextSatelliteId=Math.max(...ids)+1;
    for(const key in state.upgrades){const value=input.upgrades?.[key];state.upgrades[key]=Number.isFinite(value)?Utils.clamp(Math.floor(value),0,CONFIG.upgradeTypes[key].max):0;}
    const contractIds=new Set();
    const validContract=c=>c&&Number.isSafeInteger(c.id)&&c.id>0&&c.id<=1e9&&!contractIds.has(c.id)&&Number.isInteger(c.typeIndex)&&CONFIG.contractTypes[c.typeIndex]&&Utils.country(c.countryId)&&(c.mode==null||Object.hasOwn(CONFIG.contractModes,c.mode))&&Number.isInteger(c.requiredQuality)&&c.requiredQuality>=1&&c.requiredQuality<=3&&['baseReward','baseCost','baseDuration','reputation'].every(k=>Number.isFinite(c[k])&&c[k]>0&&c[k]<=1e12);
    const cleanContract=c=>Object.fromEntries(['id','typeIndex','countryId','requiredQuality','baseReward','baseCost','baseDuration','reputation',...(c.mode==null?[]:['mode'])].map(k=>[k,c[k]]));
    for(const m of (Array.isArray(input.activeContracts)?input.activeContracts:[]).slice(0,1000)){const sat=state.satellites.find(s=>s.id===m?.satelliteId);if(!validContract(m)||!sat||sat.activeContract!==null||!['reward','cost','duration'].every(k=>Number.isFinite(m[k])&&m[k]>0&&m[k]<=1e12)||!Number.isFinite(m.elapsed)||m.elapsed<0)continue;contractIds.add(m.id);sat.activeContract=m.id;state.activeContracts.push({...cleanContract(m),satelliteId:sat.id,reward:m.reward,cost:m.cost,duration:m.duration,...(m.specialtyMatch==null?{}:{specialtyMatch:Boolean(m.specialtyMatch)}),elapsed:Math.min(m.duration,m.elapsed)});}
    for(const c of (Array.isArray(input.offers)?input.offers:[]).slice(0,1000)){if(validContract(c)){contractIds.add(c.id);state.offers.push(cleanContract(c));}}
    state.nextContractId=Math.max(0,...contractIds,Number.isSafeInteger(input.nextContractId)&&input.nextContractId<=1e9?input.nextContractId-1:0)+1;
    state.history=(Array.isArray(input.history)?input.history:[]).filter(c=>c&&CONFIG.contractTypes[c.typeIndex]&&Utils.country(c.countryId)&&['reward','profit','time'].every(k=>Number.isFinite(c[k]))).slice(0,30);
    state.log=(Array.isArray(input.log)?input.log:[]).filter(l=>l&&typeof l.message==='string'&&Number.isFinite(l.time)).slice(-100).map(l=>({message:translateLegacyLog(l.message.slice(0,500)),time:Math.max(0,l.time),type:['success','warning','info'].includes(l.type)?l.type:'info'}));
    state.servedCountries=[...new Set([...(Array.isArray(input.servedCountries)?input.servedCountries:[]),...state.history.map(c=>c.countryId)].filter(id=>Utils.country(id)))];
    state.claimedObjectives=[...new Set((Array.isArray(input.claimedObjectives)?input.claimedObjectives:[]).filter(id=>CONFIG.objectives.some(g=>g.id===id)))];
    state.level=Utils.level(state.totalMoneyEarned);state.paused=Boolean(input.paused);state.speed=input.speed===3?3:1;return state;
  },
  exportText(state) {
    return JSON.stringify({format:'orbit-pact-save',formatVersion:1,exportedAt:new Date().toISOString(),state:{...state,version:2}},null,2);
  },
  parseImport(text) {
    if(typeof text!=='string'||text.length>this.maxImportBytes)throw new Error('Choose an Orbit Pact save smaller than 2 MB.');
    let data;
    try{data=JSON.parse(text);}catch(e){throw new Error('This file is not valid JSON. Choose an exported Orbit Pact save.');}
    if(data?.format!=null){if(data.format!=='orbit-pact-save'||data.formatVersion!==1)throw new Error('This save format is not supported.');data=data.state;}
    const state=this.validate(data);
    // Imports must not silently discard missions or other entries from the file.
    for(const key of ['activeContracts','offers','history','log'])if(!Array.isArray(data[key])||state[key].length!==data[key].length)throw new Error('This save contains incomplete or invalid game data.');
    return state;
  },
  importState(candidate,current) {
    let state;
    try{state=this.validate(candidate);state.paused=true;localStorage.setItem(this.backupKey,this.exportText(current));}
    catch(e){return {error:'The current game could not be backed up. Your game has not been replaced.'};}
    if(!this.save(state))return {error:'Your browser could not save the imported game. Your current game is still active.'};
    this.message=null;return {success:true,state};
  },
  hasBackup() {try{return Boolean(localStorage.getItem(this.backupKey));}catch(e){return false;}},
  readBackup() {
    const text=localStorage.getItem(this.backupKey);
    if(!text)throw new Error('No previous save is available.');
    return this.parseImport(text);
  }
};
