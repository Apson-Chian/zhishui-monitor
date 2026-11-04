/* One route list, two navigation surfaces. The moving glass is decorative; links stay native. */
(() => {
 'use strict';
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),states=new Map();
 let frame=0,keyboard=false,instant=true;
 function update(){
  frame=0;
  for(const id of ['main-nav','mobile-bottom-nav']){
   const nav=document.getElementById(id);if(!nav)continue;
   let state=states.get(nav);
   if(!state){
    const indicator=document.createElement('span');indicator.className='glass-nav-indicator';indicator.setAttribute('aria-hidden','true');indicator.dataset.glassThumb='';nav.prepend(indicator);state={indicator,placed:false};states.set(nav,state);resize.observe(nav);nav.addEventListener('scroll',()=>schedule(true),{passive:true});
   }
   // Responsive navigation is rebuilt by the app; retain a single indicator.
   if(!state.indicator.isConnected){nav.prepend(state.indicator);state.placed=false}
   for(const link of nav.querySelectorAll('a[data-page]'))if(!link.hasAttribute('data-glass-nav-item'))link.dataset.glassNavItem='';
   const active=nav.querySelector('[aria-current="page"]'),rect=nav.getBoundingClientRect(),box=active?.getBoundingClientRect();
   const visible=!!box&&rect.width>0&&rect.height>0&&!nav.hidden&&!nav.inert;
   if(state.indicator.hidden===visible)state.indicator.hidden=!visible;
   if(visible){
    state.indicator.style.transition=instant||keyboard||reduced.matches||!state.placed?'none':'transform 200ms var(--ease-out),opacity 160ms var(--ease-out)';
    state.indicator.style.width=box.width+'px';state.indicator.style.height=box.height+'px';
    state.indicator.style.transform=`translate(${box.left-rect.left-nav.clientLeft+nav.scrollLeft}px,${box.top-rect.top-nav.clientTop+nav.scrollTop}px)`;state.placed=true;
   }else state.placed=false;
  }
  for(const id of ['notification-button','menu-toggle']){const node=document.getElementById(id);if(node)node.dataset.glassNavItem=''}
  for(const id of ['sidebar','mobile-bottom-nav']){const node=document.getElementById(id);if(node&&!node.hasAttribute('data-glass-navigation'))node.dataset.glassNavigation=''}
  instant=false;
 }
 function schedule(noMotion=false){instant ||=noMotion;if(!frame)frame=requestAnimationFrame(update)}
 const resize=new ResizeObserver(()=>schedule(true));
 function start(){
  const sidebar=document.getElementById('sidebar'),bottom=document.getElementById('mobile-bottom-nav');
  const observer=new MutationObserver(()=>schedule());
  for(const node of [sidebar,bottom])if(node)observer.observe(node,{subtree:true,childList:true,attributes:true,attributeFilter:['aria-current','hidden','inert','class']});
  new MutationObserver(()=>schedule()).observe(document.body,{attributes:true,attributeFilter:['data-page']});
  document.addEventListener('keydown',()=>{keyboard=true},true);document.addEventListener('pointerdown',()=>{keyboard=false},true);
  window.addEventListener('resize',()=>schedule(true));reduced.addEventListener('change',()=>schedule(true));
  document.fonts?.addEventListener('loadingdone',()=>schedule(true));
  window.addEventListener('pagehide',()=>{if(frame)cancelAnimationFrame(frame);frame=0});window.addEventListener('pageshow',()=>schedule(true));
  schedule(true);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
