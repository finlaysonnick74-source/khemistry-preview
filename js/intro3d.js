/* Khemistry cinematic 3D intro. Clean-room Three.js; deterministic timeline f(t) so it can be captured frame-exactly. */
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {BokehPass} from 'three/addons/postprocessing/BokehPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';

const root=document.documentElement;
const Q=new URLSearchParams(location.search),CAPTURE=Q.has('capture');
const T_END=8.0,FADE=0.9;
const NAVY=0x0A1830,TEAL=0x2A9D99,CREAM=0xF5F0E6;
const intro=document.querySelector('.intro'),canvas=intro.querySelector('canvas');
const stats={frames:0,samples:[],dpr:0,quality:'high'};window.KhemIntroStats=stats;

function fail(e){console.warn('3D intro unavailable, CSS fallback',e);root.classList.remove('webgl-intro','intro-playing');window.KhemHero&&window.KhemHero.build();}
if(!root.classList.contains('webgl-intro')){/* reduced motion or no WebGL: nothing to do */}
else{try{await init()}catch(e){fail(e)}}

async function init(){
  try{await Promise.race([document.fonts.load('500 120px Fraunces'),new Promise(r=>setTimeout(r,1500))])}catch(e){}
  const renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance',preserveDrawingBuffer:CAPTURE});
  const maxDpr=CAPTURE?(+Q.get('dpr')||devicePixelRatio):Math.min(devicePixelRatio,2);
  let dpr=maxDpr;renderer.setPixelRatio(dpr);stats.dpr=dpr;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene();scene.background=new THREE.Color(NAVY);scene.fog=new THREE.Fog(NAVY,14,42);
  const pm=new THREE.PMREMGenerator(renderer);scene.environment=pm.fromScene(new RoomEnvironment(renderer),0.04).texture;
  const cam=new THREE.PerspectiveCamera(35,1,0.1,120);

  // lights
  scene.add(new THREE.HemisphereLight(0xcfe8e6,0x0a1830,0.35));
  const key=new THREE.DirectionalLight(0xfff4e2,2.2);key.position.set(6,14,8);key.castShadow=true;
  key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-14,right:14,top:10,bottom:-10,near:1,far:40});key.shadow.radius=6;key.shadow.bias=-0.0004;scene.add(key);
  const rim=new THREE.PointLight(TEAL,30,30,1.6);rim.position.set(-8,4,-6);scene.add(rim);
  const kLight=new THREE.PointLight(TEAL,0,10,1.8);scene.add(kLight);

  // floor
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(120,120),new THREE.MeshStandardMaterial({color:0x0c1d3a,roughness:.85,metalness:.1}));
  floor.rotation.x=-Math.PI/2;floor.position.y=-0.12;floor.receiveShadow=true;scene.add(floor);

  // symbol atlas
  const SYM='H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og'.split(' ');
  const CELL=128,COLS=16,extra=['K','h','e','m','i','s','t','r','y'];const N=SYM.length+extra.length,ROWS=Math.ceil(N/COLS);
  const ac=document.createElement('canvas');ac.width=CELL*COLS;ac.height=CELL*ROWS;const g=ac.getContext('2d');
  const drawCell=(i,txt,num,big)=>{const x=(i%COLS)*CELL,y=Math.floor(i/COLS)*CELL;g.fillStyle='#F5F0E6';g.textAlign='center';g.textBaseline='middle';
    g.font=`500 ${big?84:56}px Fraunces, Georgia, serif`;g.fillText(txt,x+CELL/2,y+CELL*(big?.5:.56));
    if(num){g.font='600 15px Inter, sans-serif';g.textAlign='left';g.fillText(num,x+12,y+18)}};
  SYM.forEach((s,i)=>drawCell(i,s,String(i+1)));extra.forEach((s,i)=>drawCell(SYM.length+i,s,'',true));
  const atlas=new THREE.CanvasTexture(ac);atlas.colorSpace=THREE.SRGBColorSpace;atlas.anisotropy=8;
  const symMat=new THREE.MeshBasicMaterial({map:atlas,transparent:true,opacity:.82,depthWrite:false,color:0xd9d2c4});
  const planeFor=i=>{const geo=new THREE.PlaneGeometry(.86,.86);const u0=(i%COLS)/COLS,v0=1-(Math.floor(i/COLS)+1)/ROWS,uv=geo.attributes.uv;
    for(let k=0;k<uv.count;k++)uv.setXY(k,u0+uv.getX(k)/COLS,v0+uv.getY(k)/ROWS);return geo};

  // table of 118 glass tiles
  const pos=z=>{if(z===1)return[1,1];if(z===2)return[1,18];if(z<=10)return[2,z<=4?z-2:z+8];if(z<=18)return[3,z<=12?z-10:z];
    if(z<=36)return[4,z-18];if(z<=54)return[5,z-36];if(z>=57&&z<=71)return[8.4,z-54];if(z>=89&&z<=103)return[9.4,z-86];
    if(z<=86)return[6,z<=56?z-54:z-68];return[7,z<=88?z-86:z-100]};
  const S=1.12,body=new RoundedBoxGeometry(1,1,.2,3,.08);
  const glass=new THREE.MeshPhysicalMaterial({color:0xbfdcda,metalness:0,roughness:.14,transmission:.92,thickness:.6,ior:1.45,clearcoat:1,clearcoatRoughness:.06,attenuationColor:new THREE.Color(0x2a9d99),attenuationDistance:1.6,envMapIntensity:1.2,specularIntensity:1});
  const tiles=[];const table=new THREE.Group();scene.add(table);
  SYM.forEach((s,i)=>{const[r,c]=pos(i+1);const grp=new THREE.Group();grp.position.set((c-9.5)*S,0,(r-5)*S);grp.rotation.x=-Math.PI/2;
    const m=new THREE.Mesh(body,glass);m.castShadow=true;grp.add(m);const sp=new THREE.Mesh(planeFor(i),symMat);sp.position.z=.105;grp.add(sp);table.add(grp);tiles.push(grp)});

  // word tiles: K + h e m i s t r y. Sources: real elements whose symbol carries the letter.
  const srcZ=[19,1,99,12,53,16,22,37,39];
  const navyMetal=new THREE.MeshPhysicalMaterial({color:0x13294b,metalness:.55,roughness:.22,clearcoat:1,clearcoatRoughness:.05,envMapIntensity:1.4});
  const tealMat=new THREE.MeshPhysicalMaterial({color:0x0b6b6b,metalness:.3,roughness:.18,clearcoat:1,emissive:new THREE.Color(TEAL),emissiveIntensity:0,envMapIntensity:1.3});
  const letterMat=new THREE.MeshBasicMaterial({map:atlas,transparent:true,depthWrite:false,color:0xF5F0E6});
  const word=srcZ.map((z,i)=>{const grp=new THREE.Group();const m=new THREE.Mesh(body,i===0?tealMat:navyMetal.clone());m.castShadow=true;grp.add(m);
    const sym=new THREE.Mesh(planeFor(z-1),symMat.clone());sym.position.z=.106;grp.add(sym);
    const let_=new THREE.Mesh(planeFor(SYM.length+i),letterMat.clone());let_.position.z=.107;let_.material.opacity=0;grp.add(let_);
    grp.userData={src:tiles[z-1],sym,let:let_,m};grp.visible=false;scene.add(grp);return grp});
  const slot=i=>new THREE.Vector3((i-4)*1.18,2.55,5.2);

  // light trail for K
  const kStart=tiles[18].position.clone();
  const trailCurve=new THREE.CatmullRomCurve3([kStart.clone().setY(.2),new THREE.Vector3(kStart.x+.6,2.2,kStart.z+1.6),new THREE.Vector3(-6.6,3.4,4.2),slot(0)]);
  const trailGeo=new THREE.TubeGeometry(trailCurve,160,.025,8,false);
  const trailMat=new THREE.MeshBasicMaterial({color:0x5fd3cd,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
  const trail=new THREE.Mesh(trailGeo,trailMat);scene.add(trail);const trailIdx=trailGeo.index.count;

  // post
  const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,cam));
  const bokeh=new BokehPass(scene,cam,{focus:8,aperture:.0012,maxblur:.007});composer.addPass(bokeh);
  const bloom=new UnrealBloomPass(new THREE.Vector2(256,256),.45,.45,.9);composer.addPass(bloom);
  const grain=new ShaderPass({uniforms:{tDiffuse:{value:null},uTime:{value:0},uAmt:{value:.045},uVig:{value:.95}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform sampler2D tDiffuse;uniform float uTime,uAmt,uVig;varying vec2 vUv;float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}void main(){vec4 c=texture2D(tDiffuse,vUv);float n=h(vUv*vec2(1920.,1080.)+fract(uTime*7.)*100.)-.5;c.rgb+=n*uAmt;vec2 d=vUv-.5;c.rgb*=mix(1.,smoothstep(.85,.2,length(d)),uVig*.55);gl_FragColor=c;}'});
  composer.addPass(grain);composer.addPass(new OutputPass());

  function resize(){const w=CAPTURE?(+Q.get('w')||innerWidth):innerWidth,h=CAPTURE?(+Q.get('h')||innerHeight):innerHeight;
    renderer.setPixelRatio(dpr);renderer.setSize(w,h,!CAPTURE);composer.setPixelRatio(dpr);composer.setSize(w,h);cam.aspect=w/h;
    cam.fov=w/h<1?58:35;cam.updateProjectionMatrix();}
  resize();addEventListener('resize',resize);

  // choreography helpers
  const cl=(x,a=0,b=1)=>Math.min(b,Math.max(a,x)),ss=(a,b,x)=>{const t=cl((x-a)/(b-a));return t*t*(3-2*t)};
  const eio=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2,eout=t=>1-Math.pow(1-t,4),expo=t=>t>=1?1:1-Math.pow(2,-10*t);
  const camPos=new THREE.CatmullRomCurve3([new THREE.Vector3(14,1.5,5.2),new THREE.Vector3(5,2.1,4.4),new THREE.Vector3(-4,2.6,4.6),new THREE.Vector3(-6.5,3.8,9),new THREE.Vector3(-1.3,4.9,15.2),new THREE.Vector3(0,5.0,15.6)],false,'centripetal');
  const camTgt=new THREE.CatmullRomCurve3([new THREE.Vector3(8,0,-.6),new THREE.Vector3(0,0,-1),new THREE.Vector3(-8.5,.2,-1),new THREE.Vector3(-6,2,2.5),new THREE.Vector3(-.3,2.45,5.1),new THREE.Vector3(0,2.5,5.2)],false,'centripetal');
  const mob=innerWidth/innerHeight<1;
  const tmp=new THREE.Vector3(),q0=new THREE.Quaternion(),q1=new THREE.Quaternion(),flat=new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,0));

  function frame(t){
    // camera: one continuous spline, eased
    const u=eio(cl(t/6.4));camPos.getPointAt(u,cam.position);camTgt.getPointAt(u,tmp);
    cam.position.y+=Math.sin(t*.7)*.04;if(mob){cam.position.z+=ss(3.6,6.4,t)*13;cam.position.y+=ss(3.6,6.4,t)*1.2;}
    cam.lookAt(tmp);bokeh.uniforms.focus.value=cam.position.distanceTo(tmp);
    bokeh.uniforms.aperture.value=.0016*(1-ss(5.6,7,t))+.0003;
    // table glints then recedes
    symMat.opacity=.82*(1-ss(5.2,7,t)*.55);
    rim.position.x=-8+t*2.2;
    // word tiles
    word.forEach((w,i)=>{const t0=i===0?2.3:3.35+i*.13,dur=i===0?1.45:1.25,p=cl((t-t0)/dur);
      w.userData.src.visible=t<t0;w.visible=t>=t0;if(!w.visible)return;
      const a=w.userData.src.position,b=slot(i),e=i===0?eio(p):expo(p);
      if(i===0){trailCurve.getPointAt(e,w.position)}else{const mid=a.clone().lerp(b,.5);mid.y+=3.2+(i%3)*.4;
        const k=e;w.position.set(0,0,0).addScaledVector(a,(1-k)*(1-k)).addScaledVector(mid,2*k*(1-k)).addScaledVector(b,k*k);}
      q0.copy(flat);q1.identity();w.quaternion.slerpQuaternions(q0,q1,ss(.1,.9,p));
      w.rotateY((1-e)*(i%2?1.2:-1.2)*(i?1:.4));
      const sw=ss(.35,.75,p);w.userData.sym.material.opacity=.82*(1-sw);w.userData.let.material.opacity=sw;
      if(i>0)w.userData.m.material.color.lerpColors(new THREE.Color(0x2f6670),new THREE.Color(0x13294b),sw);
      w.position.y+=Math.sin(t*1.3+i)*.02*ss(5.5,6.5,t);});
    // K glow + trail
    const kp=cl((t-2.3)/1.45);tealMat.emissiveIntensity=.9*ss(2.2,2.7,t)*(1-.6*ss(4.2,6,t));
    kLight.intensity=18*ss(2.3,2.8,t)*(1-.7*ss(4,6,t));kLight.position.copy(word[0].position).add(new THREE.Vector3(0,.4,.9));
    trailGeo.setDrawRange(0,Math.floor(trailIdx*eio(kp)/3)*3);trailMat.opacity=ss(2.3,2.6,t)*(1-ss(4.4,5.6,t));
    // settle: assembled word gets a soft catalyst pulse
    bloom.strength=.5+.5*Math.exp(-Math.pow((t-5.4)*2.2,2));
    grain.uniforms.uTime.value=t;
    composer.render();
  }

  // run
  let start=null,raf=0,done=false;
  const hero=()=>window.KhemHero;
  function finish(){if(done)return;done=true;cancelAnimationFrame(raf);intro.classList.add('out');root.classList.remove('intro-playing');
    setTimeout(()=>{hero()&&hero().build()},CAPTURE?0:250);setTimeout(()=>{intro.style.display='none';renderer.dispose()},1100);}
  let last=0,acc=0,cnt=0,lowStreak=0;
  function loop(now){if(start===null)start=now;const t=(now-start)/1000;
    if(last){const dt=now-last;acc+=dt;cnt++;stats.frames++;
      if(acc>=1000){const fps=cnt*1000/acc;stats.samples.push(+fps.toFixed(1));acc=0;cnt=0;
        if(fps<45&&++lowStreak>=1){ // adaptive quality ladder
          if(dpr>1){dpr=Math.max(1,dpr-.5);stats.dpr=dpr;resize();stats.quality='dpr'+dpr}
          else if(bokeh.enabled){bokeh.enabled=false;stats.quality='no-dof'}
          else if(glass.transmission>0){glass.transmission=0;glass.opacity=.85;glass.transparent=true;glass.needsUpdate=true;key.castShadow=false;stats.quality='low'}}else lowStreak=0}}
    last=now;frame(Math.min(t,T_END));if(t>=T_END)finish();else raf=requestAnimationFrame(loop)}
  intro.querySelector('.intro-skip').addEventListener('click',finish);
  addEventListener('keydown',e=>{if(e.key==='Escape'&&!done)finish()});
  window.KhemIntro={stats,frame,finish,replay(){location.reload()},T_END,
    // capture API: render t exactly; overlay fade handled by caller
    renderAt(t){frame(Math.min(t,T_END))}};
  if(CAPTURE){frame(0);window.KhemIntroReady=true;return}
  raf=requestAnimationFrame(loop);
}
