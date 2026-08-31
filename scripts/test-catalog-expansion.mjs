import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import vm from 'node:vm';
const root = new URL('../', import.meta.url);
for (const name of ['kudamono','yasai','norimono']) {
  const html=readFileSync(new URL(name+'.html',root),'utf8');
  const cards=[...html.matchAll(/<div class="card"([^>]+)>/g)];
  assert.equal(cards.length,18,name);
  assert.equal(cards.filter(m=>/\bhidden\b/.test(m[1])).length,12,name);
  assert.equal((html.match(/data-src=/g)||[]).length,12,name);
  assert.ok(html.includes('catalog-pagination.js'));
  assert.ok(html.includes('catalog-image-page.js'));
  assert.ok(html.includes('vehicle-playback.js'));
  for(const m of html.matchAll(/(?:src|data-src|data-sound|data-se)="([^"]+)"/g)) {
    if(/^(data:|https?:)/.test(m[1])) continue;
    const file=new URL(m[1],root);
    assert.ok(existsSync(file),name+': '+m[1]);
    assert.ok(statSync(file).size>0);
  }
}
const listeners=new Map(), windowListeners=new Map(), audios=[];
function eventTarget() { const handlers={}; return {handlers,addEventListener(n,f){handlers[n]=f;}}; }
const cards=Array.from({length:18},(_,i)=>({...eventTarget(),
  hidden:i>=6,dataset:{sound:'voice'+i,label:'label'+i},
  querySelector(){return {src:'image'+i,alt:'label'+i,dataset:{}};}
}));
let active=false;
const overlay={...eventTarget(),classList:{add(){active=true;},remove(){active=false;}}};
const bgm={...eventTarget(),volume:0.25,dataset:{},play(){return Promise.resolve();}};
const nodes={bgm,overlay,'overlay-img':{style:{}},'overlay-label':{},fxToggle:{}};
let stopped=0,started=[];
class Audio {
 constructor(src){this.src=src;audios.push(this);}
 pause(){this.paused=true;}
 removeAttribute(){this.src='';}
 load(){this.released=true;}
}
const context={
 document:{getElementById(id){return nodes[id];},querySelectorAll(){return cards;},
 addEventListener(n,f){listeners.set(n,f);},hidden:false},
 window:{addEventListener(n,f){windowListeners.set(n,f);}},
 Audio,Map,Set,Array,
 ZukanFX:{initToggle(){},tap(){},burst(){}},
 createVehiclePlayback({onClose}){return {start(...args){started.push(args);},stop(){stopped++;}}}
};
new vm.Script(readFileSync(new URL('catalog-image-page.js',root),'utf8')).runInNewContext(context);
assert.equal(audios.length,6,'only first-page voice preloaded');
cards[0].handlers.click(); assert.equal(active,true); assert.equal(started.length,1);
overlay.handlers.click(); assert.equal(active,false); assert.equal(stopped,1);
cards.forEach((c,i)=>c.hidden=i<6 || i>=12);
listeners.get('zukan-page-change')({detail:{visibleCards:cards.slice(6,12)}});
assert.equal(audios.length,12); assert.ok(audios.slice(0,6).every(a=>a.released));
cards[6].handlers.click(); assert.equal(active,true); assert.equal(started[1][0],'voice6');
context.document.hidden=true; listeners.get('visibilitychange')();
assert.equal(active,false);
cards[7].handlers.click(); windowListeners.get('pagehide')(); assert.equal(active,false);
new vm.Script(readFileSync(new URL('catalog-pagination.js',root),'utf8'));
cards.forEach((c,i)=>c.hidden=i<12);
listeners.get('zukan-page-change')({detail:{visibleCards:cards.slice(12)}});
assert.equal(audios.length,18);
assert.ok(audios.slice(6,12).every(a=>a.released));
cards[12].handlers.click(); assert.equal(started.at(-1)[0],'voice12');
overlay.handlers.click();
console.log('PASS: 3 x 18 cards; 12 initially hidden; all assets; three-page audio cache release; overlay tap; background cancellation');
