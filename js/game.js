'use strict';
class Game {
  constructor(){this.state=saveSystem.fresh();this.ui=null;this.map=null;this.lastFrame=0;this.lastUI=0;this.lastSave=0;this.bankrupt=false;this.refreshAt=0;}
  init(){
    const saved=saveSystem.load();this.state=saved||saveSystem.fresh();
    if(!saved){this.state.satellites.push(satelliteSystem.create(this.state,'Scout-1'));const starts=['NLD','USA','BRA','JPN','AUS'];this.state.offers=starts.map((id,i)=>contractSystem.create(this.state,id,i));this.log('Welcome to Orbit Pact. Your Scout-1 is ready for its first assignment.');}
    this.ui=new UISystem(this);this.ui.init();this.map=new WorldMap(this,(id,point)=>{this.ui.selectCountry(id,false);this.ui.spaceport.pick(id,point);});this.map.focusSite();this.ui.render();
    if(saveSystem.message){this.log(saveSystem.message,'warning');this.ui.toast(saveSystem.message);}
    this.save();
    document.addEventListener('visibilitychange',()=>{this.lastFrame=performance.now();if(document.hidden)this.save();});
    window.addEventListener('pagehide',()=>this.save());window.addEventListener('beforeunload',()=>this.save());
    const frame=now=>{const dt=this.lastFrame?Math.min(1000,Math.max(0,now-this.lastFrame)):0;this.lastFrame=now;if(!document.hidden&&(!this.matches||this.matches.screen==='sandbox')){if(!this.state.paused)this.update(dt*this.state.speed);if(now-this.lastUI>=250){this.ui.updateLive();this.lastUI=now;}if(this.ui.page==='operations'&&now-(this.lastMap||0)>33){this.map.draw();this.lastMap=now;}if(now-this.lastSave>CONFIG.saveInterval){this.save();this.lastSave=now;}}this.frame=requestAnimationFrame(frame);};this.frame=requestAnimationFrame(frame);if(typeof MatchController!=='undefined'){this.matches=new MatchController(this);this.matches.init();}
  }
  update(dt){
    if(!Number.isFinite(dt)||dt<=0||this.state.paused)return;
    const state=this.state;state.playTime+=dt;const maintenance=satelliteSystem.update(state,dt);const paid=Math.min(state.money,maintenance);state.money-=paid;state.totalCosts+=paid;
    const previousCompleted=state.completedContracts,completed=contractSystem.update(state,dt);let dirty=false;
    for(const message of baseSystem.update(state,dt)){this.log(message,'success');this.ui?.toast(message);dirty=true;}
    for(const m of completed){this.log(`${CONFIG.contractTypes[m.typeIndex].name} completed. ${Utils.money(m.reward)} received; ${Utils.money(m.reward-m.cost)} contract profit.`,'success');this.ui?.toast(`Contract completed: +${Utils.money(m.reward)}`);dirty=true;}
    for(const [threshold,message] of [[3,'Specialist satellites unlocked: Relay-1 and Nimbus-1.'],[5,'Long-term contracts unlocked. Refresh offers to find them.']])if(previousCompleted<threshold&&state.completedContracts>=threshold){this.log(message,'success');this.ui?.toast(message);}
    const level=Utils.level(state.totalMoneyEarned);if(level!==state.level){state.level=level;this.log(`Company level ${level} reached: ${CONFIG.levelNames[level-1]}.`,'success');this.ui?.toast(`Level ${level}: ${CONFIG.levelNames[level-1]}`);dirty=true;}
    if(state.money<=0&&!this.bankrupt){this.bankrupt=true;this.log('Your balance is empty. Active contracts will finish. Maintenance does not create debt.','warning');this.ui?.toast('Out of funds. Finish your active contracts.');dirty=true;}else if(state.money>1)this.bankrupt=false;
    if(dirty)this.changed();
  }
  log(message,type='info'){this.state.log.push({message,type,time:this.state.playTime});this.state.log=this.state.log.slice(-100);}
  changed(){this.ui?.render();this.save();}
  save(){const success=saveSystem.save(this.state);if(this.ui){document.getElementById('saveStatus').textContent=success?'Saved on this device':'Saving is unavailable in this browser';}return success;}
  accept(id,satelliteId){const result=contractSystem.accept(this.state,id,satelliteId);if(result.error){this.ui?.toast(result.error,true);return false;}const m=result.mission;this.log(`Contract started: ${CONFIG.contractTypes[m.typeIndex].name}. Start cost: ${Utils.money(m.cost)}.`);this.changed();this.ui?.toast('Contract started. Your satellite is now working.');return true;}
  buySatellite(type){const def=CONFIG.satelliteTypes[type];if(!def)return false;if(!satelliteSystem.isUnlocked(this.state,type)){this.ui?.toast(`Complete ${def.unlockContracts} contracts to unlock this satellite.`,true);return false;}if(this.state.money<def.price){this.ui?.toast('Not enough funds for this satellite.',true);return false;}this.state.money-=def.price;this.state.totalCosts+=def.price;const sat=satelliteSystem.create(this.state,type);this.state.satellites.push(sat);this.log(`${sat.name} launched for ${Utils.money(def.price)}.`,'success');this.changed();this.ui?.toast(`${sat.name} has joined your fleet.`);return true;}
  claimObjective(id){const result=objectiveSystem.claim(this.state,id);if(result.error){this.ui?.toast(result.error,true);return false;}const goal=result.objective;this.log(`Objective completed: ${goal.name}. +${Utils.money(goal.money)} and +${goal.research} research.`,'success');this.changed();this.ui?.toast(`${goal.name}: reward claimed.`);return true;}
  importSave(candidate){
    const result=saveSystem.importState(candidate,this.state);
    if(result.error){this.ui?.toast(result.error,true);return false;}
    this.state=result.state;this.lastFrame=performance.now();this.bankrupt=false;this.refreshAt=0;
    if(this.ui)this.ui.countryId=null;this.map?.reset();this.ui?.navigate('operations');
    this.log('Save imported. Resume the simulation when you are ready.');this.changed();
    this.ui?.toast('Save imported. Press play to continue.');return true;
  }
  buyUpgrade(key){const result=upgradeSystem.buy(this.state,key);if(result.error){this.ui?.toast(result.error,true);return false;}this.state.totalCosts+=result.info.cost;this.log(`${result.info.name} upgraded to level ${this.state.upgrades[key]}.`,'success');this.changed();this.ui?.toast('Upgrade applied to your fleet.');return true;}
  repair(id){const sat=this.state.satellites.find(s=>s.id===id);if(!sat)return false;if(sat.activeContract!==null){this.ui?.toast('Wait for the contract to finish.',true);return false;}const cost=satelliteSystem.repairCost(sat);if(this.state.money<cost){this.ui?.toast('Not enough funds for repairs.',true);return false;}this.state.money-=cost;this.state.totalCosts+=cost;sat.health=100;this.log(`${sat.name} repaired for ${Utils.money(cost)}.`,'success');this.changed();return true;}
  refresh(countryId=null){const now=Date.now();if(now<this.refreshAt){this.ui?.toast('Wait a moment before searching for contracts again.',true);return false;}contractSystem.generate(this.state,countryId);this.refreshAt=now+3000;this.log(countryId?`New offers in ${Utils.country(countryId)?.properties.name||'this country'}.`:'New worldwide contract offers received.');this.changed();return true;}
  togglePause(){this.state.paused=!this.state.paused;this.lastFrame=performance.now();this.ui?.updateLive();this.save();}
  toggleSpeed(){this.state.speed=this.state.speed===1?3:1;this.ui?.updateLive();this.save();}
  newGame(){this.state=saveSystem.fresh();this.state.satellites.push(satelliteSystem.create(this.state,'Scout-1'));contractSystem.generate(this.state);this.bankrupt=false;this.refreshAt=0;this.log('New company started. Scout-1 is ready.');if(this.ui)this.ui.countryId=null;this.map?.reset();this.changed();this.ui?.navigate('operations');}
}
const game=new Game();
window.addEventListener('DOMContentLoaded',()=>game.init());
