'use strict';
class CloudSaveSystem {
  constructor(config) {
    this.config=config;this.storageKey='orbitPact_cloud_connection';this.connection=null;this.busy=false;
    try{const saved=JSON.parse(localStorage.getItem(this.storageKey)||'null');if(saved&&this.validCode(saved.code)&&Number.isSafeInteger(saved.revision)&&saved.revision>=0)this.connection=saved;}catch(e){}
  }
  validCode(code){return typeof code==='string'&&/^[a-f0-9]{64}$/.test(code);}
  normalizeCode(code){return String(code).trim().toLowerCase().replace(/[\s-]/g,'');}
  remember(connection){
    if(connection)localStorage.setItem(this.storageKey,JSON.stringify(connection));else localStorage.removeItem(this.storageKey);
    this.connection=connection;
  }
  async request(name,args){
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
    try{
      const response=await fetch(`${this.config.url}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:this.config.publishableKey,'Content-Type':'application/json'},body:JSON.stringify(args),signal:controller.signal});
      const data=await response.json();
      if(!response.ok){const error=new Error(data.message||'The cloud save could not be reached.');error.code=data.code;throw error;}
      return data;
    }catch(e){
      if(e.name==='AbortError')throw new Error('The connection timed out. Your local progress is still saved.');
      if(e instanceof TypeError)throw new Error('Could not connect. Check your internet connection and try again.');
      throw e;
    }finally{clearTimeout(timeout);}
  }
  async create(state){
    if(this.connection)throw new Error('This device already has a cloud save.');
    const bytes=new Uint8Array(32);crypto.getRandomValues(bytes);
    const code=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
    // Retain the recovery code before the first network request, including timeouts.
    this.remember({code,revision:0,updatedAt:null});
    return this.upload(state);
  }
  async upload(state){
    if(this.busy)throw new Error('Wait for the current cloud action to finish.');
    if(!this.connection)throw new Error('Create a cloud save or enter your recovery code first.');
    this.busy=true;
    const connection=this.connection;
    try{
      const snapshot=saveSystem.validate(JSON.parse(JSON.stringify(state)));
      const result=await this.request('orbit_pact_store_save',{p_code:connection.code,p_state:snapshot,p_revision:connection.revision});
      if(!result||!Number.isSafeInteger(result.revision)||result.revision<1)throw new Error('The cloud returned an invalid save response.');
      this.remember({...connection,revision:result.revision,updatedAt:result.updated_at});return result;
    }finally{this.busy=false;}
  }
  async read(code=this.connection?.code){
    if(this.busy)throw new Error('Wait for the current cloud action to finish.');
    code=this.normalizeCode(code);if(!this.validCode(code))throw new Error('Enter the full 64-character recovery code.');
    this.busy=true;
    try{
      const result=await this.request('orbit_pact_load_save',{p_code:code});
      if(!result)throw new Error('No cloud save was found for this code.');
      if(!Number.isSafeInteger(result.revision)||result.revision<1)throw new Error('The cloud returned an invalid save response.');
      return {connection:{code,revision:result.revision,updatedAt:result.updated_at},state:saveSystem.parseImport(JSON.stringify(result.state))};
    }finally{this.busy=false;}
  }
  loadIntoGame(game,snapshot){
    const previous=this.connection;this.remember(snapshot.connection);
    if(game.importSave(snapshot.state))return true;
    this.remember(previous);return false;
  }
}
const cloudSystem=new CloudSaveSystem(CLOUD_CONFIG);
