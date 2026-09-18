import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(path.join(process.cwd(),'package.json'));
const { chromium }=require('@playwright/test');
const AxeBuilder=require('@axe-core/playwright').default;
const root=path.resolve('docs/features/ornament-builder');
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.json':'application/json'};
const server=http.createServer(async(req,res)=>{
  const loc=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!loc.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{res.setHeader('Content-Type',mime[path.extname(loc)]||'text/plain');res.end(await fs.readFile(loc));}catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}/originals/sunda/demo/index.html`;
const browser=await chromium.launch({headless:true});
const results=[];
try{
  for(const width of [360,768,1440]){
    const context=await browser.newContext({viewport:{width,height:900}});
    const page=await context.newPage();const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
    await page.goto(url);await page.waitForTimeout(1800);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`overflow ${width}`);
    const images=await page.locator('img').evaluateAll(imgs=>imgs.every(i=>i.complete&&i.naturalWidth>0));
    assert.ok(images,'image loading');
    const invalidSvg=await page.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);return ids.length!==new Set(ids).size;});
    assert.equal(invalidSvg,false,'duplicate DOM IDs');
    const accessibility=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    results.push({width,overflow:false,loadedImages:images,axe:accessibility.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)})),errors});
    await page.screenshot({path:path.join(root,`verification/demo-${width}.png`),fullPage:true});
    await page.getByRole('button',{name:'Jeda animasi'}).click();
    assert.equal(await page.locator('#motion-toggle').getAttribute('aria-pressed'),'true');
    assert.equal(await page.evaluate(()=>gsap.globalTimeline.getChildren().filter(t=>t.isActive()).length),0,'pause stops motion');
    await page.getByRole('button',{name:'Aktifkan animasi'}).click();
    await page.locator('#koleksi').scrollIntoViewIfNeeded();await page.waitForTimeout(1300);
    assert.equal(await page.evaluate(()=>[...document.querySelectorAll('.sway')].every(el=>gsap.getTweensOf(el).every(t=>t.paused()))),true,'offscreen loops paused');
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForFunction(()=>document.querySelector('#motion-toggle').disabled);
    assert.equal(await page.locator('#motion-toggle').isDisabled(),true);
    assert.equal(await page.evaluate(()=>gsap.globalTimeline.getChildren().filter(t=>t.isActive()).length),0,'live reduced motion stops animation');
    assert.equal(errors.length,0,'browser errors');
    await context.close();
  }
  for(const mode of ['reduced-motion','no-javascript']){
    const context=await browser.newContext({viewport:{width:360,height:800},javaScriptEnabled:mode!=='no-javascript',reducedMotion:'reduce'});
    const page=await context.newPage();await page.goto(url);await page.waitForTimeout(300);
    assert.ok(await page.locator('h1').isVisible());
    assert.equal(await page.locator('h1').evaluate(e=>getComputedStyle(e).opacity),'1');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:path.join(root,`verification/demo-${mode}.png`),fullPage:true});
    results.push({mode,headingVisible:true,overflow:false});
    await context.close();
  }
  await fs.writeFile(path.join(root,'verification/browser.json'),JSON.stringify({verifiedAt:new Date().toISOString(),results},null,2));
  console.log(JSON.stringify(results,null,2));
  assert.ok(results.every(r=>!r.axe?.length),'axe violations');
}finally{await browser.close();server.close();}
