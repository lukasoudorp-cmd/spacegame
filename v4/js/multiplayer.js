'use strict';
const multiplayerSystem={
  key:'orbitalPact_lobbies_v1',
  defaults(){return {difficulty:'normal',maxPlayers:6,startMoney:100000,fog:true,alliances:true,sabotage:true,pace:'standard'};},
  seed(){return [
    {id:'pub-orbit-71',name:'Orbital Rush',host:'NovaPrime',players:3,maxPlayers:6,difficulty:'normal',pace:'standard',status:'open',ping:34},
    {id:'pub-luna-24',name:'Lunar Economy',host:'AstroFox',players:2,maxPlayers:4,difficulty:'hard',pace:'slow',status:'open',ping:48},
    {id:'pub-sky-09',name:'Fast Launch',host:'Vector',players:5,maxPlayers:8,difficulty:'easy',pace:'fast',status:'open',ping:28}
  ];},
  load(){try{const raw=localStorage.getItem(this.key);const list=raw?JSON.parse(raw):[];return [...list.filter(l=>l&&l.status==='open'),...this.seed()];}catch(e){return this.seed();}},
  saveLocal(list){try{localStorage.setItem(this.key,JSON.stringify(list.filter(l=>l.local)));}catch(e){}},
  create(profile,settings={}){const opts={...this.defaults(),...settings};const lobby={id:`local-${Math.random().toString(36).slice(2,8)}`,name:`${profile.name}'s Orbit`,host:profile.name,hostId:profile.id,players:1,maxPlayers:Number(opts.maxPlayers)||6,difficulty:opts.difficulty,pace:opts.pace,fog:Boolean(opts.fog),alliances:Boolean(opts.alliances),sabotage:Boolean(opts.sabotage),startMoney:Number(opts.startMoney)||100000,status:'open',local:true,createdAt:Date.now()};const local=this.load().filter(l=>l.local);local.unshift(lobby);this.saveLocal(local);return lobby;},
  quickJoin(profile){const lobby=this.load().filter(l=>l.status==='open'&&l.players<l.maxPlayers).sort((a,b)=>b.players-a.players||a.ping-b.ping)[0];return lobby?this.join(lobby,profile):null;},
  join(lobby,profile){return {...lobby,players:Math.min(lobby.maxPlayers,lobby.players+1),members:[lobby.host,profile.name,...Array.from({length:Math.max(0,Math.min(lobby.maxPlayers,lobby.players+1)-2)},(_,i)=>`Anon${String((i*173+41)%10000).padStart(4,'0')}`)]};},
  difficultyLabel(v){return ({easy:'Easy',normal:'Normal',hard:'Hard',expert:'Expert'})[v]||'Normal';}
};
