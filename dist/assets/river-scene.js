/* Original, dependency-free digital river terrain. Cached landscape + 30 fps flow. */
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
    river(z) { return Math.sin(z * 1.55) * .34 + Math.cos(z * 2.5) * .12; }
    height(x, z) {
      const bank = Math.max(0, Math.abs(x - this.river(z)) - .16);
      return (Math.sin(x * 3.7 + z * 1.1) * .075 + Math.cos(z * 3.6 - x) * .07 + .16)
        * Math.min(1, bank * 4) + Math.pow(bank, 1.1) * .055;
    }
    project(x, z, y = 0) {
      const angle = -.48, xx = x * Math.cos(angle) + z * Math.sin(angle);
      const zz = z * Math.cos(angle) - x * Math.sin(angle), p = 1 / (1 + zz * .16);
      return [this.w * .52 + xx * this.scale * p,
        this.h * .47 + zz * this.scale * .44 * p - y * this.scale * .82 * p];
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
      this.scale = Math.min(this.w * .36, this.h * .68);
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
      const glow = c.createRadialGradient(this.w * .53, this.h * .51, 0, this.w * .53, this.h * .51, this.scale * 1.65);
      glow.addColorStop(0, '#03679938'); glow.addColorStop(.6, '#004c7913'); glow.addColorStop(1, '#02101a00');
      c.fillStyle = glow; c.fillRect(0, 0, this.w, this.h);
      // The landscape itself is static: values stay legible while the river moves.
      for (let row = 0; row <= 64; row++) {
        const z = -1.8 + row / 64 * 3.6, points = [];
        for (let col = 0; col <= 64; col++) {
          const x = -1.7 + col / 64 * 3.4;
          points.push(this.project(x, z, this.height(x, z)));
        }
        this.line(c, points, row % 8 === 0 ? '#32768e72' : '#25596b52', row % 8 === 0 ? .8 : .55);
      }
      for (let col = 0; col <= 64; col++) {
        const x = -1.7 + col / 64 * 3.4, points = [];
        for (let row = 0; row <= 64; row++) {
          const z = -1.8 + row / 64 * 3.6;
          points.push(this.project(x, z, this.height(x, z)));
        }
        this.line(c, points, col % 8 === 0 ? '#32768e72' : '#25596b42', .6);
      }
      // A luminous river carved through the projected terrain.
      for (let strand = 0; strand < 24; strand++) {
        const offset = (strand / 23 - .5) * .29, points = [];
        for (let i = 0; i <= 100; i++) {
          const z = -1.85 + i / 100 * 3.7;
          points.push(this.project(this.river(z) + offset, z, .012));
        }
        this.line(c, points, strand === 0 || strand === 23 ? '#49cde6a0' : '#168bb554', strand === 0 || strand === 23 ? 1 : 1.9);
      }
      const riverLine = Array.from({ length: 120 }, (_, i) => {
        const z = -1.84 + i / 119 * 3.68;
        return this.project(this.river(z), z, .016);
      });
      c.shadowColor = '#22c5ef'; c.shadowBlur = 20;
      this.line(c, riverLine, '#4de2fa8a', 2);
      c.shadowBlur = 0;
      // Isometric datum frame and distant landmark labels.
      this.line(c, [[-1.7,-1.8],[1.7,-1.8],[1.7,1.8],[-1.7,1.8],[-1.7,-1.8]].map(([x,z])=>this.project(x,z,-.02)), '#3797b855', .8);
      c.font = '9px DM, sans-serif'; c.fillStyle = '#5c92a6';
      const labels = [[-1.67,-1.9,'32° 04′ N'],[1.05,1.95,'118° 46′ E']];
      labels.forEach(([x,z,t])=>c.fillText(t,...this.project(x,z)));
      // Stars are deterministic and don't sparkle while people read.
      for (let i = 0; i < 45; i++) {
        const x = ((i * 173 + 97) % 997) / 997 * this.w;
        const y = ((i * 239 + 31) % 701) / 701 * this.h;
        c.fillStyle = i % 5 === 0 ? '#6fb6ce88' : '#39708755';
        c.fillRect(x, y, i % 5 === 0 ? 2 : 1, 1);
      }
    }
    draw() {
      if (!this.ctx || !this.w) return;
      const c = this.ctx, t = this.elapsed;
      c.clearRect(0, 0, this.w, this.h);
      c.drawImage(this.base, 0, 0, this.w, this.h);
      // Flow direction is encoded as small moving traces along the water.
      c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 90; i++) {
        const progress = (i * .618033 + t * .065) % 1;
        const z = -1.76 + progress * 3.52, lane = Math.sin(i * 12.3) * .125;
        const points = [];
        for (let j = 0; j < 5; j++) {
          const zz = z - j * .017;
          points.push(this.project(this.river(zz) + lane, zz, .019));
        }
        this.line(c, points, i % 4 === 0 ? '#a9faffdd' : '#50c4e589', i % 4 === 0 ? 1.5 : .8);
      }
      const nodes = [{z:-1.15,dx:.19,label:'SENSOR 01',n:'08.42 m'}, {z:.12,dx:-.2,label:'SENSOR 04',n:'10.65 m'}, {z:1.11,dx:.2,label:'SENSOR 08',n:'18.36 m'}];
      const readings = this.getReadings?.();
      nodes.forEach((node, i) => {
        const x = this.river(node.z) + node.dx, p = this.project(x,node.z,.02);
        const top = this.project(x,node.z,.25);
        const signal = (t * .3 + i * .32) % 1;
        c.strokeStyle = `rgba(70,216,241,${(1-signal)*.38})`; c.lineWidth = 1;
        c.beginPath(); c.ellipse(...p, (12+signal*24), (4+signal*8), -.08, 0, Math.PI*2); c.stroke();
        c.strokeStyle = '#68d9ed88'; c.beginPath(); c.ellipse(...p,12,4,-.08,0,Math.PI*2); c.stroke();
        const beam = c.createLinearGradient(...p,...top);beam.addColorStop(0,'#3cd5f300');beam.addColorStop(1,'#69e5fc88');
        this.line(c,[p,top],beam,1);
        c.fillStyle = '#b5f6ff';c.beginPath();c.arc(...top,2.7,0,Math.PI*2);c.fill();
        c.strokeStyle = '#5bdcf377';c.beginPath();c.arc(...top,6,0,Math.PI*2);c.stroke();
        c.font = '9px DM, sans-serif'; c.fillStyle = '#6c9db1'; c.fillText(node.label,top[0]+14,top[1]-3);
        c.font = '12px DM, sans-serif'; c.fillStyle = '#c0e7ee'; c.fillText(readings ? readings[i].toFixed(2)+' m' : node.n,top[0]+14,top[1]+14);
      });
      c.globalCompositeOperation = 'source-over';
      // Thin orbital sweep is a spatial cue, not a flashing overlay.
      const ring = [], sweep = t * .12;
      for (let i=0;i<=50;i++) {
        const a=sweep+i/50*.72;
        ring.push(this.project(Math.cos(a)*1.7,Math.sin(a)*1.7,-.02));
      }
      this.line(c,ring,'#70e0f1a0',1);
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
