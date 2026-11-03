import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=name=>readFileSync(new URL('../dist/assets/'+name,import.meta.url),'utf8');
function setup(saved={},blocked=false){
 const storage=new Map(Object.entries(saved)),context={window:{},document:{activeElement:null},localStorage:{getItem:key=>{if(blocked)throw Error('blocked');return storage.get(key)||null},setItem:(key,value)=>{if(blocked)throw Error('blocked');storage.set(key,value)}},clearTimeout(){},setTimeout:()=>1};
 vm.runInNewContext(read('atlas-data.js'),context);vm.runInNewContext(read('hydro-sandbox.js'),context);vm.runInNewContext(read('water-journey.js'),context);
 return {context,storage,journey:context.window.HydroJourney};
}
let fixture=setup(),j=fixture.journey;
assert.equal(j.getState().step,2,'the initial module is the experiment');
const hard=j.simulate({rain:60,capacity:6,cover:'hard'}),green=j.simulate({rain:60,capacity:6,cover:'green'});
assert.equal(hard.runoff,15);assert.equal(hard.stored,32400);assert.equal(green.runoff,5);assert.equal(green.stored,0);
for(const rain of [0,10,60,120])for(const area of [.1,1,5])for(const duration of [15,60,120])for(const capacity of [0,6,25])for(const cover of Object.keys(j.covers)){
 const r=j.simulate({rain,area,duration,capacity,cover});
 assert.ok(Object.values(r).filter(v=>typeof v==='number').every(Number.isFinite));
 assert.ok(Math.abs(r.total-r.absorbed-r.drainedVolume-r.stored)<1e-6,'rain volume must be conserved');
 assert.ok(Math.abs(r.runoffVolume-r.drainedVolume-r.stored)<1e-6,'runoff must be drained or stored');
 assert.ok(r.drained<=capacity&&r.drained<=r.runoff&&r.stored>=0);
}
const a=j.simulate({rain:100,area:2,duration:30,capacity:0,cover:'hard'});
assert.equal(a.total,100000);assert.equal(a.runoff,50);assert.equal(a.stored,90000);
assert.equal(j.simulate({...a,duration:60}).stored,a.stored*2);
assert(j.simulate({...a,capacity:10}).stored<a.stored);
assert.equal(j.simulate({rain:0}).stored,0);
assert.equal(j.comparison([{rain:60,capacity:6,area:1,duration:60,cover:'hard'},{rain:60,capacity:6,area:2,duration:60,cover:'green'}]),null);
assert.equal(j.comparison([{rain:60,capacity:6,area:1,duration:30,cover:'hard'},{rain:60,capacity:6,area:1,duration:60,cover:'green'}]),null);
const nodes=new Map(),node=selector=>{if(!nodes.has(selector))nodes.set(selector,{id:selector.slice(1),value:'',textContent:'',innerHTML:'',scrollIntoView(){},focus(){fixture.context.document.activeElement=this},setAttribute(){}});return nodes.get(selector)};
const checks=Object.keys({reflection:1,vegetation:1,bank:1,structure:1}).map(id=>({dataset:{observationFeature:id},checked:false}));
const presets=[20,60,100].map(rain=>({dataset:{labRain:String(rain)},setAttribute(){}}));
const root={innerHTML:'',querySelector:node,querySelectorAll:selector=>selector==='[data-observation-feature]'?checks:selector==='[data-lab-rain]'?presets:[]};
let exported='',mapOptions;
j.bind({root,stations:fixture.context.window.HydroAtlas.places,makeMap:(el,options)=>{mapOptions=options;return {destroy(){}}},toast(){},download:data=>exported=data});
const click=(attribute,dataset={})=>node('#journey').onclick({target:{closest:()=>({hasAttribute:name=>name===attribute,dataset})}});
click('data-step',{step:'3'});assert.equal(j.getState().step,3,'observation is available without prerequisites');
click('data-step',{step:'1'});assert.equal(mapOptions.stations.length,8);mapOptions.onSelect(7);assert.equal(j.getState().chosen,7);
click('data-step',{step:'2'});
for(const [name,value] of [['rain',100],['area',2],['duration',30],['capacity',0]]){node('#journey-'+name).value=String(value);node('#journey-'+name).oninput();node('#journey-'+name).onchange()}
click('data-save-run');assert.equal(j.getState().runs.length,1);assert.equal(j.getState().trials.length,3);assert(j.comparison());
click('data-save-run');assert.equal(j.getState().runs.length,1,'duplicate consecutive settings are not appended');
for(let rain=10;rain<=70;rain+=10){click('data-lab-rain',{labRain:String(rain)});click('data-save-run')}
assert.equal(j.getState().runs.length,6,'at most six parameter sets are retained');
const id=j.getState().runs[0].id;click('data-run-remove',{runRemove:String(id)});assert.equal(j.getState().runs.length,5);
click('data-reset-params');assert.equal(j.getState().rain,60);assert.equal(j.getState().area,1);assert.equal(j.getState().runs.length,5,'resetting controls retains saved parameter sets');
click('data-step',{step:'3'});
node('#observation-note').value='岸边有植物，水面反光。';node('#observation-note').oninput();checks[1].checked=true;checks[1].onchange();click('data-finish');
node('#observation-photo').value='qinhuai';node('#observation-photo').onchange();node('#observation-note').value='河面可见灯光倒影。';node('#observation-note').oninput();
click('data-export');assert(exported.includes('岸边有植物'));assert(exported.includes('河面可见灯光倒影'));assert(exported.includes('岸边植被'));assert(exported.includes('非实测报告'));assert(exported.includes('参数记录'));
j.destroy();const resumed=setup(Object.fromEntries(fixture.storage));assert.equal(resumed.journey.getState().runs.length,5);assert.equal(resumed.journey.getState().notes.xuanwu,'岸边有植物，水面反光。');
const migrated=setup({'zhishui-water-journey-v2':JSON.stringify({version:2,state:{step:3,photo:'qinhuai',note:'旧版观察',notes:{qinhuai:'旧版观察'}}})});assert.equal(migrated.journey.getState().note,'旧版观察');assert.equal(migrated.journey.getState().step,3);
const legacy=setup({'zhishui-water-journey-v1':JSON.stringify({version:1,state:{photo:'xuanwu',note:'早期笔记'}})});assert.equal(legacy.journey.getState().note,'早期笔记');
const corruptLegacy=setup({...Object.fromEntries(fixture.storage),'zhishui-water-journey-v2':'broken'});assert.equal(corruptLegacy.journey.getState().runs.length,5);
assert(setup({},true).journey.render().includes('当前浏览器无法保存'));
console.log('PASS: volume conservation, area/duration/drainage effects, comparable inputs, free module navigation, eight map places, live controls, six parameter sets, duplicate/delete/reset, notes/features/export, v1/v2 migration and storage fallback');
