import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const makeElement=(id='')=>({id,hidden:false,dataset:{},textContent:'',attributes:new Map(),listeners:new Map(),classList:{toggle(){}},setAttribute(k,v){this.attributes.set(k,v)},removeAttribute(k){this.attributes.delete(k)},addEventListener(k,fn){this.listeners.set(k,fn)},removeEventListener(k){this.listeners.delete(k)},focus(){this.focused=true}});
const preference={...makeElement(),matches:false};
const doc={...makeElement(),hidden:false};
const win={...makeElement(),scrollTo(){}};
const context={window:win,document:doc,matchMedia:()=>({matches:preference.matches,addEventListener:(k,fn)=>preference.listeners.set(k,fn),removeEventListener:k=>preference.listeners.delete(k)})};
vm.runInNewContext(readFileSync(new URL('../dist/assets/opening.js',import.meta.url),'utf8'),context);
function setup({reduced=false,animated=false}={}){
 preference.matches=reduced;
 const root=makeElement(),next=makeElement('opening-next'),chapter=makeElement();
 chapter.querySelector=()=>makeElement();chapter.querySelectorAll=()=>[];
 root.querySelector=q=>({'#opening-next':next,'.opening-chapter':chapter}[q]||makeElement());
 let exit;
 if(animated)root.animate=()=>{let resolve;const finished=new Promise(r=>resolve=r);exit={finished,finish:()=>resolve(),cancel:()=>resolve()};return exit};
 const entered=[];const opening=new win.HydroOpening(root,data=>entered.push(data));
 return {root,next,opening,entered,get exit(){return exit}};
}
let s=setup();
assert.equal(s.entered.length,0,'must not initialize application before entry');
s.opening.onClick({target:{closest:()=>s.next},detail:0});
await s.opening.enter(true);assert.equal(s.entered.length,1,'primary button must enter directly and initialize the app once');assert.equal(s.root.hidden,true);
assert.equal(s.root.listeners.size+doc.listeners.size+win.listeners.size+preference.listeners.size,0,'entry must clear opening listeners');
s=setup({animated:true});
const entering=s.opening.enter();assert.equal(s.entered.length,0);s.opening.onVisibility();doc.hidden=true;s.opening.onVisibility();await entering;doc.hidden=false;
assert.equal(s.entered.length,1,'going into background must finish a pending exit');
s=setup({reduced:true,animated:true});await s.opening.enter();assert.equal(s.exit,undefined,'reduced motion must enter immediately');
s=setup();let prevented=false;s.opening.onKey({key:'Escape',preventDefault(){prevented=true}});assert.equal(prevented,true);assert.equal(s.entered.length,1,'Escape must skip without waiting');
const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
assert.doesNotMatch(html,/id="opening-motion"/);assert.match(html,/<div id="platform" hidden>/);assert.match(html,/以水为媒·读懂河海/);assert.match(html,/一城山水/);assert.match(html,/万千脉动/);
const about=readFileSync(new URL('../dist/assets/app.js',import.meta.url),'utf8');
assert.match(about,/水，是金陵绵延的脉络。/);assert.match(about,/诗意流水生生不息。/);
assert.equal((html.match(/class="opening-chapter"/g)||[]).length,1,'opening must contain one introduction');
assert.doesNotMatch(html,/data-opening-step|opening-back|继续阅读|opening-title-two/);

// Exercise the actual shared-river path, including ownership and interruption cleanup.
function node(rect={left:0,top:0,width:600,height:720}){
 const el=makeElement();el.style={cssText:'original'};el.children=[];el.classList={toggle(){},add(){},remove(){},contains:()=>true};
 el.getBoundingClientRect=()=>rect;
 el.appendChild=child=>{child.remove?.();el.children.push(child);child.parentNode=el};
 el.remove=()=>{if(el.parentNode){el.parentNode.children=el.parentNode.children.filter(child=>child!==el);el.parentNode=null}};
 el.animate=(frames,options)=>{let resolve;const finished=new Promise(r=>resolve=r);return {frames,options,finished,finish:resolve,cancel:resolve}};
 return el;
}
context.getComputedStyle=()=>({opacity:'.85',getPropertyValue:()=>''});doc.createElement=()=>node();doc.body=node();
function bridgeSetup(){
 const root=node(),source=node(),art=node(),canvas=node(),scene=node({left:720,top:140,width:640,height:440}),platform=node(),main=node(),chapter=makeElement(),next=makeElement('opening-next');
 chapter.querySelectorAll=()=>[];chapter.querySelector=()=>makeElement();art.appendChild(source);
 root.querySelector=q=>({'.opening-chapter':chapter,'#opening-next':next,'.opening-river':source,'.opening-art':art}[q]);root.querySelectorAll=()=>[chapter];chapter.animate=node().animate;
 scene.querySelector=()=>canvas;let starts=0;
 const opening=new win.HydroOpening(root,()=>{starts++;return {scene,platform,main}});
 return {opening,root,source,art,canvas,platform,main,get starts(){return starts}};
}
for(const interrupt of [false,true]){
 const b=bridgeSetup(),entering=b.opening.enter();
 assert.equal(b.starts,1,'home prepares under the opening before its exit');assert.equal(b.root.hidden,false);assert.equal(b.platform.inert,true);
 assert.equal(b.source.parentNode.parentNode,doc.body.children[0],'the original SVG transfers into a fixed overlay');
 const animations=[...b.opening.bridgeAnimations],river=animations.find(a=>a.id==='river-handoff-river'),home=animations.find(a=>a.id==='river-handoff-homepage');
 assert.equal(river.options.duration,1800);assert.equal(home.options.delay,600);assert.equal(home.options.duration,1200);
 assert.match(river.frames.at(-1).transform,/translate\(.+\) scale\(/);assert.equal(river.frames.at(-1).opacity,0);
 await b.opening.enter();assert.equal(b.starts,1,'repeated entry cannot create a second handoff');
 if(interrupt)b.opening.onKey({key:'Escape',preventDefault(){}});else animations.forEach(a=>a.finish());
 await entering;
 assert.equal(b.root.hidden,true);assert.equal(b.platform.inert,false);assert.equal(b.source.parentNode,b.art);assert.equal(b.source.style.cssText,'original');assert.equal(doc.body.children.length,0);assert.equal(b.main.focused,true);
 assert.equal(b.root.listeners.size+doc.listeners.size+win.listeners.size+preference.listeners.size,0,'handoff clears every listener');
}
console.log('PASS: gated startup, single introduction, direct entry, Escape, duplicate entry, background exit, reduced motion, shared SVG handoff, crossfade and interruption cleanup');
