'use strict';
class Game {
  constructor(){this.state=saveSystem.fresh();this.ui=null;this.map=null;this.lastFrame=0;this.lastUI=0;this.lastSave=0;this.bankrupt=false;this.refreshAt=0;}
  init(){
    const saved=saveSystem.load();this.state=saved||saveSystem.fresh();
    if(!saved){this.state.satellites.push(satelliteSystem.create(this.state,'Scout-1'));const starts=['NLD','USA','BRA','JPN','AUS'];this.state.offers=starts.map((id,i)=>contractSystem.create(this.state,id,i));this.log('Welkom bij Space Corp. Je Scout-1 is klaar voor de eerste opdracht.');}
    this.ui=new UISystem(this);this.ui.init();this.map=new WorldMap(this,id=>this.ui.selectCountry(id,false));this.ui.render();
    if(saveSystem.message){this.log(saveSystem.message,'warning');this.ui.toast(saveSystem.message);}
    this.save();
    document.addEventListener('visibilitychange',()=>{this.lastFrame=performance.now();if(document.hidden)this.save();});
    window.addEventListener('pagehide',()=>this.save());window.addEventListener('beforeunload',()=>this.save());
    const frame=now=>{const dt=this.lastFrame?Math.min(1000,Math.max(0,now-this.lastFrame)):0;this.lastFrame=now;if(!document.hidden){if(!this.state.paused)this.update(dt*this.state.speed);if(now-this.lastUI>=250){this.ui.updateLive();this.lastUI=now;}if(this.ui.page==='operations'&&now-(this.lastMap||0)>33){this.map.draw();this.lastMap=now;}if(now-this.lastSave>CONFIG.saveInterval){this.save();this.lastSave=now;}}this.frame=requestAnimationFrame(frame);};this.frame=requestAnimationFrame(frame);
  }
  update(dt){
    if(!Number.isFinite(dt)||dt<=0||this.state.paused)return;
    const state=this.state;state.playTime+=dt;const maintenance=satelliteSystem.update(state,dt);const paid=Math.min(state.money,maintenance);state.money-=paid;state.totalCosts+=paid;
    const completed=contractSystem.update(state,dt);let dirty=false;
    for(const m of completed){this.log(`${CONFIG.contractTypes[m.typeIndex].name} voltooid. ${Utils.money(m.reward)} ontvangen; ${Utils.money(m.reward-m.cost)} contractwinst.`,'success');this.ui?.toast(`Contract voltooid: +${Utils.money(m.reward)}`);dirty=true;}
    const level=Utils.level(state.totalMoneyEarned);if(level!==state.level){state.level=level;this.log(`Bedrijfslevel ${level} bereikt: ${CONFIG.levelNames[level-1]}.`,'success');this.ui?.toast(`Level ${level}: ${CONFIG.levelNames[level-1]}`);dirty=true;}
    if(state.money<=0&&!this.bankrupt){this.bankrupt=true;this.log('Je saldo is leeg. Lopende contracten worden afgemaakt. Onderhoud bouwt geen schuld op.','warning');this.ui?.toast('Geen geld meer. Rond je lopende contracten af.');dirty=true;}else if(state.money>1)this.bankrupt=false;
    if(dirty)this.changed();
  }
  log(message,type='info'){this.state.log.push({message,type,time:this.state.playTime});this.state.log=this.state.log.slice(-100);}
  changed(){this.ui?.render();this.save();}
  save(){const success=saveSystem.save(this.state);if(this.ui){document.getElementById('saveStatus').textContent=success?'Opgeslagen op dit apparaat':'Opslaan niet mogelijk in deze browser';}return success;}
  accept(id,satelliteId){const result=contractSystem.accept(this.state,id,satelliteId);if(result.error){this.ui?.toast(result.error,true);return false;}const m=result.mission;this.log(`Contract gestart: ${CONFIG.contractTypes[m.typeIndex].name}. Startkosten: ${Utils.money(m.cost)}.`);this.changed();this.ui?.toast('Contract gestart. Je satelliet is aan het werk.');return true;}
  buySatellite(type){const def=CONFIG.satelliteTypes[type];if(!def||this.state.money<def.price){this.ui?.toast('Onvoldoende geld voor deze satelliet.',true);return false;}this.state.money-=def.price;this.state.totalCosts+=def.price;const sat=satelliteSystem.create(this.state,type);this.state.satellites.push(sat);this.log(`${sat.name} gelanceerd voor ${Utils.money(def.price)}.`,'success');this.changed();this.ui?.toast(`${sat.name} is toegevoegd aan je vloot.`);return true;}
  buyUpgrade(key){const result=upgradeSystem.buy(this.state,key);if(result.error){this.ui?.toast(result.error,true);return false;}this.state.totalCosts+=result.info.cost;this.log(`${result.info.name} verbeterd naar niveau ${this.state.upgrades[key]}.`,'success');this.changed();this.ui?.toast('Verbetering toegepast op je vloot.');return true;}
  repair(id){const sat=this.state.satellites.find(s=>s.id===id);if(!sat)return false;if(sat.activeContract!==null){this.ui?.toast('Wacht tot het contract is afgerond.',true);return false;}const cost=satelliteSystem.repairCost(sat);if(this.state.money<cost){this.ui?.toast('Onvoldoende geld voor reparatie.',true);return false;}this.state.money-=cost;this.state.totalCosts+=cost;sat.health=100;this.log(`${sat.name} gerepareerd voor ${Utils.money(cost)}.`,'success');this.changed();return true;}
  refresh(countryId=null){const now=Date.now();if(now<this.refreshAt){this.ui?.toast('Wacht even voordat je opnieuw contracten zoekt.',true);return false;}contractSystem.generate(this.state,countryId);this.refreshAt=now+3000;this.log(countryId?`Nieuw aanbod in ${Utils.country(countryId)?.properties.name||'dit land'}.`:'Nieuw wereldwijd contractaanbod ontvangen.');this.changed();return true;}
  togglePause(){this.state.paused=!this.state.paused;this.lastFrame=performance.now();this.ui?.updateLive();this.save();}
  toggleSpeed(){this.state.speed=this.state.speed===1?3:1;this.ui?.updateLive();this.save();}
  newGame(){this.state=saveSystem.fresh();this.state.satellites.push(satelliteSystem.create(this.state,'Scout-1'));contractSystem.generate(this.state);this.bankrupt=false;this.refreshAt=0;this.log('Nieuw bedrijf gestart. Scout-1 staat klaar.');if(this.ui)this.ui.countryId=null;this.map?.reset();this.changed();this.ui?.navigate('operations');}
}
const game=new Game();
window.addEventListener('DOMContentLoaded',()=>game.init());
