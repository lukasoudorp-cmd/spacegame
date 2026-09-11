'use strict';
const upgradeSystem = {
  info(state,key){const def=CONFIG.upgradeTypes[key];if(!def)return null;const level=state.upgrades[key];return {...def,key,level,cost:Math.round(def.baseCost*1.5**level),researchCost:def.research*(level+1)};},
  buy(state,key){const info=this.info(state,key);if(!info)return {error:'This upgrade does not exist.'};if(info.level>=info.max)return {error:'The maximum level has been reached.'};if(state.money<info.cost)return {error:'You do not have enough funds.'};if(state.research<info.researchCost)return {error:'Complete contracts to earn research points.'};state.money-=info.cost;state.research-=info.researchCost;state.upgrades[key]++;return {success:true,info};}
};

