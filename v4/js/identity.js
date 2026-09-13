'use strict';
const identitySystem={
  key:'orbitalPact_identity_v1',
  cleanName(value){return String(value||'').replace(/[^a-zA-Z0-9 _.-]/g,'').trim().slice(0,20);},
  anon(){let n='';try{n=localStorage.getItem(this.key);}catch(e){}if(n){try{const p=JSON.parse(n);if(p?.name)return p;}catch(e){}}const profile={id:`guest-${Math.random().toString(36).slice(2,10)}`,name:`Anon${String(Math.floor(Math.random()*10000)).padStart(4,'0')}`,guest:true,createdAt:Date.now()};this.save(profile);return profile;},
  load(){try{const raw=localStorage.getItem(this.key);if(raw){const p=JSON.parse(raw);if(p&&this.cleanName(p.name))return {...p,name:this.cleanName(p.name)};}}catch(e){}return this.anon();},
  save(profile){try{localStorage.setItem(this.key,JSON.stringify(profile));return true;}catch(e){return false;}},
  rename(profile,name){const clean=this.cleanName(name);if(clean.length<3)return {error:'Name must be at least 3 characters.'};const next={...profile,name:clean};this.save(next);return {success:true,profile:next};},
  localAccount(profile,name){const clean=this.cleanName(name);if(clean.length<3)return {error:'Choose a name of at least 3 characters.'};const next={...profile,id:`local-${Math.random().toString(36).slice(2,12)}`,name:clean,guest:false,localOnly:true};this.save(next);return {success:true,profile:next};}
};
