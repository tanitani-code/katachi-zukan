import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Model pointer capture retargeting: if main captures a tap, the card click is lost.
class Element {
  constructor(classes=[]) {
    this.classes=new Set(classes); this.children=[]; this.handlers={}; this.dataset={};
    this.hidden=false; this.clientWidth=400; this.offsetWidth=400;
    this.style={setProperty(){},removeProperty(){}};
    this.classList={contains:n=>this.classes.has(n),add:n=>this.classes.add(n),
      remove:n=>this.classes.delete(n),toggle:(n,on)=>on?this.classes.add(n):this.classes.delete(n)};
  }
  addEventListener(n,f){this.handlers[n]=f;}
  appendChild(e){this.children.push(e);}
  replaceChildren(...e){this.children=e;}
  setAttribute(){}
  removeAttribute(){}
  querySelectorAll(){return [];}
  cloneNode(){return new Element(['card']);}
  remove(){}
  setPointerCapture(id){captured=this;captures++;}
}
let captured=null,captures=0,now=1000,opened=0,sound=0;
const main=new Element(),footer=new Element(),back=new Element();
main.children=Array.from({length:12},()=>new Element(['card']));
const cards=[...main.children];
cards.forEach(c=>c.handlers.click=()=>opened++);
footer.querySelector=()=>back;
const body=new Element(['zukan-category']);
const timers=[];
const context={
 document:{body,querySelector:s=>s==='main'?main:s==='footer.bottom-nav'?footer:null,
 createElement:()=>new Element(),dispatchEvent(){},addEventListener(){}},
 window:{setTimeout:f=>{timers.push(f);return timers.length;},ZukanFX:{playTapSound(){sound++;}}},
 clearTimeout(){},performance:{now:()=>now},
 CustomEvent:class {},getComputedStyle:()=>({gridTemplateColumns:'1fr 1fr',gridTemplateRows:'repeat(3,1fr)',gap:'8px',padding:'0'})
};
vm.runInNewContext(readFileSync(new URL('../catalog-pagination.js',import.meta.url),'utf8'),context);
const e=(x,y,type='touch')=>({clientX:x,clientY:y,pointerId:1,pointerType:type,button:0,
 preventDefault(){},stopImmediatePropagation(){}});
function tap(type) {
 captured=null;
 main.handlers.pointerdown(e(100,100,type));
 main.handlers.pointerup(e(100,100,type));
 const target=captured||cards[0];
 const click={preventDefault(){},stopImmediatePropagation(){this.stopped=true;}};
 main.handlers.click(click);
 if(!click.stopped && target===cards[0])target.handlers.click();
}
tap('touch'); tap('mouse');
assert.equal(captures,0,'ordinary taps must not capture to main');
assert.equal(opened,2,'both touch and mouse clicks reach card');
main.handlers.pointerdown(e(200,100));
main.handlers.pointermove(e(195,100));
assert.equal(captures,0,'small finger movement remains a tap');
main.handlers.pointermove(e(90,100));
assert.equal(captured,main,'horizontal drag is captured');
main.handlers.pointerup(e(90,100));
const click={preventDefault(){},stopImmediatePropagation(){this.stopped=true;}};
main.handlers.click(click);
assert.ok(click.stopped,'swipe must not open card');
while(timers.length)timers.shift()();
assert.equal(context.window.ZukanPagination.page,1);
assert.equal(cards.filter(c=>!c.hidden).length,6);
assert.equal(sound,1);
now=2000; tap('touch'); assert.equal(opened,3,'tap works after swipe');
console.log('PASS: touch/mouse tap reaches card; minor movement; swipe capture; swipe click suppressed; page advances; tap after swipe');
