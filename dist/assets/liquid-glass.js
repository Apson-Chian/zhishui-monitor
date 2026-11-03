/* Edge refraction for Chromium surfaces. Other engines keep the CSS glass material.
   The map encodes only a narrow rim; it never captures or filters foreground text. */
(() => {
 'use strict';
 const root=document.documentElement,selector='.home-discovery-card,.home-task-grid>a,.monitor-analysis-link,[data-glass-control],[data-glass-thumb]';
 const reduce=matchMedia('(prefers-reduced-transparency: reduce)'),contrast=matchMedia('(prefers-contrast: more)'),forced=matchMedia('(forced-colors: active)');
 const capable=/Chrome|Chromium|Edg\//.test(navigator.userAgent)&&CSS.supports('backdrop-filter','url("#glass-probe")');
 const ns='http://www.w3.org/2000/svg',entries=new Map();let serial=0,frame=0,defs,svg;
 const enabled=()=>capable&&!document.hidden&&!reduce.matches&&!contrast.matches&&!forced.matches&&root.dataset.glassEffects!=='off';
 function create(tag,attrs){const node=document.createElementNS(ns,tag);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));return node}
 function mapData(width,height,radius){
  const ratio=Math.min(.4,256/width,160/height),w=Math.max(12,Math.round(width*ratio)),h=Math.max(12,Math.round(height*ratio));
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const context=canvas.getContext('2d'),pixels=context.createImageData(w,h),rim=Math.min(24,width/6,height/5),r=Math.min(radius,width/2,height/2);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const px=(x+.5)/w*width-width/2,py=(y+.5)/h*height-height/2,qx=Math.abs(px)-(width/2-r),qy=Math.abs(py)-(height/2-r),ax=Math.max(qx,0),ay=Math.max(qy,0),len=Math.hypot(ax,ay),distance=-(len+Math.min(Math.max(qx,qy),0)-r);
   let nx=0,ny=0;if(len>0){nx=ax/len*Math.sign(px);ny=ay/len*Math.sign(py)}else if(qx>qy)nx=Math.sign(px);else ny=Math.sign(py);
   const t=Math.max(0,Math.min(1,distance/rim)),bend=distance>=0&&distance<rim?Math.sin(t*Math.PI)*114:0,i=(y*w+x)*4;
   pixels.data[i]=Math.round(128+nx*bend);pixels.data[i+1]=Math.round(128+ny*bend);pixels.data[i+2]=128;pixels.data[i+3]=255;
  }
  context.putImageData(pixels,0,0);return canvas.toDataURL('image/png');
 }
 function press(node,on){
  const entry=entries.get(node);if(!entry?.channels)return;
  entry.channels.forEach((channel,index)=>channel.setAttribute('scale',on?[20,12,5][index]:8));
 }
 function build(node){
  if(!enabled()||!node.isConnected)return;if(node.matches(':disabled,[aria-disabled="true"]')){clear(node);return}
  const rect={width:node.offsetWidth,height:node.offsetHeight};if(rect.width<24||rect.height<24)return;
  const optical=node.matches('[data-glass-control],[data-glass-thumb]');
  let entry=entries.get(node);const key=Math.round(rect.width)+'x'+Math.round(rect.height)+'r'+getComputedStyle(node).borderTopLeftRadius;if(entry?.key===key)return;
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
   }else filter.append(create('feDisplacementMap',{in:'SourceGraphic',in2:'rim',scale:18,xChannelSelector:'R',yChannelSelector:'G'}));
   defs.append(filter);entry={filter,map,id,key:'',channels:optical?channels:null};entries.set(node,entry);
  }
  try{entry.filter.setAttribute('width',rect.width);entry.filter.setAttribute('height',rect.height);entry.map.setAttribute('width',rect.width);entry.map.setAttribute('height',rect.height);entry.map.setAttribute('href',mapData(rect.width,rect.height,parseFloat(getComputedStyle(node).borderTopLeftRadius)||22));entry.key=key;node.dataset.liquidLens='';node.style.setProperty('--liquid-lens-filter',`${optical?'blur(3px) saturate(125%)':'blur(12px) saturate(112%)'} url("#${entry.id}")`);press(node,node.hasAttribute('data-glass-pressed'))}catch{clear(node)}
 }
 function clear(node){const entry=entries.get(node);entry?.filter.remove();entries.delete(node);node.removeAttribute('data-liquid-lens');node.style.removeProperty('--liquid-lens-filter')}
 const visible=new WeakSet();
 const resize=new ResizeObserver(records=>{for(const record of records)if(visible.has(record.target))build(record.target)});
 const visibility=new IntersectionObserver(records=>{for(const record of records)if(record.isIntersecting){visible.add(record.target);build(record.target)}else{visible.delete(record.target);clear(record.target)}},{rootMargin:'100px'});
 let watched=new Set();
 function scan(){
  frame=0;root.toggleAttribute('data-glass-solid',reduce.matches||contrast.matches||forced.matches);const on=enabled();root.dataset.glassRenderer=on?'svg-rim':'css';
  for(const node of watched)if(!on||!node.isConnected){clear(node);resize.unobserve(node);visibility.unobserve(node);watched.delete(node)}
  if(!on)return;
  for(const node of document.querySelectorAll(selector))if(!watched.has(node)){watched.add(node);resize.observe(node);visibility.observe(node)}
  for(const node of watched)if(visible.has(node))build(node);
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(scan)}
 function start(){
  svg=create('svg',{'aria-hidden':'true',width:0,height:0,focusable:'false'});svg.style.cssText='position:fixed;width:0;height:0;pointer-events:none';defs=create('defs',{});svg.append(defs);document.body.append(svg);
  new MutationObserver(records=>{if(records.some(record=>!record.target.closest?.('svg')&&(record.type==='attributes'||[...record.addedNodes].some(node=>node.nodeType===1&&(node.matches?.(selector)||node.querySelector?.(selector)))||[...record.removedNodes].some(node=>node.nodeType===1))))schedule()}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-glass-control','data-glass-thumb','disabled','aria-disabled']});
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
