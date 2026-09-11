'use strict';
const contractSystem = {
  create(state,countryId,index=0) {
    const countries=WORLD_DATA.features.filter(f=>f.properties.region!=='Antarctica');
    const country=Utils.country(countryId)||countries[Math.floor(Math.random()*countries.length)];
    const typeIndex=Math.floor(Math.random()*CONFIG.contractTypes.length),t=CONFIG.contractTypes[typeIndex];
    // Always include beginner contracts, even after the company levels up.
    const quality=index%3===0?1:Math.min(3,Math.max(1,state.level-1));
    const factor=1+quality*.5;
    return {id:state.nextContractId++,typeIndex,countryId:country.id,requiredQuality:quality,baseReward:Math.round(t.reward*factor),baseCost:Math.round(t.cost*(1+quality*.3)),baseDuration:(75+quality*30)*1000,reputation:t.rep+quality};
  },
  generate(state,countryId=null){state.offers=Array.from({length:5},(_,i)=>this.create(state,countryId,i));},
  quote(state,offer,satellite=null){const efficiency=satellite?satelliteSystem.stats(state,satellite).efficiency:.8;return {reward:Math.round(offer.baseReward*(1+state.upgrades.resolution*.1+state.upgrades.coverage*.03)),cost:Math.round(offer.baseCost*(1-state.upgrades.communication*.08)),duration:Math.round(offer.baseDuration*(1-state.upgrades.processing*.08)*(.8/efficiency))};},
  accept(state,id,satelliteId){
    const offer=state.offers.find(c=>c.id===id);if(!offer)return {error:'This contract is no longer available.'};
    const sat=satelliteSystem.available(state,offer.requiredQuality).find(s=>s.id===satelliteId);if(!sat)return {error:'Choose an available satellite of the required class.'};
    const quote=this.quote(state,offer,sat);if(state.money<quote.cost)return {error:'Not enough funds for the start cost.'};
    const mission={...offer,...quote,satelliteId:sat.id,elapsed:0};
    state.money-=quote.cost;state.totalCosts+=quote.cost;sat.activeContract=offer.id;
    state.activeContracts.push(mission);state.offers=state.offers.filter(c=>c.id!==id);
    return {success:true,mission};
  },
  update(state,dt){
    const completed=[];
    for(const mission of state.activeContracts){mission.elapsed=Math.min(mission.duration,mission.elapsed+dt);if(mission.elapsed>=mission.duration)completed.push(mission);}
    const done=new Set(completed.map(c=>c.id));
    state.activeContracts=state.activeContracts.filter(c=>!done.has(c.id));
    for(const m of completed){state.money+=m.reward;state.totalMoneyEarned+=m.reward;state.reputation+=m.reputation;state.research+=m.reputation*2;state.completedContracts++;const sat=state.satellites.find(s=>s.id===m.satelliteId);if(sat)sat.activeContract=null;state.history.unshift({id:m.id,typeIndex:m.typeIndex,countryId:m.countryId,reward:m.reward,profit:m.reward-m.cost,time:state.playTime});}
    state.history=state.history.slice(0,30);return completed;
  }
};

