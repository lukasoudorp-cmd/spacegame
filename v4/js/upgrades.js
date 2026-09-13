'use strict';
const upgradeSystem = {
  info(state,key){const def=CONFIG.upgradeTypes[key];if(!def)return null;const level=state.upgrades[key];return {...def,key,level,cost:Math.round(def.baseCost*1.5**level),researchCost:def.research*(level+1)};},
  buy(state,key){const info=this.info(state,key);if(!info)return {error:'Deze verbetering bestaat niet.'};if(info.level>=info.max)return {error:'Het maximale niveau is bereikt.'};if(state.money<info.cost)return {error:'Je hebt onvoldoende geld.'};if(state.research<info.researchCost)return {error:'Voltooi contracten om onderzoekspunten te verdienen.'};state.money-=info.cost;state.research-=info.researchCost;state.upgrades[key]++;return {success:true,info};}
};
