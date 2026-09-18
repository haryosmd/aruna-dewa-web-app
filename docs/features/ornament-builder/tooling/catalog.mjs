import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { blobIdentity } from '../../../../.codex/skills/aruna-ornament-builder/scripts/core.mjs';
const require=createRequire(path.join(process.cwd(),'package.json'));
const sharp=require('sharp');
const root=path.resolve('docs/features/ornament-builder/originals/sunda');
const sources={house:'https://repository.maranatha.edu/597/1/Rumah%20Tradisional%20Sunda.pdf',angklung:'https://ich.unesco.org/en/RL/indonesian-angklung-00393'};
const items=[
  ['julang-ngapak','Rumah Julang Ngapak','venue','cultural-architecture',['foundation','walls','roof','veranda'],'bottom-center','reveal',sources.house],
  ['angklung','Angklung','symbol','cultural-instrument',['frame','tubes','bindings'],'bottom-center','reveal',sources.angklung],
  ['anyaman-bambu','Anyaman bambu','motif','material-inspired-not-exclusive',['weave'],'center','static',sources.house],
  ['bingkai-sunda','Bingkai taman','frame','original-decorative',['frame','leaves'],'center','reveal',null],
  ['divider-sunda','Pucuk dan pertemuan','divider','original-decorative',['stems','leaves','center'],'center','reveal',null],
  ['sudut-daun','Sudut dedaunan','corner','companion-flora',['stem','leaves'],'bottom-left','parallax',null],
  ['rangkaian-bunga','Rangkaian melati','floral','companion-flora',['cutout'],'bottom-right','sway',null],
  ['layer-dedaunan','Dedaunan taman','layer','companion-flora',['cutout'],'bottom-right','sway',null],
];
const assets=[];
for(let i=0;i<items.length;i++){
  const [id,name,category,culturalRole,layers,anchor,motion,source]=items[i];
  const files=[];
  if(i<6)files.push(`svg/${id}.svg`);
  else{
    const png=id==='rangkaian-bunga'?'rangkaian-bunga-final.png':id+'.png';
    await sharp(path.join(root,png)).resize({width:1200,withoutEnlargement:true}).webp({quality:88,alphaQuality:100}).toFile(path.join(root,id+'.webp'));
    files.push(png,id+'.webp');
  }
  const variants=[];
  for(const file of files){
    const bytes=await fs.readFile(path.join(root,file));const meta=await sharp(bytes).metadata();
    variants.push({file,format:path.extname(file).slice(1),width:meta.width,height:meta.height,bytes:bytes.length,sha256:blobIdentity(bytes),alpha:!!meta.hasAlpha});
  }
  assets.push({id:'sunda-'+id,name,category,tags:['sunda','taman-pasundan','sage','ivory','botanical',i<6?'vector':'watercolor'],culturalRole,provenance:{kind:i<6?'original-vector':'ai-generated-original',method:i<6?'Original paths authored for Aruna Dewa; not traced from competitor assets.':'Built-in image_gen; prompt and selected output recorded in GENERATION.md.',references:source?[source]:[],capturedAt:new Date().toISOString().slice(0,10)},usage:'original-local-demo',style:{palette:['#263e31','#6d8065','#a38348','#f7f3e9'],rendering:i<6?'currentColor-two-tone':'watercolor-cutout'},layers,anchor,motion:{preset:motion,amplitude:motion==='sway'?1.5:motion==='parallax'?8:0,unit:motion==='sway'?'deg':'px',durationSeconds:motion==='sway'?5.5:1.1,easing:motion==='sway'?'sine.inOut':'power2.out',reducedMotion:'static',rigid:i<2},variants});
}
const catalog={schemaVersion:1,id:'sunda-taman-pasundan',name:'Taman Pasundan',scope:'local-original-pack-not-installed-as-application-theme',palette:{background:'#f7f3e9',foreground:'#263e31',primary:'#435c41',accent:'#a38348'},fonts:{demo:{display:'Georgia',body:'Arial',source:'system-installed; not bundled competitor fonts'},recommended:{display:'Cormorant Garamond',body:'Plus Jakarta Sans',source:['https://github.com/google/fonts/tree/main/ofl/cormorantgaramond','https://github.com/google/fonts/tree/main/ofl/plusjakartasans'],note:'Obtain official font files and license when integrating; demo is fully offline with system fonts.'}},composition:{cover:['sunda-julang-ngapak','sunda-layer-dedaunan','sunda-rangkaian-bunga'],story:['sunda-sudut-daun','sunda-divider-sunda'],event:['sunda-angklung','sunda-anyaman-bambu'],frameOption:'sunda-bingkai-sunda'},assets};
await fs.writeFile(path.join(root,'catalog.json'),JSON.stringify(catalog,null,2));
console.log('Catalog: 8 originals, 10 format variants');
