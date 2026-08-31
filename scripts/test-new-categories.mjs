import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const tabs=await (await fetch('http://127.0.0.1:9223/json')).json();
const ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
await new Promise(r=>ws.onopen=r);
let id=0;const pending=new Map();
ws.onmessage=({data})=>{const m=JSON.parse(data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}};
const send=(method,params={})=>new Promise((resolve,reject)=>{pending.set(++id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
const ev=async(expression)=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
const wait=ms=>new Promise(r=>setTimeout(r,ms));

try {
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
for(const page of (process.argv[2] ? [process.argv[2]] : ['umi','tabemono'])){
const html=await readFile(new URL('../'+page+'.html',import.meta.url),'utf8');
assert.equal((html.match(/class="card"/g)||[]).length,6);
for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g)){
if(!match[1]||match[1].startsWith('http'))continue;
assert.ok((await readFile(new URL('../'+match[1],import.meta.url))).length>0,match[1]);
}
await send('Page.navigate',{url:'http://127.0.0.1:8080/'+page+'.html'});
for(let n=0;n<100;n++){await wait(200);if(await ev("document.readyState==='complete' && typeof createVehiclePlayback==='function'"))break;}
assert.ok(await ev("[...document.querySelectorAll('.card-img,.header-title-art')].every(i=>i.complete&&i.naturalWidth>0)"),page+' images');
assert.ok(await ev("document.documentElement.scrollHeight<=innerHeight+1"),page+' no scroll');
assert.equal(await ev("document.querySelectorAll('main>.card').length"),6);
const shot=await send('Page.captureScreenshot',{format:'png'});
await writeFile(join(tmpdir(),'zukan-'+page+'.png'),Buffer.from(shot.data,'base64'));
for(let i=0;i<6;i++){
const point=await ev("(()=>{const r=document.querySelectorAll('main>.card')["+i+"].getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()");
await send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});
await send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});
assert.equal(await ev("document.querySelector('#overlay').classList.contains('active')"),true,page+' card '+i);
assert.equal(await ev("document.querySelector('#overlay-label').textContent===document.querySelectorAll('main>.card')["+i+"].dataset.label"),true);
if(i===0){await wait(4500);assert.equal(await ev("document.querySelector('#overlay').classList.contains('active')"),false,page+' autoclose');}
else await ev("document.querySelector('#overlay').click()");
}
console.log(page+': all local assets, images, 6 cards, no scroll, overlays and autoclose PASS');
}
const top=await readFile(new URL('../index.html',import.meta.url),'utf8');
assert.match(top,/data-cat="umi" href="umi.html"/);
assert.match(top,/data-cat="tabemono" href="tabemono.html"/);
} finally {await send('Page.navigate',{url:'about:blank'});ws.close();}
