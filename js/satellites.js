'use strict';
const satelliteSystem = {
  create(state,type) {
    if(!CONFIG.satelliteTypes[type])throw new Error('Unknown satellite type');
    const id=state.nextSatelliteId++;
    return {id,type,name:`${type} / ${String(id).padStart(2,'0')}`,health:100,activeContract:null,age:0,phase:(id*.61803398875)%1};
  },
  stats(state,sat) {
    const def=CONFIG.satelliteTypes[sat.type],u=state.upgrades;
    return {...def,health:sat.health,coverage:Math.min(100,def.coverage+u.coverage*5),efficiency:Math.min(1,def.efficiency+u.efficiency*.04),maintenance:def.maintenance*(1-u.efficiency*.1)};
  },
  available(state,quality=1) {return state.satellites.filter(s=>s.activeContract===null&&s.health>0&&CONFIG.satelliteTypes[s.type].quality>=quality);},
  monthlyCost(state) {return state.satellites.reduce((sum,s)=>sum+this.stats(state,s).maintenance,0);},
  update(state,dt) {
    for(const s of state.satellites){s.age+=dt;s.health=Math.max(0,s.health-dt/CONFIG.dayMs*(s.activeContract!==null?.3:.08)/(1+state.upgrades.reliability*.4));}
    return this.monthlyCost(state)*dt/CONFIG.monthMs;
  },
  repairCost(sat){return Math.ceil((100-sat.health)*CONFIG.satelliteTypes[sat.type].price*.001);},
  position(sat,time){const angle=(sat.phase+time/180000)*Math.PI*2;return [((angle*180/Math.PI+180)%360)-180,Math.sin(angle+sat.id)* (38+(sat.id%4)*9)];}
};

