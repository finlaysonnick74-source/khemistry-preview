/* Khemistry hero mockup. Clean-room motion, GSAP timeline. */
(()=>{
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const root=document.documentElement,RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine=matchMedia('(hover:hover) and (pointer:fine)').matches;
const mobile=()=>innerWidth<=760;

/* faded periodic table */
const SYM='H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og'.split(' ');
function pos(z){ // [row,col] in an 18x9 grid
  if(z===1)return[1,1];if(z===2)return[1,18];
  if(z<=10)return[2,z<=4?z-2:z+8];if(z<=18)return[3,z<=12?z-10:z];
  if(z<=36)return[4,z-18];if(z<=54)return[5,z-36];
  if(z>=57&&z<=71)return[8,z-54];if(z>=89&&z<=103)return[9,z-86];
  if(z<=86)return[6,z<=56?z-54:z-68];return[7,z<=88?z-86:z-100];}
const table=$('.table');
function buildTable(){
  table.innerHTML='';
  if(mobile()){for(let i=0;i<9*14;i++){const c=document.createElement('i');const z=(i*7)%118;c.textContent=i%3?'':SYM[z];table.appendChild(c)}return}
  SYM.forEach((s,i)=>{const[r,c]=pos(i+1);const e=document.createElement('i');e.textContent=s;e.style.gridArea=`${r}/${c}`;table.appendChild(e)});
}
buildTable();

/* split helpers (from kit text-split idea) */
function split(el){const t=el.textContent;el.setAttribute('aria-label',t);
  el.innerHTML=t.split(' ').map(w=>`<span class="w" aria-hidden="true">${[...w].map(c=>`<span class="c">${c}</span>`).join('')}</span>`).join(' ');}
split($('.headline'));
const line=$('.line');if(line)line.innerHTML=line.textContent.split(' ').map(w=>`<span class="w">${w}</span>`).join(' ');

/* bonds */
const lockup=$('.lockup'),plate=$('.plate'),tiles=$$('.tile'),paths=$$('.bonds path');
function drawBonds(){const L=lockup.getBoundingClientRect(),P=plate.getBoundingClientRect(),C=$('.credit').getBoundingClientRect();
  const px=P.left+P.width/2-L.left,py=C.bottom+6-L.top;
  tiles.forEach((t,i)=>{const r=t.getBoundingClientRect();const tx=t.offsetLeft+$('.tiles').offsetLeft+r.width/2,ty=$('.tiles').offsetTop;
    const sx=px+(i-1)*P.width*.18;const my=(py+ty)/2;
    paths[i].setAttribute('d',`M${sx},${py} C${sx},${my} ${tx},${my} ${tx},${ty}`);
    const len=paths[i].getTotalLength();paths[i].style.strokeDasharray=len;paths[i].dataset.len=len;});}

/* tiles: flip + magnetic */
const live=$('#live');
const tabs=$$('[role=tab]');
function selectTab(k,focus){tabs.forEach(b=>{const on=b.id==='tab-'+k;b.setAttribute('aria-selected',on);b.tabIndex=on?0:-1;$('#'+b.getAttribute('aria-controls')).hidden=!on;if(on&&focus)b.focus()});
  const pnl=$('#panel-'+k);if(window.gsap&&!RM)gsap.fromTo(pnl.children,{autoAlpha:0,y:16},{autoAlpha:1,y:0,duration:.6,stagger:.07,ease:'expo.out'});}
tabs.forEach((b,i)=>{b.addEventListener('click',()=>selectTab(b.id.slice(4)));b.addEventListener('keydown',e=>{let n=null;if(e.key==='ArrowRight')n=(i+1)%3;else if(e.key==='ArrowLeft')n=(i+2)%3;else if(e.key==='Home')n=0;else if(e.key==='End')n=2;if(n!==null){e.preventDefault();selectTab(tabs[n].id.slice(4),true)}})});
const toTab=k=>{selectTab(k);$('#formula').scrollIntoView({behavior:RM?'auto':'smooth'});setTimeout(()=>$('#tab-'+k).focus({preventScroll:true}),RM?0:700)};
$$('[data-tab]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();toTab(a.dataset.tab)}));
tiles.forEach(t=>{t.addEventListener('click',()=>{skip();toTab(t.dataset.k)});
  if(fine&&!RM){const m=$('.mag',t);m.style.transition='transform .5s cubic-bezier(.2,.7,.1,1)';
    t.addEventListener('pointermove',e=>{const r=t.getBoundingClientRect(),x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2;m.style.transform=`translate(${x*.14}px,${y*.14}px) rotateX(${-y*.06}deg) rotateY(${x*.06}deg)`});
    t.addEventListener('pointerleave',()=>m.style.transform='');}});
if(fine&&!RM){const img=$('.p-inner img'),light=$('.light');
  addEventListener('pointermove',e=>{const nx=e.clientX/innerWidth-.5,ny=e.clientY/innerHeight-.5;
    
    light.style.setProperty('--lx',e.clientX+'px');light.style.setProperty('--ly',e.clientY+'px');});
  $$('.btn').forEach(b=>{b.addEventListener('pointermove',e=>{const r=b.getBoundingClientRect();b.style.transform=`translate(${(e.clientX-r.left-r.width/2)*.18}px,${(e.clientY-r.top-r.height/2)*.25}px)`});b.addEventListener('pointerleave',()=>b.style.transform='')});}

/* menu */
const menu=$('.menu');menu.addEventListener('click',()=>{const o=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',o);$('#navlist').classList.toggle('open',o)});

/* timeline */
let tl;const hero=$('.hero');
const ANIM=['.plate','.tile','.ctas','.bonds path','.credit','.p-inner','.headline','.table','.cr-mi','.mi','.k','.he','.he span','.pl-no','.pl-sub','.seam','.headline .c','.table i','.credit .c','.explain'];
function finish(){hero.classList.add('is-done')}
function build(){
  if(tl)tl.kill();gsap.set(ANIM.join(','),{clearProps:'all'});
  $('.mi').textContent='mistry';drawBonds();
  if(RM||!window.gsap){root.classList.remove('anim');paths.forEach(p=>p.style.strokeDashoffset=0);finish();return}
  hero.classList.remove('is-done');root.classList.add('anim');
  const mob=mobile(),S=mob?.82:1;
  const capMi=$('.cr-mi'),mi=$('.mi');
  // caption chars
  const cap=$('.credit');if(!cap.dataset.split){cap.dataset.split=1;
    cap.querySelectorAll(':scope > *, :scope').forEach(()=>{});
    const walk=n=>{[...n.childNodes].forEach(c=>{if(c.nodeType===3){const f=document.createDocumentFragment();[...c.textContent].forEach(ch=>{const s=document.createElement('span');s.className='c';s.textContent=ch;f.appendChild(s)});c.replaceWith(f)}else walk(c)})};walk(cap);cap.setAttribute('aria-label','Maidlin Mistry, Founder')}
  // geometry for the Mistry lift (measured in final layout)
  const a=capMi.getBoundingClientRect(),b=mi.getBoundingClientRect();
  const sc=a.height/b.height;
  const dx=a.left-b.left,dy=a.top-b.top;mi.textContent='Mistry';
  const he=$('.he');if(!he.dataset.split){he.dataset.split=1;he.innerHTML='<span>h</span><span>e</span>'}
  const seam=$('.seam');seam.style.left=(he.offsetLeft+plate.querySelector('.pl-word').offsetLeft)+'px';
  gsap.set(['.plate','.tile','.ctas','.bonds path','.credit','.p-inner','.headline','.table','.explain'],{visibility:'visible'});
  tl=gsap.timeline({defaults:{ease:'power3.out'},onComplete:finish});
  // 1 calm open
  tl.from('.table i',{opacity:0,duration:.9,stagger:{each:.004,from:'center'},ease:'power1.out'},0)
  // 2 she speaks
    .from('.credit',{autoAlpha:0,x:-14,duration:.6},.5)
    .from('.credit .c',{opacity:0,yPercent:40,duration:.4,stagger:.022},.6)
  // 3 Mistry lifts out and lands as an element
    .set(plate,{borderColor:'rgba(19,41,75,0)',backgroundColor:'rgba(245,240,230,0)'},0)
    .set(['.k','.he span','.pl-no','.pl-sub'],{autoAlpha:0},0)
    .set(mi,{x:dx,y:dy,scale:sc,transformOrigin:'0 0',autoAlpha:0},0)
    .set(capMi,{autoAlpha:0},1.55).set(mi,{autoAlpha:1,color:'#0B6B6B'},1.55)
    .to(mi,{x:0,duration:.95*S,ease:'power3.inOut'},1.55)
    .to(mi,{y:0,scale:1,duration:.95*S,ease:'expo.inOut'},1.55)
    .to(mi,{color:'#13294B',duration:.4},2.2)
    .to(plate,{borderColor:'rgba(19,41,75,1)',backgroundColor:'rgba(245,240,230,1)',duration:.4,ease:'power2.out'},2.35)
    .to(['.pl-no','.pl-sub'],{autoAlpha:1,duration:.4},2.4)
    .to(capMi,{autoAlpha:1,duration:.5},2.5)
  // K lights up and slides in, then fuses
    .fromTo('.k',{autoAlpha:0,x:-120*S,color:'#0B6B6B',textShadow:'0 0 24px rgba(42,157,153,.9)'},{autoAlpha:1,x:0,duration:.6,ease:'expo.out'},2.5)
    .fromTo(seam,{opacity:0,scaleY:.2},{opacity:.9,scaleY:1,duration:.3},2.6)
    .to(seam,{opacity:0,scaleY:0,duration:.35,ease:'power2.in'},3.05)
    .call(()=>{mi.textContent='mistry'},null,3.05)
    .to('.he span',{autoAlpha:1,duration:.45,stagger:.06},3.08)
    .from('.he span',{yPercent:40,duration:.5,stagger:.06},3.08)
    .to('.k',{color:'#13294B',textShadow:'0 0 0px rgba(42,157,153,0)',duration:.6},3.1)
    .fromTo(plate,{boxShadow:'0 0 0 0px rgba(42,157,153,.45)'},{boxShadow:'0 0 0 14px rgba(42,157,153,0)',duration:.9,ease:'power2.out'},3.08);
  // 5 tiles light, drift and bond
  const off=mob?[[-30,60,-6],[0,80,4],[30,60,7]]:[[-150,110,-9],[20,170,5],[190,90,11]];
  tiles.forEach((t,i)=>{tl.fromTo(t,{autoAlpha:0,x:off[i][0],y:off[i][1],rotation:off[i][2],scale:.84,filter:'saturate(.2) brightness(1.5)'},{autoAlpha:.7,duration:.4,ease:'power1.out'},3.6+i*.08)
    .to(t,{x:0,y:0,rotation:0,scale:1,autoAlpha:1,filter:'saturate(1) brightness(1)',duration:1.15*S,ease:'expo.out'},3.95+i*.05)});
  tl.fromTo(plate,{boxShadow:'0 0 0 0px rgba(42,157,153,.4)'},{boxShadow:'0 0 0 18px rgba(42,157,153,0)',duration:1.1,ease:'power2.out'},4.05)
    .fromTo('.bonds path',{strokeDashoffset:(i,p)=>p.dataset.len},{strokeDashoffset:0,duration:.8,stagger:.08,ease:'power2.inOut'},4.3)
    .from('.explain',{autoAlpha:0,y:8,letterSpacing:'.12em',duration:.8,ease:'power2.out'},4.5)
  // 6 headline + CTAs
    .from('.headline .c',{autoAlpha:0,yPercent:55,rotate:4,duration:.7,stagger:.012,ease:'power3.out'},4.7)
    .from('.ctas',{autoAlpha:0,y:14,duration:.6},5.5);
  if(mob)tl.timeScale(1.12);
}
function skip(){if(tl&&tl.progress()<1)tl.progress(1)}
$('.skip').addEventListener('click',skip);
$('.replay').addEventListener('click',()=>{if(window.KhemIntro&&window.KhemIntro.replay)window.KhemIntro.replay();else build()});
addEventListener('keydown',e=>{if(e.key==='Escape')skip()});
addEventListener('wheel',()=>{if(!root.classList.contains('intro-playing'))skip()},{passive:true});
let rz;addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(()=>{buildTable();skip();drawBonds()},150)});
/* values: scroll reveal (kit scroll-reveal pattern, IO + GSAP) */
const vh=$('[data-vsplit]');vh.setAttribute('aria-label',vh.textContent);vh.innerHTML=vh.textContent.split(' ').map(w=>`<span class="w" aria-hidden="true"><span>${w}</span></span>`).join(' ');
if(!RM&&window.gsap){const vs=$$('.v');gsap.set(vs,{autoAlpha:0,y:40});gsap.set('.v-tile',{rotationY:-90,transformPerspective:600});gsap.set('[data-vsplit] .w>span',{yPercent:110});gsap.set('.values .eyebrow',{autoAlpha:0});
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;io.unobserve(e.target);
    if(e.target.classList.contains('v-head')){gsap.to('.values .eyebrow',{autoAlpha:1,duration:.6});gsap.to('[data-vsplit] .w>span',{yPercent:0,duration:.9,stagger:.06,ease:'expo.out'})}
    else{const i=vs.indexOf(e.target),d=(i%(innerWidth>1000?3:innerWidth>760?2:1))*.1;gsap.to(e.target,{autoAlpha:1,y:0,duration:.9,delay:d,ease:'expo.out'});gsap.to(e.target.querySelector('.v-tile'),{rotationY:0,duration:1,delay:d+.15,ease:'back.out(1.6)'})}}),{threshold:.2});
  io.observe($('.v-head'));vs.forEach(v=>io.observe(v));}
window.KhemHero={build,skip,get tl(){return tl}};
const go=()=>{if(root.classList.contains('webgl-intro'))return;build()};
(document.fonts&&document.fonts.ready?Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,1200))]):Promise.resolve()).then(go);
})();
