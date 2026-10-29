import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const pending = new Map(), documentEvents = new Map(), preferenceEvents = new Map();
let nextId = 0, draws = 0;
const gradient = { addColorStop() {} };
const drawing = new Proxy({}, { get: (_, key) => {
  if (key === 'createRadialGradient' || key === 'createLinearGradient') return () => gradient;
  if (key === 'drawImage') return () => draws++;
  return () => {};
}, set: () => true });
const canvas = () => ({
  getContext: () => drawing,
  getBoundingClientRect: () => ({ width: 1000, height: 700 }),
  parentElement: { classList: { add() {} } }
});
const preference = {
  matches: false,
  addEventListener: (name, fn) => preferenceEvents.set(name, fn),
  removeEventListener: name => preferenceEvents.delete(name)
};
const context = {
  window: {}, devicePixelRatio: 3,
  matchMedia: () => preference,
  document: {
    hidden: false, createElement: canvas,
    addEventListener: (name, fn) => documentEvents.set(name, fn),
    removeEventListener: name => documentEvents.delete(name)
  },
  requestAnimationFrame: fn => { const id = ++nextId; pending.set(id, fn); return id; },
  cancelAnimationFrame: id => pending.delete(id),
  ResizeObserver: class { constructor(fn) { this.fn = fn; } observe() {} disconnect() { this.disconnected = true; } },
  IntersectionObserver: class { constructor(fn) { this.fn = fn; } observe() {} disconnect() { this.disconnected = true; } }
};
runInNewContext(readFileSync(new URL('../dist/assets/river-scene.js', import.meta.url), 'utf8'), context);
const scene = new context.window.HydroScene(canvas(), { getReadings: () => [8.42,10.65,18.36] });
const frame = time => { const callbacks = [...pending.values()]; pending.clear(); callbacks.forEach(fn => fn(time)); };
assert.equal(scene.canvas.width,1500,'DPR must be capped');
assert.equal(pending.size,1);
frame(100); frame(150);
assert.ok(scene.elapsed>0 && draws>1);
scene.setPaused(true);
assert.equal(pending.size,0);
scene.setPaused(false);
assert.equal(pending.size,1);
context.document.hidden=true; documentEvents.get('visibilitychange')();
assert.equal(pending.size,0,'background must stop frame loop');
context.document.hidden=false; documentEvents.get('visibilitychange')();
assert.equal(pending.size,1);
scene.intersectionObserver.fn([{isIntersecting:false}]);
assert.equal(pending.size,0,'offscreen must stop frame loop');
scene.intersectionObserver.fn([{isIntersecting:true}]);
assert.equal(pending.size,1);
preference.matches=true; preferenceEvents.get('change')();
assert.equal(pending.size,0,'reduced motion must render a static scene');
preference.matches=false; preferenceEvents.get('change')();
scene.resize(); scene.resize();
assert.equal(pending.size,1,'resizing must never duplicate the frame loop');
scene.destroy();
assert.equal(pending.size,0);
assert.equal(documentEvents.size,0);
assert.equal(preferenceEvents.size,0);
assert.equal(scene.resizeObserver.disconnected,true);
assert.equal(scene.intersectionObserver.disconnected,true);
scene.setPaused(false);
assert.equal(pending.size,0,'destroyed scenes must stay stopped');
const fallback=canvas(); fallback.getContext=()=>null;
assert.doesNotThrow(()=>new context.window.HydroScene(fallback).destroy());
console.log('PASS: river scene timing, DPR cap, pause/resume, visibility, reduced motion, resize, cleanup, fallback');
