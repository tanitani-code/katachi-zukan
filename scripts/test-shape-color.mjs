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
for(const page of ['katachi','iro']){
const html=await readFile(new URL('../'+page+'.html',import.meta.url),'utf8');
assert.equal((html.match(/class="card"/g)||[]).length,12);
for(const match of html.matchAll(/data-sound="([^"]+)"/g))assert.ok((await readFile(new URL('../'+match[1],import.meta.url))).length>1000);
for(const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new Function(match[1]);
await send('Page.navigate',{url:'http://127.0.0.1:8080/'+page+'.html'});
for(let i=0;i<60;i++){await wait(300);if(await ev("document.readyState==='complete' && !!window.ZukanPagination"))break;}
assert.equal(await ev('ZukanPagination.pageCount'),2);
const next=await ev("(()=>{const r=document.querySelector('.catalog-page-next').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()");
await send('Input.dispatchMouseEvent',{type:'mousePressed',...next,button:'left',clickCount:1});
await send('Input.dispatchMouseEvent',{type:'mouseReleased',...next,button:'left',clickCount:1});
await wait(300);
assert.equal(await ev("document.querySelectorAll('main>.card:not([hidden])').length"),6);
assert.equal(await ev("[...document.querySelectorAll('main>.card')].filter(c=>getComputedStyle(c).display!=='none').length"),6);
const shot=await send('Page.captureScreenshot',{format:'png'});
await writeFile(join(tmpdir(),'zukan-'+page+'-page2.png'),Buffer.from(shot.data,'base64'));
for(let index=6;index<12;index++){
const point=await ev("(()=>{const r=document.querySelectorAll('main>.card')["+index+"].getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()");
await send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});
await send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});
assert.equal(await ev("document.querySelector('#overlay').classList.contains('active')"),true);
if(page==='iro')assert.equal(await ev("getComputedStyle(document.querySelector('#overlay .dot')).backgroundColor===getComputedStyle(document.querySelectorAll('main>.card')["+index+"].querySelector('.dot')).backgroundColor"),true);
await ev("document.querySelector('#overlay').click()");
}
await send('Input.dispatchMouseEvent',{type:'mousePressed',...next,button:'left',clickCount:1});
await send('Input.dispatchMouseEvent',{type:'mouseReleased',...next,button:'left',clickCount:1});
assert.equal(await ev('ZukanPagination.page'),0);
console.log(page+': 12 assets, six new overlays, colors and loop PASS');
}
await send('Page.navigate',{url:'http://127.0.0.1:8080/index.html'});
for(let attempt=0;attempt<60;attempt++){await wait(300);if(await ev("document.readyState==='complete'"))break;}
const history=await send('Page.getNavigationHistory');
const topEntry=history.entries[history.currentIndex].id;
for(let round=0;round<2;round++){
const cardPoint=await ev("(()=>{const r=document.querySelector('[data-cat=katachi]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()");
await send('Input.dispatchMouseEvent',{type:'mousePressed',...cardPoint,button:'left',clickCount:1});
await send('Input.dispatchMouseEvent',{type:'mouseReleased',...cardPoint,button:'left',clickCount:1});
for(let attempt=0;attempt<60;attempt++){await wait(200);if(await ev("location.pathname.endsWith('/katachi.html')"))break;}
assert.equal(await ev("location.pathname.endsWith('/katachi.html')"),true,'top card navigation round '+round);
if(round===0){
await send('Page.navigateToHistoryEntry',{entryId:topEntry});
for(let attempt=0;attempt<60;attempt++){await wait(200);if(await ev("location.pathname.endsWith('/index.html') && document.readyState==='complete'"))break;}
}
}
console.log('top -> shapes -> browser back -> shapes PASS');
}finally{await send('Page.navigate',{url:'about:blank'});ws.close();}
