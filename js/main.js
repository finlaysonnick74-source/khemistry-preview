/* Khemistry v4: DOM layer (title card positions, tabs, panel, values, menu). */
(()=>{
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const root=document.documentElement,RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
/* Composition in NDC (-1..1), shared with the 3D scene so DOM and WebGL line up. h = tile height as a fraction of viewport height. */
const LAYOUT={
  desk:{fov:35,word:{x:.2,y:.46,h:.072},credit:.055,ppp:{x:.2,y:.02,h:.15,gap:1.32},por:{x:-.6,feet:-.78,top:.9}},
  mob:{fov:50,word:{x:0,y:.66,h:.038},credit:.05,ppp:{x:0,y:.36,h:.092,gap:1.26},por:{x:0,feet:-.36,top:.2}}};
window.KHEM_LAYOUT=LAYOUT;
const pick=()=>innerWidth/innerHeight>=1?LAYOUT.desk:LAYOUT.mob;window.KhemPick=pick;
const hero=$('.h3d');
function place(){const L=pick(),W=innerWidth,H=innerHeight,A=W/H;
  const pct=(x,y)=>[(x+1)/2*100,(1-y)/2*100];
  const [cx,cy]=pct(L.word.x,L.word.y-L.word.h-L.credit);hero.style.setProperty('--cr-x',cx+'%');hero.style.setProperty('--cr-y',cy+'%');
  const tpx=L.ppp.h*H;hero.style.setProperty('--tile',tpx+'px');
  $$('.ppp-hit').forEach((b,i)=>{const nx=L.ppp.x+(i-1)*L.ppp.gap*L.ppp.h*2/A;const [x,y]=pct(nx,L.ppp.y);b.style.left=x+'%';b.style.top=y+'%'});}
place();addEventListener('resize',place);

/* tabs (below hero) */
const tabs=$$('[role=tab]');
function selectTab(k,focus){tabs.forEach(b=>{const on=b.id==='tab-'+k;b.setAttribute('aria-selected',on);b.tabIndex=on?0:-1;$('#'+b.getAttribute('aria-controls')).hidden=!on;if(on&&focus)b.focus()});
  const pnl=$('#panel-'+k);if(window.gsap&&!RM)gsap.fromTo(pnl.children,{autoAlpha:0,y:16},{autoAlpha:1,y:0,duration:.6,stagger:.07,ease:'expo.out'});}
window.KhemSelectTab=selectTab;
tabs.forEach((b,i)=>{b.addEventListener('click',()=>selectTab(b.id.slice(4)));b.addEventListener('keydown',e=>{let n=null;if(e.key==='ArrowRight')n=(i+1)%3;else if(e.key==='ArrowLeft')n=(i+2)%3;else if(e.key==='Home')n=0;else if(e.key==='End')n=2;if(n!==null){e.preventDefault();selectTab(tabs[n].id.slice(4),true)}})});
const toTab=k=>{selectTab(k);$('#formula').scrollIntoView({behavior:RM?'auto':'smooth'});setTimeout(()=>$('#tab-'+k).focus({preventScroll:true}),RM?0:700)};
$$('[data-tab]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();toTab(a.dataset.tab)}));

/* hero tiles -> camera fly + overlay panel with her copy */
const panel=$('#tile-panel'),body=$('.tp-body');let openK=null,opener=null;
function openPanel(k,btn){openK=k;opener=btn;body.innerHTML=$('#panel-'+k).innerHTML;panel.hidden=false;panel.dataset.k=k;hero.classList.add('focus');
  $$('.ppp-hit').forEach(b=>b.setAttribute('aria-expanded',b.dataset.k===k));selectTab(k);
  dispatchEvent(new CustomEvent('khem:focus',{detail:k}));if(window.gsap&&!RM)gsap.fromTo(panel,{autoAlpha:0,x:24},{autoAlpha:1,x:0,duration:.7,ease:'expo.out'});$('.tp-close').focus({preventScroll:true});}
function closePanel(){if(!openK)return;openK=null;panel.hidden=true;hero.classList.remove('focus');$$('.ppp-hit').forEach(b=>b.setAttribute('aria-expanded','false'));dispatchEvent(new CustomEvent('khem:focus',{detail:null}));opener&&opener.focus({preventScroll:true});}
$$('.ppp-hit').forEach(b=>{b.setAttribute('aria-expanded','false');
  b.addEventListener('click',()=>{dispatchEvent(new CustomEvent('khem:skip'));openK===b.dataset.k?closePanel():openPanel(b.dataset.k,b)});
  ['pointerenter','focus'].forEach(ev=>b.addEventListener(ev,()=>dispatchEvent(new CustomEvent('khem:hover',{detail:b.dataset.k}))));
  ['pointerleave','blur'].forEach(ev=>b.addEventListener(ev,()=>dispatchEvent(new CustomEvent('khem:hover',{detail:null}))));});
$('.tp-close').addEventListener('click',closePanel);
$('.tp-more').addEventListener('click',e=>{e.preventDefault();const k=openK;closePanel();toTab(k||'people')});
addEventListener('keydown',e=>{if(e.key==='Escape'){if(openK)closePanel();else dispatchEvent(new CustomEvent('khem:skip'))}});
$('.skip').addEventListener('click',()=>dispatchEvent(new CustomEvent('khem:skip')));
function replay(){
  closePanel();
  menu.setAttribute('aria-expanded','false');$('#navlist').classList.remove('open');
  window.scrollTo({top:0,left:0,behavior:'instant'});
  // Still/reduced-motion mode already displays the final frame.
  if(root.classList.contains('live3d'))dispatchEvent(new CustomEvent('khem:replay'));
}
$('.replay').addEventListener('click',replay);
const brand=$('.brand');brand.addEventListener('click',e=>{e.preventDefault();replay();brand.focus({preventScroll:true})});
brand.addEventListener('keydown',e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();brand.click()}});

/* menu */
const menu=$('.menu');menu.addEventListener('click',()=>{const o=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',o);$('#navlist').classList.toggle('open',o)});

/* headline split for the title-card reveal (driven by the 3D clock) */
const hl=$('.headline');hl.setAttribute('aria-label',hl.textContent);
hl.innerHTML=hl.textContent.split(' ').map(w=>`<span class="w" aria-hidden="true">${[...w].map(c=>`<span class="c">${c}</span>`).join('')}</span>`).join(' ');

/* values: scroll reveal */
const vh=$('[data-vsplit]');vh.setAttribute('aria-label',vh.textContent);vh.innerHTML=vh.textContent.split(' ').map(w=>`<span class="w" aria-hidden="true"><span>${w}</span></span>`).join(' ');
if(!RM&&window.gsap){const vs=$$('.v');gsap.set(vs,{autoAlpha:0,y:40});gsap.set('.v-tile',{rotationY:-90,transformPerspective:600});gsap.set('[data-vsplit] .w>span',{yPercent:110});gsap.set('.values .eyebrow',{autoAlpha:0});
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;io.unobserve(e.target);
    if(e.target.classList.contains('v-head')){gsap.to('.values .eyebrow',{autoAlpha:1,duration:.6});gsap.to('[data-vsplit] .w>span',{yPercent:0,duration:.9,stagger:.06,ease:'expo.out'})}
    else{const i=vs.indexOf(e.target),d=(i%(innerWidth>1000?3:innerWidth>760?2:1))*.1;gsap.to(e.target,{autoAlpha:1,y:0,duration:.9,delay:d,ease:'expo.out'});gsap.to(e.target.querySelector('.v-tile'),{rotationY:0,duration:1,delay:d+.15,ease:'back.out(1.6)'})}}),{threshold:.2});
  io.observe($('.v-head'));vs.forEach(v=>io.observe(v));}
})();
