'use strict';
const ICON_PATHS={
  globe:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  satellite:'<path d="m9 7 8 8-4 4-8-8zM5 3l4 4-4 4-4-4zm14 10 4 4-4 4-4-4zM13 11l4-4m-3-3a7 7 0 0 1 7 7m-7-3a3 3 0 0 1 3 3"/>',
  briefcase:'<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V4h8v3M3 12l9 3 9-3M12 12v5"/>',
  layers:'<path d="m12 3 10 5-10 5L2 8zm-9 9 9 5 9-5M3 17l9 5 9-5"/>',
  chart:'<path d="M4 3v18h18M9 17v-5m5 5V7m5 10V4"/>',
  activity:'<path d="M2 12h4l3-8 5 16 3-8h5"/>',
  radar:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="m12 12 7-7"/><circle cx="12" cy="12" r="1"/>',
  focus:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/><circle cx="12" cy="12" r="3"/>',
  trend:'<path d="m3 17 6-6 4 4 8-11M15 4h6v6"/>',
  shield:'<path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6zM8 12l3 3 5-6"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5m0 3h.01"/>',
  pause:'<path d="M8 5v14M16 5v14"/>',
  play:'<path d="m8 4 12 8-12 8z"/>',
  refresh:'<path d="M20 10a8 8 0 0 0-14-5L3 8m0-5v5h5M4 14a8 8 0 0 0 14 5l3-3m0 5v-5h-5"/>',
  cloud:'<path d="M6 18a4 4 0 0 1-1-8 7 7 0 0 1 13-1 4.5 4.5 0 0 1 0 9z"/>',
  bolt:'<path d="m13 2-9 12h7l-1 8 10-13h-7z"/>',
  check:'<path d="m4 12 5 5L20 6"/>',
  arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>'
};
const icon=name=>`<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name]||ICON_PATHS.globe}</svg>`;
class UISystem{
  constructor(game){this.game=game;this.page='operations';this.countryId=null;this.dialog=document.getElementById('detailDialog');this.openOffer=null;}
  get state(){return this.game.state;}
  init(){
    document.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));
    document.querySelectorAll('.nav-button').forEach(el=>{const label=el.textContent.trim().replace(/\d+$/,'').trim();el.title=label;el.setAttribute('aria-label',label);if(el.dataset.page===this.page)el.setAttribute('aria-current','page');});
    const select=document.getElementById('countrySelect');
    WORLD_DATA.features.filter(f=>f.properties.region!=='Antarctica').sort((a,b)=>a.properties.name.localeCompare(b.properties.name,'en')).forEach(f=>{const o=document.createElement('option');o.value=f.id;o.textContent=f.properties.name;select.appendChild(o);});
    select.addEventListener('change',()=>this.selectCountry(select.value||null));
    document.addEventListener('click',e=>{
      const nav=e.target.closest('[data-page]');if(nav){this.navigate(nav.dataset.page);return;}
      const button=e.target.closest('[data-action]');if(!button||button.disabled)return;const id=Number(button.dataset.id);
      switch(button.dataset.action){case'offer':this.showContract(id);break;case'buy':this.game.buySatellite(button.dataset.type);break;case'upgrade':this.game.buyUpgrade(button.dataset.key);break;case'repair':this.game.repair(id);break;case'satellite':this.showSatellite(id);break;case'country':this.navigate('operations');this.selectCountry(button.dataset.country);break;}
    });
    const bind=(id,fn)=>document.getElementById(id).addEventListener('click',fn);
    bind('refreshContracts',()=>this.game.refresh());bind('refreshMapOffers',()=>this.game.refresh(this.countryId));
    bind('pauseButton',()=>this.game.togglePause());bind('speedButton',()=>this.game.toggleSpeed());
    bind('globeButton',()=>this.game.map.setMode('globe'));bind('flatButton',()=>this.game.map.setMode('flat'));
    bind('zoomIn',()=>this.game.map.changeZoom(1.2));bind('zoomOut',()=>this.game.map.changeZoom(1/1.2));bind('resetMap',()=>this.game.map.reset());
    bind('closeDialog',()=>this.dialog.close());this.dialog.addEventListener('click',e=>{if(e.target===this.dialog){const r=this.dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)this.dialog.close();}});
    this.dialog.addEventListener('close',()=>{this.openOffer=null;});bind('helpButton',()=>this.showHelp());bind('newGameButton',()=>this.confirmNewGame());
    bind('saveButton',()=>{const success=this.game.save();this.toast(success?'Your progress has been saved.':'Your browser cannot save your progress.',!success);});
    bind('clearLogButton',()=>{this.state.log=[];this.game.log('Activity log cleared.');this.game.changed();});
    document.querySelector('.brand').addEventListener('click',e=>{e.preventDefault();this.navigate('operations');});
  }
  navigate(page){
    const copy={operations:['Mission control','ORBITAL OPERATIONS','The world within reach.','Choose a contract. Put your satellite to work.'],contracts:['Contracts','CONTRACT NETWORK','Your next mission.','Deliver data, earn money and build your reputation.'],fleet:['My fleet','FLEET MANAGEMENT','Ready to expand your orbit.','Manage your satellites and expand your capacity.'],upgrades:['Research','TECHNOLOGY & DEVELOPMENT','Improve every mission.','Invest your research points in your entire fleet.'],company:['Company','COMPANY OVERVIEW','From first launch to global operator.','View your results and your next milestone.'],log:['Activity log','OPERATION HISTORY','Your activity at a glance.','Launches, contracts and company developments.']};
    if(!copy[page])return;this.page=page;const [label,eyebrow,title,description]=copy[page];
    for(const [id,text]of Object.entries({pageLabel:label,pageEyebrow:eyebrow,pageTitle:title,pageDescription:description}))document.getElementById(id).textContent=text;
    document.querySelectorAll('.page').forEach(el=>{const active=el.id===`page-${page}`;el.hidden=!active;el.classList.toggle('active',active);});
    document.querySelectorAll('.nav-button').forEach(el=>{el.classList.toggle('active',el.dataset.page===page);if(el.dataset.page===page)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');el.title=copy[el.dataset.page][0];el.setAttribute('aria-label',copy[el.dataset.page][0]);});
    this.render();if(page==='operations')this.game.map?.resize();window.scrollTo({top:0,behavior:'instant'});
  }
  selectCountry(id,focus=true){this.countryId=Utils.country(id)?id:null;document.getElementById('countrySelect').value=this.countryId||'';this.game.map?.select(this.countryId,focus);this.renderMapOffers();}
  render(){
    const focused=document.activeElement,focusData=focused?.dataset.action?{...focused.dataset}:null;
    this.renderMapOffers();this.renderActive('activeMissions');this.renderActive('contractsActive');
    if(this.page==='contracts')this.renderContracts();if(this.page==='fleet')this.renderFleet();if(this.page==='upgrades')this.renderUpgrades();if(this.page==='company')this.renderCompany();if(this.page==='log')this.renderLog();
    this.updateLive();
    if(focusData&&!document.contains(focused)){const buttons=Array.from(document.querySelectorAll('[data-action]'));const match=buttons.find(b=>Object.entries(focusData).every(([k,v])=>b.dataset[k]===v));if(match&&!match.disabled)match.focus({preventScroll:true});}
  }
  renderMapOffers(){
    const country=Utils.country(this.countryId);document.getElementById('regionTitle').textContent=country?.properties.name||'Worldwide';
    const offers=this.state.offers.filter(c=>!this.countryId||c.countryId===this.countryId).slice(0,3);
    document.getElementById('mapOffers').innerHTML=offers.length?offers.map(c=>{const t=CONFIG.contractTypes[c.typeIndex],q=contractSystem.quote(this.state,c);return `<button class="rail-card" data-action="offer" data-id="${c.id}"><span class="contract-icon">${icon(t.icon)}</span><div><h3>${Utils.escape(t.name)}</h3><p>${Utils.escape(Utils.country(c.countryId).properties.name)} · Class ${c.requiredQuality}</p><div class="rail-reward"><strong>+ ${Utils.money(q.reward-q.cost)}</strong><span>${Utils.time(q.duration)} MIN</span></div></div></button>`;}).join(''):`<p class="rail-empty">${country?'No contracts in this country yet. Find new offers using the button below.':'You have accepted all assignments. Find new contracts or finish your missions.'}</p>`;
  }
  renderContracts(){
    document.getElementById('contractsList').innerHTML=this.state.offers.length?this.state.offers.map(c=>{
      const t=CONFIG.contractTypes[c.typeIndex],q=contractSystem.quote(this.state,c);return `<article class="card"><div class="card-head"><span class="card-icon">${icon(t.icon)}</span><span class="badge">CLASS ${c.requiredQuality}</span></div><h3>${Utils.escape(t.name)}</h3><p class="location">${Utils.escape(Utils.country(c.countryId).properties.name)} · ${t.client}</p><p class="description">${t.description}</p><div class="reward">${Utils.money(q.reward-q.cost)}</div><p class="reward-label">Contract profit, excluding fleet maintenance</p><div class="card-stats"><div class="card-stat"><span>Start cost</span><strong>${Utils.money(q.cost)}</strong></div><div class="card-stat"><span>Estimated duration</span><strong>${Utils.time(q.duration)}</strong></div><div class="card-stat"><span>Reputation / research</span><strong>+${c.reputation} / +${c.reputation*2}</strong></div></div><button class="outline-button full" data-action="offer" data-id="${c.id}">View contract ${icon('arrow')}</button></article>`;
    }).join(''):'<div class="empty-state"><div><h3>All contracts have been accepted.</h3><p>Refresh offers to find more assignments.</p></div></div>';
  }
  renderActive(id){
    const container=document.getElementById(id);container.innerHTML=this.state.activeContracts.length?this.state.activeContracts.map(c=>{
      const t=CONFIG.contractTypes[c.typeIndex],sat=this.state.satellites.find(s=>s.id===c.satelliteId);return `<article class="mission-row">${icon(t.icon)}<div><h3>${Utils.escape(t.name)}</h3><p>${Utils.escape(Utils.country(c.countryId).properties.name)} · ${Utils.escape(sat?.name||'Satellite')}</p></div><div class="mission-progress"><div class="progress-meta"><span data-remaining="${c.id}"></span><span data-percent="${c.id}"></span></div><div class="progress" role="progressbar" aria-label="Progress ${Utils.escape(t.name)}" aria-valuemin="0" aria-valuemax="100" data-progress="${c.id}"><span></span></div></div><div class="mission-value">+${Utils.money(c.reward)}<small>on completion</small></div></article>`;
    }).join(''):`<div class="empty-state">${icon('radar')}<div><h3>Your next mission starts here.</h3><p>Accept a contract to put your satellite to work.</p></div><button class="outline-button" data-page="contracts">Choose a contract ${icon('arrow')}</button></div>`;
  }
  renderFleet(){
    const state=this.state;document.getElementById('fleetCount').textContent=`${state.satellites.length} satellite${state.satellites.length===1?'':'s'} in Earth orbit`;
    document.getElementById('satellitesList').innerHTML=state.satellites.map(s=>{
      const stats=satelliteSystem.stats(state,s),busy=s.activeContract!==null;return `<article class="card"><div class="card-head"><span class="card-icon" style="color:${stats.color}">${icon('satellite')}</span><span class="badge ${busy?'green':''}">${busy?'ON MISSION':'AVAILABLE'}</span></div><h3>${Utils.escape(s.name)}</h3><p class="location">Class ${stats.quality} · ${stats.role.toLowerCase()}</p><div class="card-stats"><div class="card-stat"><span>Condition</span><strong data-health="${s.id}">${s.health.toFixed(1)}%</strong></div><div class="progress"><span data-health-bar="${s.id}" style="width:${s.health}%"></span></div><div class="card-stat"><span>Efficiency</span><strong>${Math.round(stats.efficiency*100)}%</strong></div><div class="card-stat"><span>Coverage</span><strong>${stats.coverage}%</strong></div><div class="card-stat"><span>Maintenance / game month</span><strong>${Utils.money(stats.maintenance)}</strong></div></div><div class="card-actions"><button class="outline-button" data-action="satellite" data-id="${s.id}">Details</button><button class="outline-button" data-action="repair" data-id="${s.id}">Repair</button></div></article>`;
    }).join('');
    document.getElementById('shopList').innerHTML=Object.entries(CONFIG.satelliteTypes).map(([key,s])=>`<article class="card"><div class="hardware-header"><div style="color:${s.color}">${icon('satellite')}</div><div class="eyebrow">${s.role} / CLASS ${s.quality}</div><h3>${s.name}</h3><p>${s.description}</p></div><div class="card-stats"><div class="card-stat"><span>Base coverage</span><strong>${s.coverage}%</strong></div><div class="card-stat"><span>Base efficiency</span><strong>${Math.round(s.efficiency*100)}%</strong></div><div class="card-stat"><span>Base maintenance / month</span><strong>${Utils.money(s.maintenance)}</strong></div></div><div class="reward" style="color:${s.color}">${Utils.money(s.price)}</div><p class="reward-label">Purchase includes launch</p><div class="card-actions"><button class="primary-button" data-action="buy" data-type="${key}" data-price="${s.price}">Buy & launch ${icon('arrow')}</button></div></article>`).join('');
  }
  renderUpgrades(){
    document.getElementById('upgradesList').innerHTML=Object.keys(CONFIG.upgradeTypes).map(key=>{
      const u=upgradeSystem.info(this.state,key);return `<article class="card"><div class="card-head"><span class="card-icon">${icon(u.icon)}</span><span class="badge">LEVEL ${u.level} / ${u.max}</span></div><h3>${u.name}</h3><p class="description">${u.description}</p><div class="upgrade-levels">${Array.from({length:u.max},(_,i)=>`<span class="${i<u.level?'filled':''}"></span>`).join('')}</div><div class="card-stats"><div class="card-stat"><span>Investment</span><strong>${u.level===u.max?'Complete':Utils.money(u.cost)}</strong></div><div class="card-stat"><span>Research points</span><strong class="cyan">${u.level===u.max?'Complete':`${u.researchCost} ◇`}</strong></div></div><button class="${u.level===u.max?'outline-button':'primary-button'} full" data-action="upgrade" data-key="${key}" data-price="${u.cost}" data-research="${u.researchCost}" ${u.level===u.max?'data-maxed="true" disabled':''}>${u.level===u.max?'Fully upgraded':'Develop upgrade'} ${icon(u.level===u.max?'check':'arrow')}</button></article>`;
    }).join('');
  }
  renderCompany(){
    const s=this.state,p=Utils.progress(s);document.getElementById('companyOverview').innerHTML=`<div class="company-hero"><p class="eyebrow">ORBIT PACT / LEVEL ${s.level}</p><h2>${CONFIG.levelNames[s.level-1]}</h2><p>${s.level===5?'You have reached the highest company rank. Keep expanding your fleet.':`Earn another ${Utils.money(p.remaining)} in contract rewards to reach level ${s.level+1}.`}</p><div class="progress"><span style="width:${p.percent}%"></span></div><div class="progress-meta"><span>${Utils.money(s.totalMoneyEarned)} total revenue</span><span>${p.percent.toFixed(0)}%</span></div></div><div class="metrics-grid"><div class="metric"><div><span>Total contract revenue</span><strong>${Utils.money(s.totalMoneyEarned)}</strong></div></div><div class="metric"><div><span>Total spending</span><strong id="totalCosts">${Utils.money(s.totalCosts)}</strong></div></div><div class="metric"><div><span>Contracts completed</span><strong>${s.completedContracts}</strong></div></div><div class="metric"><div><span>Play time</span><strong id="companyPlayTime">${Utils.clock(s.playTime)}</strong></div></div></div><div class="section-heading"><h2>Recently completed contracts</h2></div><div class="panel log-list">${s.history.length?s.history.slice(0,8).map(m=>`<div class="log-entry success"><time>${Utils.clock(m.time)}</time><span>${CONFIG.contractTypes[m.typeIndex].name} · ${Utils.escape(Utils.country(m.countryId).properties.name)} · ${Utils.money(m.profit)} profit</span></div>`).join(''):'<div class="log-entry"><span class="subtle">Complete your first contract to see your results here.</span></div>'}</div>`;
  }
  renderLog(){document.getElementById('logList').innerHTML=this.state.log.slice().reverse().map(l=>`<div class="log-entry ${l.type}"><time>${Utils.clock(l.time)}</time><span>${Utils.escape(l.message)}</span></div>`).join('')||'<div class="log-entry">No activity yet.</div>';}
  updateLive(){
    const s=this.state,p=Utils.progress(s);const set=(id,text)=>{const el=document.getElementById(id);if(el&&el.textContent!==String(text))el.textContent=text;};
    set('moneyDisplay',Utils.money(s.money));set('reputationDisplay',s.reputation);set('researchDisplay',s.research);set('missionClock',Utils.clock(s.playTime));set('activeCount',s.activeContracts.length);set('runningBadge',s.activeContracts.length);set('expectedProfit',Utils.money(s.activeContracts.reduce((sum,c)=>sum+c.reward-c.cost,0)));set('maintenanceDisplay',Utils.money(satelliteSystem.monthlyCost(s)));set('navOfferCount',s.offers.length);set('sidebarLevel',`Level ${s.level} · ${CONFIG.levelNames[s.level-1]}`);set('nextLevelHint',s.level===5?'Highest company level reached':`${Utils.money(p.remaining)} to level ${s.level+1}`);set('systemStatus',s.paused?'SIMULATION PAUSED':'SYSTEMS OPERATIONAL');set('companyPlayTime',Utils.clock(s.playTime));set('totalCosts',Utils.money(s.totalCosts));
    document.getElementById('sidebarProgress').style.width=p.percent+'%';document.getElementById('systemDot').style.background=s.paused?'var(--amber)':'var(--mint)';
    const free=satelliteSystem.available(s).length;document.getElementById('freeSatellites').innerHTML=`${free} <small>/ ${s.satellites.length}</small>`;
    const pause=document.getElementById('pauseButton');if(pause.dataset.paused!==String(s.paused)){pause.innerHTML=icon(s.paused?'play':'pause');pause.dataset.paused=s.paused;pause.setAttribute('aria-label',s.paused?'Resume game':'Pause game');pause.title=s.paused?'Resume':'Pause';}set('speedButton',s.speed+'×');
    for(const c of s.activeContracts){const progress=Utils.clamp(c.elapsed/c.duration*100,0,100);document.querySelectorAll(`[data-remaining="${c.id}"]`).forEach(el=>el.textContent=Utils.time(c.duration-c.elapsed)+' remaining');document.querySelectorAll(`[data-percent="${c.id}"]`).forEach(el=>el.textContent=progress.toFixed(0)+'%');document.querySelectorAll(`[data-progress="${c.id}"]`).forEach(el=>{el.firstElementChild.style.width=progress+'%';el.setAttribute('aria-valuenow',Math.floor(progress));});}
    document.querySelectorAll('[data-price]').forEach(el=>{el.disabled=Boolean(el.dataset.maxed)||s.money<Number(el.dataset.price)||s.research<Number(el.dataset.research||0);if(el.disabled&&!el.dataset.maxed)el.title=s.money<Number(el.dataset.price)?'Not enough funds':'Not enough research points';else el.title='';});
    document.querySelectorAll('[data-action="repair"]').forEach(el=>{const sat=s.satellites.find(v=>v.id===Number(el.dataset.id));if(!sat)return;const cost=satelliteSystem.repairCost(sat);el.textContent=`Repair · ${Utils.money(cost)}`;el.disabled=sat.activeContract!==null||sat.health>=99.99||s.money<cost;el.title=sat.activeContract!==null?'Wait for the contract to finish.':'';});
    document.querySelectorAll('[data-health]').forEach(el=>{const sat=s.satellites.find(v=>v.id===Number(el.dataset.health));if(sat)el.textContent=sat.health.toFixed(1)+'%';});document.querySelectorAll('[data-health-bar]').forEach(el=>{const sat=s.satellites.find(v=>v.id===Number(el.dataset.healthBar));if(sat)el.style.width=sat.health+'%';});
    if(this.openOffer&&this.dialog.open)this.updateQuote();
  }
  openDialog(title,body,eyebrow='MISSION BRIEFING'){
    this.openOffer=null;document.getElementById('dialogTitle').textContent=title;document.getElementById('dialogEyebrow').textContent=eyebrow;document.getElementById('dialogBody').innerHTML=body;document.getElementById('dialogActions').replaceChildren();if(!this.dialog.open)this.dialog.showModal();
  }
  dialogButton(label,fn,primary=false){const b=document.createElement('button');b.className=primary?'primary-button':'outline-button';b.textContent=label;b.addEventListener('click',fn);document.getElementById('dialogActions').appendChild(b);return b;}
  showContract(id){
    const c=this.state.offers.find(v=>v.id===id);if(!c)return;const t=CONFIG.contractTypes[c.typeIndex],available=satelliteSystem.available(this.state,c.requiredQuality);
    this.openDialog(t.name,`<p>${Utils.escape(t.client)} · ${Utils.escape(Utils.country(c.countryId).properties.name)} · Class ${c.requiredQuality}</p><p style="margin-top:12px">${t.description}</p><div class="briefing"><div><span>Reward on completion</span><strong id="quoteReward" class="cyan"></strong></div><div><span>Start cost</span><strong id="quoteCost"></strong></div><div><span>Contract profit</span><strong id="quoteProfit" class="cyan"></strong></div><div><span>Duration in game time</span><strong id="quoteDuration"></strong></div></div><label class="field-label" for="satelliteChoice">Assign satellite</label><select id="satelliteChoice" ${available.length?'':'disabled'}>${available.length?available.map(s=>`<option value="${s.id}">${Utils.escape(s.name)} · ${Math.round(s.health)}% condition</option>`).join(''):'<option>No suitable satellite available</option>'}</select><p class="subtle" style="margin-top:12px">+${c.reputation} reputation · +${c.reputation*2} research points. Start costs are paid immediately. Fleet maintenance is charged separately.</p><p id="quoteMessage" class="dialog-message"></p>`);
    this.openOffer=id;document.getElementById('satelliteChoice').addEventListener('change',()=>this.updateQuote());
    this.dialogButton('Close',()=>this.dialog.close());const b=this.dialogButton('Start contract',()=>{const sid=Number(document.getElementById('satelliteChoice').value);if(this.game.accept(id,sid))this.dialog.close();},true);b.id='acceptContractButton';this.updateQuote();
  }
  updateQuote(){
    const c=this.state.offers.find(v=>v.id===this.openOffer),button=document.getElementById('acceptContractButton');if(!c||!button){if(button)button.disabled=true;return;}
    const selected=Number(document.getElementById('satelliteChoice').value);const sat=satelliteSystem.available(this.state,c.requiredQuality).find(s=>s.id===selected),q=contractSystem.quote(this.state,c,sat);
    for(const [id,value]of Object.entries({quoteReward:Utils.money(q.reward),quoteCost:Utils.money(q.cost),quoteProfit:Utils.money(q.reward-q.cost),quoteDuration:Utils.time(q.duration)}))document.getElementById(id).textContent=value;
    button.disabled=!sat||this.state.money<q.cost;document.getElementById('quoteMessage').textContent=!sat?'You need an available satellite of the required class with enough condition.':this.state.money<q.cost?'You do not have enough funds for the start cost.':'';
  }
  showSatellite(id){const sat=this.state.satellites.find(s=>s.id===id);if(!sat)return;const stats=satelliteSystem.stats(this.state,sat);this.openDialog(sat.name,`<p>${stats.description}</p><div class="briefing"><div><span>Condition</span><strong>${sat.health.toFixed(1)}%</strong></div><div><span>Efficiency</span><strong>${Math.round(stats.efficiency*100)}%</strong></div><div><span>Coverage</span><strong>${stats.coverage}%</strong></div><div><span>Maintenance / game month</span><strong>${Utils.money(stats.maintenance)}</strong></div><div><span>Time in space</span><strong>${Utils.clock(sat.age)}</strong></div><div><span>Status</span><strong>${sat.activeContract!==null?'On mission':sat.health<=0?'Needs repair':'Available'}</strong></div></div><p>Higher efficiency reduces the duration of new contracts. Coverage and resolution increase their rewards. Repair your satellite as its condition declines.</p>`,'SATELLITE TELEMETRY');this.dialogButton('Close',()=>this.dialog.close());}
  showHelp(){this.openDialog('Your first mission.',`<ol class="help-list"><li>You start with <strong>€100,000 and one Scout-1</strong>. Choose a contract in mission control.</li><li>Assign your satellite and pay the start cost. You receive the reward after about two game minutes.</li><li>Buy more satellites to work on multiple assignments at once.</li><li>Earn research points from contracts. Upgrade your fleet in Research.</li><li>Drag the globe, click countries or use the country selector. Find contracts in your chosen country.</li></ol><p>Use 3× to speed up the simulation. Pausing or hiding the tab stops game time. A game month lasts 30 game minutes. Your progress is saved in this browser.</p>`,'GETTING STARTED');this.dialogButton('Got it',()=>this.dialog.close(),true);}
  confirmNewGame(){this.openDialog('Start over?',`<p>This replaces your current company, satellites and progress with a new game with €100,000 and one Scout-1.</p>`,'NEW GAME');this.dialogButton('Back',()=>this.dialog.close());const b=this.dialogButton('Start over',()=>{this.dialog.close();this.game.newGame();});b.className='danger-button';}
  toast(message,error=false){const el=document.createElement('div');el.className='toast'+(error?' error':'');el.textContent=message;const holder=document.getElementById('toasts');holder.appendChild(el);while(holder.children.length>3)holder.firstChild.remove();setTimeout(()=>el.remove(),5000);}
}

