// Isolated headless Edge regression check; requires a disposable debug browser on port 9223.
import assert from 'node:assert/strict';
const tabs=await (await fetch('http://127.0.0.1:9223/json')).json();
const tab=tabs.find(t=>t.type==='page');
const ws=new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
let seq=0;const pending=new Map(),errors=[];
ws.onmessage=({data})=>{
 const m=JSON.parse(data);
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
 await send('Page.navigate',{url:'http://localhost:8080/'+name+'.html'});
 await new Promise(r=>setTimeout(r,1500));
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
 await send('Emulation.setTouchEmulationEnabled',{enabled:false});
}
ws.close();
