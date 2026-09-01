import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {collectWebAssets} from './web-assets.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const files=collectWebAssets(root);
for(const excluded of ['package.json','package-lock.json','capacitor.config.json','images/branding/app-icon-master.png','images/vehicles/densha_4.png']) assert.ok(!files.includes(excluded),excluded);
for(const page of ['index','katachi','iro','kazu','kudamono','yasai','doubutsu','norimono','umi','tabemono','parents']) {
 assert.ok(files.includes(page+'.html'));
 if(page!=='parents') assert.ok(files.includes('images/headers/'+(page==='index'?'top':page)+'.png'));
}
for(const file of files.filter(f=>f.endsWith('.html'))) {
 const html=readFileSync(join(root,file),'utf8');
 for(const m of html.matchAll(/(?:src|href|data-src|data-sound|data-se|data-voice)=["']([^"']+)["']/g)) {
  const path=m[1].split(/[?#]/)[0];
  if(!path || /^(data:|https?:|\/)/.test(path))continue;
  assert.ok(files.includes(path),`${file} missing ${path}`);
 }
}
if(process.argv.includes('--built')) for(const file of files) {
 assert.equal(statSync(join(root,'www',file)).size,statSync(join(root,file)).size,file);
}
console.log(`PASS: ${files.length} runtime files, all HTML references, dynamic headers, no development metadata/originals`);
