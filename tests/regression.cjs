/* Run with Node.js: node tests/regression.cjs. No installation needed. */
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const memory=new Map(),listeners=[],elements=new Map();
let frames=0,drawCalls=0;
function canvas(){
  const context=new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})}, {get:(o,k)=>k in o?o[k]:(...args)=>{for(const a of args)if(typeof a==='number')assert.ok(Number.isFinite(a),`Canvas ${k} received a nonfinite value`);drawCalls++;}});
  return {width:800,height:520,parentElement:{},getContext:()=>context,getBoundingClientRect:()=>({x:0,y:0,left:0,top:0,width:800,height:520}),addEventListener:(...args)=>listeners.push(args),classList:{toggle(){}},setAttribute(){},style:{},setPointerCapture(){},hasPointerCapture:()=>false};
}
function element(id){if(!elements.has(id))elements.set(id,id==='mapCanvas'?canvas():{textContent:'',style:{},hidden:false,classList:{toggle(){}},setAttribute(){}});return elements.get(id);}
const c=vm.createContext({console,Date,Math,Map,Set,Intl,Number,Object,Array,JSON,performance:{now:()=>100},setTimeout(){},requestAnimationFrame:()=>++frames,
  window:{devicePixelRatio:1,addEventListener:(...args)=>listeners.push(args)},
  document:{hidden:false,addEventListener:(...args)=>listeners.push(args),getElementById:element,createElement:()=>canvas()},
  ResizeObserver:class{observe(){}},
  localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)}
});
for(const f of ['vendor/d3.min.js','js/world-data.js','js/locale.js','js/config.js','js/satellites.js','js/upgrades.js','js/contracts.js','js/objectives.js','js/save.js','js/map.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),c,{filename:f});
vm.runInContext('class UISystem {constructor(game){this.game=game;this.page="operations";}init(){}render(){}updateLive(){}toast(){}selectCountry(){}navigate(){}}',c);
vm.runInContext(fs.readFileSync(path.join(root,'js/game.js'),'utf8'),c,{filename:'js/game.js'});
const run=source=>vm.runInContext(source,c);
const near=(a,b,tolerance=1e-6)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} != ${b}`);
let count=0;
function test(name,fn){fn();count++;console.log(`PASS ${name}`);}
function fresh(){run('game.state=saveSystem.fresh();game.state.satellites.push(satelliteSystem.create(game.state,"Scout-1"));contractSystem.generate(game.state);');}

test('All entrypoint assets exist and all authored JavaScript parses',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  for(const m of html.matchAll(/(?:src|href)="([^"#]+)"/g))assert.ok(fs.existsSync(path.join(root,m[1])),m[1]);
  for(const file of fs.readdirSync(path.join(root,'js')).filter(f=>f.endsWith('.js')))new vm.Script(fs.readFileSync(path.join(root,'js',file),'utf8'),{filename:file});
  const sources=html+fs.readFileSync(path.join(root,'js/ui.js'),'utf8');
  const ids=new Set([...sources.matchAll(/\bid="([a-zA-Z][\w-]*)"/g)].map(m=>m[1]));
  for(const m of sources.matchAll(/\.id='([\w-]+)'/g))ids.add(m[1]);
  for(const file of ['ui.js','game.js','map.js'])for(const m of fs.readFileSync(path.join(root,'js',file),'utf8').matchAll(/getElementById\('([\w-]+)'\)/g))assert.ok(ids.has(m[1]),`Missing element: ${m[1]}`);
});
test('Fresh game starts, saves and schedules exactly one game loop',()=>{
  run('game.init()');assert.equal(run('game.state.money'),100000);assert.equal(run('game.state.satellites.length'),1);assert.equal(run('game.state.satellites[0].activeContract'),null);assert.equal(frames,1);assert.ok(memory.has('spaceCorp_save_v2'));assert.ok(drawCalls>0);
});
test('Each satellite accepts one contract; duplicate acceptance is rejected',()=>{
  fresh();run('const first=game.state.offers[0];const second=game.state.offers[1];');assert.equal(run('contractSystem.accept(game.state,first.id,1).success'),true);assert.ok(run('contractSystem.accept(game.state,second.id,1).error'));assert.ok(run('contractSystem.accept(game.state,first.id,1).error'));assert.equal(run('game.state.activeContracts.length'),1);
});
test('Costs are paid once and completion pays once and frees the starter',()=>{
  fresh();run('const quoted=contractSystem.quote(game.state,game.state.offers[0],game.state.satellites[0]);const moneyBefore=game.state.money;contractSystem.accept(game.state,game.state.offers[0].id,1);');near(run('game.state.money'),run('moneyBefore-quoted.cost'));run('contractSystem.update(game.state,quoted.duration)');near(run('game.state.money'),run('moneyBefore-quoted.cost+quoted.reward'));assert.equal(run('game.state.satellites[0].activeContract'),null);assert.equal(run('game.state.completedContracts'),1);run('contractSystem.update(game.state,999999)');assert.equal(run('game.state.completedContracts'),1);
});
test('Insufficient cash and satellite class prevent acceptance without mutation',()=>{
  fresh();run('game.state.money=0;const before=JSON.stringify(game.state);');assert.ok(run('contractSystem.accept(game.state,game.state.offers[0].id,1).error'));assert.equal(run('JSON.stringify(game.state)===before'),true);run('game.state.money=100000;game.state.offers[0].requiredQuality=3;');assert.ok(run('contractSystem.accept(game.state,game.state.offers[0].id,1).error'));
});
test('Maintenance is frame-rate independent and includes the starter',()=>{
  fresh();const cost30=run('Array.from({length:30},()=>satelliteSystem.update(game.state,1000/30)).reduce((a,b)=>a+b,0)');const cost60=run('Array.from({length:60},()=>satelliteSystem.update(game.state,1000/60)).reduce((a,b)=>a+b,0)');near(cost30,cost60);near(cost60,500/1800);near(run('satelliteSystem.update(game.state,CONFIG.monthMs)'),500);
});
test('Every upgrade has its advertised effect and spending is validated',()=>{
  fresh();assert.ok(run('upgradeSystem.buy(game.state,"resolution").error'));run('game.state.money=10000000;game.state.research=10000;const baseQuote=contractSystem.quote(game.state,game.state.offers[0],game.state.satellites[0]);const baseStats=satelliteSystem.stats(game.state,game.state.satellites[0]);');
  for(const key of run('Object.keys(CONFIG.upgradeTypes)'))assert.equal(run(`upgradeSystem.buy(game.state,"${key}").success`),true);
  assert.ok(run('contractSystem.quote(game.state,game.state.offers[0],game.state.satellites[0]).reward>baseQuote.reward'));assert.ok(run('contractSystem.quote(game.state,game.state.offers[0],game.state.satellites[0]).cost<baseQuote.cost'));assert.ok(run('contractSystem.quote(game.state,game.state.offers[0],game.state.satellites[0]).duration<baseQuote.duration'));assert.ok(run('satelliteSystem.stats(game.state,game.state.satellites[0]).coverage>baseStats.coverage'));assert.ok(run('satelliteSystem.stats(game.state,game.state.satellites[0]).efficiency>baseStats.efficiency'));near(run('satelliteSystem.monthlyCost(game.state)'),450);
  run('const testState=saveSystem.validate(JSON.parse(JSON.stringify(game.state)));testState.upgrades.reliability=0;const beforeHealth=game.state.satellites[0].health;satelliteSystem.update(game.state,60000);satelliteSystem.update(testState,60000);');assert.ok(run('game.state.satellites[0].health>testState.satellites[0].health'));
  run('game.state.upgrades.resolution=5');assert.ok(run('upgradeSystem.buy(game.state,"resolution").error'));
});
test('Active mission, upgrades, health, history and unique IDs survive reload',()=>{
  fresh();run('game.state.money=2000000;game.state.research=100;game.buySatellite("Observer-1");upgradeSystem.buy(game.state,"processing");contractSystem.accept(game.state,game.state.offers[0].id,1);contractSystem.update(game.state,10000);saveSystem.save(game.state);const loaded=saveSystem.load();');assert.equal(run('loaded.activeContracts.length'),1);assert.equal(run('loaded.activeContracts[0].elapsed'),10000);assert.equal(run('loaded.upgrades.processing'),1);assert.equal(run('loaded.satellites[0].activeContract===loaded.activeContracts[0].id'),true);assert.equal(run('satelliteSystem.create(loaded,"Scout-1").id'),3);
  run('contractSystem.update(loaded,999999);saveSystem.save(loaded);const completedSave=saveSystem.load();');assert.equal(run('completedSave.completedContracts'),1);assert.equal(run('completedSave.history.length'),1);assert.equal(run('completedSave.activeContracts.length'),0);assert.equal(run('completedSave.satellites[0].activeContract'),null);
});
test('Legacy saves migrate safely without overwriting the original',()=>{
  memory.delete('spaceCorp_save_v2');const old={version:1,money:12345,reputation:23,research:5,totalMoneyEarned:150000,playTime:4321,satellites:[{id:0,type:'Scout-1',health:92,activeContract:0}]};memory.set('spaceCorp_save',JSON.stringify(old));run('const migrated=saveSystem.load()');assert.equal(run('migrated.money'),12345);assert.equal(run('migrated.level'),2);assert.equal(run('migrated.satellites[0].health'),92);assert.equal(run('migrated.satellites[0].activeContract'),null);assert.equal(run('migrated.satellites[0].id'),1);assert.equal(memory.get('spaceCorp_save'),JSON.stringify(old));
});
test('Corrupted saves do not crash loading',()=>{
  memory.set('spaceCorp_save_v2','{bad json');assert.equal(run('saveSystem.load()'),null);memory.set('spaceCorp_save_v2',JSON.stringify({version:2,money:-50}));assert.equal(run('saveSystem.load()'),null);
});
test('Levels cap at five with finite progress including all boundaries',()=>{
  for(const [earned,level]of [[0,1],[99999,1],[100000,2],[500000,3],[2000000,4],[5000000,5],[10000000,5]]){assert.equal(run(`Utils.level(${earned})`),level);const result=run(`Utils.progress({totalMoneyEarned:${earned}})`);assert.ok(Number.isFinite(result.percent)&&result.percent>=0&&result.percent<=100);}
});
test('A new game resets state without duplicating event handlers or game loops',()=>{
  const beforeListeners=listeners.length,beforeFrames=frames;run('game.newGame();game.newGame();game.newGame()');assert.equal(listeners.length,beforeListeners);assert.equal(frames,beforeFrames);assert.equal(run('game.state.money'),100000);assert.equal(run('game.state.satellites.length'),1);assert.equal(run('game.state.activeContracts.length'),0);assert.equal(run('game.state.satellites[0].id'),1);
});
test('Paused simulation charges no maintenance and makes no progress',()=>{
  fresh();run('game.state.paused=true;const pausedState=JSON.stringify(game.state);game.update(60000)');assert.equal(run('JSON.stringify(game.state)===pausedState'),true);run('game.state.paused=false');
});
test('Satellite coordinates remain deterministic and geographically valid',()=>{
  fresh();const a=run('JSON.stringify(satelliteSystem.position(game.state.satellites[0],1500))'),b=run('JSON.stringify(satelliteSystem.position(game.state.satellites[0],1500))');assert.equal(a,b);for(let t=0;t<1000000;t+=7919){const p=run(`satelliteSystem.position(game.state.satellites[0],${t})`);assert.ok(Math.abs(p[0])<=180&&Math.abs(p[1])<=90);}
});
test('World geometry and country hit detection use the small-area orientation',()=>{
  assert.equal(run('WORLD_DATA.features.length'),177);assert.equal(run('WORLD_DATA.features.every(f=>d3.geoArea(f)<2*Math.PI)'),true);assert.equal(run('d3.geoContains(Utils.country("NLD"),[4.9,52.4])'),true);assert.equal(run('d3.geoContains(Utils.country("NLD"),[-74,40.7])'),false);
});
test('Globe and flat projections render and invert correctly after mode changes',()=>{
  run('game.map.setMode("flat");game.map.changeZoom(1.3);game.map.select("NLD");game.map.draw()');let location=run('game.map.projection.invert(game.map.projection([4.9,52.4]))');near(location[0],4.9,1e-4);near(location[1],52.4,1e-4);run('game.map.setMode("globe");game.map.select("NLD");game.map.draw()');location=run('game.map.projection.invert(game.map.projection([4.9,52.4]))');near(location[0],4.9,1e-4);near(location[1],52.4,1e-4);assert.ok(drawCalls>100);
});
test('Late-game offers always retain an entry-level contract',()=>{
  fresh();run('game.state.level=5;contractSystem.generate(game.state,"NLD")');assert.equal(run('game.state.offers[0].requiredQuality'),1);assert.equal(run('game.state.offers.every(c=>c.countryId==="NLD")'),true);
});
test('English country names keep country IDs and contract destinations intact',()=>{
  assert.equal(run('Utils.country("NLD").properties.name'),'Netherlands');
  assert.equal(run('Utils.country("USA").properties.name'),'United States');
  assert.equal(run('WORLD_DATA.features.every(f=>typeof f.properties.name==="string"&&f.properties.name.length>0)'),true);
  assert.equal(run('Utils.money(123456)'), '€123,456');
  fresh();run('contractSystem.generate(game.state,"NLD");contractSystem.accept(game.state,game.state.offers[0].id,1);saveSystem.save(game.state);');
  assert.equal(run('saveSystem.load().activeContracts[0].countryId'),'NLD');
});
test('Dutch activity logs translate once while saved mission progress is preserved',()=>{
  fresh();run('contractSystem.accept(game.state,game.state.offers[0].id,1);contractSystem.update(game.state,12345);');
  const messages=[
    ['Welkom bij Space Corp. Je Scout-1 is klaar voor de eerste opdracht.','Welcome to Orbit Pact. Your Scout-1 is ready for its first assignment.'],
    ['Weersobservatie voltooid. € 22.500 ontvangen; € 16.000 contractwinst.','Weather observation completed. €22,500 received; €16,000 contract profit.'],
    ['Bedrijfslevel 2 bereikt: Ruimtevaartbedrijf.','Company level 2 reached: Space company.'],
    ['Nieuw aanbod in Nederland.','New offers in Netherlands.'],
    ['Communicatiesupport verbeterd naar niveau 2.','Communications support upgraded to level 2.']
  ];
  run(`game.state.log=${JSON.stringify(messages.map(([message],i)=>({message,time:i,type:'info'})))};saveSystem.save(game.state);`);
  const before=JSON.parse(memory.get('spaceCorp_save_v2'));
  run('const englishSave=saveSystem.load();saveSystem.save(englishSave);');
  const after=JSON.parse(memory.get('spaceCorp_save_v2'));
  assert.deepEqual(after.log.map(l=>l.message),messages.map(([,english])=>english));
  for(const key of ['money','satellites','activeContracts','offers','upgrades','playTime'])assert.deepEqual(after[key],before[key],key);
  run('saveSystem.save(saveSystem.load());');
  assert.deepEqual(JSON.parse(memory.get('spaceCorp_save_v2')).log,after.log);
});
test('Specialists unlock after three completions and reward only matching work',()=>{
  fresh();run('game.state.money=1000000;const beforeLocked=JSON.stringify(game.state);');
  assert.equal(run('game.buySatellite("Relay-1")'),false);assert.equal(run('JSON.stringify(game.state)===beforeLocked'),true);
  run('game.state.completedContracts=3;game.buySatellite("Relay-1");const relay=game.state.satellites[1];const communicationOffer={...game.state.offers[0],typeIndex:3};const generalQuote=contractSystem.quote(game.state,communicationOffer);const relayQuote=contractSystem.quote(game.state,communicationOffer,relay);');
  assert.equal(run('relayQuote.specialtyMatch'),true);near(run('relayQuote.reward'),run('Math.round(generalQuote.reward*1.2)'));
  assert.ok(run('relayQuote.duration<generalQuote.duration'));assert.equal(run('relayQuote.cost===generalQuote.cost'),true);
  assert.equal(run('contractSystem.quote(game.state,{...communicationOffer,typeIndex:0},relay).specialtyMatch'),false);
  assert.equal(run('contractSystem.specialtyMatch({type:"Advanced-1"},communicationOffer)'),true);
});
test('Offers include quick and standard work, then unlock longer commitments',()=>{
  fresh();assert.equal(run('game.state.offers.some(c=>c.mode==="quick")'),true);assert.equal(run('game.state.offers.some(c=>c.mode==="standard")'),true);assert.equal(run('game.state.offers.some(c=>c.mode==="extended")'),false);
  run('game.state.completedContracts=5;contractSystem.generate(game.state);');
  assert.equal(run('game.state.offers.some(c=>c.mode==="extended")'),true);
  assert.equal(run('game.state.offers.find(c=>c.mode==="quick").baseDuration<game.state.offers.find(c=>c.mode==="standard").baseDuration'),true);
  assert.equal(run('game.state.offers.find(c=>c.mode==="extended").baseDuration>game.state.offers.find(c=>c.mode==="standard").baseDuration'),true);
  assert.equal(run('game.state.offers.every(c=>c.baseReward>c.baseCost)'),true);
});
test('Accepted specialty and long-term quotes stay fixed after upgrades and reloads',()=>{
  fresh();run('game.state.money=1000000;game.state.completedContracts=5;game.buySatellite("Relay-1");contractSystem.generate(game.state);const extended=game.state.offers.find(c=>c.mode==="extended");extended.typeIndex=3;contractSystem.accept(game.state,extended.id,2);const frozenMission=JSON.stringify(game.state.activeContracts[0]);game.state.upgrades.resolution=5;game.state.upgrades.processing=5;saveSystem.save(game.state);');
  const mission=JSON.parse(run('frozenMission')),loaded=run('saveSystem.load().activeContracts[0]');
  for(const key of ['reward','cost','duration','mode','specialtyMatch'])assert.equal(loaded[key],mission[key],key);
});
test('Objective rewards are granted once, including after a save transfer',()=>{
  fresh();assert.equal(run('objectiveSystem.claim(game.state,"first_signal").success'),undefined);
  run('game.state.completedContracts=1;const goalMoney=game.state.money;const earnedBeforeGoal=game.state.totalMoneyEarned;');
  assert.equal(run('game.claimObjective("first_signal")'),true);near(run('game.state.money-goalMoney'),15000);
  assert.equal(run('game.state.totalMoneyEarned'),run('earnedBeforeGoal'));assert.equal(run('game.claimObjective("first_signal")'),false);
  run('game.state=saveSystem.parseImport(saveSystem.exportText(game.state));');assert.equal(run('game.claimObjective("first_signal")'),false);
});
test('New objectives preserve older saves and count each served country once',()=>{
  fresh();run('game.state.completedContracts=8;game.state.history=[{id:99,typeIndex:0,countryId:"NLD",reward:100,profit:50,time:1}];const oldExpansionSave=JSON.parse(JSON.stringify(game.state));delete oldExpansionSave.servedCountries;delete oldExpansionSave.claimedObjectives;game.state=saveSystem.validate(oldExpansionSave);');
  assert.equal(run('game.state.completedContracts'),8);assert.equal(run('objectiveSystem.next(game.state).id'),'first_signal');assert.equal(run('game.state.servedCountries.join(",")'),'NLD');
  run('contractSystem.generate(game.state,"NLD");contractSystem.accept(game.state,game.state.offers[0].id,1);contractSystem.update(game.state,999999);');assert.equal(run('game.state.servedCountries.length'),1);
});
test('Invalid imports reject before touching the current game or its saved copy',()=>{
  fresh();run('saveSystem.save(game.state);');const before=memory.get('spaceCorp_save_v2'),stateBefore=run('JSON.stringify(game.state)');
  for(const text of ['{bad','null','[]','{"version":9}','{"format":"different-game","formatVersion":1}', 'x'.repeat(2*1024*1024+1)])assert.throws(()=>run(`saveSystem.parseImport(${JSON.stringify(text)})`));
  run('const invalidMission=JSON.parse(JSON.stringify(game.state));invalidMission.activeContracts=[null];');assert.throws(()=>run('saveSystem.parseImport(JSON.stringify(invalidMission))'));
  assert.equal(memory.get('spaceCorp_save_v2'),before);assert.equal(run('JSON.stringify(game.state)'),stateBefore);
});
test('Import keeps a recoverable backup and resumes in a paused state',()=>{
  fresh();run('game.state.money=88888;const originalText=saveSystem.exportText(game.state);const incoming=saveSystem.parseImport(originalText);incoming.money=12345;');
  const listenersBefore=listeners.length,framesBefore=frames;
  assert.equal(run('game.importSave(incoming)'),true);assert.equal(run('game.state.money'),12345);assert.equal(run('game.state.paused'),true);
  assert.equal(run('saveSystem.readBackup().money'),88888);assert.equal(run('saveSystem.load().money'),12345);
  assert.equal(listeners.length,listenersBefore);assert.equal(frames,framesBefore);
  assert.equal(run('game.importSave(saveSystem.readBackup())'),true);assert.equal(run('game.state.money'),88888);
});
test('Failed backup or import storage leaves the active company unchanged',()=>{
  fresh();run('const beforeFailedImport=JSON.stringify(game.state);const originalSetItem=localStorage.setItem;localStorage.setItem=()=>{throw new Error("Storage full")};');
  assert.equal(run('game.importSave(saveSystem.fresh())'),false);assert.equal(run('JSON.stringify(game.state)'),run('beforeFailedImport'));
  run('localStorage.setItem=(key,value)=>{if(key===saveSystem.key)throw new Error("Storage full");originalSetItem(key,value);};');
  assert.equal(run('game.importSave(game.state)'),false);assert.equal(run('JSON.stringify(game.state)'),run('beforeFailedImport'));
  run('localStorage.setItem=originalSetItem;');
});
console.log(`\n${count} regression checks passed. Browser layout is not covered by these checks.`);
