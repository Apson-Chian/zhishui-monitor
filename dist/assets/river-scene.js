/* Sculpted river landscape: seamless shaded relief and continuous water at 30 fps. */
(() => {
  'use strict';
  class HydroScene {
    constructor(canvas, options = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: true });
      if (!this.ctx) return;
      canvas.parentElement.classList.add('scene-ready');
      this.paused = !!options.paused;
      this.getReadings = options.getReadings;
      this.showLabels = options.showLabels !== false;
      this.visible = true;
      this.elapsed = 0;
      this.last = 0;
      this.raf = 0;
      this.destroyed = false;
      this.reduce = matchMedia('(prefers-reduced-motion: reduce)');
      this.base = document.createElement('canvas');
      this.onVisibility = () => this.sync();
      this.onPreference = () => this.sync();
      document.addEventListener('visibilitychange', this.onVisibility);
      this.reduce.addEventListener('change', this.onPreference);
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(canvas);
      this.intersectionObserver = new IntersectionObserver(entries => {
        this.visible = entries[0].isIntersecting;
        this.sync();
      }, { threshold: 0.05 });
      this.intersectionObserver.observe(canvas);
      this.resize();
    }
    river(z) { return Math.sin(z * 1.9) * .36 + Math.cos(z * 2.6) * .10; }
    riverWidth(z) { return .19 + .03 * Math.cos(z * 2.4); }
    height(x, z) {
      const bank = Math.max(0, Math.abs(x - this.river(z)) - this.riverWidth(z));
      const hill = (cx, cz, spread, h) => h * Math.exp(-((x-cx)**2+(z-cz)**2)/spread);
      const edge = Math.min(1, (1.6-Math.abs(x))*5, (1.75-Math.abs(z))*5);
      return (.045 + hill(-.95,-.4,.55,.50) + hill(1.05,.65,.7,.40)
        + hill(.9,-1.3,.38,.26)) * Math.min(1,bank*4) * Math.max(.12,edge);
    }
    project(x, z, y = 0) {
      const angle = -.62, xx = x * Math.cos(angle) + z * Math.sin(angle);
      const zz = z * Math.cos(angle) - x * Math.sin(angle);
      return [this.w * .50 + xx * this.scale,
        this.h * .54 + zz * this.scale * .53 - y * this.scale * .90];
    }
    line(ctx, points, color, width = 1) {
      ctx.beginPath();
      points.forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p));
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
    }
    resize() {
      if (this.destroyed) return;
      const box = this.canvas.getBoundingClientRect();
      this.w = Math.max(1, box.width); this.h = Math.max(1, box.height);
      this.dpr = Math.min(devicePixelRatio || 1, 1.5);
      this.scale = Math.min(this.w * .187, this.h * .43);
      for (const c of [this.canvas, this.base]) {
        c.width = Math.round(this.w * this.dpr);
        c.height = Math.round(this.h * this.dpr);
      }
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.bake(); this.draw(); this.sync();
    }
    bake() {
      const c = this.base.getContext('2d');
      c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      c.clearRect(0, 0, this.w, this.h);
      const glow = c.createRadialGradient(this.w*.5,this.h*.5,0,this.w*.5,this.h*.5,this.scale*2.3);
      glow.addColorStop(0,'#b8e2df88');glow.addColorStop(1,'#eaf5ef00');
      c.fillStyle = glow; c.fillRect(0, 0, this.w, this.h);
      const polygon=(points,fill,seamless=false)=>{c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();c.fillStyle=fill;c.fill();if(seamless){c.strokeStyle=fill;c.lineWidth=.65;c.lineJoin='round';c.stroke()}};
      // An opaque relief replaces the wireframe. Only its contours remain visible.
      const corners=[[-1.6,-1.75],[1.6,-1.75],[1.6,1.75],[-1.6,1.75]];
      c.save();c.shadowColor='#245b4f30';c.shadowBlur=28;c.shadowOffsetY=18;
      polygon(corners.map(([x,z])=>this.project(x,z,-.15)),'#aac9bb');c.restore();
      for(const [a,b] of [[corners[1],corners[2]],[corners[2],corners[3]]]){
        const shade=c.createLinearGradient(0,this.h*.5,0,this.h*.9);shade.addColorStop(0,'#e4eee0');shade.addColorStop(1,'#96b8aa');
        polygon([this.project(...a),this.project(...b),this.project(...b,-.15),this.project(...a,-.15)],shade);
        for(let layer=1;layer<3;layer++)this.line(c,[this.project(...a,-layer*.035),this.project(...b,-layer*.035)],'#f0faf466',.6);
      }
      const nx=100,nz=108,dx=3.2/nx,dz=3.5/nz;
      const grid=Array.from({length:nz+1},(_,row)=>Array.from({length:nx+1},(_,col)=>{
        const x=-1.6+col*dx,z=-1.75+row*dz;
        return {x,z,h:this.height(x,z)};
      }));
      for(let row=0;row<nz;row++)for(let col=0;col<nx;col++){
        const vertices=[grid[row][col],grid[row][col+1],grid[row+1][col+1],grid[row+1][col]];
        const elevation=vertices.reduce((sum,p)=>sum+p.h,0)/4;
        const midX=(vertices[0].x+vertices[1].x)/2,midZ=(vertices[0].z+vertices[3].z)/2;
        const slopeX=(this.height(midX+.012,midZ)-this.height(midX-.012,midZ))/.024;
        const slopeZ=(this.height(midX,midZ+.012)-this.height(midX,midZ-.012))/.024;
        const illumination=(-slopeX*.48-slopeZ*.42+.78)/Math.sqrt(1+slopeX*slopeX+slopeZ*slopeZ);
        const light=Math.max(59,Math.min(92,81+illumination*11-elevation*14));
        const hue=144-elevation*33;
        polygon(vertices.map(p=>this.project(p.x,p.z,p.h)),`hsl(${hue} 22% ${light}%)`,true);
      }
      // Marching-squares isolines, baked once; no moving mesh or decorative stars.
      for(let level=.065;level<.53;level+=.065){
        c.beginPath();
        for(let row=0;row<nz;row++)for(let col=0;col<nx;col++){
          const vs=[grid[row][col],grid[row][col+1],grid[row+1][col+1],grid[row+1][col]],crossings=[];
          for(let edge=0;edge<4;edge++){
            const a=vs[edge],b=vs[(edge+1)%4];
            if((a.h<level)!==(b.h<level)){const f=(level-a.h)/(b.h-a.h);crossings.push(this.project(a.x+(b.x-a.x)*f,a.z+(b.z-a.z)*f,level+.001))}
          }
          for(let i=0;i+1<crossings.length;i+=2){c.moveTo(...crossings[i]);c.lineTo(...crossings[i+1])}
        }
        c.strokeStyle='#426e542e';c.lineWidth=.7;c.stroke();
      }
      const bank=(side,factor=1)=>Array.from({length:201},(_,i)=>{const z=-1.75+i/200*3.5;return this.project(this.river(z)+side*this.riverWidth(z)*factor,z,.008)});
      // A pale shore and darker channel give the river depth without a wire mesh.
      polygon([...bank(-1,1.19),...bank(1,1.19).reverse()],'#eaf0d7');
      const water=c.createLinearGradient(this.w*.75,this.h*.2,this.w*.25,this.h*.85);
      water.addColorStop(0,'#69b8ae');water.addColorStop(.28,'#2d9396');
      water.addColorStop(.58,'#176c7c');water.addColorStop(1,'#5db8b3');
      polygon([...bank(-1),...bank(1).reverse()],water);
      [-1,1].forEach(side=>{
        this.line(c,bank(side,1.15),'#fcfff2a6',1.1);
        this.line(c,bank(side),'#b8e6cebd',1.4);
        this.line(c,bank(side,.86),'#92d9ce50',1.5);
      });
      for(let lane=0;lane<7;lane++){
        const points=Array.from({length:161},(_,i)=>{const z=-1.75+i/160*3.5;return this.project(this.river(z)+(lane/6-.5)*this.riverWidth(z)*1.6,z,.012)});
        this.line(c,points,lane%2?'#ccfff018':'#084e681c',.8);
      }
    }
    draw() {
      if (!this.ctx || !this.w) return;
      const c = this.ctx, t = this.elapsed;
      c.clearRect(0, 0, this.w, this.h);
      c.drawImage(this.base, 0, 0, this.w, this.h);
      c.lineCap='round';
      // Tapered trails follow the same velocity field; they never jump back upstream.
      // Each trail fades at both scene boundaries before its phase wraps.
      for(let lane=0;lane<12;lane++){
        const phase=(lane*.618033+t*.055)%1,z=-1.75+phase*3.5;
        const envelope=Math.min(1,phase*12,(1-phase)*12);
        for(let segment=0;segment<14;segment++){
          const z0=z-segment*.022,z1=z0-.024;
          if(z1< -1.75)continue;
          const offset=zz=>Math.sin(lane*8.3)*this.riverWidth(zz)*.80;
          const alpha=envelope*(1-segment/14)*.56;
          this.line(c,[this.project(this.river(z0)+offset(z0),z0,.018),this.project(this.river(z1)+offset(z1),z1,.018)],`rgba(235,255,245,${alpha})`,1.45-segment*.065);
        }
      }
      // Broad, transparent refractions, clipped to the river's physical banks.
      for(let i=0;i<6;i++){
        const phase=(i/6+t*.035)%1,z=-1.75+phase*3.5,points=[];
        for(let j=0;j<=24;j++){
          const u=j/24*2-1,zz=z+Math.sin(u*2.2+i)*.045;
          points.push(this.project(this.river(zz)+u*this.riverWidth(zz)*.92,zz,.016));
        }
        this.line(c,points,`rgba(222,255,245,${Math.min(phase,1-phase)*.55})`,.8);
      }
      const nodes=[{z:-1.15,side:1,label:'01'},{z:.05,side:-1,label:'02'},{z:1.12,side:1,label:'03'}];
      const readings=this.getReadings?.();
      nodes.forEach((node,i)=>{
        const x=this.river(node.z)+node.side*(this.riverWidth(node.z)+.09);
        const p=this.project(x,node.z,this.height(x,node.z)+.015);
        const top=this.project(x,node.z,this.height(x,node.z)+.20);
        const signal=(t*.20+i/3)%1;
        // Signal footprint is bounded and softly disappears before the next pulse.
        c.beginPath();c.ellipse(...p,(7+signal*19),(3+signal*7),0,0,Math.PI*2);
        c.strokeStyle=`rgba(33,130,145,${(1-signal)**2*.48})`;c.lineWidth=1;c.stroke();
        c.beginPath();c.ellipse(...p,7,2.6,0,0,Math.PI*2);c.fillStyle='#429a9a55';c.fill();
        const beam=c.createLinearGradient(...p,...top);beam.addColorStop(0,'#428e9122');beam.addColorStop(1,'#28778bbf');
        this.line(c,[p,top],beam,1.2);
        c.save();c.shadowColor='#1a5e6a38';c.shadowBlur=9;c.shadowOffsetY=2;
        c.beginPath();c.arc(...top,6,0,Math.PI*2);c.fillStyle='#f8fff3';c.fill();c.strokeStyle='#277d87';c.lineWidth=1.4;c.stroke();c.restore();
        c.beginPath();c.arc(...top,2.1,0,Math.PI*2);c.fillStyle='#2b8a9c';c.fill();
        if(this.showLabels){
          c.font='12px "PingFang SC", sans-serif';c.fillStyle='#356a75';
          c.fillText(readings?readings[i].toFixed(2)+' m':node.label,top[0]+13,top[1]+4);
        }
      });
    }

    sync() {
      cancelAnimationFrame(this.raf); this.raf = 0; this.last = 0;
      if (this.destroyed) return;
      if (this.paused || this.reduce.matches || document.hidden || !this.visible) { this.draw(); return; }
      this.raf = requestAnimationFrame(time => this.frame(time));
    }
    frame(time) {
      if (this.destroyed) return;
      if (!this.last) this.last = time;
      if (time-this.last >= 1000/30) {
        this.elapsed += Math.min((time-this.last)/1000,.08);
        this.last = time; this.draw();
      }
      this.raf = requestAnimationFrame(t=>this.frame(t));
    }
    setPaused(paused) { this.paused = paused; if (this.ctx) this.sync(); }
    destroy() {
      this.destroyed = true; cancelAnimationFrame(this.raf);
      this.resizeObserver?.disconnect(); this.intersectionObserver?.disconnect();
      document.removeEventListener('visibilitychange',this.onVisibility);
      this.reduce?.removeEventListener('change',this.onPreference);
      this.base = null;
    }
  }
  window.HydroScene = HydroScene;
})();
