'use strict';
const eventSystem={
  ensure(state){if(!state.worldEvents)state.worldEvents=[];if(!Number.isFinite(state.nextEventAt))state.nextEventAt=90000;},
  update(state){this.ensure(state);if(state.playTime<state.nextEventAt)return null;const events=[
    {title:'Launch window',text:'A shared launch opens a cheaper route to orbit.',effect:'money',value:8000},
    {title:'Research breakthrough',text:'A partner lab shares new processing methods.',effect:'research',value:6},
    {title:'Solar storm',text:'A solar storm forces extra shielding checks.',effect:'money',value:-5000},
    {title:'Data demand spike',text:'Earth observation demand rises across several regions.',effect:'reputation',value:3}
  ];const ev={...events[Math.floor(Math.random()*events.length)],id:`ev-${Math.floor(state.playTime)}`,time:state.playTime};
    if(ev.effect==='money')state.money=Math.max(0,state.money+ev.value);if(ev.effect==='research')state.research+=ev.value;if(ev.effect==='reputation')state.reputation+=ev.value;
    state.worldEvents.unshift(ev);state.worldEvents=state.worldEvents.slice(0,8);state.nextEventAt=state.playTime+90000+Math.random()*90000;return ev;
  }
};
