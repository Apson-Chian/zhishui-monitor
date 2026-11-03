import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const context={window:{}};vm.runInNewContext(read('dist/assets/pollution-model.js'),context);
const M=context.window.HydroPollution,features=JSON.parse(read('dist/assets/data/pollution-reaches.geojson')).features;
const water=JSON.parse(read('dist/assets/data/nanjing-water.geojson'));
const originalEdges=new Set(water.features.filter(f=>f.geometry.type==='LineString').flatMap(f=>f.geometry.coordinates.slice(1).map((b,i)=>JSON.stringify([f.geometry.coordinates[i],b]))));
const close=(a,b,tol=1e-7)=>assert.ok(Math.abs(a-b)<=tol,`${a} != ${b}`);
for(const f of features){
 const r=M.createReach(f);assert(r.length>1000&&r.length<40000);for(let i=1;i<r.coordinates.length;i++)assert(originalEdges.has(JSON.stringify([r.coordinates[i-1],r.coordinates[i]])),'every edge comes from the existing geometry');
 for(const fraction of [0,.1,.5,.95,1]){const x=r.length*fraction,c=M.pointAt(r,x),projection=M.project(r,c);close(projection.chainage,x,1e-5);close(projection.distance,0,1e-6)}
 const p=M.normalize(M.defaults),source=r.length*p.source/100;
 for(const minute of [0,1,30,120,360,720]){
  const a=M.analyze(r,p,minute);close(a.mass.inside+a.mass.outside+a.mass.decayed,p.mass);assert(Object.values(a.mass).every(v=>v>=0&&v<=p.mass));close(a.center,source+p.velocity*minute*60);
  // Numerically integrate the concentration over the full Gaussian and finite GIS reach.
  const steps=1600,dx=16*a.sigma/steps;let mass=0;
  for(let i=0;i<=steps;i++)mass+=M.concentration(p,source,a.center-8*a.sigma+i*dx,minute)*(i===0||i===steps?.5:1)*dx*p.area/1000;
  close(mass,p.mass-a.mass.decayed,1e-5);
  const n=4000,ds=r.length/n;let finite=0;for(let i=0;i<=n;i++)finite+=M.concentration(p,source,i*ds,minute)*(i===0||i===n?.5:1)*ds*p.area/1000;close(finite,a.mass.inside,.002);
  if(a.affected){assert(a.affected[0]>=0&&a.affected[1]<=r.length);assert(M.concentration(p,source,(a.affected[0]+a.affected[1])/2,minute)>=p.threshold);close(a.affectedLength,a.affected[1]-a.affected[0]);}
 }
 const base=M.analyze(r,p,60),more=M.analyze(r,{...p,mass:p.mass*2},60),wider=M.analyze(r,{...p,dispersion:40},60);close(more.peak,base.peak*2);assert(wider.sigma>base.sigma);assert(wider.peak<base.peak);
 const noDecay=M.analyze(r,{...p,halfLife:0},360);close(noDecay.mass.decayed,0);close(M.analyze(r,p,360).mass.decayed,p.mass/2);
 for(const point of M.analyze(r,p,0).points){
  const C=t=>M.concentration(p,source,point.chainage,t);close(C(point.peakMinute),point.peak);
  assert(C(Math.max(0,point.peakMinute-.1))<=point.peak+1e-8&&C(Math.min(720,point.peakMinute+.1))<=point.peak+1e-8,'reported peak is a true temporal maximum');
  if(point.entry!==null){if(point.entry>0)close(C(point.entry),p.threshold);if(point.exit!==null)close(C(point.exit),p.threshold);assert(point.entry<=point.peakMinute&&point.peakMinute<=(point.exit??720))}
 }
 const snapshot=M.exportSnapshot(r,base);assert.equal(snapshot.type,'FeatureCollection');assert(snapshot.boundary.includes('教学'));assert(snapshot.features.every(f=>['LineString','Point'].includes(f.geometry.type)));
}
const r=M.createReach(features[0]);
const clean=M.normalize({mass:Infinity,velocity:NaN,source:999,halfLife:-4,area:0,threshold:'bad'});assert.equal(clean.source,95);assert.equal(clean.halfLife,0);assert.equal(clean.area,50);assert.equal(clean.threshold,1);assert(Object.values(clean).every(Number.isFinite));
assert.throws(()=>M.createReach({geometry:{type:'LineString',coordinates:[[0,0],[NaN,1]]}}));
for(const input of [{...M.defaults,source:75,velocity:.1,dispersion:80,halfLife:0,threshold:.1},{...M.defaults,source:90,velocity:1.5,dispersion:1,halfLife:1}]){const a=M.analyze(r,input,0);for(const point of a.points){const c=t=>M.concentration(a.params,a.source,point.chainage,t);assert(c(Math.max(0,point.peakMinute-.01))<=point.peak+1e-8);assert(c(Math.min(720,point.peakMinute+.01))<=point.peak+1e-8)}}
const low=M.analyze(r,{...M.defaults,threshold:10,mass:10},720);assert.equal(low.affectedLength,0);assert(low.points.every(p=>p.entry===null));
let saved;const storage={getItem:()=>saved||null,setItem:(_,value)=>saved=value},ledger=M.createLedger(storage),seen=new Set();
const analysis=M.analyze(r,M.defaults,720),events=ledger.observe('run-1',r,analysis,seen);assert(events.some(e=>e.kind==='enter'));assert(events.some(e=>e.kind==='exit'));events.forEach(e=>seen.add(e.id));
assert.equal(ledger.observe('run-1',r,analysis,seen).length,0);assert.equal(ledger.observe('run-1',r,M.analyze(r,M.defaults,0),seen).length,0);assert.equal(M.createLedger(storage).list().length,events.length);
ledger.clear();assert.equal(ledger.observe('run-1',r,analysis,seen).length,0,'clearing then replaying does not restore already seen events');assert(ledger.observe('run-2',r,analysis).length>0);
for(let i=3;i<20;i++)ledger.observe('run-'+i,r,analysis);assert.equal(ledger.list().length,40);
const blocked=M.createLedger({getItem(){throw Error('denied')},setItem(){throw Error('quota')}});assert.equal(blocked.available(),false);assert(blocked.observe('run',r,analysis).length>0);
assert.equal(M.createLedger({getItem:()=>'{broken'}).list().length,0);assert.equal(M.createLedger({getItem:()=>JSON.stringify({version:1,records:[{id:'invalid'}]})}).list().length,0);
console.log('PASS: source geometry, GIS projection/chainage, Gaussian mass conservation, unit conversion, advection, dispersion, decay, exact threshold crossings/peaks, finite reach export, event dedup/replay/retention and storage fallback');
