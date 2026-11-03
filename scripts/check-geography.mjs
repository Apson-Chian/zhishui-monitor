import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url));
const data=JSON.parse(read('dist/assets/data/nanjing-water.geojson'));
const ctx={window:{},localStorage:{getItem:()=>null,setItem:()=>{}},clearTimeout(){}};
vm.runInNewContext(read('dist/assets/atlas-data.js').toString(),ctx);
vm.runInNewContext(read('dist/assets/water-journey.js').toString(),ctx);
const {HydroAtlas:atlas,HydroJourney:journey}=ctx.window;
assert.equal(atlas.places.length,8);
for(const p of atlas.places){assert.ok(p.lat>31&&p.lat<33&&p.lng>118&&p.lng<120);assert.ok(p.source);}
assert.ok(data.features.some(f=>f.properties.name==='长江'));
assert.ok(data.features.some(f=>f.properties.name==='秦淮河'));
for(const f of data.features){const g=f.geometry;const polygons=g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'?g.coordinates:[];for(const polygon of polygons)for(const ring of polygon){assert.deepEqual(ring[0],ring.at(-1));assert.ok(ring.length>=4);}}
for(const photo of JSON.parse(read('dist/assets/data/photo-credits.json'))){assert.ok(photo.author&&photo.licenseUrl&&photo.date&&photo.displayChanges);const bytes=read('dist/'+photo.file);assert.equal(createHash('sha256').update(bytes).digest('hex'),photo.sha256);}
for(let rain=10;rain<=120;rain+=10)for(const cover of Object.keys(journey.covers))for(const capacity of [0,6,25]){const r=journey.simulate({rain,cover,capacity});assert.ok(r.drained<=capacity&&r.drained<=r.runoff);assert.ok(r.stored>=0);assert.ok(Math.abs(r.runoff*3600-r.drained*3600-r.stored)<1e-7);}
const hard=journey.simulate({rain:60,cover:'hard',capacity:6});
const green=journey.simulate({rain:60,cover:'green',capacity:6});
assert.equal(hard.runoff,15);assert.equal(hard.stored,32400);assert.equal(green.runoff,5);assert.equal(green.stored,0);
assert.equal(journey.comparison([{rain:60,cover:'hard',capacity:6},{rain:70,cover:'green',capacity:6}]),null);
assert.ok(journey.comparison([{rain:60,cover:'hard',capacity:6},{rain:60,cover:'green',capacity:6}]));
assert.equal(journey.simulate({rain:999,capacity:-5,cover:'bad'}).rain,120);
assert.equal(journey.simulate({rain:NaN,capacity:Infinity}).capacity,6);
const blocked={window:{HydroAtlas:atlas},localStorage:{getItem(){throw Error('blocked')}},clearTimeout(){}};
vm.runInNewContext(read('dist/assets/water-journey.js').toString(),blocked);
assert.ok(blocked.window.HydroJourney.render().includes('当前浏览器无法保存'));
const corrupt={window:{HydroAtlas:atlas},localStorage:{getItem:()=>'{broken'},clearTimeout(){}};
vm.runInNewContext(read('dist/assets/water-journey.js').toString(),corrupt);
assert.equal(corrupt.window.HydroJourney.getState().step,2);
console.log('PASS: WGS84 locations, closed lake polygons, photo licenses/hashes, rainwater mass balance, controlled comparison, invalid input and storage fallback');
