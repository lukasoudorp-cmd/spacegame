'use strict';
class WorldMap {
  constructor(game,onSelect){
    this.game=game;this.onSelect=onSelect;this.canvas=document.getElementById('mapCanvas');this.ctx=this.canvas.getContext('2d');
    this.base=document.createElement('canvas');this.baseCtx=this.base.getContext('2d');
    this.mode='globe';this.rotation=[-15,-20,0];this.zoom=1;this.pan=[0,0];this.selected=null;this.hover=null;this.dirty=true;this.width=0;this.height=0;
    this.tooltip=document.getElementById('mapTooltip');this.graticule=d3.geoGraticule10();
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(this.canvas.parentElement);
    this.bind();this.resize();
  }
  bind(){
    const c=this.canvas;
    c.addEventListener('pointerdown',e=>{if(!e.isPrimary)return;this.pointer={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false};c.setPointerCapture(e.pointerId);this.tooltip.hidden=true;});
    c.addEventListener('pointermove',e=>{
      if(this.pointer&&this.pointer.id===e.pointerId){const p=this.pointer,dx=e.clientX-p.x,dy=e.clientY-p.y;p.moved=p.moved||Math.hypot(e.clientX-p.startX,e.clientY-p.startY)>4;
        if(p.moved){if(this.mode==='globe'){this.rotation[0]+=dx*.3/this.zoom;this.rotation[1]=Utils.clamp(this.rotation[1]-dy*.3/this.zoom,-80,80);}else{this.pan[0]=Utils.clamp(this.pan[0]+dx,-this.width*this.zoom/2,this.width*this.zoom/2);this.pan[1]=Utils.clamp(this.pan[1]+dy,-this.height*this.zoom/2,this.height*this.zoom/2);}this.dirty=true;}p.x=e.clientX;p.y=e.clientY;
      }else if(e.pointerType!=='touch'){const hit=this.hit(e);if(hit?.id!==this.hover?.id){this.hover=hit;this.dirty=true;}if(hit){const rect=c.getBoundingClientRect();this.tooltip.textContent=hit.properties.name;this.tooltip.style.left=`${Math.max(8,Math.min(this.width-195,e.clientX-rect.left+14))}px`;this.tooltip.style.top=`${Math.max(55,Math.min(this.height-80,e.clientY-rect.top-35))}px`;this.tooltip.hidden=false;}else this.tooltip.hidden=true;}
    });
    c.addEventListener('pointerup',e=>{if(!this.pointer||this.pointer.id!==e.pointerId)return;const moved=this.pointer.moved;this.pointer=null;if(c.hasPointerCapture(e.pointerId))c.releasePointerCapture(e.pointerId);if(!moved){const hit=this.hit(e);this.select(hit?.id||null,false);this.onSelect(hit?.id||null);}});
    c.addEventListener('pointercancel',()=>{this.pointer=null;});c.addEventListener('pointerleave',()=>{this.hover=null;this.tooltip.hidden=true;this.dirty=true;});
    c.addEventListener('wheel',e=>{e.preventDefault();this.changeZoom(e.deltaY>0?1/1.12:1.12);},{passive:false});
    c.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','Home'].includes(e.key)){e.preventDefault();if(e.key==='+')this.changeZoom(1.2);else if(e.key==='-')this.changeZoom(1/1.2);else if(e.key==='Home')this.reset();else{const dx=e.key==='ArrowLeft'?-8:e.key==='ArrowRight'?8:0,dy=e.key==='ArrowUp'?8:e.key==='ArrowDown'?-8:0;if(this.mode==='globe'){this.rotation[0]+=dx;this.rotation[1]=Utils.clamp(this.rotation[1]+dy,-80,80);}else{this.pan[0]=Utils.clamp(this.pan[0]+dx*4,-this.width*this.zoom/2,this.width*this.zoom/2);this.pan[1]=Utils.clamp(this.pan[1]-dy*4,-this.height*this.zoom/2,this.height*this.zoom/2);}this.dirty=true;}}});
  }
  resize(){const rect=this.canvas.getBoundingClientRect();if(rect.width<1||rect.height<1)return;this.width=rect.width;this.height=rect.height;this.dpr=Math.min(window.devicePixelRatio||1,2);for(const c of [this.canvas,this.base]){c.width=Math.round(this.width*this.dpr);c.height=Math.round(this.height*this.dpr);}this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);this.baseCtx.setTransform(this.dpr,0,0,this.dpr,0,0);this.dirty=true;this.draw();}
  setMode(mode){this.mode=mode;this.zoom=1;this.pan=[0,0];this.dirty=true;document.getElementById('globeButton').classList.toggle('selected',mode==='globe');document.getElementById('flatButton').classList.toggle('selected',mode==='flat');document.getElementById('globeButton').setAttribute('aria-pressed',mode==='globe');document.getElementById('flatButton').setAttribute('aria-pressed',mode==='flat');this.draw();}
  changeZoom(factor){this.zoom=Utils.clamp(this.zoom*factor,.8,3.5);this.dirty=true;this.draw();}
  reset(){this.zoom=1;this.pan=[0,0];this.rotation=[-15,-20,0];this.selected=null;this.dirty=true;this.onSelect(null);this.draw();}
  select(id,focus=true){this.selected=id;if(id&&focus){const f=Utils.country(id);if(f&&this.mode==='globe'){this.rotation=[-f.properties.center[0],-f.properties.center[1],0];this.zoom=1;}}this.dirty=true;this.draw();}
  setupProjection(){const w=this.width,h=this.height;this.radius=Math.min(w*.43,h*.39)*this.zoom;
    if(this.mode==='globe')this.projection=d3.geoOrthographic().rotate(this.rotation).scale(this.radius).translate([w/2,h*.5]).precision(.4);
    else this.projection=d3.geoNaturalEarth1().fitExtent([[24,65],[w-24,h-80]],{type:'Sphere'}).precision(.4).rotate([0,0,0]);
    if(this.mode==='flat'){this.projection.scale(this.projection.scale()*this.zoom);const t=this.projection.translate();this.projection.translate([t[0]+this.pan[0],t[1]+this.pan[1]]);}
    this.path=d3.geoPath(this.projection,this.baseCtx);
  }
  hit(e){if(!this.projection)return null;const rect=this.canvas.getBoundingClientRect(),xy=[e.clientX-rect.left,e.clientY-rect.top];if(this.mode==='globe'&&Math.hypot(xy[0]-this.width/2,xy[1]-this.height*.5)>this.radius)return null;const lonlat=this.projection.invert(xy);if(!lonlat||!lonlat.every(Number.isFinite))return null;if(Math.abs(lonlat[1])>90)return null;return WORLD_DATA.features.find(f=>d3.geoContains(f,lonlat))||null;}
  visible(lonlat){return this.mode==='flat'||d3.geoDistance(lonlat,[-this.rotation[0],-this.rotation[1]])<Math.PI/2;}
  renderBase(){
    const ctx=this.baseCtx,w=this.width,h=this.height;ctx.clearRect(0,0,w,h);this.setupProjection();
    // Fixed star field: never randomise positions while drawing.
    for(let i=0;i<95;i++){const x=((i*137.508)%997)/997*w,y=((i*239.13)%991)/991*h;ctx.fillStyle=i%4?'#45607460':'#bad5e680';ctx.fillRect(x,y,i%7===0?1.5:1,i%7===0?1.5:1);}
    if(this.mode==='globe'){
      const glow=ctx.createRadialGradient(w/2,h*.5,this.radius*.93,w/2,h*.5,this.radius*1.2);glow.addColorStop(0,'#75d8e83b');glow.addColorStop(.42,'#458ba81b');glow.addColorStop(1,'#22435600');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(w/2,h*.5,this.radius*1.2,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#6f9db222';ctx.lineWidth=1;ctx.beginPath();ctx.arc(w/2,h*.5,this.radius*1.11,0,Math.PI*2);ctx.stroke();
    }
    const ocean=ctx.createLinearGradient(w*.3,h*.1,w*.8,h*.9);ocean.addColorStop(0,'#163449');ocean.addColorStop(1,'#081728');ctx.beginPath();this.path({type:'Sphere'});ctx.fillStyle=ocean;ctx.fill();ctx.strokeStyle='#4b7891';ctx.lineWidth=.8;ctx.stroke();
    ctx.beginPath();this.path(this.graticule);ctx.strokeStyle='#56869e2e';ctx.lineWidth=.55;ctx.stroke();
    WORLD_DATA.features.forEach((f,i)=>{ctx.beginPath();this.path(f);ctx.fillStyle=f.id===this.selected?'#529f8e':f.id===this.hover?.id?'#416776':['#243f4c','#2a4652','#2d4b56','#284350'][i%4];ctx.fill();ctx.strokeStyle=f.id===this.selected?'#aaf6d1':'#6992a17a';ctx.lineWidth=f.id===this.selected?1.2:.55;ctx.stroke();});
    if(this.mode==='globe'){
      ctx.save();ctx.beginPath();this.path({type:'Sphere'});ctx.clip();
      // Concentric circles keep the gradient smooth at every viewport size and zoom.
      // Only shade the rim, so country details remain visible across the globe.
      const [cx,cy]=this.projection.translate();
      const shade=ctx.createRadialGradient(cx,cy,0,cx,cy,this.radius);
      shade.addColorStop(0,'rgba(2,11,18,0)');
      shade.addColorStop(.65,'rgba(2,11,18,0)');
      shade.addColorStop(.88,'rgba(2,11,18,0.08)');
      shade.addColorStop(1,'rgba(2,11,18,0.22)');
      ctx.fillStyle=shade;ctx.fillRect(0,0,w,h);ctx.restore();
    }
    // Sparse geographical labels, grounded in real coordinates.
    const labels=[['NOORD-AMERIKA',[-105,42]],['ZUID-AMERIKA',[-60,-15]],['EUROPA',[19,52]],['AFRIKA',[18,5]],['AZIË',[90,41]],['AUSTRALIË',[134,-25]]];
    ctx.font='12px Consolas, monospace';ctx.textAlign='center';ctx.fillStyle='#bdd5dfaa';for(const [name,ll] of labels){if(!this.visible(ll))continue;const p=this.projection(ll);if(p&&p[0]>40&&p[0]<w-40&&p[1]>80&&p[1]<h-70)ctx.fillText(name,p[0],p[1]);}
    const lat=-this.rotation[1],lon=((-this.rotation[0]+540)%360)-180;document.getElementById('mapCoordinates').textContent=this.mode==='globe'?`${Math.abs(lat).toFixed(0)}° ${lat>=0?'N':'Z'} · ${Math.abs(lon).toFixed(0)}° ${lon>=0?'O':'W'}`:'WERELDOVERZICHT';this.dirty=false;
  }
  draw(){if(!this.width||!this.height)return;if(this.dirty)this.renderBase();const ctx=this.ctx;ctx.clearRect(0,0,this.width,this.height);ctx.drawImage(this.base,0,0,this.width,this.height);const path=d3.geoPath(this.projection,ctx),state=this.game.state;
    const selectedOffers=state.offers.filter(c=>!this.selected||c.countryId===this.selected);const markers=new Map();for(const c of [...selectedOffers,...state.activeContracts])markers.set(c.countryId,state.activeContracts.includes(c));
    for(const [id,active] of markers){const country=Utils.country(id);if(!country)continue;const ll=country.properties.center;if(!this.visible(ll))continue;const p=this.projection(ll);const color=active?'#91f0c2':'#edc587';ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=1;ctx.beginPath();ctx.arc(...p,7,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(...p,2.5,0,Math.PI*2);ctx.fill();if(active){ctx.globalAlpha=.3;ctx.beginPath();ctx.arc(...p,10+(state.playTime/200)%6,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}}
    state.satellites.forEach((sat,i)=>{
      const position=satelliteSystem.position(sat,state.playTime);const trace=Array.from({length:100},(_,n)=>satelliteSystem.position(sat,state.playTime+(n-70)*1800));
      if(i<12){ctx.beginPath();path({type:'LineString',coordinates:trace});ctx.strokeStyle=CONFIG.satelliteTypes[sat.type].color+'50';ctx.lineWidth=.85;ctx.setLineDash([3,5]);ctx.stroke();ctx.setLineDash([]);}
      const mission=state.activeContracts.find(c=>c.satelliteId===sat.id);
      if(mission){const country=Utils.country(mission.countryId);if(country){ctx.beginPath();path({type:'LineString',coordinates:[position,country.properties.center]});ctx.strokeStyle='#91f0c26b';ctx.lineWidth=1;ctx.stroke();}}
      if(!this.visible(position))return;const p=this.projection(position),color=CONFIG.satelliteTypes[sat.type].color;
      ctx.save();ctx.translate(...p);ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=12;ctx.rotate(Math.PI/4);ctx.fillRect(-3.5,-3.5,7,7);ctx.restore();
      if(i<8){ctx.font='12px Consolas, monospace';ctx.textAlign='left';ctx.fillStyle='#c4e8e7';ctx.fillText(`SAT-${String(sat.id).padStart(2,'0')}`,p[0]+11,p[1]+3);}
    });
  }
}
