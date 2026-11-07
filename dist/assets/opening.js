/* The opening river stays on screen while the homepage is prepared beneath it. */
(() => {
  'use strict';
  class HydroOpening {
    constructor(root,onEnter) {
      this.root=root;this.onEnter=onEnter;this.entering=false;this.done=false;
      this.bridgeAnimations=new Set();this.exitAnimation=null;
      const tokens=typeof getComputedStyle==='function'?getComputedStyle(root):null;
      const duration=(name,fallback)=>parseFloat(tokens?.getPropertyValue(name))||fallback;
      this.easing=tokens?.getPropertyValue('--ease-out').trim()||'cubic-bezier(0.23, 1, 0.32, 1)';
      this.movementEasing=tokens?.getPropertyValue('--ease-in-out').trim()||'cubic-bezier(0.77, 0, 0.175, 1)';
      this.transferDuration=duration('--river-transfer-duration',1800);
      this.crossfadeDuration=duration('--river-crossfade-duration',1200);
      this.crossfadeDelay=duration('--river-crossfade-delay',600);
      this.exitDuration=duration('--opening-exit-duration',900);
      this.preference=matchMedia('(prefers-reduced-motion: reduce)');
      this.next=root.querySelector('#opening-next');
      this.onClick=e=>{const button=e.target.closest('button');if(!button||this.entering)return;const keyboard=e.detail===0;if(button.id==='opening-skip')this.enter(keyboard,true);else if(button===this.next)this.enter(keyboard)};
      this.onKey=e=>{if(this.entering){this.interruptedByKeyboard=true;this.finishAnimations();if(e.key==='Escape')e.preventDefault();return}this.finishAnimations();if(e.key==='Escape'){e.preventDefault();this.enter(true,true)}};
      this.onVisibility=()=>{root.classList.toggle('opening-background',document.hidden);if(document.hidden)this.finishAnimations()};
      this.onPreference=()=>{this.syncMotion();if(this.preference.matches)this.finishAnimations()};
      this.onPageHide=()=>this.finishAnimations();this.onResize=()=>this.finishAnimations();this.onNavigate=()=>this.finishAnimations();
      this.onScroll=e=>e.preventDefault();
      root.addEventListener('click',this.onClick);root.addEventListener('keydown',this.onKey);
      document.addEventListener('visibilitychange',this.onVisibility);window.addEventListener('pagehide',this.onPageHide);
      this.preference.addEventListener('change',this.onPreference);
      this.syncMotion();this.onVisibility();root.focus({preventScroll:true});
    }
    syncMotion(){this.root.classList.toggle('opening-still',this.preference.matches)}
    track(el,frames,options,id){
      const animation=el.animate(frames,{easing:this.easing,fill:'both',...options});animation.id='river-handoff-'+id;
      this.bridgeAnimations.add(animation);animation.finished.catch(()=>{});return animation;
    }
    finishAnimations(){
      this.exitAnimation?.finish();
      this.bridgeAnimations.forEach(a=>a.finish());this.completeBridge?.();
    }
    async bridge(source){
      const root=this.root,origin=source.getBoundingClientRect(),bounds=root.getBoundingClientRect();
      const originalRootStyle=root.style.cssText,originalSourceStyle=source.style.cssText;
      const parent=source.parentNode,sibling=source.nextSibling,opacity=Number(getComputedStyle(source).opacity);
      const layer=document.createElement('div'),transfer=document.createElement('div');
      layer.className='river-transfer-layer';layer.setAttribute('aria-hidden','true');transfer.className='river-transfer';
      Object.assign(transfer.style,{left:origin.left+'px',top:origin.top+'px',width:origin.width+'px',height:origin.height+'px'});
      Object.assign(root.style,{position:'fixed',left:bounds.left+'px',top:bounds.top+'px',width:bounds.width+'px',height:bounds.height+'px',minHeight:bounds.height+'px',margin:'0',zIndex:'2000'});
      root.classList.add('opening-transition');
      source.style.opacity='1';transfer.appendChild(source);layer.appendChild(transfer);document.body.appendChild(layer);
      let surfaces={};
      this.completeBridge=()=>{
        if(this.done)return;this.done=true;root.hidden=true;
        if(sibling?.parentNode===parent)parent.insertBefore(source,sibling);else parent.appendChild(source);
        source.style.cssText=originalSourceStyle;root.style.cssText=originalRootStyle;root.classList.remove('opening-transition');layer.remove();
        if(surfaces.platform)surfaces.platform.inert=false;
        this.completeBridge=null;this.destroy();surfaces.main?.focus({preventScroll:true});
      };
      try{
        surfaces=this.onEnter({keyboard:false,riverTransition:true})||{};
        if(surfaces.platform)surfaces.platform.inert=true;
        const scene=surfaces.scene,destination=scene?.getBoundingClientRect();
        const target=scene?.classList.contains('scene-ready')?scene.querySelector('#digital-river'):scene;
        const duration=destination&&target?this.transferDuration:240;
        if(destination&&target){
          const dx=destination.left+destination.width/2-origin.left-origin.width/2;
          const dy=destination.top+destination.height/2-origin.top-origin.height/2;
          const scale=Math.min(destination.width/origin.width,destination.height/origin.height);
          this.track(transfer,[{transform:'translate(0, 0) scale(1)',opacity},
            {offset:.4,opacity:Math.max(opacity,.6)},
            {transform:`translate(${dx}px, ${dy}px) scale(${scale})`,opacity:0}],{duration,easing:this.movementEasing},'river');
          root.querySelectorAll('.opening-reading,.opening-header,.opening-watermark,.opening-art-note').forEach(el=>this.track(el,[{opacity:1},{opacity:0}],{duration:350},'copy'));
          this.exitAnimation=this.track(root,[{opacity:1},{opacity:0}],{duration:this.exitDuration,delay:300},'opening');
          this.track(target,[{opacity:0},{opacity:1}],{duration:this.crossfadeDuration,delay:this.crossfadeDelay},'homepage');
        }else{
          this.exitAnimation=this.track(root,[{opacity:1},{opacity:0}],{duration},'opening');
          this.track(transfer,[{opacity},{opacity:0}],{duration},'river');
        }
        window.addEventListener('resize',this.onResize);window.addEventListener('hashchange',this.onNavigate);
        window.addEventListener('wheel',this.onScroll,{passive:false});window.addEventListener('touchmove',this.onScroll,{passive:false});
        await Promise.all([...this.bridgeAnimations].map(a=>a.finished.catch(()=>{})));
      }finally{this.completeBridge?.()}
    }
    async enter(keyboard=false,instant=false){
      if(this.entering||this.done)return;this.entering=true;this.finishAnimations();this.root.setAttribute('aria-busy','true');
      const source=this.root.querySelector('.opening-river');
      const motion=!keyboard&&!instant&&!this.preference.matches&&!document.hidden&&this.root.animate;
      if(motion&&source?.getBoundingClientRect&&document.createElement&&source.getBoundingClientRect().width>0){await this.bridge(source);return}
      if(motion){this.exitAnimation=this.root.animate([{opacity:1},{opacity:0}],{duration:240,easing:this.easing,fill:'forwards'});try{await this.exitAnimation.finished}catch{}}
      if(this.done)return;this.done=true;this.root.hidden=true;this.destroy();window.scrollTo(0,0);
      this.onEnter({keyboard,instant:instant||keyboard||this.preference.matches||document.hidden||!this.root.animate});
    }
    destroy(){
      if(this.completeBridge&&!this.done){this.completeBridge();return}
      this.bridgeAnimations.forEach(a=>a.cancel());this.bridgeAnimations.clear();this.exitAnimation?.cancel();this.exitAnimation=null;
      this.root.removeEventListener('click',this.onClick);this.root.removeEventListener('keydown',this.onKey);
      document.removeEventListener('visibilitychange',this.onVisibility);window.removeEventListener('pagehide',this.onPageHide);
      window.removeEventListener('resize',this.onResize);window.removeEventListener('hashchange',this.onNavigate);
      window.removeEventListener('wheel',this.onScroll);window.removeEventListener('touchmove',this.onScroll);
      this.preference.removeEventListener('change',this.onPreference);this.root.removeAttribute('aria-busy');
    }
  }
  window.HydroOpening=HydroOpening;
})();
