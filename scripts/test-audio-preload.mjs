import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
for(const page of ['katachi','iro']) {
 const html=readFileSync(new URL('../'+page+'.html',import.meta.url),'utf8');
 for(const script of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) new vm.Script(script[1]);
 const cards=[...html.matchAll(/data-sound="([^"]+)"/g)].map(m=>({dataset:{sound:m[1]}}));
 const loaded=[];
 const context=vm.createContext({document:{querySelectorAll:()=>cards},Audio:class {constructor(src){loaded.push(src);}}});
 const start=html.indexOf('  const audioCache = {}');
 const end=html.indexOf('  const overlay =',start);
 assert.ok(start>0&&end>start);
 vm.runInContext(html.slice(start,end),context);
 assert.deepEqual(loaded,cards.slice(0,6).map(c=>c.dataset.sound));
 context.nextCards=cards.slice(6);
 vm.runInContext('preloadCards(nextCards)',context);
 assert.deepEqual(loaded,cards.map(c=>c.dataset.sound));
 vm.runInContext('preloadCards(nextCards)',context);
 assert.equal(loaded.length,12,'cached audio must not load twice');
 assert.match(html,/closeOverlay\(\);\s*preloadCards\(event.detail.visibleCards\)/);
 console.log(`${page}: first six only, next page preload, cache reuse, inline syntax PASS`);
}
