/** Run from the Aruna-dewa root. Public invitation assets only; never submits forms. */
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import { normalizeUrl, detectType, blobIdentity, extractCssUrls } from './core.mjs';
const require = createRequire(path.join(process.cwd(), 'package.json'));
const { chromium } = require('@playwright/test');
const sharp = require('sharp');
const defaults = [
  ...['spesial-05','spesial-07','spesial-02'].map(x => `https://inv.wekita.id/${x}/`),
  ...['batak','bali','vintage-07','vintage-01','vintage-08'].map(x => `https://inv.punakawandigital.id/${x}/`),
];
const args = process.argv.slice(2);
const outIndex = args.indexOf('--out');
const out = path.resolve(outIndex >= 0 ? args.splice(outIndex, 2)[1] : 'docs/features/ornament-builder/sources');
const urls = (args.length ? args : defaults).map(u => normalizeUrl(u)).filter(Boolean);
if (!urls.length) throw new Error('Provide at least one HTTP(S) URL');
await fs.mkdir(path.join(out, 'blobs'), { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference', ignoreHTTPSErrors: false });
const now = () => new Date().toISOString();
const maxBytes = 20 * 1024 * 1024;
const cache = new Map();

async function archive(url, body, mime, source = 'network') {
  const format = detectType(body, mime);
  if (!format) return { url, status: 'unsupported-or-invalid', mime, bytes: body.length, fetchedAt: now() };
  if (body.length > maxBytes) return { url, status: 'size-limit', bytes: body.length, fetchedAt: now() };
  const checksum = blobIdentity(body);
  // Scripts, CSS and raw SVG are evidence; do not execute them inside the local gallery.
  const suffix = ['js','css','svg'].includes(format) ? `${format}.txt` : format;
  const local = `blobs/${checksum}.${suffix}`;
  await fs.writeFile(path.join(out, local), body, { flag: 'wx' }).catch(e => { if (e.code !== 'EEXIST') throw e; });
  let dimensions = null;
  if (['png','jpg','webp','gif','avif','svg'].includes(format)) {
    try {
      const m = await sharp(body).metadata();
      dimensions = { width: m.width, height: m.height, pages: m.pages || 1, alpha: !!m.hasAlpha };
      // Raster thumbnail makes even a third-party SVG inert in the gallery.
      const thumb = `blobs/${checksum}.thumb.webp`;
      try { await fs.access(path.join(out, thumb)); }
      catch { await sharp(body, { limitInputPixels: 60_000_000 }).resize({ width: 320, height: 320, fit: 'inside', withoutEnlargement: true }).webp({ quality: 75 }).toFile(path.join(out, thumb)); }
      return { url, status: 'downloaded', format, mime, bytes: body.length, checksum, local, thumbnail: thumb, dimensions, source, fetchedAt: now(), usage: 'research-only-unverified-license' };
    } catch (e) { dimensions = { decodeError: e.message.slice(0,180) }; }
  }
  return { url, status: 'downloaded', format, mime, bytes: body.length, checksum, local, dimensions, source, fetchedAt: now(), usage: 'research-only-unverified-license' };
}

async function fetchAsset(url) {
  if (cache.has(url)) return cache.get(url);
  const job = (async () => {
    try {
      const r = await context.request.get(url, { timeout: 20000, maxRedirects: 5 });
      if (!r.ok()) return { url, status: 'http-error', httpStatus: r.status(), fetchedAt: now() };
      if (Number(r.headers()['content-length']) > maxBytes) return { url, status: 'size-limit', fetchedAt: now() };
      return await archive(url, await r.body(), r.headers()['content-type'] || '', 'discovered');
    } catch (e) { return { url, status: 'request-failed', error: e.message.slice(0,220), fetchedAt: now() }; }
  })();
  cache.set(url, job);
  return job;
}

for (const url of urls) {
  const id = new URL(url).hostname.split('.')[1] + '-' + new URL(url).pathname.split('/').filter(Boolean).join('-');
  const dir = path.join(out, id);
  await fs.mkdir(dir, { recursive: true });
  const page = await context.newPage();
  const pending = [];
  const found = new Set();
  const records = new Map();
  const failedRequests = [];
  const evidence = { schemaVersion: 1, id, url, capturedAt: now(), viewport: { width: 390, height: 844 }, phases: [], fontFaces: [], renderedFonts: [], motion: [], limitations: [], interactions: [], inspection: [] };
  page.on('requestfailed', r => failedRequests.push({ url: r.url(), error: r.failure()?.errorText }));
  page.on('response', r => {
    const type = r.headers()['content-type'] || '';
    if (!/image|font|css|javascript|octet-stream/.test(type)) return;
    const job = (async () => {
      try {
        if (!r.ok()) return records.set(r.url(), { url: r.url(), status: 'http-error', httpStatus: r.status(), fetchedAt: now() });
        if (Number(r.headers()['content-length']) > maxBytes) return;
        const body = await r.body();
        const record = await archive(r.url(), body, type);
        records.set(r.url(), record);
        if (record.format === 'css') extractCssUrls(body.toString(), r.url()).forEach(v => found.add(v));
      } catch { /* superseded requests are retained in request-failures */ }
    })();
    pending.push(job);
  });
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    evidence.httpStatus = response?.status();
    if (response) await fs.writeFile(path.join(dir, 'source.html.txt'), await response.body());
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(dir, 'cover.png') });
    async function sample(phase) {
      const data = await page.evaluate(() => {
        const selector = el => el.id ? `#${CSS.escape(el.id)}` : (el.closest('[data-id]') ? `[data-id="${el.closest('[data-id]').getAttribute('data-id')}"] ` : '') + el.tagName.toLowerCase() + [...el.classList].slice(0,2).map(c=>`.${CSS.escape(c)}`).join('');
        const assets = new Set();
        const fonts = [];
        const motion = [];
        for (const el of document.querySelectorAll('*')) {
          const r = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          for (const attr of ['src','data-src','data-lazy-src','poster']) { const v = el.getAttribute(attr); if (v) assets.add(v); }
          for (const attr of ['srcset','data-srcset']) { for (const v of (el.getAttribute(attr)||'').split(',')) if (v.trim()) assets.add(v.trim().split(/\s+/)[0]); }
          if (el instanceof HTMLImageElement && el.currentSrc) assets.add(el.currentSrc);
          for (const s of [style, getComputedStyle(el,'::before'), getComputedStyle(el,'::after')]) {
            for (const prop of ['backgroundImage','maskImage','content']) for (const m of s[prop].matchAll(/url\(["']?([^"')]+)["']?\)/g)) assets.add(m[1]);
          }
          const visible = r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && style.visibility !== 'hidden' && style.display !== 'none';
          if (visible && /^(H[1-6]|P|SPAN|A|BUTTON)$/.test(el.tagName) && el.textContent.trim() && el.children.length < 3 && fonts.length < 35) fonts.push({ selector: selector(el), text: el.textContent.trim().slice(0,65), family: style.fontFamily, weight: style.fontWeight, style: style.fontStyle, size: style.fontSize, lineHeight: style.lineHeight, letterSpacing: style.letterSpacing, loaded: document.fonts.check(`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`) });
          if (visible && (style.animationName !== 'none' || style.transform !== 'none' || style.transitionDuration !== '0s') && motion.length < 55) motion.push({ selector: selector(el), animation: style.animationName, duration: style.animationDuration, easing: style.animationTimingFunction, iterations: style.animationIterationCount, transform: style.transform, transition: style.transition, origin: style.transformOrigin, zIndex: style.zIndex });
        }
        const faces = [...document.fonts].map(f => ({ family: f.family, weight: f.weight, style: f.style, status: f.status }));
        const inlineSvgs = [...document.querySelectorAll('svg')].map(s => s.outerHTML);
        const sheets = [...document.querySelectorAll('link[rel="stylesheet"]')].map(e=>e.href);
        return { assets: [...assets], fonts, motion, faces, inlineSvgs, sheets, scrollY, scrollHeight: document.documentElement.scrollHeight };
      });
      data.assets.concat(data.sheets).map(x => normalizeUrl(x, url)).filter(Boolean).forEach(v => found.add(v));
      for (const svg of data.inlineSvgs) {
        const key = `${url}#inline-svg-${blobIdentity(Buffer.from(svg)).slice(0,12)}`;
        if (!records.has(key)) records.set(key, await archive(key, Buffer.from(svg), 'image/svg+xml','inline-svg'));
      }
      evidence.phases.push({ phase, scrollY: data.scrollY, scrollHeight: data.scrollHeight, fonts: data.fonts });
      evidence.fontFaces = data.faces;
      evidence.motion.push(...data.motion.map(m => ({ phase, ...m })));
    }
    await sample('cover');
    const opener = page.getByText(/^(buka undangan|open invitation)$/i).first();
    if (await opener.count()) {
      try { await opener.click({ timeout: 5000 }); evidence.interactions.push('Clicked visible invitation opener; no forms submitted.'); }
      catch (e) { evidence.limitations.push('Opener click failed: ' + e.message.slice(0,150)); }
    } else evidence.limitations.push('No exact invitation-opener label found; page sampled as loaded.');
    await page.waitForTimeout(2500);
    await sample('opened');
    const cdp = await context.newCDPSession(page);
    await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
    const root = (await cdp.send('DOM.getDocument')).root.nodeId;
    for (const item of evidence.phases.flatMap(p=>p.fonts).slice(0,24)) {
      try {
        const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root, selector: item.selector });
        if (nodeId) evidence.renderedFonts.push({ selector: item.selector, ...(await cdp.send('CSS.getPlatformFontsForNode', { nodeId })) });
      } catch { /* selector collision is not evidence of a rendered font */ }
    }
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    const steps = Math.min(Math.ceil(height / 650), 45);
    for (let i=1;i<=steps;i++) {
      await page.evaluate(y=>window.scrollTo(0,y), i*650);
      await page.waitForTimeout(180);
      if (i % 3 === 0 || i === steps) await sample(`scroll-${i}`);
    }
    const selectors = [...new Set(evidence.phases.flatMap(p=>p.fonts.map(f=>f.selector)))];
    evidence.renderedFonts = [];
    for (const selector of selectors.slice(0,150)) {
      try {
        const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root, selector });
        if (nodeId) evidence.renderedFonts.push({ selector, ...(await cdp.send('CSS.getPlatformFontsForNode', { nodeId })) });
      } catch { /* keep computed candidates distinct from platform evidence */ }
    }
    await page.screenshot({ path: path.join(dir, 'full-page.png'), fullPage: true, timeout: 30000 });
    await fs.writeFile(path.join(dir, 'rendered.html.txt'), await page.content());
    const inspect = await page.evaluate(() => {
      const ev = new MouseEvent('contextmenu', { bubbles:true, cancelable:true });
      document.body.dispatchEvent(ev);
      return { syntheticContextMenuPrevented: ev.defaultPrevented, note:'Synthetic event only; not proof about trusted keyboard shortcuts or docked DevTools.' };
    });
    evidence.inspection.push(inspect);
    evidence.limitations.push('Sampled at 390×844; not an exhaustive capture of all responsive variants, hover states, or time-delayed assets. Audio/video bodies excluded.');
  } catch (e) { evidence.limitations.push('Page capture failed: ' + e.message.slice(0,250)); }
  await Promise.allSettled(pending);
  // Follow CSS imports and font/background URLs up to three rounds, bounded to this page's discovered resources.
  for (let round=0;round<3;round++) {
    const todo = [...found].filter(u => !records.has(u) && !/\.(?:mp3|mp4|webm|ogg|wav)(?:\?|$)/i.test(u)).slice(0,350);
    if (!todo.length) break;
    for (let i=0;i<todo.length;i+=6) {
      const batch = await Promise.all(todo.slice(i,i+6).map(fetchAsset));
      for (const r of batch) {
        records.set(r.url,r);
        if (r.format === 'css' && r.local) extractCssUrls(await fs.readFile(path.join(out,r.local),'utf8'), r.url).forEach(v=>found.add(v));
      }
    }
  }
  for (const r of records.values()) {
    if (!['css','js'].includes(r.format) || !r.local) continue;
    const text = await fs.readFile(path.join(out,r.local),'utf8');
    if (r.format === 'css') {
      r.fontDeclarations = [...text.matchAll(/@font-face\s*\{([^}]+)\}/g)].map(m=>m[1]);
      r.keyframes = [...text.matchAll(/@(?:-webkit-)?keyframes\s+([\w-]+)/g)].map(m=>m[1]);
    }
    const matches = [...text.matchAll(/contextmenu|disable-devtool|devtools|keyCode\s*={2,3}\s*123|canva\.com/gi)];
    if (matches.length) evidence.inspection.push({ source: r.url, matches: matches.slice(0,8).map(m=>text.slice(Math.max(0,m.index-90),m.index+160)), note:'Static string match; inspect context before attributing prevention or provenance.' });
  }
  evidence.requestFailures = failedRequests;
  evidence.discoveredUrls = [...found];
  for (const assetUrl of found) if (!records.has(assetUrl)) records.set(assetUrl, { url: assetUrl, status: /\.(?:mp3|mp4|webm|ogg|wav)(?:\?|$)/i.test(assetUrl) ? 'excluded-media' : 'not-collected-budget', fetchedAt: now() });
  evidence.assets = [...records.values()];
  evidence.coverage = { discovered: found.size, downloaded: evidence.assets.filter(r=>r.status==='downloaded').length, failed: evidence.assets.filter(r=>r.status!=='downloaded').length, phases: evidence.phases.length, renderedFontSamples: evidence.renderedFonts.length };
  await fs.writeFile(path.join(dir, 'manifest.json'), JSON.stringify(evidence,null,2));
  console.log(id, JSON.stringify(evidence.coverage));
  await page.close();
}
await browser.close();
