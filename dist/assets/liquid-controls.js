/* Keep native controls in charge of input. This layer only paints material and feedback. */
(() => {
 'use strict';
 const root=document.documentElement;
 const controls='.btn,.hero-secondary,.playback-button,.detail-card-trigger,.detail-card-close,#dialog-close,.rain-presets button,.lab-rain-presets button,.monitor-tool-tabs button,.segmented button,.filter-tabs button,.lab-tabs button,.monitor-record-filters button,.vision-view-switch button,[data-map-mode],.atlas-reset,#ai-cancel,#ai-show-results';
 const ranges=new Map();let frame=0,pressed=null;
 const blocked=node=>node.matches(':disabled,[aria-disabled="true"]')||!!node.closest('[inert]');
 function signal(node,on){
  if(!node)return;
  node.toggleAttribute('data-glass-pressed',on);
  document.dispatchEvent(new CustomEvent('zhishui:glasspress',{detail:{node,pressed:on}}));
 }
 function release(){
  if(!pressed)return;
  signal(pressed.surface,false);pressed.shell?.removeAttribute('data-glass-dragging');pressed.surface.removeAttribute('data-glass-keyboard');pressed=null;
 }
 function rangeSetup(input){
  let entry=ranges.get(input);if(entry)return entry;
  let shell,thumb;
  if(input.id==='sandbox-gate'){
   shell=input.closest('.gate-slider');thumb=shell?.querySelector('.gate-slider-thumb');
   if(!shell||!thumb)return;
  }else{
   shell=document.createElement('span');shell.className='liquid-range';
   const rail=document.createElement('span');rail.className='liquid-range-rail';rail.setAttribute('aria-hidden','true');
   const fill=document.createElement('span');fill.className='liquid-range-fill';thumb=document.createElement('span');thumb.className='liquid-range-thumb';
   rail.append(fill,thumb);input.before(shell);shell.append(input,rail);
  }
  shell.dataset.glassRange='';thumb.dataset.glassThumb='';input.dataset.glassInput='';
  entry={shell,thumb};ranges.set(input,entry);return entry;
 }
 function sync(input,entry){
  const min=Number(input.min||0),max=Number(input.max||100),value=Number(input.value),ratio=max>min?Math.max(0,Math.min(1,(value-min)/(max-min))):0;
  entry.shell.style.setProperty('--range-progress',(ratio*100)+'%');
  entry.shell.style.setProperty('--range-ratio',String(ratio));
  entry.shell.toggleAttribute('data-glass-disabled',input.matches(':disabled'));
 }
 function scan(){
  frame=0;
  for(const [input]of ranges)if(!input.isConnected)ranges.delete(input);
  if(pressed&&!pressed.surface.isConnected)release();
  for(const node of document.querySelectorAll(controls))if(!node.hasAttribute('data-glass-control')){
   if(getComputedStyle(node).position==='static')node.dataset.glassPosition='relative';
   node.dataset.glassControl='';
  }
  for(const input of document.querySelectorAll('input[type="range"]')){
   const entry=rangeSetup(input);if(entry)sync(input,entry);
  }
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(scan)}
 function begin(node,event,keyboard=false){
  if(blocked(node))return;
  const entry=ranges.get(node),surface=entry?.thumb||node;release();
  if(!keyboard&&event){const rect=surface.getBoundingClientRect();surface.style.setProperty('--press-x',Math.max(0,Math.min(100,(event.clientX-rect.left)/rect.width*100))+'%');surface.style.setProperty('--press-y',Math.max(0,Math.min(100,(event.clientY-rect.top)/rect.height*100))+'%')}
  if(keyboard)surface.dataset.glassKeyboard='';
  entry?.shell.setAttribute('data-glass-dragging','');pressed={surface,shell:entry?.shell,pointerId:event?.pointerId};signal(surface,true);
 }
 function start(){
  scan();
  new MutationObserver(records=>{
   if(records.some(record=>!record.target.closest?.('svg')&&(record.type==='childList'||record.type==='attributes')))schedule();
  }).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['disabled','min','max','step','value']});
  document.addEventListener('input',event=>{if(ranges.has(event.target))for(const [input,entry]of ranges)sync(input,entry)});
  document.addEventListener('pointerdown',event=>{
   if(event.button!==0)return;
   const node=event.target.closest('[data-glass-control],[data-glass-nav-item],input[data-glass-input]');if(node)begin(node,event);
  },true);
  window.addEventListener('pointerup',release,true);window.addEventListener('pointercancel',release,true);
  document.addEventListener('lostpointercapture',release,true);
  document.addEventListener('pointerout',event=>{if(pressed&&(!event.relatedTarget||!pressed.shell&&event.target.closest('[data-glass-control],[data-glass-nav-item]')===pressed.surface&&!pressed.surface.contains(event.relatedTarget)))release()});
  document.addEventListener('keydown',event=>{
   if(event.repeat||!['Enter',' '].includes(event.key))return;
   const node=event.target.closest('[data-glass-control],[data-glass-nav-item]');if(node)begin(node,null,true);
  });
  document.addEventListener('keyup',event=>{if(['Enter',' '].includes(event.key))release()});
  document.addEventListener('focusout',event=>{if(pressed?.surface===event.target)release()});
  window.addEventListener('blur',release);document.addEventListener('visibilitychange',()=>{if(document.hidden)release()});
  window.addEventListener('pagehide',()=>{release();if(frame)cancelAnimationFrame(frame);frame=0});
  window.addEventListener('pageshow',event=>{if(event.persisted)schedule()});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
