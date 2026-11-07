/* Optional browser regression. Start npm run dev, then npm run check:glass.
   Requires Playwright and its Chromium browser; no production dependency. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
let chromium;
try{({chromium}=require('playwright'))}catch{throw new Error('Install the optional test tool: npm install --no-save playwright; npx playwright install chromium')}
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});
try{
 const page=await browser.newPage({viewport:{width:900,height:800},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto((process.argv[2]||'http://127.0.0.1:5188/')+'#/home');
 if(await page.locator('#opening-skip').isVisible())await page.locator('#opening-skip').click();
 await page.evaluate(()=>document.fonts.ready);
 await page.evaluate(()=>{
  const fixture=document.createElement('div');fixture.id='rim-regression';fixture.style.cssText='position:fixed;z-index:9000;left:30px;top:130px;width:560px;height:340px;background:repeating-linear-gradient(90deg,#245b66 0 30px,#d6dba3 30px 60px,#7ba9aa 60px 90px,#edf5e3 90px 120px)';
  const card=document.createElement('a');card.href='#/knowledge';card.className='monitor-analysis-link';card.id='rim-card';card.style.cssText='display:block;position:absolute;inset:40px;width:480px;height:260px;border-radius:26px;background:rgba(255,255,255,.18);box-shadow:none;border:0';card.innerHTML='<strong id="rim-text" style="position:absolute;left:100px;top:105px;color:#173c42">水位与流量</strong>';fixture.append(card);document.querySelector('#main').append(fixture);
 });
 await page.waitForFunction(()=>document.querySelector('#rim-card').hasAttribute('data-liquid-lens'));
 const fixture=page.locator('#rim-regression'),card=page.locator('#rim-card'),foreground=await page.locator('#rim-text').boundingBox();
 const refracted=await fixture.screenshot();
 await card.evaluate(element=>element.style.setProperty('--liquid-lens-filter','var(--liquid-surface-filter)'));
 const plain=await fixture.screenshot();
 assert.deepEqual(await page.locator('#rim-text').boundingBox(),foreground,'foreground geometry stays fixed');
 const difference=await page.evaluate(async urls=>{
  const arrays=[];
  for(const url of urls){const image=new Image();image.src=url;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const context=canvas.getContext('2d');context.drawImage(image,0,0);arrays.push(context.getImageData(0,0,image.width,image.height).data)}
  const regions={left:[42,95,66,285],right:[494,95,518,285],center:[110,110,440,240]},results={};
  for(const [name,[x1,y1,x2,y2]]of Object.entries(regions)){let total=0;for(let y=y1;y<y2;y++)for(let x=x1;x<x2;x++)for(let k=0;k<3;k++)total+=Math.abs(arrays[0][(y*560+x)*4+k]-arrays[1][(y*560+x)*4+k]);results[name]=total/((x2-x1)*(y2-y1)*3)}return results;
 },[refracted,plain].map(buffer=>'data:image/png;base64,'+buffer.toString('base64')));
 assert(difference.left>14&&difference.right>14,'the strong rim changes actual background pixels');
 assert(difference.center<.5,'the center does not shift');
 await page.evaluate(()=>document.documentElement.dataset.glassEffects='off');
 await page.waitForFunction(()=>!document.querySelector('#rim-card').hasAttribute('data-liquid-lens'));
 assert.equal(await card.evaluate(element=>getComputedStyle(element).backdropFilter),'none','explicit fallback stops the filter');
 await page.evaluate(()=>{document.querySelector('#rim-regression').remove();delete document.documentElement.dataset.glassEffects});
 // Suppress all CSS colour decoration: only displacement of the real grey backdrop may add colour.
 await page.evaluate(()=>{
  const fixture=document.createElement('div');fixture.id='optical-regression';fixture.style.cssText='position:fixed;left:30px;top:130px;width:560px;height:300px;z-index:9000;background:repeating-linear-gradient(90deg,#333 0 14px,#ddd 14px 28px)';
  fixture.innerHTML='<button type="button" class="btn" id="optical-button" style="position:absolute;left:100px;top:40px;width:320px;height:90px;border-radius:45px;background:#ffffff20;border:0;box-shadow:none"><span>水位与流量</span></button><style>#optical-button::before,#optical-button::after{display:none!important}</style>';
  document.querySelector('#main').append(fixture);
 });
 await page.waitForFunction(()=>document.querySelector('#optical-button').hasAttribute('data-liquid-lens'));
 const optical=page.locator('#optical-regression'),button=page.locator('#optical-button'),labelBox=await button.locator('span').boundingBox();
 const resting=await optical.screenshot();await button.hover();await page.mouse.down();
 assert.equal(await button.getAttribute('data-glass-pressed'),'');assert.deepEqual(await button.locator('span').boundingBox(),labelBox,'reduced-motion press leaves the label fixed');
 const pressed=await optical.screenshot();await page.mouse.up();assert.equal(await button.getAttribute('data-glass-pressed'),null);
 const fringe=await page.evaluate(async urls=>{
  const counts=[];
  for(const url of urls){const image=new Image();image.src=url;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const context=canvas.getContext('2d');context.drawImage(image,0,0);const data=context.getImageData(0,0,image.width,image.height).data;let count=0;for(let y=60;y<110;y++)for(let x=110;x<130;x++){const i=(y*560+x)*4;if(Math.max(data[i],data[i+1],data[i+2])-Math.min(data[i],data[i+1],data[i+2])>8)count++}counts.push(count)}return counts;
 },[resting,pressed].map(buffer=>'data:image/png;base64,'+buffer.toString('base64')));
 assert(fringe[1]>fringe[0]+100,'press separates RGB background channels at the rim, without CSS colour decoration');
 // A translucent backdrop root must not become greyer when its three channels recombine.
 await optical.evaluate(el=>{el.style.background='#ffffff40';el.style.backdropFilter='blur(1px)'});
 const alphaRest=await optical.screenshot(),originalFilter=await button.evaluate(el=>el.style.getPropertyValue('--liquid-lens-filter'));
 await button.evaluate(el=>el.style.setProperty('--liquid-lens-filter','var(--control-filter)'));
 const alphaPlain=await optical.screenshot();await button.evaluate((el,value)=>el.style.setProperty('--liquid-lens-filter',value),originalFilter);
 const alphaDifference=await page.evaluate(async urls=>{
  const arrays=[];for(const url of urls){const image=new Image();image.src=url;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const context=canvas.getContext('2d');context.drawImage(image,0,0);arrays.push(context.getImageData(0,0,image.width,image.height).data)}
  let sum=0;for(let y=65;y<100;y++)for(let x=180;x<340;x++)for(let k=0;k<3;k++){const i=(y*560+x)*4+k;sum+=Math.abs(arrays[0][i]-arrays[1][i])}return sum/(35*160*3);
 },[alphaRest,alphaPlain].map(buffer=>'data:image/png;base64,'+buffer.toString('base64')));
 assert(alphaDifference<1,'recombining RGB preserves translucent backdrop alpha');
 await page.evaluate(()=>document.querySelector('#optical-regression').remove());
 await page.locator('[data-open-gallery]').click();
 assert.equal(await page.locator('#dialog').evaluate(element=>element.open),true,'glass does not intercept the gallery button');
 await page.locator('#dialog .nanjing-place[data-liquid-surface]').first().waitFor();
 await page.keyboard.press('Escape');assert.deepEqual(errors,[]);
 console.log('PASS: background pixels bend only at the rim, press refracts background RGB channels, clear foreground and translucent alpha, material-off fallback and gallery interaction',JSON.stringify({difference,fringe,alphaDifference}));
}finally{await browser.close()}
