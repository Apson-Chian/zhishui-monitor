/* Edge refraction for Chromium surfaces. Other engines keep the CSS glass material.
   The map encodes only a narrow rim; it never captures or filters foreground text. */
(() => {
 'use strict';
 const root=document.documentElement;
 const cards=[
  '.hero-scene','.home-discovery-card','.home-task-grid>a','.scene-coordinate',
  '.panel:not(.detail-card-slot,.monitor-table-page>.panel>.panel)','.feature-card','.stat-card',
  '.monitor-location-panel','.monitor-location-filters','.monitor-selection-panel','.monitor-analysis-link','.sandbox-panel',
  '.sandbox-inputs','.gate-control','.rain-result-panel','.ledger-entry','.ledger-empty',
  '.pollution-map-panel','.pollution-point-card','.pollution-metrics>div',
  '.lab-result-card','.lab-place-profile','.vision-sample','.vision-result-card','.vision-disclosure','.vision-reading',
  '.hh-report-conclusion','.hh-narrative','.knowledge-card','.knowledge-grid .no-results',
  '.nanjing-place','.real-photo-card','.article-tip','#dialog','.detail-card-dialog'
 ].join(',');
 const toolbars='.sidebar,.mobile-bottom-nav,.sidebar.open #main-nav,.monitor-tool-tabs,.lab-tabs,.atlas-toolbar,.lab-map-toolbar,.pollution-map-toolbar';
 const surfaces=cards+','+toolbars;
 const controls='[data-glass-control],[data-glass-thumb],[data-glass-nav-item]';
 const selector=surfaces+','+controls;
 const reduce=matchMedia('(prefers-reduced-transparency: reduce)'),contrast=matchMedia('(prefers-contrast: more)'),forced=matchMedia('(forced-colors: active)');
 const capable=/Chrome|Chromium|Edg\//.test(navigator.userAgent)&&CSS.supports('backdrop-filter','url("#glass-probe")');
 const ns='http://www.w3.org/2000/svg',entries=new Map(),maps=new Map();let serial=0,frame=0,defs,svg;
 // Translate the reference intensities into edge and lip contributions to a pixel displacement map.
 const edgeIntensity=.10,rimIntensity=.09;
 const enabled=()=>capable&&!document.hidden&&!reduce.matches&&!contrast.matches&&!forced.matches&&root.dataset.glassEffects!=='off';
 function create(tag,attrs){const node=document.createElementNS(ns,tag);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));return node}
 function mapData(width,height,radius,key,optical){
  if(maps.has(key))return maps.get(key);
  const w=Math.min(384,Math.max(16,Math.round(width*.55))),h=Math.min(384,Math.max(16,Math.round(height*.55)));
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  const context=canvas.getContext('2d'),pixels=context.createImageData(w,h);
  const rim=Math.min(optical?24:34,width/4,height/4),r=Math.min(radius,width/2,height/2);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const px=(x+.5)/w*width-width/2,py=(y+.5)/h*height-height/2,qx=Math.abs(px)-(width/2-r),qy=Math.abs(py)-(height/2-r),ax=Math.max(qx,0),ay=Math.max(qy,0),len=Math.hypot(ax,ay),distance=-(len+Math.min(Math.max(qx,qy),0)-r);
   let nx=0,ny=0;if(len>0){nx=ax/len*Math.sign(px);ny=ay/len*Math.sign(py)}else if(qx>qy)nx=Math.sign(px);else ny=Math.sign(py);
   // Sample inward so the rim can pull a line without sampling transparent pixels outside the lens.
   const t=distance/rim,i=(y*w+x)*4;
   const bend=t>0&&t<1
    ?-600*(edgeIntensity*Math.sin(t*Math.PI)+rimIntensity*Math.sin(Math.PI*Math.min(1,t*2.7)))*(1-.35*t)
    :0;
   pixels.data[i]=Math.round(128+nx*bend);pixels.data[i+1]=Math.round(128+ny*bend);pixels.data[i+2]=128;pixels.data[i+3]=255;
  }
  context.putImageData(pixels,0,0);
  const image=canvas.toDataURL('image/png');
  if(maps.size>=48)maps.delete(maps.keys().next().value);
  maps.set(key,image);
  return image;
 }
 function press(node,on){
  const entry=entries.get(node);if(!entry?.channels)return;
  const scale=Math.min(24,Math.min(node.offsetWidth,node.offsetHeight)*.55);
  const multipliers=[1.55,1.14,.68];
  entry.channels.forEach((channel,index)=>channel.setAttribute('scale',on?scale*multipliers[index]:scale));
 }
 function build(node){
  if(!enabled()||!node.isConnected)return;if(node.matches(':disabled,[aria-disabled="true"]')){clear(node);return}
  const underlay=node.hasAttribute('data-liquid-underlay');
  const rect=underlay?{width:node.clientWidth,height:node.clientHeight}:{width:node.offsetWidth,height:node.offsetHeight};
  if(rect.width<24||rect.height<24){clear(node);return}
  const optical=node.matches(controls);
  const style=getComputedStyle(node),radius=style.borderTopLeftRadius;
  let entry=entries.get(node);const key=rect.width+'x'+rect.height+'r'+radius+(optical?'c':'s');if(entry?.key===key)return;
  if(!entry){
   const id='liquid-rim-'+(++serial),filter=create('filter',{id,x:0,y:0,filterUnits:'userSpaceOnUse',primitiveUnits:'userSpaceOnUse','color-interpolation-filters':'sRGB'}),map=create('feImage',{x:0,y:0,width:'100%',height:'100%',preserveAspectRatio:'none',result:'rim'});
   filter.append(map);const channels=[];
   if(optical){
    for(let channel=0;channel<3;channel++){
     const displacement=create('feDisplacementMap',{in:'SourceGraphic',in2:'rim',scale:8,xChannelSelector:'R',yChannelSelector:'G',result:'displaced-'+channel});
     // Combine unpremultiplied channels, then restore the original backdrop alpha.
     // Screening three translucent masks directly would thicken the alpha and grey the glass.
     const matrix=Array(20).fill(0);matrix[channel*5+channel]=1;matrix[19]=1;
     filter.append(displacement,create('feColorMatrix',{in:'displaced-'+channel,type:'matrix',values:matrix.join(' '),result:'channel-'+channel}));channels.push(displacement);
    }
    filter.append(create('feBlend',{in:'channel-0',in2:'channel-1',mode:'screen',result:'red-green'}),create('feBlend',{in:'red-green',in2:'channel-2',mode:'screen',result:'combined-rgb'}),create('feComposite',{in:'combined-rgb',in2:'SourceGraphic',operator:'in'}));
   }else filter.append(create('feDisplacementMap',{in:'SourceGraphic',in2:'rim',scale:Math.min(58,Math.min(rect.width,rect.height)*.78),xChannelSelector:'R',yChannelSelector:'G'}));
   defs.append(filter);entry={filter,map,id,key:'',channels:optical?channels:null};entries.set(node,entry);
  }
  try{
   entry.filter.setAttribute('width',rect.width);entry.filter.setAttribute('height',rect.height);
   entry.map.setAttribute('width',rect.width);entry.map.setAttribute('height',rect.height);
   if(!optical)entry.filter.lastElementChild.setAttribute('scale',Math.min(58,Math.min(rect.width,rect.height)*.78));
   entry.map.setAttribute('href',mapData(rect.width,rect.height,parseFloat(radius)||0,key,optical));
   entry.key=key;node.dataset.liquidLens='';
   const blur=optical?'var(--control-filter)':'var(--liquid-surface-filter)';
   node.style.setProperty('--liquid-lens-filter',`${blur} url("#${entry.id}")`);
   press(node,node.hasAttribute('data-glass-pressed'));
  }catch{clear(node)}
 }
 function clear(node){const entry=entries.get(node);entry?.filter.remove();entries.delete(node);node.removeAttribute('data-liquid-lens');node.style.removeProperty('--liquid-lens-filter')}
 const visible=new WeakSet();
 const resize=new ResizeObserver(records=>{for(const record of records)if(visible.has(record.target))build(record.target)});
 const visibility=new IntersectionObserver(records=>{for(const record of records)if(record.isIntersecting){visible.add(record.target);build(record.target)}else{visible.delete(record.target);clear(record.target)}},{rootMargin:'100px'});
 const watched=new Set(),styled=new Set();
 function scan(){
  frame=0;root.toggleAttribute('data-glass-solid',reduce.matches||contrast.matches||forced.matches);const on=enabled();root.dataset.glassRenderer=on?'svg-rim':'css';
  for(const node of styled)if(!node.isConnected||!node.matches(surfaces)){
   node.removeAttribute('data-liquid-surface');node.removeAttribute('data-liquid-underlay');styled.delete(node);
  }
  for(const node of document.querySelectorAll(surfaces)){
   if(!styled.has(node)){
    node.dataset.liquidSurface=node.matches(toolbars)?'toolbar':'card';
    styled.add(node);
   }
   // Nested lenses can read the glass below them without a filtered ancestor blocking the backdrop.
   const layer=node.matches('#main :not(.scene-coordinate)')&&!!node.querySelector(selector);
   if(layer&&!node.hasAttribute('data-liquid-underlay'))node.dataset.liquidUnderlay=getComputedStyle(node).position==='static'?'relative':'';
   if(!layer)node.removeAttribute('data-liquid-underlay');
  }
  for(const node of watched)if(!on||!node.isConnected||!node.matches(selector)){clear(node);resize.unobserve(node);visibility.unobserve(node);visible.delete(node);watched.delete(node)}
  if(!on)return;
  for(const node of document.querySelectorAll(selector))if(!watched.has(node)){watched.add(node);resize.observe(node);visibility.observe(node)}
  for(const node of watched)if(visible.has(node))build(node);
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(scan)}
 function start(){
  svg=create('svg',{'aria-hidden':'true',width:0,height:0,focusable:'false'});svg.style.cssText='position:fixed;width:0;height:0;pointer-events:none';defs=create('defs',{});svg.append(defs);document.body.append(svg);
  new MutationObserver(records=>{if(records.some(record=>!record.target.closest?.('svg')&&(record.type==='attributes'||[...record.addedNodes].some(node=>node.nodeType===1&&(node.matches?.(selector)||node.querySelector?.(selector)))||[...record.removedNodes].some(node=>node.nodeType===1))))schedule()}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-glass-control','data-glass-thumb','data-glass-nav-item','aria-expanded','open','disabled','aria-disabled']});
  document.addEventListener('zhishui:glasspress',event=>press(event.detail.node,event.detail.pressed));
  new MutationObserver(schedule).observe(root,{attributes:true,attributeFilter:['data-glass-effects']});
  for(const media of [reduce,contrast,forced])media.addEventListener('change',schedule);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){for(const node of entries.keys())clear(node)}else{schedule();for(const node of watched){visibility.unobserve(node);visibility.observe(node)}}});
  window.addEventListener('pagehide',()=>{if(frame)cancelAnimationFrame(frame);frame=0;for(const node of entries.keys())clear(node)});
  window.addEventListener('pageshow',e=>{if(e.persisted){for(const node of watched){visibility.unobserve(node);visibility.observe(node)}schedule()}});
  schedule();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
