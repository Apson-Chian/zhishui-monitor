import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../dist/assets/app.js',import.meta.url),'utf8');
const logic=source.slice(source.indexOf('function handlePlatformLink('),source.indexOf('\nfunction route(){'));
const scrolls=[],focus=[],sectionScrolls=[];let closed=0,sidebars=0,reduced=false;
const main={focus:()=>focus.push('main')},dialog={close:()=>closed++};
const section={scrollIntoView:options=>sectionScrolls.push(options),focus:()=>focus.push('section')};
const context={URLSearchParams,location:{hash:'#/home'},window:{scrollTo:options=>scrolls.push(options)},matchMedia:()=>({matches:reduced}),document:{getElementById:id=>id==='start'?section:null},$:selector=>selector==='#dialog'?dialog:main,closeSidebar:()=>sidebars++};
vm.runInNewContext(logic,context);
function click(hash='#/home',changes={}){
 const anchor={hash,target:'',hasAttribute:()=>false,getAttribute:()=>hash};
 const e={button:0,detail:1,defaultPrevented:false,target:{closest:()=>anchor},preventDefault(){this.defaultPrevented=true},...changes};
 context.handlePlatformLink(e);return {e,anchor};
}
let result=click();assert.equal(result.e.defaultPrevented,true);assert.equal(scrolls.at(-1).top,0);assert.equal(scrolls.at(-1).behavior,'smooth');assert.equal(sidebars,1);
const before=scrolls.length;result=click('#/monitor');assert.equal(result.e.defaultPrevented,false,'new route must retain native hash navigation');assert.equal(scrolls.length,before);
for(const changes of [{ctrlKey:true},{metaKey:true},{shiftKey:true},{altKey:true},{button:1},{defaultPrevented:true}]){const c=closed;click('#/home',changes);assert.equal(closed,c,'modified/already handled click must stay native')}
for(const kind of ['download','new-tab']){
 const a={hash:'#/home',target:kind==='new-tab'?'_blank':'',hasAttribute:()=>kind==='download',getAttribute:()=>'#/home'};
 const c=closed;click('#/home',{target:{closest:()=>a}});assert.equal(closed,c,'download and new tabs must stay native');
}
click('#/home',{detail:0});assert.equal(scrolls.at(-1).behavior,'instant');assert.equal(focus.at(-1),'main');
reduced=true;click();assert.equal(scrolls.at(-1).behavior,'instant');
context.location.hash='#/home?section=start';click(context.location.hash,{detail:0});assert.equal(sectionScrolls.length,1);assert.equal(focus.at(-1),'section');
console.log('PASS: current-route scroll, keyboard focus, native cross-route links, section links, reduced motion and modified/download/new-tab preservation');
