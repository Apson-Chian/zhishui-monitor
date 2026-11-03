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
 await card.evaluate(element=>element.style.setProperty('--liquid-lens-filter','blur(12px) saturate(112%)'));
 const plain=await fixture.screenshot();
 assert.deepEqual(await page.locator('#rim-text').boundingBox(),foreground,'foreground geometry stays fixed');
 const difference=await page.evaluate(async urls=>{
  const arrays=[];
  for(const url of urls){const image=new Image();image.src=url;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const context=canvas.getContext('2d');context.drawImage(image,0,0);arrays.push(context.getImageData(0,0,image.width,image.height).data)}
  const regions={left:[42,95,66,285],right:[494,95,518,285],center:[110,110,440,240]},results={};
  for(const [name,[x1,y1,x2,y2]]of Object.entries(regions)){let total=0;for(let y=y1;y<y2;y++)for(let x=x1;x<x2;x++)for(let k=0;k<3;k++)total+=Math.abs(arrays[0][(y*560+x)*4+k]-arrays[1][(y*560+x)*4+k]);results[name]=total/((x2-x1)*(y2-y1)*3)}return results;
 },[refracted,plain].map(buffer=>'data:image/png;base64,'+buffer.toString('base64')));
 assert(difference.left>1&&difference.right>1,'the rim changes actual background pixels');
 assert(difference.center<.5,'the center does not shift');
 await page.evaluate(()=>document.documentElement.dataset.glassEffects='off');
 await page.waitForFunction(()=>!document.querySelector('#rim-card').hasAttribute('data-liquid-lens'));
 assert.equal(await card.evaluate(element=>getComputedStyle(element).backdropFilter),'none','explicit fallback stops the filter');
 await page.evaluate(()=>{document.querySelector('#rim-regression').remove();delete document.documentElement.dataset.glassEffects});
 await page.locator('[data-open-gallery]').click();
 assert.equal(await page.locator('#dialog').evaluate(element=>element.open),true,'glass does not intercept the gallery button');
 await page.keyboard.press('Escape');assert.deepEqual(errors,[]);
 console.log('PASS: background pixels bend only at the rim, clear foreground, material-off fallback and gallery interaction',JSON.stringify(difference));
}finally{await browser.close()}
