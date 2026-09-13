'use strict';
const backend={
  configured(){return Boolean(window.ORBITAL_CONFIG?.supabaseUrl&&window.ORBITAL_CONFIG?.supabaseAnonKey);},
  mode(){return this.configured()?'Supabase ready':'Local demo';},
  async health(){if(!this.configured())return {ok:false,local:true};try{const r=await fetch(`${window.ORBITAL_CONFIG.supabaseUrl}/rest/v1/`,{headers:{apikey:window.ORBITAL_CONFIG.supabaseAnonKey}});return {ok:r.ok};}catch(e){return {ok:false,error:String(e)}}}
};
