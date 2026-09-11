'use strict';
const objectiveSystem = {
  value(state,objective) {
    switch(objective.metric) {
      case 'contracts': return state.completedContracts;
      case 'fleet': return state.satellites.length;
      case 'upgrades': return Object.values(state.upgrades).reduce((sum,level)=>sum+level,0);
      case 'countries': return state.servedCountries.length;
      default: return 0;
    }
  },
  info(state,objective) {
    const value=this.value(state,objective),claimed=state.claimedObjectives.includes(objective.id);
    return {...objective,value,claimed,ready:!claimed&&value>=objective.target,percent:Utils.clamp(value/objective.target*100,0,100)};
  },
  all(state) {return CONFIG.objectives.map(objective=>this.info(state,objective));},
  next(state) {const goals=this.all(state);return goals.find(g=>g.ready)||goals.find(g=>!g.claimed)||null;},
  claim(state,id) {
    const objective=CONFIG.objectives.find(g=>g.id===id);
    if(!objective)return {error:'This objective does not exist.'};
    const info=this.info(state,objective);
    if(info.claimed)return {error:'This reward has already been claimed.'};
    if(!info.ready)return {error:'Finish the objective before claiming its reward.'};
    state.claimedObjectives.push(id);
    state.money+=info.money;state.research+=info.research;
    return {success:true,objective:info};
  }
};
