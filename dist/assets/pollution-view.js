/* Local GIS analysis workspace; no sensor feed, network model service or real incident. */
(() => {
 'use strict';
 const M=window.HydroPollution;
 let dataPromise,active,serial=0;
 const session={params:{...M.defaults},reach:'outer-qinhuai',minute:0,run:'',seen:new Set()};
 let storage;try{storage=window.localStorage}catch{}
 const ledger=M.createLedger(storage),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const fixed=(n,d=2)=>Number(n).toLocaleString('zh-CN',{maximumFractionDigits:d,minimumFractionDigits:d});
 const time=t=>{if(t===null)return '12小时内未达到';const m=Math.round(t);return `${Math.floor(m/60)?Math.floor(m/60)+'时':''}${m%60}分`};
 const action=(key,label,cls='')=>`<button type="button" class="btn ${cls}" data-pollution-action="${key}" ${key==='retry'?'':'disabled'}>${label}</button>`;
 function slider(key,label,min,max,step,unit){return `<div class="pollution-control"><label for="pollution-${key}">${label}<output id="pollution-output-${key}" for="pollution-${key}"></output></label><input id="pollution-${key}" type="range" data-pollution-param="${key}" min="${min}" max="${max}" step="${step}" value="${session.params[key]}" aria-label="${label}" disabled><span class="pollution-unit">${unit}</span></div>`}
 function render(){return `<section id="pollution-workspace" class="pollution-workspace" aria-label="污染扩散教学分析">
 <div class="pollution-intro"><div><h2>污染扩散</h2><p>设置一次假设释放，播放后查看浓度变化和经过的观察位置。</p></div><span class="pollution-teaching">教学模拟</span></div>
 <div class="pollution-layout"><aside class="pollution-controls panel"><h3>释放与输运</h3><label class="pollution-reach-label" for="pollution-reach">分析河段</label><select id="pollution-reach" disabled><option>正在载入河段…</option></select>
 ${slider('source','释放位置',5,95,.1,'% · 河段起点至终点')}${action('source','在地图上设释放点')}
 ${slider('mass','释放质量',10,2000,10,'kg')}${slider('velocity','平均流速',.1,1.5,.05,'m/s')}${slider('dispersion','沿河扩散强度',1,80,1,'m²/s')}
 <details class="pollution-advanced"><summary>更多计算参数</summary>${slider('area','模型过水面积',50,2000,10,'m² · 假设全断面混合')}${slider('halfLife','污染物衰减半衰期',0,24,1,'小时 · 0 表示不衰减')}${slider('threshold','教学比较阈值',.1,10,.1,'mg/L · 不对应水质标准')}</details>
 <p class="pollution-parameter-note">修改参数会暂停播放，并从0分重新计算。</p>${action('defaults','恢复默认参数')}</aside>
 <div class="pollution-main"><section class="pollution-map-panel"><div class="pollution-map-toolbar"><div><h3 id="pollution-reach-name">河道空间分析</h3><span id="pollution-reach-length"></span></div>${action('fit','河段全景')}</div><div id="pollution-map" class="geographic-map pollution-map" aria-label="污染扩散教学地图"></div>
 <p id="pollution-map-status" class="pollution-map-status" role="status">正在载入河道…</p><div class="pollution-legend" aria-label="模拟浓度与教学阈值之比"><span><i class="plume-low"></i>低于0.25倍</span><span><i class="plume-mid"></i>0.25—1倍</span><span><i class="plume-high"></i>1—2倍</span><span><i class="plume-peak"></i>≥2倍</span></div><p class="pollution-map-note">箭头为教学流向，彩色线为沿河浓度示意，不表示河宽或陆域污染范围。</p></section>
 <section class="pollution-replay panel" aria-label="扩散回放"><div class="pollution-replay-heading"><div class="pollution-play-actions">${action('play','播放推演','primary')}${action('step','前进10分')}${action('reset','回到0分')}</div><strong id="pollution-clock">0分 / 12小时</strong></div><label class="sr-only" for="pollution-time">扩散模拟时刻，分钟</label><input id="pollution-time" type="range" min="0" max="720" step="1" value="${session.minute}" disabled><div class="pollution-time-scale"><span>释放 · 0</span><span>6小时</span><span>12小时</span></div><p id="pollution-play-status">手动播放，每秒推进10分钟；可拖动时间轴回放。</p></section>
 <div class="pollution-metrics"><div><span>河段内峰值</span><strong id="pollution-peak">—</strong><small>mg/L</small></div><div><span>超阈河段长度</span><strong id="pollution-length">—</strong><small>km</small></div><div><span>河段内剩余质量</span><strong id="pollution-mass-remaining">—</strong><small>kg</small></div></div>
 <section class="pollution-profile panel"><div class="pollution-section-heading"><h3>当前沿程浓度</h3><span id="pollution-profile-max"></span></div><svg id="pollution-profile-chart" viewBox="0 0 640 174" role="img" aria-label="当前沿河模拟浓度"><path d="M38 18V140H620" fill="none" stroke="#c8d9d2"/><path id="pollution-profile-fill" fill="#bf6a351b"/><path id="pollution-profile-line" fill="none" stroke="#b86135" stroke-width="2.5"/><path id="pollution-profile-threshold" stroke="#9c6654" stroke-dasharray="5 5"/><text x="42" y="14">mg/L</text><text id="pollution-profile-threshold-label" x="618" text-anchor="end"></text><text x="38" y="165">0 km</text><text id="pollution-profile-end" x="620" y="165" text-anchor="end"></text></svg></section>
 </div></div>
 <section class="pollution-points"><div class="pollution-section-heading"><div><h3>虚拟观察断面</h3><p>当前浓度与未来12小时的模型响应；首次超阈指达到教学比较阈值。</p></div>${action('export','导出 GIS 分析')}</div><div class="pollution-point-grid">${[0,1,2].map(i=>`<article class="pollution-point-card"><button type="button" data-pollution-point="${i}" class="pollution-point-heading" disabled aria-label="在地图定位观察断面${['一','二','三'][i]}"><span class="pollution-point-number">${i+1}</span><span>观察断面${['一','二','三'][i]}</span><span class="pollution-point-locate" aria-hidden="true">地图定位</span></button><p id="pollution-point-distance-${i}">—</p><dl><div><dt>当前浓度</dt><dd id="pollution-point-current-${i}">—</dd></div><div><dt>首次超阈</dt><dd id="pollution-point-entry-${i}">—</dd></div><div><dt>模型峰值</dt><dd id="pollution-point-peak-${i}">—</dd></div><div><dt>峰值时刻</dt><dd id="pollution-point-time-${i}">—</dd></div></dl><span id="pollution-point-state-${i}" class="pollution-point-state">待计算</span></article>`).join('')}</div></section>
 <section class="pollution-record-shortcut panel"><div><h3>推演记录</h3><p>断面超阈与回落会保存到统一的事件记录。</p><p id="pollution-storage-status"></p></div><button type="button" class="btn" data-monitor-tool="records">查看事件记录 <span id="pollution-record-count"></span></button></section>
 <details class="pollution-model-details panel"><summary>模型、质量平衡与资料来源</summary><p>采用一维定常流速、常弥散系数的高斯团块解析式，初始标准差60m，可叠加一阶衰减。浓度假设在等效过水断面内完全混合。有限地图河段只截取无限河道模型的一部分，超出两端的质量记为河段外。</p><p id="pollution-mass-balance"></p><p>C(x,t)＝1000 M(t) exp[−(x−x₀−ut)² / (2σ²)] / (A√(2πσ²))；σ²＝60²＋2Dt；M(t)按半衰期衰减。C单位mg/L、质量kg、距离m、时间s。所有参数均为教学假设，未考虑支流、潮汐、二维混合、吸附及真实排污过程，不用于现场水质或应急判断。</p><p>真实河道折线来自本站OpenStreetMap快照（ODbL），观察断面为沿程30%、55%、80%的虚拟位置。流向为教学设定。<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">地图来源与许可</a> · <a href="https://water.usgs.gov/software/OTIS/" target="_blank" rel="noopener">USGS一维溶质输运概念</a>（概念参考，本站未运行OTIS）。</p></details>
 </section>`}
 class Workspace {
  constructor(root){
   this.root=root;this.dead=false;this.ready=false;this.playing=false;this.settingSource=false;this.layers=[];this.segments=[];this.markers=[];
   this.onClick=e=>this.click(e);this.onInput=e=>this.input(e);this.onChange=e=>{if(e.target.id==='pollution-reach')this.choose(e.target.value)};
   this.onVisibility=()=>{if(document.hidden)this.pause()};this.onPreference=()=>{if(this.preference.matches)this.pause()};
   this.preference=matchMedia('(prefers-reduced-motion: reduce)');root.addEventListener('click',this.onClick);root.addEventListener('input',this.onInput);root.addEventListener('change',this.onChange);document.addEventListener('visibilitychange',this.onVisibility);this.preference.addEventListener('change',this.onPreference);
   this.events();this.load();
  }
  $(s){return this.root.querySelector(s)}
  text(id,value){const el=this.$('#'+id);if(el)el.textContent=value}
  newRun(){session.run=Date.now().toString(36)+'-'+(++serial);session.seen=new Set()}
  async load(){
   this.text('pollution-map-status','正在载入河道…');
   try{
    dataPromise ||=fetch(new URL('assets/data/pollution-reaches.geojson',document.baseURI)).then(r=>{if(!r.ok)throw Error('河段未载入');return r.json()}).catch(e=>{dataPromise=null;throw e});
    const data=await dataPromise;if(this.dead)return;this.reaches=data.features.map(M.createReach);if(!this.reaches.length)throw Error('河段为空');
    const select=this.$('#pollution-reach');select.innerHTML=this.reaches.map(r=>`<option value="${esc(r.id)}">${esc(r.name)}</option>`).join('');
    this.root.querySelectorAll('input,select').forEach(el=>el.disabled=false);this.ready=true;
    if(window.HydroMap&&window.L){this.base=new window.HydroMap(this.$('#pollution-map'),{stations:[],selected:-1,onSelect(){}});this.map=this.base.map;if(this.map){this.map.createPane('pollution');this.map.getPane('pollution').style.zIndex=450;this.onMapClick=e=>{if(this.settingSource&&!e.target.closest('.leaflet-control,.leaflet-popup'))this.mapSource({latlng:this.map.mouseEventToLatLng(e)})};this.$('#pollution-map').addEventListener('click',this.onMapClick,true)}}
    if(!this.map)this.$('#pollution-map').innerHTML='<p class="map-unavailable">地图暂不可用，沿程浓度和断面分析仍可使用。</p>';
    this.root.querySelectorAll('[data-pollution-action]').forEach(button=>{button.disabled=false;if(!this.map&&['fit','source'].includes(button.dataset.pollutionAction))button.hidden=true});
    this.root.querySelectorAll('[data-pollution-point]').forEach(button=>{if(this.map)button.disabled=false;else{const title=document.createElement('h4');title.className=button.className;for(const node of [...button.childNodes])if(!node.classList?.contains('pollution-point-locate'))title.append(node);button.replaceWith(title)}});
    this.choose(session.reach,false);
   }catch{if(!this.dead)this.$('#pollution-map-status').innerHTML='河段载入失败，可重试。 '+action('retry','重新载入')}
  }
  choose(id,reset=true){
   this.pause();this.settingSource=false;this.reach=this.reaches.find(r=>r.id===id)||this.reaches[0];session.reach=this.reach.id;this.$('#pollution-reach').value=session.reach;
   if(reset){session.minute=0;this.newRun()}else if(!session.run)this.newRun();
   this.text('pollution-reach-name',this.reach.name);this.text('pollution-reach-length',`${fixed(this.reach.length/1000)} km · ${this.reach.direction}`);
   this.buildMap();this.syncInputs();this.draw();
  }
  buildMap(){
   if(!this.map)return;for(const layer of this.layers)layer.remove();this.layers=[];this.segments=[];this.markers=[];const L=window.L,toLat=c=>[c[1],c[0]],add=l=>{l.addTo(this.map);this.layers.push(l);return l};
   this.routeLayer=add(L.polyline(this.reach.coordinates.map(toLat),{pane:'pollution',color:'#649ca1',weight:7,opacity:.5,interactive:false}));
   for(let i=0;i<260;i++){const a=this.reach.length*i/260,b=this.reach.length*(i+1)/260;this.segments.push({x:(a+b)/2,layer:add(L.polyline(M.lineBetween(this.reach,a,b).map(toLat),{pane:'pollution',weight:11,opacity:0,interactive:false,lineCap:'butt'}))})}
   for(const f of [.2,.45,.7]){const x=this.reach.length*f,c=M.pointAt(this.reach,x),a=M.pointAt(this.reach,x-30),b=M.pointAt(this.reach,x+30),angle=Math.atan2(-(b[1]-a[1]),(b[0]-a[0])*Math.cos(c[1]*Math.PI/180))*180/Math.PI;add(L.marker(toLat(c),{pane:'pollution',interactive:false,keyboard:false,icon:L.divIcon({className:'pollution-flow-arrow',iconSize:[24,24],iconAnchor:[12,12],html:`<svg viewBox="0 0 24 24" aria-hidden="true" style="transform:rotate(${angle}deg)"><path d="M3 12H21M14 5L21 12L14 19"/></svg>`})}))}
   this.sourceMarker=add(L.marker(toLat(M.pointAt(this.reach,this.reach.length*session.params.source/100)),{title:'查看教学释放点',keyboard:true,icon:L.divIcon({className:'pollution-source-marker',html:'<span>源</span>',iconSize:[34,34],iconAnchor:[17,17]})}));
   this.sourceMarker.bindPopup('教学释放点');this.sourceMarker.on('keydown',e=>{if(e.originalEvent?.key===' '){L.DomEvent.stop(e.originalEvent);this.sourceMarker.openPopup()}});
   for(let i=0;i<3;i++){const c=M.pointAt(this.reach,this.reach.length*[.3,.55,.8][i]);const marker=add(L.marker(toLat(c),{title:'虚拟观察断面'+(i+1),icon:L.divIcon({className:'pollution-section-marker',html:`<span>${i+1}</span>`,iconSize:[34,34],iconAnchor:[17,17]})}));marker.bindPopup('虚拟观察断面');marker.on('keydown',e=>{if(e.originalEvent?.key===' '){L.DomEvent.stop(e.originalEvent);marker.openPopup()}});this.markers.push(marker)}
   this.fit();
  }
  fit(){if(this.map&&this.routeLayer){this.map.invalidateSize({pan:false});this.map.fitBounds(this.routeLayer.getBounds(),{padding:[38,42],maxZoom:14,animate:false})}}
  syncInputs(){
   for(const [key,value] of Object.entries(session.params)){const el=this.$('#pollution-'+key);if(el)el.value=value;this.text('pollution-output-'+key,key==='velocity'?fixed(value,2):['source','threshold'].includes(key)?fixed(value,1):fixed(value,0))}
   this.$('[data-pollution-action="source"]').setAttribute('aria-pressed',String(this.settingSource));this.$('#pollution-map').classList.toggle('setting-source',this.settingSource);
  }
  input(e){
   if(!this.ready)return;
   if(e.target.id==='pollution-time'){this.pause();session.minute=Number(e.target.value);this.draw(true);return}
   const key=e.target.dataset.pollutionParam;if(!Object.hasOwn(M.defaults,key))return;
   this.pause();session.params=M.normalize({...session.params,[key]:Number(e.target.value)});session.minute=0;this.newRun();this.syncInputs();this.draw();
  }
  mapSource(e){
   if(!this.settingSource)return;const nearest=M.project(this.reach,[e.latlng.lng,e.latlng.lat]);if(nearest.distance>2000){this.text('pollution-map-status','请在选定河段附近点击，释放点会吸附到河道。');return}
   this.pause();session.params.source=+Math.max(5,Math.min(95,nearest.chainage/this.reach.length*100)).toFixed(1);session.minute=0;this.newRun();this.settingSource=false;this.syncInputs();this.draw();this.text('pollution-map-status',`释放点已吸附到选定河段，距起点${fixed(this.analysis.source/1000)} km。`);
  }
  click(e){
   const point=e.target.closest('[data-pollution-point]');if(point&&this.ready){const i=+point.dataset.pollutionPoint,p=this.analysis.points[i];if(this.map){this.map.setView([p.coordinate[1],p.coordinate[0]],14,{animate:false});this.markers[i].openPopup();this.$('#pollution-map').scrollIntoView({block:'center',behavior:'instant'});if(e.detail===0)this.markers[i].getElement()?.focus({preventScroll:true})}return}
   const button=e.target.closest('[data-pollution-action]');if(!button)return;const key=button.dataset.pollutionAction;
   if(key==='retry'){this.load();return}if(key==='clear'){ledger.clear();this.events();this.text('pollution-events-live','记录已清空。');return}if(key==='export-events'){this.download({title:'智水监测 · 污染扩散教学事件',boundary:'虚拟断面与教学阈值，非真实污染事件。',events:ledger.list()},'智水-污染推演记录.json','application/json');return}if(!this.ready)return;
   if(key==='source'){this.settingSource=!this.settingSource;this.syncInputs();this.text('pollution-map-status',this.settingSource?'点击选定河段附近设置释放点；再次点击按钮可取消。':'释放点设置已取消。')}
   if(key==='fit')this.fit();
   if(key==='play'){if(this.playing)this.pause();else{if(session.minute>=M.horizon){session.minute=0;this.newRun()}this.playing=true;this.timer=setInterval(()=>{if(document.hidden||this.dead){this.pause();return}session.minute=Math.min(M.horizon,session.minute+5);this.draw(true);if(session.minute>=M.horizon)this.pause()},500);this.draw(true)}}
   if(key==='step'){this.pause();session.minute=Math.min(M.horizon,session.minute+10);this.draw(true)}
   if(key==='reset'){this.pause();session.minute=0;this.draw()}
   if(key==='defaults'){this.pause();session.params={...M.defaults};session.minute=0;this.newRun();this.syncInputs();this.draw()}
   if(key==='export')this.download(M.exportSnapshot(this.reach,this.analysis,ledger.list()),'智水-污染扩散分析.geojson','application/geo+json');
  }
  draw(record=false){
   if(!this.ready||this.dead)return;const a=this.analysis=M.analyze(this.reach,session.params,session.minute),p=a.params;
   if(record){const pending=ledger.observe(session.run,this.reach,a,session.seen).filter(e=>!session.seen.has(e.id));pending.forEach(e=>session.seen.add(e.id));if(pending.length){this.events();this.text('pollution-events-live',`新增${pending.length}条模拟断面事件。`)}}
   if(this.sourceMarker){this.sourceMarker.setPopupContent(`<div class="pollution-popup"><strong>教学释放点</strong><p>距河段起点 ${fixed(a.source/1000)} km · ${fixed(p.source,1)}%</p><p>释放质量 ${fixed(p.mass,0)} kg · 模拟第0分钟释放</p><small>假设释放 · 非实际排污点</small></div>`);this.sourceMarker.getElement()?.setAttribute('aria-label','查看教学释放点，距河段起点'+fixed(a.source/1000)+'公里')}
   this.text('pollution-clock',`${time(a.minute)} / 12小时`);this.$('#pollution-time').value=a.minute;this.$('[data-pollution-action="play"]').textContent=this.playing?'暂停推演':'播放推演';
   this.text('pollution-play-status',this.playing?'播放中 · 每秒推进10分钟':a.minute>=M.horizon?'已到12小时，可回放或重新播放。':'已暂停 · 可拖动时间轴，或前进10分钟');
   this.text('pollution-peak',fixed(a.peak));this.text('pollution-length',fixed(a.affectedLength/1000));this.text('pollution-mass-remaining',fixed(a.mass.inside,1));
   if(!this.settingSource)this.text('pollution-map-status',a.center>this.reach.length?'团块中心已移出选定河段；剩余尾部仍按模型计算。':`当前教学阈值 ${fixed(p.threshold,1)} mg/L · 团块中心距释放点${fixed((a.center-a.source)/1000)} km`);
   this.text('pollution-mass-balance',`释放${fixed(p.mass,1)} kg＝河段内${fixed(a.mass.inside,1)} kg＋河段外${fixed(a.mass.outside,1)} kg＋已衰减${fixed(a.mass.decayed,1)} kg（显示值经四舍五入）。`);
   if(this.map){this.sourceMarker.setLatLng([M.pointAt(this.reach,a.source)[1],M.pointAt(this.reach,a.source)[0]]);for(const s of this.segments){const ratio=M.concentration(p,a.source,s.x,a.minute)/p.threshold;s.layer.setStyle({color:ratio>=2?'#9d456c':ratio>=1?'#cf643a':ratio>=.25?'#d6a443':'#65a7a2',opacity:ratio<.02?0:.95})}}
   for(const point of a.points){const i=point.index,over=point.concentration>=p.threshold,status=over?'模拟超阈':point.exit!==null&&a.minute>=point.exit?'已回到阈值以下':point.entry===null?'12小时内未达阈值':a.minute<point.entry?'尚未达阈值':'低于阈值';
    this.text('pollution-point-distance-'+i,`${point.fromSource<0?'释放点上游':'释放点下游'} ${fixed(Math.abs(point.fromSource)/1000)} km`);this.text('pollution-point-current-'+i,fixed(point.concentration)+' mg/L');this.text('pollution-point-entry-'+i,time(point.entry));this.text('pollution-point-peak-'+i,fixed(point.peak)+' mg/L');this.text('pollution-point-time-'+i,time(point.peakMinute));this.text('pollution-point-state-'+i,status);this.$('#pollution-point-state-'+i).classList.toggle('is-over',over);
    if(this.markers[i]){const marker=this.markers[i];marker.getElement()?.classList.toggle('is-over',over);marker.getElement()?.setAttribute('aria-label',`${point.name}，${status}，模拟浓度${fixed(point.concentration)}毫克每升`);marker.setPopupContent(`<div class="pollution-popup"><strong>${esc(point.name)}</strong><p>${esc(status)} · ${fixed(point.concentration)} mg/L</p><p>首次超阈：${time(point.entry)}<br>教学阈值：${fixed(p.threshold,1)} mg/L</p><small>虚拟断面 · 非监测数据</small></div>`)}}
   const max=Math.max(p.threshold*1.5,a.peak*1.15,.1),x=d=>38+d/this.reach.length*582,y=c=>140-Math.min(max,c)/max*112;
   const path=Array.from({length:241},(_,i)=>{const d=i/240*this.reach.length;return `${i?'L':'M'}${x(d).toFixed(2)} ${y(M.concentration(p,a.source,d,a.minute)).toFixed(2)}`}).join(' ');
   this.$('#pollution-profile-line').setAttribute('d',path);this.$('#pollution-profile-fill').setAttribute('d',path+' L620 140 L38 140Z');this.$('#pollution-profile-threshold').setAttribute('d',`M38 ${y(p.threshold)}H620`);this.$('#pollution-profile-threshold-label').setAttribute('y',Math.max(26,y(p.threshold)-6));this.text('pollution-profile-threshold-label','教学阈值 '+fixed(p.threshold,1));this.text('pollution-profile-end',fixed(this.reach.length/1000)+' km');this.text('pollution-profile-max','纵轴上限 '+fixed(max)+' mg/L');this.$('#pollution-profile-chart').setAttribute('aria-label',`${time(a.minute)}沿河模拟浓度，河段内峰值${fixed(a.peak)}毫克每升`);
  }
  events(){
   const records=ledger.list();if(!this.$('#pollution-events-list')){this.text('pollution-record-count',records.length?'（'+records.length+'）':'');this.text('pollution-storage-status',ledger.available()?'':'本机存储不可用，记录仅保留本次会话；可导出保存。');return}this.$('#pollution-events-list').innerHTML=records.length?`<ol>${records.slice(0,12).map(e=>`<li><span class="pollution-event-kind ${e.kind}">${e.kind==='enter'?'超阈':'回落'}</span><div><strong>${esc(e.reachName)} · 断面${e.point+1}</strong><p>推演${time(e.minute)} · ${e.kind==='enter'?'达到':'降回'}教学阈值 ${fixed(e.threshold,1)} mg/L</p></div><time>${new Date(e.at).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})}</time></li>`).join('')}</ol><p class="pollution-event-count">共${records.length}条，本页显示最近12条；导出包含全部保留记录。</p>`:'<p class="pollution-empty">暂无模拟事件。播放或拖动时间轴后，断面达到阈值及回落的时刻会记入这里。</p>';
   this.text('pollution-storage-status',ledger.available()?'':'本机存储不可用，记录仅保留本次会话；可导出保存。');
  }
  download(value,name,type){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type})),link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
  pause(){clearInterval(this.timer);this.timer=null;this.playing=false;if(this.ready&&!this.dead){this.$('[data-pollution-action="play"]').textContent='播放推演';this.text('pollution-play-status',session.minute>=M.horizon?'已到12小时，可回放或重新播放。':'已暂停 · 可拖动时间轴，或前进10分钟')}}
  destroy(){this.pause();this.dead=true;this.$('#pollution-map')?.removeEventListener('click',this.onMapClick,true);this.base?.destroy();this.root.removeEventListener('click',this.onClick);this.root.removeEventListener('input',this.onInput);this.root.removeEventListener('change',this.onChange);document.removeEventListener('visibilitychange',this.onVisibility);this.preference.removeEventListener('change',this.onPreference)}
 }
 window.HydroPollutionView={render,pause(){active?.pause()},records:()=>ledger.list(),available:()=>ledger.available(),clearRecords(){ledger.clear();active?.events()},inspectRecord(id){const e=ledger.list().find(r=>r.id===id);if(!e)return false;session.params=M.normalize(e.params);session.reach=e.reach;session.minute=e.minute;session.run=e.run;session.seen=new Set(ledger.list().filter(r=>r.run===e.run).map(r=>r.id));return true},mount(root){active?.destroy();if(root)active=new Workspace(root)},destroy(){active?.destroy();active=null}};
})();
