/* True WGS84 waterways, presented as a calm local water map. */
(() => {
 'use strict';
 let geometryPromise,contextPromise;
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 class HydroMap {
  constructor(element,options){
   this.element=element;this.options=options;this.markers=new Map();this.dead=false;this.mode='water';this.layerSettings={water:true,alerts:true,lakes:true,...options.layers};
   if(!window.L){element.innerHTML='<p class="map-unavailable">地图未加载，请从地点列表选择。</p>';return}
   const L=window.L;
   element.classList.add('water-atlas');
   this.map=L.map(element,{preferCanvas:true,scrollWheelZoom:false,zoomControl:false,attributionControl:true,minZoom:8,maxZoom:16,zoomAnimation:false,fadeAnimation:false}).setView([32.035,118.77],12);
   L.control.zoom({zoomInTitle:'放大地图',zoomOutTitle:'缩小地图'}).addTo(this.map);
   const north=L.control({position:'topright'});north.onAdd=()=>{const node=document.createElement('div');node.className='map-north';node.setAttribute('aria-label','地图朝北');node.innerHTML='<svg viewBox="0 0 20 26" aria-hidden="true"><path d="M10 2 18 23 10 18 2 23Z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10 2V18L18 23Z" fill="currentColor"/></svg><span>N</span>';return node};north.addTo(this.map);
   this.map.attributionControl.setPrefix(false);
   this.map.attributionControl.addAttribution('水系 © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>');
   this.map.createPane('waterSilhouette');this.map.getPane('waterSilhouette').style.zIndex=380;this.map.getPane('waterSilhouette').style.pointerEvents='none';
   this.map.createPane('landContext');this.map.getPane('landContext').style.zIndex=390;this.map.getPane('landContext').style.pointerEvents='none';
   this.map.createPane('waterGeometry');this.map.getPane('waterGeometry').style.zIndex=410;
   this.map.createPane('contextLabels');this.map.getPane('contextLabels').style.zIndex=425;this.map.getPane('contextLabels').style.pointerEvents='none';
   this.map.createPane('waterLabels');this.map.getPane('waterLabels').style.zIndex=420;this.map.getPane('waterLabels').style.pointerEvents='none';
   this.tiles=L.tileLayer(options.tileUrl||'https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:16,updateWhenIdle:true,keepBuffer:1,attribution:'街道 © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OSM</a>'});
   this.tiles.on('tileerror',()=>{if(this.dead)return;this.tileFailed=true;if(this.mode==='streets'){this.status('街道底图暂不可达，水系与地点仍可使用。');this.applyLayers();this.showContextLabels()}});
   this.tiles.on('tileload',()=>{if(this.dead)return;if(this.mode==='streets'&&!this.tileFailed)this.status('')});
   this.contextLabels=L.layerGroup();this.riverLabels=L.layerGroup().addTo(this.map);this.lakeLabels=L.layerGroup().addTo(this.map);
   L.control.scale({imperial:false,position:'bottomleft',maxWidth:100}).addTo(this.map);
   this.map.on('moveend zoomend popupopen popupclose',()=>{this.layoutLabels();this.showContextLabels()});this.resizeObserver=new ResizeObserver(()=>{if(!this.dead){this.map.invalidateSize({pan:false});this.layoutLabels()}});this.resizeObserver.observe(element);
   contextPromise ||= fetch(new URL('assets/data/nanjing-context.geojson',document.baseURI)).then(r=>{if(!r.ok)throw Error('context');return r.json()}).catch(error=>{contextPromise=null;throw error});
   contextPromise.then(data=>{if(this.dead)return;this.context=L.geoJSON(data,{pane:'landContext',interactive:false,style:f=>f.properties.kind==='road'?{color:'#c8d1c8',weight:1.5,opacity:.85}:f.properties.kind==='park'?{color:'#c5d4b8',weight:.6,fillColor:'#dce7cf',fillOpacity:.75}:{color:'#80b8bd',weight:1,fillColor:'#a8d3d8',fillOpacity:.85}}).addTo(this.map);this.addContextLabels(data);this.applyLayers()}).catch(()=>{});
   geometryPromise ||= fetch(new URL('assets/data/nanjing-water.geojson',document.baseURI)).then(r=>{if(!r.ok)throw Error('geometry');return r.json()}).catch(error=>{geometryPromise=null;throw error});
   geometryPromise.then(data=>{
    if(this.dead)return;
    const width=()=>Math.min(360,2200/(156543.03392*Math.cos(this.map.getCenter().lat*Math.PI/180)/2**this.map.getZoom()));
    this.silhouette=L.geoJSON(data,{pane:'waterSilhouette',interactive:false,filter:f=>f.geometry.type==='LineString'&&f.properties.name==='长江',style:()=>({color:'#b1d5d8',weight:width(),opacity:.9,lineCap:'round',lineJoin:'round'})}).addTo(this.map);
    this.map.on('zoomend',()=>this.silhouette?.setStyle({weight:width()}));
    this.geometry=L.geoJSON(data,{pane:'waterGeometry',style:f=>({color:f.geometry.type==='LineString'?'#63aeb5':'#77b1b1',weight:f.geometry.type==='LineString'?(f.properties.name==='长江'?2:/新河|外秦淮/.test(f.properties.name)?5:2.5):1.5,opacity:.9,fillColor:'#b6dcd6',fillOpacity:.8,lineCap:'round',lineJoin:'round'})}).addTo(this.map);
    this.geometry.eachLayer(layer=>{layer.bindTooltip(esc(layer.feature.properties.name),{sticky:true,direction:'top',className:'water-name-tip'});layer.on('click',e=>{if(e.originalEvent)L.DomEvent.stopPropagation(e.originalEvent);this.selectWater(layer.feature,e.latlng)})});
    const candidates=new Map(),anchors={'长江':[118.675,32.025],'外秦淮河':[118.735,32.055],'秦淮新河':[118.74,31.96]};
    for(const f of data.features){const name=f.properties.name;if(!Object.hasOwn(anchors,name)||f.geometry.type!=='LineString')continue;candidates.set(name,[...(candidates.get(name)||[]),...f.geometry.coordinates])}
    for(const [name,coords] of candidates){const anchor=anchors[name],p=coords.reduce((best,p)=>Math.hypot(p[0]-anchor[0],p[1]-anchor[1])<Math.hypot(best[0]-anchor[0],best[1]-anchor[1])?p:best,coords[0]);L.marker([p[1],p[0]],{pane:'waterLabels',interactive:false,keyboard:false,icon:L.divIcon({className:'water-label',html:esc(name),iconSize:[110,26],iconAnchor:[55,13]})}).addTo(this.riverLabels)}
    for(const index of [6,7]){const p=window.HydroAtlas?.places.find(p=>p.index===index);if(p)L.marker([p.lat+.009,p.lng],{pane:'waterLabels',interactive:false,keyboard:false,icon:L.divIcon({className:'water-label lake-label',html:esc(p.name),iconSize:[100,26],iconAnchor:[50,13]})}).addTo(this.lakeLabels)}
    this.paintWater();this.applyLayers();this.status('');
   }).catch(()=>{if(!this.dead)this.status('水系未加载，可从地点列表选择，或切换街道图。')});
   this.update(options.stations,options.selected);if(options.focusAll)this.fitAll();
  }
  setBasemap(mode){if(this.dead||!this.map)return;this.mode=mode==='streets'?'streets':'water';this.element.classList.toggle('street-view',this.mode==='streets');if(this.mode==='streets'){this.tileFailed=false;this.tiles.addTo(this.map)}else{this.tiles.remove();this.status('')}this.applyLayers();this.showContextLabels()}
  status(text){const el=this.options.statusElement;if(el){el.textContent=text;el.hidden=!text}}
  setLayers(settings){this.layerSettings={...this.layerSettings,...settings};this.applyLayers();if(this.stations)this.update(this.stations,this.selected)}
  applyLayers(){if(this.dead||!this.map)return;const show=(layer,visible)=>{if(!layer)return;if(visible&&!this.map.hasLayer(layer))layer.addTo(this.map);if(!visible&&this.map.hasLayer(layer))layer.remove()};show(this.silhouette,this.layerSettings.water&&(this.mode==='water'||this.tileFailed));show(this.riverLabels,this.layerSettings.water);show(this.lakeLabels,this.layerSettings.lakes);this.geometry?.eachLayer(layer=>show(layer,layer.feature.geometry.type==='LineString'?this.layerSettings.water:this.layerSettings.lakes));this.context?.eachLayer(layer=>show(layer,(this.mode==='water'||this.tileFailed)&&(layer.feature.properties.kind!=='water'||this.layerSettings.water)))}
  addContextLabels(data){
   const L=window.L,names=['南京长江大桥','南京江心洲长江大桥','北京东路','中山东路','江东中路','中华门城堡','东水关遗址公园','南京中国绿化博览园'];
   for(const name of names){const features=data.features.filter(f=>f.properties.name===name),coords=f=>f.geometry.type==='LineString'?f.geometry.coordinates:f.geometry.type==='Polygon'?f.geometry.coordinates[0]:f.geometry.type==='MultiPolygon'?f.geometry.coordinates[0][0]:[];
    const feature=features.sort((a,b)=>coords(b).length-coords(a).length)[0];if(!feature)continue;const points=coords(feature);if(!points.length)continue;const point=feature.geometry.type==='LineString'?points[Math.floor(points.length/2)]:[(Math.min(...points.map(p=>p[0]))+Math.max(...points.map(p=>p[0])))/2,(Math.min(...points.map(p=>p[1]))+Math.max(...points.map(p=>p[1])))/2];
    L.marker([point[1],point[0]],{pane:'contextLabels',interactive:false,keyboard:false,icon:L.divIcon({className:'map-context-label',html:esc(name),iconSize:[150,24],iconAnchor:[75,12]})}).addTo(this.contextLabels);
   }this.showContextLabels();
  }
  showContextLabels(){if(this.dead||!this.map||!this.contextLabels)return;const visible=(this.mode==='water'||this.tileFailed)&&this.map.getZoom()>=12;if(visible&&!this.map.hasLayer(this.contextLabels))this.contextLabels.addTo(this.map);if(!visible&&this.map.hasLayer(this.contextLabels))this.contextLabels.remove()}
  paintWater(){if(this.dead||!this.map||!this.stations)return;const rank=group=>Math.max(0,...this.stations.filter(s=>s.group===group).map(s=>window.HydroSandbox?.stage(s.level,s.limit)||0)),palette=['#99cbd0','#89bac6','#6ca6b9','#518ba4'];this.silhouette?.setStyle({color:palette[rank('yangtze')]});this.geometry?.eachLayer(layer=>{const f=layer.feature,lake=f.geometry.type!=='LineString',group=lake?'lake':f.properties.name==='长江'?'yangtze':'qinhuai',point=lake?this.stations.find(s=>s.group==='lake'&&f.properties.name===s.name):null,value=lake?(point?window.HydroSandbox?.stage(point.level,point.limit)||0:0):rank(group);layer.setStyle({color:lake?palette[value]:'#579eac',...(lake?{fillColor:palette[value]}:{})})})}
  selectWater(feature,latlng){
   const name=feature.properties.name,group=feature.geometry.type==='LineString'?(name==='长江'?'yangtze':'qinhuai'):'lake';
   const candidates=this.stations.filter(s=>s.group===group&&(group!=='lake'||s.name===name));if(!candidates.length)return;
   const nearest=candidates.reduce((a,b)=>latlng.distanceTo([a.lat,a.lng])<latlng.distanceTo([b.lat,b.lng])?a:b);
   this.options.onSelect(nearest.index);this.focusStation(nearest.index,{openPopup:true});
  }
  update(stations,selected){this.stations=stations;this.selected=selected;if(this.dead||!this.map)return;const L=window.L,active=new Set(stations.map(s=>s.id));for(const [id,entry] of this.markers)if(!active.has(id)){entry.marker.remove();this.markers.delete(id)}
   for(const s of stations){const rank=window.HydroSandbox?.stage(s.level,s.limit)||0,st=window.HydroSandbox?.stages[rank]||{key:'calm',name:'教学状态',symbol:'○'},alarm=this.layerSettings.alerts&&rank>=2,isSelected=s.index===selected;let entry=this.markers.get(s.id);
    if(!entry){const marker=L.marker([s.lat,s.lng],{keyboard:true,title:s.name,alt:s.name,riseOnHover:true,icon:L.divIcon({className:'geographic-marker',iconSize:[44,44],iconAnchor:[22,22],html:''})}).addTo(this.map);
     const click=()=>{this.options.onSelect(s.index);this.openStationPopup(s.index)};marker.on('click',click);
     marker.on('keydown',e=>{if(e.originalEvent?.key===' '){L.DomEvent.stop(e.originalEvent);marker.fire('click')}});
     entry={marker,click,visualKey:null};this.markers.set(s.id,entry)
    }
    const el=entry.marker.getElement();if(el){
     el.setAttribute('role','button');el.setAttribute('aria-label',`${s.name}，${st.name}，模拟水位 ${s.level.toFixed(2)} 米`);el.setAttribute('aria-pressed',String(isSelected));
     el.classList.toggle('marker-selected',isSelected);el.classList.toggle('marker-alert',alarm);
     const html=`<span class="atlas-pin ${this.layerSettings.alerts?st.key:'calm'} ${isSelected?'selected':''}"><i>${s.index+1}</i>${this.layerSettings.alerts&&rank?`<b class="atlas-status-symbol">${st.symbol}</b>`:''}</span><span class="atlas-marker-label ${alarm?st.key:''}"><strong>${esc(s.name)}</strong><small>${s.level.toFixed(2)} m${alarm?' · '+(rank===3?'模拟高位':'模拟超阈'):''}</small></span>`;
     const visualKey=`${rank}|${isSelected}|${this.layerSettings.alerts}`;if(visualKey!==entry.visualKey){el.innerHTML=html;entry.visualKey=visualKey}else{const reading=el.querySelector('.atlas-marker-label small');if(reading)reading.textContent=`${s.level.toFixed(2)} m${alarm?' · '+(rank===3?'模拟高位':'模拟超阈'):''}`}
    }
    entry.marker.setZIndexOffset(isSelected?2000:alarm?1000+rank*100:0);
    const tip=`${esc(s.name)} · ${esc(st.name)} · ${s.level.toFixed(2)} m`;if(entry.marker.getTooltip())entry.marker.setTooltipContent(tip);else entry.marker.bindTooltip(tip,{direction:'top',offset:[0,-20],className:'station-name-tip'});
    if(entry.marker.isPopupOpen()&&this.options.popupContent&&!entry.marker.getPopup().getElement()?.contains(document.activeElement))entry.marker.setPopupContent(this.options.popupContent(s.index));
   }this.paintWater();this.layoutLabels();
  }
  layoutLabels(){
   if(this.dead||!this.map||!this.stations)return;const size=this.map.getSize();if(!size.x||!size.y)return;
   const points=this.stations.map(s=>({...s,rank:window.HydroSandbox?.stage(s.level,s.limit)||0,p:this.map.latLngToContainerPoint([s.lat,s.lng])}));
   const placed=[],overlap=(a,b)=>a.x<b.x+b.w+5&&a.x+a.w+5>b.x&&a.y<b.y+b.h+5&&a.y+a.h+5>b.y;
   points.sort((a,b)=>(b.index===this.selected)-(a.index===this.selected)||b.rank-a.rank);
   for(const s of points){const el=this.markers.get(s.id)?.marker.getElement(),label=el?.querySelector('.atlas-marker-label');if(!label)continue;
    const chosen=s.index===this.selected,alarm=this.layerSettings.alerts&&s.rank>=2,inside=s.p.x>=0&&s.p.x<=size.x&&s.p.y>=0&&s.p.y<=size.y;
    label.hidden=!!this.markers.get(s.id)?.marker.isPopupOpen()||!(inside&&(chosen||alarm||this.map.getZoom()>=13));if(label.hidden)continue;
    const w=label.offsetWidth,h=label.offsetHeight,candidates=[[s.p.x+27,s.p.y-h/2],[s.p.x-w/2,s.p.y-h-28],[s.p.x-w-27,s.p.y-h/2],[s.p.x-w/2,s.p.y+28]];
    let candidate=candidates.map(([x,y])=>({x,y,w,h})).find(r=>r.x>=10&&r.y>=10&&r.x+w<=size.x-10&&r.y+h<=size.y-10&&!placed.some(p=>overlap(r,p))&&!points.some(p=>p.index!==s.index&&overlap(r,{x:p.p.x-19,y:p.p.y-19,w:38,h:38})));
    if(!candidate&&chosen)candidate={x:Math.max(10,Math.min(size.x-w-10,s.p.x-w/2)),y:Math.max(10,Math.min(size.y-h-10,s.p.y-h-30)),w,h};
    if(!candidate){label.hidden=true;continue}label.style.left=(candidate.x-s.p.x+22)+'px';label.style.top=(candidate.y-s.p.y+22)+'px';placed.push(candidate);
   }
  }
  openStationPopup(index){if(this.dead)return;const s=this.stations.find(s=>s.index===index),entry=s&&this.markers.get(s.id);if(!entry||!this.options.popupContent)return;
   if(!entry.marker.getPopup()){entry.marker.bindPopup(this.options.popupContent(index),{maxWidth:Math.max(180,Math.min(290,this.map.getSize().x-76)),minWidth:Math.min(220,Math.max(180,this.map.getSize().x-76)),autoPan:true,autoPanPaddingTopLeft:[18,40],autoPanPaddingBottomRight:[18,22],className:'station-popup',closeButton:true});entry.marker.off('click');entry.marker.on('click',entry.click)}else entry.marker.setPopupContent(this.options.popupContent(index));entry.marker.openPopup();
  }
  focusStation(index,{openPopup=true,keyboard=false}={}){if(this.dead||!this.map)return false;const p=this.stations.find(s=>s.index===index);if(!p)return false;this.map.stop();this.map.setView([p.lat,p.lng],Math.max(13,this.map.getZoom()),{animate:false});if(openPopup)this.openStationPopup(index);if(keyboard)this.markers.get(p.id)?.marker.getElement()?.focus({preventScroll:true});this.layoutLabels();return true}
  select(index,focus=true){this.update(this.stations,index);if(focus)this.focusStation(index,{openPopup:!!this.options.popupContent})}
  fitAll(){if(this.dead||!this.map||!this.stations?.length)return false;this.map.stop();this.map.closePopup();this.map.invalidateSize({pan:false});const L=window.L,bounds=L.latLngBounds(this.stations.map(s=>[s.lat,s.lng])).pad(.2);if(this.stations.length===1){const p=this.stations[0];bounds.extend([p.lat-.02,p.lng-.03]);bounds.extend([p.lat+.02,p.lng+.03])}this.map.fitBounds(bounds,{padding:[55,60],maxZoom:12,animate:false});this.layoutLabels();return true}
  destroy(){this.dead=true;this.resizeObserver?.disconnect();this.map?.remove();this.markers.clear()}
 }
 window.HydroMap=HydroMap;
})();
