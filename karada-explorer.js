(() => {
  const main=document.querySelector("main.body-explorer");
  const track=main?.querySelector(".body-track");
  const footer=document.querySelector("footer.bottom-nav");
  if(!main||!track||!footer)return;
  const pages=Array.from(track.querySelectorAll(".body-page"));
  // Target coordinates are percentages of each source image, not percentages of the screen.
  const data=[
    [
      ["kami","かみ",15,12,50,6],["mayuge","まゆげ",14,25,35,34],["me","め",14,38,31,39.5],
      ["mimi","みみ",14,52,15,49],["hana","はな",86,28,53,47],["hoho","ほお",86,42,70,53],
      ["kuchi","くち",14,66,42,59],["ha","は",86,62,54,58],["ago","あご",86,79,50,69]
    ],
    [
      ["atama","あたま",14,12,45,4],["kubi","くび",86,17,50,21],["kata","かた",14,27,35,26],
      ["ude","うで",86,34,82,43],["hiji","ひじ",14,44,23,41],["te","て",86,54,87,50],
      ["onaka","おなか",14,59,50,49],["hiza","ひざ",86,70,62,73],["ashi","あし",14,83,37,82]
    ],
    [
      ["yubi","ゆび",14,16,27,12],["tsume","つめ",86,18,76,6],["tenohira","てのひら",14,38,30,29],
      ["tenokou","てのこう",86,39,73,29],["tsumasaki","つまさき",14,65,58,82],
      ["kakato","かかと",50,88,77,92],["ashinoura","あしのうら",86,67,77,72]
    ]
  ];
  const audioCache=new Map(),annotations=[];
  let activeAudio=null,session=0,current=0,start=null,dragging=false,suppressUntil=0,bgmNormal=null;
  const requestedPage=Math.max(0,Math.min(2,Number(new URLSearchParams(location.search).get("page"))||0));
  const bgm=document.getElementById("bgm");

  function audioFor(name){
    const src="sounds/body/"+name+".mp3";
    if(!audioCache.has(src)){const a=new Audio(src);a.preload="auto";audioCache.set(src,a);}
    return audioCache.get(src);
  }
  function clearActive(){
    document.querySelectorAll(".body-hotspot.active,.body-line.active").forEach(e=>e.classList.remove("active"));
    annotations.forEach(a=>a.line.setAttribute("marker-end","url(#"+a.normalMarker+")"));
  }

  data.forEach((items,pageIndex)=>{
    const page=pages[pageIndex],figure=page.querySelector(".body-figure"),svg=page.querySelector(".body-lines");
    const ns="http://www.w3.org/2000/svg";
    const defs=document.createElementNS(ns,"defs");
    const normalMarker="body-arrow-"+pageIndex,activeMarker="body-arrow-active-"+pageIndex;
    [[normalMarker,"#087fba"],[activeMarker,"#ff4b3e"]].forEach(([id,color])=>{
      const marker=document.createElementNS(ns,"marker");
      marker.id=id;marker.setAttribute("viewBox","0 0 12 12");marker.setAttribute("refX","11");marker.setAttribute("refY","6");
      marker.setAttribute("markerWidth","12");marker.setAttribute("markerHeight","12");marker.setAttribute("orient","auto");marker.setAttribute("markerUnits","userSpaceOnUse");
      const path=document.createElementNS(ns,"path");path.setAttribute("d","M0 0 L12 6 L0 12 Z");path.setAttribute("fill",color);
      marker.appendChild(path);defs.appendChild(marker);
    });
    svg.appendChild(defs);
    items.forEach(([name,label,lx,ly,tx,ty])=>{
      const line=document.createElementNS(ns,"line");line.classList.add("body-line");line.dataset.part=name;line.setAttribute("marker-end","url(#"+normalMarker+")");svg.appendChild(line);
      const button=document.createElement("button");button.type="button";button.className="body-hotspot";button.dataset.part=name;button.style.setProperty("--lx",lx+"%");button.style.setProperty("--ly",ly+"%");button.textContent=label;button.setAttribute("aria-label",label+"を聞く");page.appendChild(button);
      const annotation={page,figure,svg,button,line,tx,ty,normalMarker,activeMarker};annotations.push(annotation);
      button.addEventListener("click",e=>{if(performance.now()<suppressUntil){e.preventDefault();return;}playPart(name,annotation);});
      audioFor(name);
    });
    if(!figure.complete)figure.addEventListener("load",layoutAnnotations,{once:true});
  });

  function imageContentRect(figure,pageRect){
    const box=figure.getBoundingClientRect(),iw=figure.naturalWidth||1,ih=figure.naturalHeight||1;
    const scale=Math.min(box.width/iw,box.height/ih),width=iw*scale,height=ih*scale;
    return {left:box.left-pageRect.left+(box.width-width)/2,top:box.top-pageRect.top+(box.height-height)/2,width,height};
  }
  function layoutAnnotations(){
    pages.forEach(page=>{
      const pageRect=page.getBoundingClientRect(),svg=page.querySelector(".body-lines");
      svg.setAttribute("viewBox","0 0 "+pageRect.width+" "+pageRect.height);
    });
    annotations.forEach(a=>{
      const pageRect=a.page.getBoundingClientRect(),content=imageContentRect(a.figure,pageRect),buttonRect=a.button.getBoundingClientRect();
      const tx=content.left+content.width*a.tx/100,ty=content.top+content.height*a.ty/100;
      const cx=buttonRect.left-pageRect.left+buttonRect.width/2,cy=buttonRect.top-pageRect.top+buttonRect.height/2;
      const dx=tx-cx,dy=ty-cy;
      const edgeScale=1/Math.max(Math.abs(dx)/(buttonRect.width*.43),Math.abs(dy)/(buttonRect.height*.38),1);
      const sx=cx+dx*edgeScale,sy=cy+dy*edgeScale;
      a.line.setAttribute("x1",sx);a.line.setAttribute("y1",sy);a.line.setAttribute("x2",tx);a.line.setAttribute("y2",ty);
    });
  }

  function playPart(name,a){
    const mine=++session;activeAudio?.pause();clearActive();a.button.classList.add("active");a.line.classList.add("active");a.line.setAttribute("marker-end","url(#"+a.activeMarker+")");
    window.ZukanFX?.playTapSound?.();navigator.vibrate?.(30);
    if(bgm&&bgmNormal===null)bgmNormal=bgm.volume;if(bgm&&!bgm.muted)bgm.volume=Math.min(bgmNormal,.055);
    const audio=audioFor(name);activeAudio=audio;audio.currentTime=0;
    const done=()=>{if(mine!==session)return;if(bgm&&bgmNormal!==null)bgm.volume=bgmNormal;bgmNormal=null;activeAudio=null;setTimeout(()=>{if(mine===session)clearActive();},700);};
    audio.onended=done;audio.onerror=done;audio.play().catch(done);
  }

  const back=footer.querySelector(".nav-back");
  const prev=document.createElement("button"),next=document.createElement("button"),center=document.createElement("div"),dots=document.createElement("div");
  prev.type=next.type="button";prev.className="body-page-arrow";next.className="body-page-arrow";prev.setAttribute("aria-label","前のページ");next.setAttribute("aria-label","次のページ");
  prev.innerHTML='<svg viewBox="0 0 64 64"><path d="M48 9 17 32l31 23V43L33 32l15-11z"/></svg>';
  next.innerHTML='<svg viewBox="0 0 64 64"><path d="m16 9 31 23-31 23V43l15-11-15-11z"/></svg>';
  center.className="body-page-center";dots.className="body-page-dots";
  const dotButtons=pages.map((_,i)=>{const b=document.createElement("button");b.type="button";b.className="body-page-dot";b.setAttribute("aria-label",(i+1)+"ページ目");b.onclick=()=>go(i,true);dots.appendChild(b);return b;});
  if(back)center.appendChild(back);center.appendChild(dots);footer.replaceChildren(prev,center,next);

  function render(dx=0,animate=true){
    track.classList.toggle("dragging",!animate);track.style.transform="translate3d(calc("+(-current*100)+"% + "+dx+"px),0,0)";
    dotButtons.forEach((d,i)=>d.classList.toggle("active",i===current));document.body.dataset.catalogPage=String(current+1);
    requestAnimationFrame(layoutAnnotations);
  }
  function go(n,sound=false){
    current=(n+pages.length)%pages.length;clearActive();activeAudio?.pause();if(bgm&&bgmNormal!==null)bgm.volume=bgmNormal;bgmNormal=null;session++;
    if(sound)window.ZukanFX?.playTapSound?.();render(0,true);
  }
  prev.onclick=()=>go(current-1,true);next.onclick=()=>go(current+1,true);
  main.addEventListener("pointerdown",e=>{if(e.pointerType==="mouse"&&e.button!==0)return;start={x:e.clientX,y:e.clientY,id:e.pointerId};dragging=false;},{passive:true});
  main.addEventListener("pointermove",e=>{if(!start||e.pointerId!==start.id)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;if(!dragging){if(Math.abs(dx)<8||Math.abs(dx)<=Math.abs(dy))return;dragging=true;try{main.setPointerCapture(e.pointerId)}catch{}}e.preventDefault();render(dx,false);},{passive:false});
  main.addEventListener("pointerup",e=>{if(!start||e.pointerId!==start.id)return;const dx=e.clientX-start.x,dy=e.clientY-start.y,was=dragging;start=null;if(was)suppressUntil=performance.now()+450;if(was&&Math.abs(dx)>Math.abs(dy)*1.1&&Math.abs(dx)>=Math.min(72,main.clientWidth*.2))go(current+(dx<0?1:-1),true);else render(0,true);dragging=false;},{passive:true});
  main.addEventListener("pointercancel",()=>{start=null;dragging=false;render(0,true);});
  document.addEventListener("keydown",e=>{if(e.key==="ArrowLeft")go(current-1,true);if(e.key==="ArrowRight")go(current+1,true);});
  window.addEventListener("resize",layoutAnnotations,{passive:true});
  if("ResizeObserver" in window)new ResizeObserver(layoutAnnotations).observe(main);
  window.ZukanPagination={get page(){return current},pageCount:pages.length,goTo:go,refresh:()=>render()};
  render();
  if(requestedPage)window.setTimeout(()=>go(requestedPage,false),150);
})();