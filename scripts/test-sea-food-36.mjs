import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const tabs=await (await fetch('http://127.0.0.1:9223/json')).json();
const ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
await new Promise(r=>ws.onopen=r);
let id=0;const pending=new Map();
ws.onmessage=({data})=>{const m=JSON.parse(data);if(m.method==='Network.loadingFailed')console.error('Network',m.params);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}};
const send=(method,params={})=>new Promise((resolve,reject)=>{pending.set(++id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
const ev=async(expression)=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const until=async(expr)=>{for(let n=0;n<300;n++){if(await ev(expr))return;await wait(100);}throw Error('Timed out '+expr);};
async function clickCard(i){
 const pt=await ev("(()=>{const r=document.querySelectorAll('main>.card')["+i+"].getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};})()");
 await send('Input.dispatchMouseEvent',{type:'mousePressed',...pt,button:'left',clickCount:1});
 await send('Input.dispatchMouseEvent',{type:'mouseReleased',...pt,button:'left',clickCount:1});
}
try{
 await send('Page.enable');
 await send('Network.enable');
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 for(const page of (process.argv[2] ? [process.argv[2]] : ['umi','tabemono'])){
  const html=await readFile(new URL('../'+page+'.html',import.meta.url),'utf8');
  assert.equal((html.match(/class="card"/g)||[]).length,18);
  for(const m of html.matchAll(/(?:src|data-src|data-sound|href)="([^"]+)"/g)){
   if(!m[1]||/^(data:|http|#)/.test(m[1]))continue;
   assert.ok((await readFile(new URL('../'+m[1],import.meta.url))).length>0,m[1]);
  }
  await send('Page.navigate',{url:'http://127.0.0.1:8080/'+page+'.html?check=20260831'});
  await until("document.readyState!=='loading' && window.ZukanPagination?.pageCount===3");
  for(let p=0;p<3;p++){
   await ev('ZukanPagination.goTo('+p+')');
   await wait(250);
   await until("[...document.querySelectorAll('main>.card:not([hidden]) .card-img')].every(i=>i.complete&&i.naturalWidth>2)");
   assert.equal(await ev("document.querySelectorAll('main>.card:not([hidden])').length"),6);
   assert.ok(await ev("document.documentElement.scrollHeight<=innerHeight+1"),page+' vertical overflow');
   assert.equal(await ev("document.querySelectorAll('.catalog-page-dot').length"),3);
   for(let i=p*6;i<p*6+6;i++){
    await clickCard(i);
    assert.ok(await ev("document.querySelector('#overlay').classList.contains('active')"),page+' open '+i);
    await until("document.querySelector('#overlay-img').complete&&document.querySelector('#overlay-img').naturalWidth>2");
    assert.ok(await ev("getComputedStyle(document.querySelector('#overlay-img')).backgroundColor==='rgba(0, 0, 0, 0)'"));
    assert.ok(await ev("document.querySelector('#overlay-label').textContent===document.querySelectorAll('main>.card')["+i+"].dataset.label"));
    if(i===p*6){
     await wait(5500);
     assert.ok(await ev("!document.querySelector('#overlay').classList.contains('active')"),page+' auto close '+i);
    }else{
     await ev("document.querySelector('#overlay').click()");
     assert.ok(await ev("!document.querySelector('#overlay').classList.contains('active')"));
    }
   }
  }
  await ev("document.querySelector('.catalog-page-next').click()");
  assert.equal(await ev('ZukanPagination.page'),0,page+' wraps forward');
  await ev("document.querySelector('.catalog-page-previous').click()");
  assert.equal(await ev('ZukanPagination.page'),2,page+' wraps backward');
  await ev('ZukanPagination.goTo(0)');
  await wait(250);
  const pt=await ev("(()=>{const r=document.querySelector('main').getBoundingClientRect();return{x:r.right-30,y:r.y+r.height/2};})()");
  await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...pt,id:1}]});
  for(let k=1;k<=8;k++){await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:pt.x-k*30,y:pt.y,id:1}]});await wait(30);}
  await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await wait(500);
  assert.equal(await ev('ZukanPagination.page'),1,page+' swipe');
  const shot=await send('Page.captureScreenshot',{format:'jpeg',quality:80});
  await writeFile(join(tmpdir(),'zukan-'+page+'-expanded.jpg'),Buffer.from(shot.data,'base64'));
  console.log(page+': 18 assets, six visible, three pages, 18 overlays, auto/manual close, loop arrows, swipe PASS');
 }
}catch(error){
 console.error(await ev("JSON.stringify([...document.images].map(i=>({src:i.currentSrc,complete:i.complete,width:i.naturalWidth})))"));
 console.error(await ev("JSON.stringify({url:location.href,ready:document.readyState,classes:document.body.className,cards:document.querySelectorAll('main>.card').length,footer:!!document.querySelector('footer.bottom-nav'),pagination:window.ZukanPagination?.pageCount,scripts:[...document.scripts].map(s=>s.src)})"));
 throw error;
}finally{await send('Page.navigate',{url:'about:blank'});ws.close();}
