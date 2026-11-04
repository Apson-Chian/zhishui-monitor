/* Optional browser regression: npm run dev, then npm run check:navigation.
   GLASS_BROWSER=webkit or firefox verifies the CSS material fallback too. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),engine=process.env.GLASS_BROWSER||'chromium';
const playwright=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const browser=await playwright[engine].launch({headless:true,...(engine==='chromium'&&process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});
const base=process.argv[2]||'http://127.0.0.1:5188/',errors=[];
const routes=['home','monitor','experience','ai','knowledge','about'];
async function open(width,options={}){
 const p=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce',...options});p.on('pageerror',error=>errors.push(error.message));
 await p.goto(base+'#/home');await p.locator('#opening-skip').click();await p.evaluate(()=>document.fonts.ready);await p.locator('.glass-nav-indicator').first().waitFor({state:'attached'});return p;
}
async function aligned(p,nav){
 await p.waitForFunction(id=>{
  const nav=document.getElementById(id),active=nav.querySelector('[aria-current="page"]'),indicator=nav.querySelector('.glass-nav-indicator');
  if(!active)return indicator.hidden;
  const a=active.getBoundingClientRect(),b=indicator.getBoundingClientRect();return !indicator.hidden&&Math.abs(a.x-b.x)<1.5&&Math.abs(a.y-b.y)<1.5&&Math.abs(a.width-b.width)<1.5&&Math.abs(a.height-b.height)<1.5;
 },nav);
}
try{
 for(const width of [1440,1024,901,900,768,390,320]){
  const p=await open(width),mobile=width<=900,nav=mobile?'mobile-bottom-nav':'main-nav';
  assert.equal(await p.locator('#main-nav a').count(),6);assert.equal(await p.locator('#mobile-bottom-nav a').count(),5);
  for(const route of routes){
   await p.evaluate(route=>location.hash='/'+route,route);await p.waitForFunction(route=>document.body.dataset.page===route,route);await aligned(p,nav);
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${width} ${route}: no horizontal overflow`);
   assert.equal(await p.locator('#'+nav+' [aria-current="page"]').count(),mobile&&route==='about'?0:1);
   if(!mobile){const side=await p.locator('#sidebar').boundingBox(),main=await p.locator('#main').boundingBox();assert(main.x>=side.x+side.width+8,'content has its own column')}
  }
  await p.evaluate(()=>location.hash='/monitor?tool=rain');await p.locator('#sandbox-rain[data-glass-input]').waitFor();
  for(const preset of await p.locator('[data-rain-preset]').all()){
   const box=await preset.boundingBox();for(const label of await preset.locator('span').all()){const text=await label.boundingBox();assert(text.x>=box.x&&text.x+text.width<=box.x+box.width+1,'sidebar leaves enough room for preset labels')}
  }
  if(mobile){
   await p.locator('#menu-toggle').click();assert.equal(await p.locator('#main').evaluate(el=>el.inert),true);assert.equal(await p.locator('#mobile-bottom-nav').evaluate(el=>el.hidden&&el.inert),true);await aligned(p,'main-nav');
   await p.locator('#main-nav [data-page="knowledge"]').click();await p.waitForFunction(()=>document.body.dataset.page==='knowledge');await aligned(p,'mobile-bottom-nav');assert.equal(await p.locator('#menu-toggle').getAttribute('aria-expanded'),'false');assert.equal(await p.locator('#main').evaluate(el=>el.inert),false);
   await p.locator('#menu-toggle').click();await p.keyboard.press('Escape');assert.equal(await p.locator('#menu-toggle').evaluate(el=>document.activeElement===el),true);
   await p.setViewportSize({width:1100,height:700});await aligned(p,'main-nav');assert.equal(await p.locator('#main-nav').evaluate(el=>el.inert),false);assert.equal(await p.locator('#mobile-bottom-nav').evaluate(el=>el.hidden),true);
   await p.setViewportSize({width,height:900});await aligned(p,'mobile-bottom-nav');assert.equal(await p.locator('#main-nav').evaluate(el=>el.inert),true);
   await p.locator('#mobile-bottom-nav [data-page="home"]').click();await p.waitForFunction(()=>document.body.dataset.page==='home');
  }else{
   await p.locator('#notification-button').click();assert.equal(await p.locator('#dialog').evaluate(el=>el.open),true);await p.keyboard.press('Escape');
   await p.locator('#main-nav [data-page="home"]').focus();await p.keyboard.press('Enter');await p.waitForFunction(()=>document.body.dataset.page==='home');assert.equal(await p.locator('#main').evaluate(el=>document.activeElement===el),true);
   await p.setViewportSize({width,height:480});await p.locator('#main-nav [data-page="about"]').scrollIntoViewIfNeeded();await aligned(p,'main-nav');await p.setViewportSize({width,height:900});
  }
  await p.locator('#'+nav+' [data-page="knowledge"]').click();await p.waitForFunction(()=>document.body.dataset.page==='knowledge');await p.goBack();await p.waitForFunction(()=>document.body.dataset.page==='home');await p.goForward();await p.waitForFunction(()=>document.body.dataset.page==='knowledge');await aligned(p,nav);
  assert((await p.locator('#'+nav+' [data-page="knowledge"]').evaluate(el=>getComputedStyle(el).fontFamily)).includes('Zhishui Songti'));
  await p.screenshot({path:`qa/navigation-${engine}-${width}.png`});await p.close();
 }
 const p=await open(390,{reducedMotion:'no-preference'});
 await p.locator('#mobile-bottom-nav [data-page="monitor"]').click();await p.locator('#mobile-bottom-nav [data-page="knowledge"]').click();await p.waitForFunction(()=>document.body.dataset.page==='knowledge');await aligned(p,'mobile-bottom-nav');
 const link=p.locator('#mobile-bottom-nav [data-page="home"]');await link.focus();await p.keyboard.press('Enter');await p.waitForFunction(()=>document.body.dataset.page==='home');await aligned(p,'mobile-bottom-nav');assert.equal(await p.locator('#mobile-bottom-nav .glass-nav-indicator').evaluate(el=>getComputedStyle(el).transitionDuration),'0s');
 await p.evaluate(()=>{window.navMutationCount=0;new MutationObserver(records=>window.navMutationCount+=records.length).observe(document.querySelector('#mobile-bottom-nav .glass-nav-indicator'),{attributes:true,attributeFilter:['style','hidden']})});
 await p.waitForTimeout(500);assert((await p.evaluate(()=>window.navMutationCount))<5,'idle navigation does not keep repainting');
 await p.evaluate(()=>document.documentElement.dataset.glassEffects='off');await p.waitForFunction(()=>!document.querySelector('[data-liquid-lens]'));await aligned(p,'mobile-bottom-nav');await p.close();
 const contrast=await open(390,{forcedColors:'active'});await aligned(contrast,'mobile-bottom-nav');assert.equal(await contrast.locator('#mobile-bottom-nav').evaluate(el=>getComputedStyle(el).backdropFilter),'none');await contrast.close();
 assert.deepEqual(errors,[]);console.log(`PASS ${engine}: sidebar column, five mobile tabs, all six routes, exact selected lens, menu/inert/Escape, keyboard, history, 900px breakpoint, rotation, short screens, rapid interruption, idle, Songti and material fallbacks`);
}finally{await browser.close()}
