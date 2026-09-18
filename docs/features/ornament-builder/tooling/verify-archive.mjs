import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { blobIdentity } from '../../../../.codex/skills/aruna-ornament-builder/scripts/core.mjs';
const root=path.resolve('docs/features/ornament-builder');
const source=path.join(root,'sources');
const hashes=new Map();const images=new Set();const fontHashes=new Set();const allRecords=[];const sites=[];
for(const d of await fs.readdir(source,{withFileTypes:true})){
  if(!d.isDirectory()||d.name==='blobs')continue;
  const m=JSON.parse(await fs.readFile(path.join(source,d.name,'manifest.json'),'utf8'));
  for(const filename of ['gallery.html','REPORT.md','fonts.json','cover.png','full-page.png','source.html.txt','rendered.html.txt'])await fs.access(path.join(source,d.name,filename));
  const urls=new Set(m.assets.map(a=>a.url));
  assert.ok(m.discoveredUrls.every(u=>urls.has(u)),`${d.name}: unaccounted discovery`);
  for(const a of m.assets){
    allRecords.push(a);
    if(a.status!=='downloaded'){assert.ok(!a.local,`${a.url}: unsuccessful body exposed as valid`);continue;}
    if(!hashes.has(a.checksum)){
      const b=await fs.readFile(path.join(source,a.local));
      assert.equal(blobIdentity(b),a.checksum);
      assert.equal(b.length,a.bytes);
      hashes.set(a.checksum,a.local);
    }else assert.equal(hashes.get(a.checksum),a.local,'identical bytes must share a path');
    if(a.thumbnail){images.add(a.checksum);await fs.access(path.join(source,a.thumbnail));}
    if(['woff','woff2','ttf','otf','eot'].includes(a.format))fontHashes.add(a.checksum);
  }
  sites.push({id:m.id,records:m.assets.length,coverage:m.coverage,protection:m.inspection[0]?.syntheticContextMenuPrevented});
}
assert.equal(sites.length,8);
const recommendation=JSON.parse(execFileSync('node',['.codex/skills/aruna-ornament-builder/scripts/recommend.mjs','--theme','sunda','--style','botanical'],{encoding:'utf8'}));
assert.equal(recommendation.selected.length,8);
assert.equal(recommendation.missing.length,0);
assert.ok(recommendation.selected.filter(a=>['venue','symbol'].includes(a.category)).every(a=>a.motion.rigid));
const unknown=JSON.parse(execFileSync('node',['.codex/skills/aruna-ornament-builder/scripts/recommend.mjs','--theme','unknown-region'],{encoding:'utf8'}));
assert.equal(unknown.selected.length,0,'must not substitute another culture');
await fs.writeFile(path.join(root,'verification/brief-sunda.json'),JSON.stringify(recommendation,null,2));
const result={verifiedAt:new Date().toISOString(),sites,downloadedReferences:allRecords.filter(a=>a.status==='downloaded').length,uniqueBodies:hashes.size,uniqueImages:images.size,uniqueFontFiles:fontHashes.size,exceptions:allRecords.filter(a=>a.status!=='downloaded').reduce((a,r)=>(a[r.status]=(a[r.status]||0)+1,a),{}),deduplication:'Every repeated SHA-256 resolves to the same stored path across site manifests; bytes verified once per unique body.',briefAudit:'Eight source reports, gallery and font evidence exist; all discovered URLs accounted for.',briefSunda:'Eight original categories selected; no missing categories; architecture/instrument rigid. Unknown culture returns no candidates.'};
await fs.writeFile(path.join(root,'verification/archive.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
