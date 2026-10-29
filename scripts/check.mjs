import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(path.join(root, 'dist/assets/app.js'), 'utf8');
const logic = source.slice(0, source.indexOf("$('#main-nav').innerHTML="));
const queue = new Map();
let nextTimer = 0;
const context = {
  assert, console, document: { hidden: false },
  URL: { createObjectURL: () => 'blob:fixture', revokeObjectURL() {} },
  Image: class { decode() { return Promise.resolve(); } },
  setTimeout: fn => { const id = ++nextTimer; queue.set(id, fn); return id; },
  clearTimeout: id => queue.delete(id),
  flush: () => { const callbacks = [...queue.values()]; queue.clear(); callbacks.forEach(fn => fn()); }
};
const checks = `
render = () => {};
updateReadings = () => {};
openStationAlert = () => {};
let message = '';
toast = s => { message = s; };
let csv;
download = (data, name, type) => { csv = { data, name, type }; };
assert.equal(stations.length, 8);
assert.equal(stations.filter(isWarn).length, 1);
const initial = stations[0].level;
tick();
assert.notEqual(stations[0].level, initial);
assert.ok(histories.every(h => h.length === 25));
state.paused = true;
const pausedValue = stations[0].level;
tick();
assert.equal(stations[0].level, pausedValue);
state.paused = false;
document.hidden = true;
tick();
assert.equal(stations[0].level, pausedValue);
document.hidden = false;
state.region = 'lake';
assert.equal(visibleStations().length, 2);
exportCSV();
assert.equal(csv.data.charCodeAt(0), 0xfeff);
assert.equal(csv.data.split('\\r\\n').length, 3);
assert.ok(csv.data.includes('JS-007') && csv.data.includes('JS-008'));
assert.ok(!csv.data.includes('JS-001'));
assert.ok(csv.data.includes('前端模拟'));
state.region = 'all';
state.selected = 0;
const base = stations[0].base;
simulateStorm();
assert.ok(isWarn(stations[0]));
assert.equal(state.alerts[0].station, 0);
state.selected = 7;
tick();
assert.ok(isWarn(stations[0]), 'switching stations must not erase storm');
simulateStorm();
assert.equal(stations[0].base, base);
assert.ok(!isWarn(stations[0]));
assert.ok(isWarn(stations[1]), 'original warning must survive reset');
state.image = null;
detect();
assert.equal(state.detecting, false);
loadSample();
detect();
assert.equal(state.detecting, true);
flush();
assert.equal(state.detecting, false);
assert.equal(state.results.length, 3);
state.sample = false;
detect();
flush();
assert.equal(state.results.length, 2);
assert.ok(state.results.every(r => r.name.startsWith('演示目标')));
detect();
loadSample();
flush();
assert.equal(state.results.length, 0, 'replacing image must cancel pending results');
assert.equal(state.detecting, false);
await acceptImage({ type: 'text/plain', size: 100 });
assert.ok(message.includes('JPG'));
await acceptImage({ type: 'image/png', size: 11 * 1024 * 1024 });
assert.ok(message.includes('10 MB'));
await acceptImage({ type: 'image/png', size: 100 });
assert.equal(state.image, 'blob:fixture');
assert.equal(state.sample, false);
assert.equal(state.results.length, 0);
console.log('PASS: simulation updates, pause/background, regional CSV, storm lifecycle, AI lifecycle, upload validation');
`;
await runInNewContext(`(async () => { ${logic}\n${checks} })()`, context, { timeout: 5000 });
for (const asset of ['assets/style.css', 'assets/cinematic.css', 'assets/river-scene.js', 'assets/app.js', 'assets/favicon.svg', 'assets/dm-sans.woff2', 'assets/vendor/chart.umd.js']) {
  assert.ok(existsSync(path.join(root, 'dist', asset)), `Missing asset: ${asset}`);
}
assert.ok(!readFileSync(path.join(root, 'dist/index.html'), 'utf8').includes('https://cdn'));
console.log('PASS: complete local runtime assets; no CDN dependency');
