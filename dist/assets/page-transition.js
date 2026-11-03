/* Interruptible route transitions; the latest navigation owns the content. */
(() => {
  'use strict';
  class HydroPageTransition {
    constructor(root, easing='cubic-bezier(0.23, 1, 0.32, 1)') {
      this.root=root;this.easing=easing;this.revision=0;this.animation=null;
    }
    async run(commit,{motion=true}={}) {
      const revision=++this.revision;
      this.animation?.cancel();this.animation=null;
      const previous=this.root.querySelector('.page-enter');
      if(!motion||!previous?.animate){commit();return;}
      const outgoing=previous.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-4px)'}],{duration:80,easing:this.easing,fill:'forwards'});
      this.animation=outgoing;
      try{await outgoing.finished}catch{}
      if(revision!==this.revision)return;
      // Keep the old surface hidden until its replacement is committed.
      try{commit()}finally{outgoing.cancel()}
      const current=this.root.querySelector('.page-enter');
      if(!current?.animate){this.animation=null;return;}
      const incoming=current.animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:200,easing:this.easing});
      this.animation=incoming;
      try{await incoming.finished}catch{}
      if(revision===this.revision)this.animation=null;
    }
    destroy(){this.revision++;this.animation?.cancel();this.animation=null;}
  }
  // One-shot marketing entrances. Content stays visible when JS/WAAPI is unavailable.
  class HydroHomeMotion {
    constructor(root,{entrance=false,enabled=true}={}) {
      this.root=root;this.paused=!enabled;this.animations=new Set();
      const tokens=typeof getComputedStyle==='function'?getComputedStyle(root):null;
      this.easing=tokens?.getPropertyValue('--ease-out').trim()||'cubic-bezier(0.23, 1, 0.32, 1)';
      this.riverDuration=parseFloat(tokens?.getPropertyValue('--river-entry-duration'))||1400;
      this.riverDelay=parseFloat(tokens?.getPropertyValue('--river-entry-delay'))||140;
      this.preference=matchMedia('(prefers-reduced-motion: reduce)');
      this.onPreference=()=>{if(this.preference.matches)this.stop()};
      this.onVisibility=()=>{if(document.hidden)this.finish()};
      this.onKeyboard=()=>this.stop();
      this.preference.addEventListener('change',this.onPreference);
      document.addEventListener('visibilitychange',this.onVisibility);
      root.addEventListener('keydown',this.onKeyboard,{once:true});
      if(!enabled||this.preference.matches||document.hidden)return;
      if(entrance){
        root.querySelectorAll('.hero-title-line').forEach((el,i)=>this.play(el,650,i*70,20));
        const description=root.querySelector('.hero-description');
        const actions=root.querySelector('.cinematic-actions');
        const scene=root.querySelector('.hero-scene');
        if(description)this.play(description,500,100,12);
        if(actions)this.play(actions,280,140,8);
        const river=root.querySelector('.hero-scene.scene-ready #digital-river')||scene;
        if(river)this.play(river,this.riverDuration,this.riverDelay,0);
      }
      if(typeof IntersectionObserver==='undefined')return;
      this.observer=new IntersectionObserver(entries=>{
        let index=0;
        entries.forEach(entry=>{
          if(!entry.isIntersecting)return;
          this.observer.unobserve(entry.target);
          if(!this.paused&&!document.hidden)this.play(entry.target,280,index++%3*40,12);
        });
      },{threshold:.12,rootMargin:'0px 0px -24px 0px'});
      root.querySelectorAll('.home-entries>div:first-child,.home-task-grid>a,.real-water-section .deck-heading,.real-photo-card').forEach(el=>this.observer.observe(el));
    }
    play(el,duration,delay,distance){
      if(!el.animate)return;
      const frames=distance?[{opacity:0,transform:`translateY(${distance}px)`},{opacity:1,transform:'translateY(0)'}]:[{opacity:0},{opacity:1}];
      const animation=el.animate(frames,{duration,delay,easing:this.easing,fill:'backwards'});
      this.animations.add(animation);
      animation.finished.then(()=>this.animations.delete(animation),()=>this.animations.delete(animation));
    }
    finish(){this.animations.forEach(animation=>animation.cancel());this.animations.clear()}
    stop(){this.paused=true;this.observer?.disconnect();this.finish()}
    setPaused(paused){this.paused=paused;if(paused)this.finish()}
    destroy(){this.stop();this.preference.removeEventListener('change',this.onPreference);document.removeEventListener('visibilitychange',this.onVisibility);this.root.removeEventListener('keydown',this.onKeyboard)}
  }
  window.HydroHomeMotion=HydroHomeMotion;
  window.HydroPageTransition=HydroPageTransition;
})();
