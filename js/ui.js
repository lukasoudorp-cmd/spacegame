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
    WORLD_DATA.features.filter(f=>f.properties.region!=='Antarctica').sort((a,b)=>a.properties.name.localeCompare(b.properties.name,'nl')).forEach(f=>{const o=document.createElement('option');o.value=f.id;o.textContent=f.properties.name;select.appendChild(o);});
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
    bind('saveButton',()=>{const success=this.game.save();this.toast(success?'Je voortgang is opgeslagen.':'Je browser kan de voortgang niet opslaan.',!success);});
    bind('clearLogButton',()=>{this.state.log=[];this.game.log('Logboek gewist.');this.game.changed();});
    document.querySelector('.brand').addEventListener('click',e=>{e.preventDefault();this.navigate('operations');});
  }
  navigate(page){
    const copy={operations:['Missiecentrum','ORBITALE OPERATIES','De wereld binnen bereik.','Kies een contract. Zet je satelliet aan het werk.'],contracts:['Contracten','OPDRACHTENNETWERK','Jouw volgende missie.','Lever data, verdien geld en bouw je reputatie op.'],fleet:['Mijn vloot','SATELLIETBEHEER','Klaar voor een grotere baan.','Beheer je satellieten en breid je capaciteit uit.'],upgrades:['Onderzoek','TECHNOLOGIE & ONTWIKKELING','Maak elke missie beter.','Investeer je onderzoekspunten in je hele vloot.'],company:['Bedrijf','BEDRIJFSOVERZICHT','Van eerste lancering tot wereldspeler.','Bekijk je resultaten en je volgende mijlpaal.'],log:['Logboek','OPERATIEGESCHIEDENIS','Alles op een rij.','Lanceringen, contracten en ontwikkelingen in je bedrijf.']};
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
    const country=Utils.country(this.countryId);document.getElementById('regionTitle').textContent=country?.properties.name||'Wereldwijd';
    const offers=this.state.offers.filter(c=>!this.countryId||c.countryId===this.countryId).slice(0,3);
    document.getElementById('mapOffers').innerHTML=offers.length?offers.map(c=>{const t=CONFIG.contractTypes[c.typeIndex],q=contractSystem.quote(this.state,c);return `<button class="rail-card" data-action="offer" data-id="${c.id}"><span class="contract-icon">${icon(t.icon)}</span><div><h3>${Utils.escape(t.name)}</h3><p>${Utils.escape(Utils.country(c.countryId).properties.name)} · Klasse ${c.requiredQuality}</p><div class="rail-reward"><strong>+ ${Utils.money(q.reward-q.cost)}</strong><span>${Utils.time(q.duration)} MIN</span></div></div></button>`;}).join(''):`<p class="rail-empty">${country?'Nog geen contracten in dit land. Zoek nieuw aanbod met de knop hieronder.':'Je hebt alle opdrachten aangenomen. Zoek nieuwe contracten of rond je missies af.'}</p>`;
  }
  renderContracts(){
    document.getElementById('contractsList').innerHTML=this.state.offers.length?this.state.offers.map(c=>{
      const t=CONFIG.contractTypes[c.typeIndex],q=contractSystem.quote(this.state,c);return `<article class="card"><div class="card-head"><span class="card-icon">${icon(t.icon)}</span><span class="badge">KLASSE ${c.requiredQuality}</span></div><h3>${Utils.escape(t.name)}</h3><p class="location">${Utils.escape(Utils.country(c.countryId).properties.name)} · ${t.client}</p><p class="description">${t.description}</p><div class="reward">${Utils.money(q.reward-q.cost)}</div><p class="reward-label">Contractwinst, exclusief vlootonderhoud</p><div class="card-stats"><div class="card-stat"><span>Startkosten</span><strong>${Utils.money(q.cost)}</strong></div><div class="card-stat"><span>Geschatte duur</span><strong>${Utils.time(q.duration)}</strong></div><div class="card-stat"><span>Reputatie / onderzoek</span><strong>+${c.reputation} / +${c.reputation*2}</strong></div></div><button class="outline-button full" data-action="offer" data-id="${c.id}">Bekijk contract ${icon('arrow')}</button></article>`;
    }).join(''):'<div class="empty-state"><div><h3>Alle contracten zijn aangenomen.</h3><p>Vernieuw het aanbod om meer opdrachten te vinden.</p></div></div>';
  }
  renderActive(id){
    const container=document.getElementById(id);container.innerHTML=this.state.activeContracts.length?this.state.activeContracts.map(c=>{
      const t=CONFIG.contractTypes[c.typeIndex],sat=this.state.satellites.find(s=>s.id===c.satelliteId);return `<article class="mission-row">${icon(t.icon)}<div><h3>${Utils.escape(t.name)}</h3><p>${Utils.escape(Utils.country(c.countryId).properties.name)} · ${Utils.escape(sat?.name||'Satelliet')}</p></div><div class="mission-progress"><div class="progress-meta"><span data-remaining="${c.id}"></span><span data-percent="${c.id}"></span></div><div class="progress" role="progressbar" aria-label="Voortgang ${Utils.escape(t.name)}" aria-valuemin="0" aria-valuemax="100" data-progress="${c.id}"><span></span></div></div><div class="mission-value">+${Utils.money(c.reward)}<small>bij voltooiing</small></div></article>`;
    }).join(''):`<div class="empty-state">${icon('radar')}<div><h3>Je volgende missie begint hier.</h3><p>Accepteer een contract om je satelliet aan het werk te zetten.</p></div><button class="outline-button" data-page="contracts">Kies een contract ${icon('arrow')}</button></div>`;
  }
  renderFleet(){
    const state=this.state;document.getElementById('fleetCount').textContent=`${state.satellites.length} satelliet${state.satellites.length===1?'':'en'} in een baan om de aarde`;
    document.getElementById('satellitesList').innerHTML=state.satellites.map(s=>{
      const stats=satelliteSystem.stats(state,s),busy=s.activeContract!==null;return `<article class="card"><div class="card-head"><span class="card-icon" style="color:${stats.color}">${icon('satellite')}</span><span class="badge ${busy?'green':''}">${busy?'IN OPERATIE':'BESCHIKBAAR'}</span></div><h3>${Utils.escape(s.name)}</h3><p class="location">Klasse ${stats.quality} · ${stats.role.toLowerCase()}</p><div class="card-stats"><div class="card-stat"><span>Conditie</span><strong data-health="${s.id}">${s.health.toFixed(1)}%</strong></div><div class="progress"><span data-health-bar="${s.id}" style="width:${s.health}%"></span></div><div class="card-stat"><span>Efficiëntie</span><strong>${Math.round(stats.efficiency*100)}%</strong></div><div class="card-stat"><span>Dekking</span><strong>${stats.coverage}%</strong></div><div class="card-stat"><span>Onderhoud / spelmaand</span><strong>${Utils.money(stats.maintenance)}</strong></div></div><div class="card-actions"><button class="outline-button" data-action="satellite" data-id="${s.id}">Details</button><button class="outline-button" data-action="repair" data-id="${s.id}">Repareer</button></div></article>`;
    }).join('');
    document.getElementById('shopList').innerHTML=Object.entries(CONFIG.satelliteTypes).map(([key,s])=>`<article class="card"><div class="hardware-header"><div style="color:${s.color}">${icon('satellite')}</div><div class="eyebrow">${s.role} / KLASSE ${s.quality}</div><h3>${s.name}</h3><p>${s.description}</p></div><div class="card-stats"><div class="card-stat"><span>Basisdekking</span><strong>${s.coverage}%</strong></div><div class="card-stat"><span>Basisefficiëntie</span><strong>${Math.round(s.efficiency*100)}%</strong></div><div class="card-stat"><span>Basisonderhoud / maand</span><strong>${Utils.money(s.maintenance)}</strong></div></div><div class="reward" style="color:${s.color}">${Utils.money(s.price)}</div><p class="reward-label">Aanschaf inclusief lancering</p><div class="card-actions"><button class="primary-button" data-action="buy" data-type="${key}" data-price="${s.price}">Koop & lanceer ${icon('arrow')}</button></div></article>`).join('');
  }
  renderUpgrades(){
    document.getElementById('upgradesList').innerHTML=Object.keys(CONFIG.upgradeTypes).map(key=>{
      const u=upgradeSystem.info(this.state,key);return `<article class="card"><div class="card-head"><span class="card-icon">${icon(u.icon)}</span><span class="badge">NIVEAU ${u.level} / ${u.max}</span></div><h3>${u.name}</h3><p class="description">${u.description}</p><div class="upgrade-levels">${Array.from({length:u.max},(_,i)=>`<span class="${i<u.level?'filled':''}"></span>`).join('')}</div><div class="card-stats"><div class="card-stat"><span>Investering</span><strong>${u.level===u.max?'Voltooid':Utils.money(u.cost)}</strong></div><div class="card-stat"><span>Onderzoekspunten</span><strong class="cyan">${u.level===u.max?'Voltooid':`${u.researchCost} ◇`}</strong></div></div><button class="${u.level===u.max?'outline-button':'primary-button'} full" data-action="upgrade" data-key="${key}" data-price="${u.cost}" data-research="${u.researchCost}" ${u.level===u.max?'data-maxed="true" disabled':''}>${u.level===u.max?'Maximaal ontwikkeld':'Ontwikkel verbetering'} ${icon(u.level===u.max?'check':'arrow')}</button></article>`;
    }).join('');
  }
  renderCompany(){
    const s=this.state,p=Utils.progress(s);document.getElementById('companyOverview').innerHTML=`<div class="company-hero"><p class="eyebrow">SPACE CORP / LEVEL ${s.level}</p><h2>${CONFIG.levelNames[s.level-1]}</h2><p>${s.level===5?'Je hebt de hoogste bedrijfsrang bereikt. Breid je vloot verder uit.':`Verdien nog ${Utils.money(p.remaining)} aan contractbeloningen voor level ${s.level+1}.`}</p><div class="progress"><span style="width:${p.percent}%"></span></div><div class="progress-meta"><span>${Utils.money(s.totalMoneyEarned)} totale omzet</span><span>${p.percent.toFixed(0)}%</span></div></div><div class="metrics-grid"><div class="metric"><div><span>Totale contractomzet</span><strong>${Utils.money(s.totalMoneyEarned)}</strong></div></div><div class="metric"><div><span>Totale uitgaven</span><strong id="totalCosts">${Utils.money(s.totalCosts)}</strong></div></div><div class="metric"><div><span>Contracten voltooid</span><strong>${s.completedContracts}</strong></div></div><div class="metric"><div><span>Speeltijd</span><strong id="companyPlayTime">${Utils.clock(s.playTime)}</strong></div></div></div><div class="section-heading"><h2>Laatste voltooide contracten</h2></div><div class="panel log-list">${s.history.length?s.history.slice(0,8).map(m=>`<div class="log-entry success"><time>${Utils.clock(m.time)}</time><span>${CONFIG.contractTypes[m.typeIndex].name} · ${Utils.escape(Utils.country(m.countryId).properties.name)} · ${Utils.money(m.profit)} winst</span></div>`).join(''):'<div class="log-entry"><span class="subtle">Voltooi je eerste contract om hier je resultaten te zien.</span></div>'}</div>`;
  }
  renderLog(){document.getElementById('logList').innerHTML=this.state.log.slice().reverse().map(l=>`<div class="log-entry ${l.type}"><time>${Utils.clock(l.time)}</time><span>${Utils.escape(l.message)}</span></div>`).join('')||'<div class="log-entry">Er zijn nog geen gebeurtenissen.</div>';}
  updateLive(){
    const s=this.state,p=Utils.progress(s);const set=(id,text)=>{const el=document.getElementById(id);if(el&&el.textContent!==String(text))el.textContent=text;};
    set('moneyDisplay',Utils.money(s.money));set('reputationDisplay',s.reputation);set('researchDisplay',s.research);set('missionClock',Utils.clock(s.playTime));set('activeCount',s.activeContracts.length);set('runningBadge',s.activeContracts.length);set('expectedProfit',Utils.money(s.activeContracts.reduce((sum,c)=>sum+c.reward-c.cost,0)));set('maintenanceDisplay',Utils.money(satelliteSystem.monthlyCost(s)));set('navOfferCount',s.offers.length);set('sidebarLevel',`Level ${s.level} · ${CONFIG.levelNames[s.level-1]}`);set('nextLevelHint',s.level===5?'Hoogste bedrijfslevel bereikt':`${Utils.money(p.remaining)} tot level ${s.level+1}`);set('systemStatus',s.paused?'SIMULATIE GEPAUZEERD':'SYSTEMEN OPERATIONEEL');set('companyPlayTime',Utils.clock(s.playTime));set('totalCosts',Utils.money(s.totalCosts));
    document.getElementById('sidebarProgress').style.width=p.percent+'%';document.getElementById('systemDot').style.background=s.paused?'var(--amber)':'var(--mint)';
    const free=satelliteSystem.available(s).length;document.getElementById('freeSatellites').innerHTML=`${free} <small>/ ${s.satellites.length}</small>`;
    const pause=document.getElementById('pauseButton');if(pause.dataset.paused!==String(s.paused)){pause.innerHTML=icon(s.paused?'play':'pause');pause.dataset.paused=s.paused;pause.setAttribute('aria-label',s.paused?'Spel hervatten':'Spel pauzeren');pause.title=s.paused?'Hervatten':'Pauzeren';}set('speedButton',s.speed+'×');
    for(const c of s.activeContracts){const progress=Utils.clamp(c.elapsed/c.duration*100,0,100);document.querySelectorAll(`[data-remaining="${c.id}"]`).forEach(el=>el.textContent=Utils.time(c.duration-c.elapsed)+' resterend');document.querySelectorAll(`[data-percent="${c.id}"]`).forEach(el=>el.textContent=progress.toFixed(0)+'%');document.querySelectorAll(`[data-progress="${c.id}"]`).forEach(el=>{el.firstElementChild.style.width=progress+'%';el.setAttribute('aria-valuenow',Math.floor(progress));});}
    document.querySelectorAll('[data-price]').forEach(el=>{el.disabled=Boolean(el.dataset.maxed)||s.money<Number(el.dataset.price)||s.research<Number(el.dataset.research||0);if(el.disabled&&!el.dataset.maxed)el.title=s.money<Number(el.dataset.price)?'Onvoldoende geld':'Onvoldoende onderzoekspunten';else el.title='';});
    document.querySelectorAll('[data-action="repair"]').forEach(el=>{const sat=s.satellites.find(v=>v.id===Number(el.dataset.id));if(!sat)return;const cost=satelliteSystem.repairCost(sat);el.textContent=`Repareer · ${Utils.money(cost)}`;el.disabled=sat.activeContract!==null||sat.health>=99.99||s.money<cost;el.title=sat.activeContract!==null?'Wacht tot het contract klaar is.':'';});
    document.querySelectorAll('[data-health]').forEach(el=>{const sat=s.satellites.find(v=>v.id===Number(el.dataset.health));if(sat)el.textContent=sat.health.toFixed(1)+'%';});document.querySelectorAll('[data-health-bar]').forEach(el=>{const sat=s.satellites.find(v=>v.id===Number(el.dataset.healthBar));if(sat)el.style.width=sat.health+'%';});
    if(this.openOffer&&this.dialog.open)this.updateQuote();
  }
  openDialog(title,body,eyebrow='MISSIEBRIEFING'){
    this.openOffer=null;document.getElementById('dialogTitle').textContent=title;document.getElementById('dialogEyebrow').textContent=eyebrow;document.getElementById('dialogBody').innerHTML=body;document.getElementById('dialogActions').replaceChildren();if(!this.dialog.open)this.dialog.showModal();
  }
  dialogButton(label,fn,primary=false){const b=document.createElement('button');b.className=primary?'primary-button':'outline-button';b.textContent=label;b.addEventListener('click',fn);document.getElementById('dialogActions').appendChild(b);return b;}
  showContract(id){
    const c=this.state.offers.find(v=>v.id===id);if(!c)return;const t=CONFIG.contractTypes[c.typeIndex],available=satelliteSystem.available(this.state,c.requiredQuality);
    this.openDialog(t.name,`<p>${Utils.escape(t.client)} · ${Utils.escape(Utils.country(c.countryId).properties.name)} · Klasse ${c.requiredQuality}</p><p style="margin-top:12px">${t.description}</p><div class="briefing"><div><span>Beloning na voltooiing</span><strong id="quoteReward" class="cyan"></strong></div><div><span>Startkosten</span><strong id="quoteCost"></strong></div><div><span>Contractwinst</span><strong id="quoteProfit" class="cyan"></strong></div><div><span>Duur in speltijd</span><strong id="quoteDuration"></strong></div></div><label class="field-label" for="satelliteChoice">Satelliet toewijzen</label><select id="satelliteChoice" ${available.length?'':'disabled'}>${available.length?available.map(s=>`<option value="${s.id}">${Utils.escape(s.name)} · ${Math.round(s.health)}% conditie</option>`).join(''):'<option>Geen geschikte satelliet beschikbaar</option>'}</select><p class="subtle" style="margin-top:12px">+${c.reputation} reputatie · +${c.reputation*2} onderzoekspunten. Startkosten worden direct betaald. Vlootonderhoud loopt apart door.</p><p id="quoteMessage" class="dialog-message"></p>`);
    this.openOffer=id;document.getElementById('satelliteChoice').addEventListener('change',()=>this.updateQuote());
    this.dialogButton('Sluiten',()=>this.dialog.close());const b=this.dialogButton('Start contract',()=>{const sid=Number(document.getElementById('satelliteChoice').value);if(this.game.accept(id,sid))this.dialog.close();},true);b.id='acceptContractButton';this.updateQuote();
  }
  updateQuote(){
    const c=this.state.offers.find(v=>v.id===this.openOffer),button=document.getElementById('acceptContractButton');if(!c||!button){if(button)button.disabled=true;return;}
    const selected=Number(document.getElementById('satelliteChoice').value);const sat=satelliteSystem.available(this.state,c.requiredQuality).find(s=>s.id===selected),q=contractSystem.quote(this.state,c,sat);
    for(const [id,value]of Object.entries({quoteReward:Utils.money(q.reward),quoteCost:Utils.money(q.cost),quoteProfit:Utils.money(q.reward-q.cost),quoteDuration:Utils.time(q.duration)}))document.getElementById(id).textContent=value;
    button.disabled=!sat||this.state.money<q.cost;document.getElementById('quoteMessage').textContent=!sat?'Je hebt een vrije satelliet nodig met de juiste klasse en voldoende conditie.':this.state.money<q.cost?'Je hebt onvoldoende geld voor de startkosten.':'';
  }
  showSatellite(id){const sat=this.state.satellites.find(s=>s.id===id);if(!sat)return;const stats=satelliteSystem.stats(this.state,sat);this.openDialog(sat.name,`<p>${stats.description}</p><div class="briefing"><div><span>Conditie</span><strong>${sat.health.toFixed(1)}%</strong></div><div><span>Efficiëntie</span><strong>${Math.round(stats.efficiency*100)}%</strong></div><div><span>Dekking</span><strong>${stats.coverage}%</strong></div><div><span>Onderhoud / spelmaand</span><strong>${Utils.money(stats.maintenance)}</strong></div><div><span>Tijd in de ruimte</span><strong>${Utils.clock(sat.age)}</strong></div><div><span>Status</span><strong>${sat.activeContract!==null?'In operatie':sat.health<=0?'Reparatie nodig':'Beschikbaar'}</strong></div></div><p>Een hogere efficiëntie verkort de duur van nieuwe contracten. Dekking en resolutie verhogen hun beloning. Repareer je satelliet wanneer de conditie afneemt.</p>`,'SATELLIETTELEMETRIE');this.dialogButton('Sluiten',()=>this.dialog.close());}
  showHelp(){this.openDialog('Je eerste missie.',`<ol class="help-list"><li>Je begint met <strong>€100.000 en één Scout-1</strong>. Kies een contract in het missiecentrum.</li><li>Wijs je satelliet toe en betaal de startkosten. Na ongeveer twee spelminuten ontvang je de beloning.</li><li>Koop extra satellieten om meerdere opdrachten tegelijk uit te voeren.</li><li>Verdien onderzoekspunten met contracten. Verbeter je vloot onder Onderzoek.</li><li>Sleep de aardbol, klik op landen of gebruik de landkeuze. Zoek contracten voor je gekozen land.</li></ol><p>Met 3× versnel je de simulatie. Pauzeren of het tabblad verbergen stopt de speeltijd. Een spelmaand duurt 30 spelminuten. Je voortgang blijft in deze browser bewaard.</p>`,'SNEL AAN DE SLAG');this.dialogButton('Begrepen',()=>this.dialog.close(),true);}
  confirmNewGame(){this.openDialog('Opnieuw beginnen?',`<p>Hiermee vervang je je huidige bedrijf, satellieten en voortgang door een nieuw spel met €100.000 en één Scout-1.</p>`,'NIEUW SPEL');this.dialogButton('Terug',()=>this.dialog.close());const b=this.dialogButton('Begin opnieuw',()=>{this.dialog.close();this.game.newGame();});b.className='danger-button';}
  toast(message,error=false){const el=document.createElement('div');el.className='toast'+(error?' error':'');el.textContent=message;const holder=document.getElementById('toasts');holder.appendChild(el);while(holder.children.length>3)holder.firstChild.remove();setTimeout(()=>el.remove(),5000);}
}
