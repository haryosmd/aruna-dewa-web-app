import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { blobIdentity, svgProblems } from './core.mjs';
const require=createRequire(path.join(process.cwd(),'package.json'));
const sharp=require('sharp');
const root=path.resolve(process.argv[2]||'docs/features/ornament-builder/originals/sunda');
const catalog=JSON.parse(await fs.readFile(path.join(root,'catalog.json'),'utf8'));
const errors=[];const globalIds=new Set();const ids=new Set();
if(catalog.schemaVersion!==1)errors.push('unsupported catalog schemaVersion');
for(const a of catalog.assets){
  if(ids.has(a.id))errors.push(`duplicate asset ID ${a.id}`);ids.add(a.id);
  for(const key of ['category','tags','culturalRole','provenance','usage','layers','anchor','motion','variants'])if(!a[key])errors.push(`${a.id}: missing ${key}`);
  for(const v of a.variants){
    const loc=path.resolve(root,v.file);
    if(!loc.startsWith(root+path.sep)){errors.push(`${a.id}: path escape`);continue;}
    const b=await fs.readFile(loc);
    if(blobIdentity(b)!==v.sha256)errors.push(`${a.id}: checksum mismatch`);
    if(v.format==='svg'){
      const text=b.toString();
      errors.push(...svgProblems(text).map(e=>`${a.id}: ${e}`));
      for(const m of text.matchAll(/\bid=["']([^"']+)/g)){if(globalIds.has(m[1]))errors.push(`global SVG ID collision ${m[1]}`);globalIds.add(m[1]);}
      if(!text.includes('data-layer='))errors.push(`${a.id}: no editable layers`);
    }else{
      const meta=await sharp(b).metadata();const stats=await sharp(b).stats();
      if(!meta.hasAlpha || stats.channels[3].min!==0 || stats.channels[3].max<200)errors.push(`${a.id}: missing usable transparency`);
    }
  }
}
const result={checkedAt:new Date().toISOString(),assets:catalog.assets.length,variants:catalog.assets.reduce((n,a)=>n+a.variants.length,0),errors};
console.log(JSON.stringify(result,null,2));
if(errors.length)process.exitCode=1;
