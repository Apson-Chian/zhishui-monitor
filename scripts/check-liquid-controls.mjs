/* Optional Playwright regression: npm run dev, then npm run check:controls.
   GLASS_BROWSER=webkit or firefox also checks the CSS material fallback. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),engine=process.env.GLASS_BROWSER||'chromium';
const playwright=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const browser=await playwright[engine].launch({headless:true,...(engine==='chromium'&&process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});
const base=process.argv[2]||'http://127.0.0.1:5188/',errors=[];
async function open(width,options={}){
 const p=await browser.newPage({viewport:{width,height:1000},...options});p.on('pageerror',error=>errors.push(error.message));
 await p.goto(base+'#/monitor?tool=rain');await p.locator('#opening-skip').click();await p.locator('#sandbox-rain[data-glass-input]').waitFor();await p.evaluate(()=>document.fonts.ready);return p;
}
try{
 for(const width of [1440,390,320]){
  const p=await open(width);
  assert.equal(await p.locator('[data-glass-range]').count(),3);
  for(const id of ['sandbox-rain','sandbox-gate','sandbox-time']){
   const input=p.locator('#'+id);await input.focus();await p.keyboard.press('End');assert.equal(await input.inputValue(),await input.getAttribute('max'));await p.keyboard.press('Home');assert.equal(await input.inputValue(),'0');
   await input.scrollIntoViewIfNeeded();const box=await input.boundingBox(),thumbWidth=id==='sandbox-gate'?52:40,y=box.y+box.height/2;
   const x=ratio=>box.x+thumbWidth/2+(box.width-thumbWidth)*ratio;
   await p.mouse.move(x(0),y);await p.mouse.down();
   assert.equal(await input.evaluate(el=>el.closest('[data-glass-range]').hasAttribute('data-glass-dragging')),true);
   await p.mouse.move(x(.75),y,{steps:8});
   const expected=Number(await input.getAttribute('max'))*.75;
   assert(Math.abs(Number(await input.inputValue())-expected)<=Number(await input.getAttribute('step')||1)+1,`${engine} ${id}: native drag follows rail`);
   await p.mouse.up();assert.equal(await p.locator('[data-glass-dragging],[data-glass-pressed]').count(),0);
   await p.waitForFunction(id=>{const el=document.getElementById(id),ratio=(el.value-el.min)/(el.max-el.min)*100;return Math.abs(parseFloat(el.closest('[data-glass-range]').style.getPropertyValue('--range-progress'))-ratio)<.1},id);
  }
  const time=p.locator('#sandbox-time');await time.focus();await p.keyboard.press('Home');await p.locator('[data-rain-preset="90"]').click();await p.locator('#sandbox-play').click();
  await p.waitForFunction(()=>Number(document.querySelector('#sandbox-time').value)>0);
  await p.waitForFunction(()=>parseFloat(document.querySelector('#sandbox-time').closest('[data-glass-range]').style.getPropertyValue('--range-progress'))>0);
  await p.locator('#sandbox-play').click();
  const preset=p.locator('[data-rain-preset="60"]');await preset.scrollIntoViewIfNeeded();await preset.focus();await p.keyboard.down(' ');
  assert.equal(await preset.getAttribute('data-glass-keyboard'),'');assert.equal(await preset.evaluate(el=>getComputedStyle(el).transform),'none');await p.keyboard.up(' ');
  await p.locator('.rain-control').screenshot({path:`qa/optical-${engine}-rain-${width}.png`});
  await p.locator('.gate-control').screenshot({path:`qa/optical-${engine}-gate-${width}.png`});
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await p.evaluate(()=>location.hash='/experience');await p.locator('input[data-lab-param][data-glass-input]').first().waitFor();
  const journey=p.locator('input[data-lab-param]').first();await journey.focus();await p.keyboard.press('End');await p.waitForFunction(()=>document.querySelector('input[data-lab-param]').closest('[data-glass-range]').style.getPropertyValue('--range-progress')==='100%');
  await p.evaluate(()=>location.hash='/home');await p.locator('.hero-primary[data-glass-control]').waitFor();
  const primary=p.locator('.hero-primary');await primary.scrollIntoViewIfNeeded();await primary.hover();await p.mouse.down();assert.equal(await primary.getAttribute('data-glass-pressed'),'');await p.mouse.move(0,0);await p.mouse.up();assert.equal(await p.locator('[data-glass-pressed]').count(),0);
  await p.close();
 }
 const reduced=await open(390,{reducedMotion:'reduce'});const button=reduced.locator('[data-rain-preset="90"]');await button.scrollIntoViewIfNeeded();await button.hover();await reduced.mouse.down();assert.equal(await button.evaluate(el=>getComputedStyle(el).transform),'none');await reduced.mouse.up();
 await reduced.evaluate(()=>document.documentElement.dataset.glassEffects='off');await reduced.waitForFunction(()=>!document.querySelector('[data-liquid-lens]'));
 assert.equal(await reduced.locator('.gate-slider-thumb').evaluate(el=>getComputedStyle(el).backdropFilter),'none');await reduced.close();
 const contrast=await open(390,{forcedColors:'active'});assert.equal(await contrast.locator('.liquid-range-rail').first().evaluate(el=>getComputedStyle(el).display),'none');await contrast.locator('#sandbox-rain').focus();await contrast.keyboard.press('End');assert.equal(await contrast.locator('#sandbox-rain').inputValue(),'120');await contrast.close();
 assert.deepEqual(errors,[]);console.log(`PASS ${engine}: native drag/keyboard, values and playback stay synchronized, route replacement, canceled press, reduced motion, material-off and forced colours; widths 1440/390/320`);
}finally{await browser.close()}
