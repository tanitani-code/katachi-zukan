// Isolated headless Edge regression check; requires a disposable debug browser on port 9223.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const tabs=await (await fetch('http://127.0.0.1:9223/json')).json();
const tab=tabs.find(t=>t.type==='page');
const ws=new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
let seq=0;const pending=new Map(),errors=[];
ws.onmessage=({data})=>{
 const m=JSON.parse(data);
 if(m.method==='Network.loadingFailed' && !m.params.canceled) console.log('NETWORK FAILED',m.params);
 if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}
 if(m.method==='Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);
};
function send(method,params={}){return new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
await send('Runtime.enable');await send('Page.enable');
await send('Network.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});
await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
for(const name of ['kudamono','yasai','norimono']){
 errors.length=0;
 await send('Page.navigate',{url:'http://127.0.0.1:8080/'+name+'.html'});
 await new Promise(r=>setTimeout(r,1500));
 for(let attempt=0;attempt<60;attempt++) {
   if(await evaluate("document.readyState==='complete' && typeof createVehiclePlayback==='function' && document.body.dataset.catalogPage==='1'")) break;
   await new Promise(r=>setTimeout(r,500));
 }
 const before=await evaluate(`({ready:document.readyState,cards:document.querySelectorAll('main>.card').length,visible:[...document.querySelectorAll('main>.card')].filter(c=>!c.hidden).length,player:typeof createVehiclePlayback,fx:typeof ZukanFX})`);
 const point=await evaluate(`(()=>{const r=document.querySelector('main>.card:not([hidden])').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
 await send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});
 await send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});
 const after=await evaluate(`({open:document.querySelector('#overlay').classList.contains('active'),display:getComputedStyle(document.querySelector('#overlay')).display,label:document.querySelector('#overlay-label').textContent,hit:document.elementFromPoint(${point.x},${point.y})?.outerHTML.slice(0,250)})`);
 console.log(JSON.stringify({name,before,after,errors}));
 assert.equal(after.open,true,name+' mouse tap');
 await send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});
 await send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});
 const next=await evaluate(`(()=>{const r=document.querySelector('.catalog-page-next').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
 await send('Input.dispatchMouseEvent',{type:'mousePressed',...next,button:'left',clickCount:1});
 await send('Input.dispatchMouseEvent',{type:'mouseReleased',...next,button:'left',clickCount:1});
 await new Promise(r=>setTimeout(r,300));
 await send('Emulation.setTouchEmulationEnabled',{enabled:true});
 const touchPoint=await evaluate(`(()=>{const r=document.querySelector('main>.card:not([hidden])').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
 await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touchPoint]});
 await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await new Promise(r=>setTimeout(r,100));
 const touch=await evaluate(`({open:document.querySelector('#overlay').classList.contains('active'),label:document.querySelector('#overlay-label').textContent,page:document.body.dataset.catalogPage})`);
 console.log(JSON.stringify({name,touch,errors}));
 assert.equal(touch.open,true,name+' touch tap');
 assert.equal(touch.page,'2',name+' page 2');
 assert.deepEqual(errors,[],name+' runtime errors');
 // Close, then swipe from page 2 to page 3; touch must still open the new card.
 await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touchPoint]});
 await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:300,y:400}]});
 for(const x of [270,230,190,150,100]) {
   await new Promise(r=>setTimeout(r,60));
   await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:400}]});
 }
 await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await new Promise(r=>setTimeout(r,650));
 assert.equal(await evaluate('document.body.dataset.catalogPage'),'3',name+' swipe to page 3');
 const third=await evaluate(`(()=>{const r=document.querySelector('main>.card:not([hidden])').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
 const imageState=await evaluate(`Promise.all([...document.querySelectorAll('main>.card:not([hidden]) img')].map(img=>img.decode().then(()=>true,()=>false)))`);
 console.log(name+' images',imageState,await evaluate(`[...document.querySelectorAll('main>.card:not([hidden]) img')].map(i=>({src:i.src,complete:i.complete,width:i.naturalWidth}))`));
 assert.ok(imageState.every(Boolean),name+' page 3 images decode');
 const screenshot=await send('Page.captureScreenshot',{format:'png'});
 await writeFile(join(tmpdir(),'zukan-'+name+'-page3.png'),Buffer.from(screenshot.data,'base64'));
 await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[third]});
 await new Promise(r=>setTimeout(r,80));
 await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await new Promise(r=>setTimeout(r,400));
 assert.equal(await evaluate("document.querySelector('#overlay').classList.contains('active')"),true,name+' third page tap');
 await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[third]});
 await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[next]});
 await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await new Promise(r=>setTimeout(r,250));
 assert.equal(await evaluate('document.body.dataset.catalogPage'),'1',name+' loop back');
 assert.equal(await evaluate("document.querySelectorAll('main>.card').length"),18);
 assert.deepEqual(errors,[],name+' all pages runtime errors');
 console.log(name+': third-page swipe, tap, loop PASS');
 await send('Emulation.setTouchEmulationEnabled',{enabled:false});
}
ws.close();
