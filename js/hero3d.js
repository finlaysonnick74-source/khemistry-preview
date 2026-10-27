/* Khemistry v4: the live 3D hero. Clean-room Three.js. Choreography is a pure function of t (frame-exact capture). */
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {BokehPass} from 'three/addons/postprocessing/BokehPass.js';
import {FullScreenQuad} from 'three/addons/postprocessing/Pass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {FXAAShader} from 'three/addons/shaders/FXAAShader.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';

// Half-resolution defocus with a sharp full-resolution resolve for focused symbols.
class HalfResolutionBokehPass extends BokehPass {
  constructor(scene,camera,options){
    super(scene,camera,options);
    this.blurTarget=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:false});
    this.resolveMaterial=new THREE.ShaderMaterial({
      uniforms:{tSharp:{value:null},tBlur:{value:this.blurTarget.texture},tDepth:this.uniforms.tDepth,
        focus:this.uniforms.focus,aperture:this.uniforms.aperture,nearClip:this.uniforms.nearClip,farClip:this.uniforms.farClip,pixelHeight:{value:1}},
      vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:`#include <packing>
        varying vec2 vUv;uniform sampler2D tSharp,tBlur,tDepth;uniform float focus,aperture,nearClip,farClip,pixelHeight;
        void main(){float depth=unpackRGBAToDepth(texture2D(tDepth,vUv));float z=perspectiveDepthToViewZ(depth,nearClip,farClip);
          float radius=abs(focus+z)*aperture*pixelHeight;
          gl_FragColor=mix(texture2D(tSharp,vUv),texture2D(tBlur,vUv),smoothstep(.6,2.,radius));}`});
    this.resolveQuad=new FullScreenQuad(this.resolveMaterial);
  }
  setSize(w,h){const sw=Math.max(1,Math.ceil(w/2)),sh=Math.max(1,Math.ceil(h/2));super.setSize(sw,sh);this.blurTarget.setSize(sw,sh);this.resolveMaterial.uniforms.pixelHeight.value=h;}
  render(renderer,write,read){const screen=this.renderToScreen;this.renderToScreen=false;
    const shadowAuto=renderer.shadowMap.autoUpdate;renderer.shadowMap.autoUpdate=false;
    try{super.render(renderer,this.blurTarget,read)}finally{renderer.shadowMap.autoUpdate=shadowAuto;this.renderToScreen=screen}
    this.resolveMaterial.uniforms.tSharp.value=read.texture;
    renderer.setRenderTarget(screen?null:write);this.resolveQuad.render(renderer);
  }
  dispose(){super.dispose();this.blurTarget.dispose();this.resolveMaterial.dispose();this.resolveQuad.dispose();}
}

const root=document.documentElement,hero=document.querySelector('.h3d'),canvas=document.querySelector('.h3d-canvas');
const Q=new URLSearchParams(location.search),CAPTURE=Q.has('capture');
const T_SETTLE=8.2;
const NAVY=0x0A1830,TEAL=0x2A9D99;
const stats={frames:0,samples:[],dpr:0,quality:'high'};window.KhemStats=stats;
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const cl=(x,a=0,b=1)=>Math.min(b,Math.max(a,x)),ss=(a,b,x)=>{const t=cl((x-a)/(b-a));return t*t*(3-2*t)};
const eio=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2,expo=t=>t>=1?1:1-Math.pow(2,-10*t);

function toStill(e){console.warn('3D unavailable, still frame',e);root.classList.remove('live3d');root.classList.add('still3d');}
if(root.classList.contains('live3d')){try{await init()}catch(e){toStill(e)}}

async function init(){
  try{await Promise.race([Promise.all([document.fonts.load('500 120px Fraunces'),document.fonts.load('600 20px Inter')]),new Promise(r=>setTimeout(r,1500))])}catch(e){}
  const renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance',preserveDrawingBuffer:CAPTURE});
  let dpr=CAPTURE?(+Q.get('dpr')||devicePixelRatio):Math.min(devicePixelRatio,2);stats.dpr=dpr;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;
  if(Q.has('fps')){const gl=renderer.getContext(),dbg=gl.getExtension('WEBGL_debug_renderer_info');stats.gpu=dbg?gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);console.log('[khem gpu]',stats.gpu);root.dataset.khemGpu=stats.gpu;}
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene();scene.background=new THREE.Color(NAVY);scene.fog=new THREE.Fog(NAVY,16,44);
  const pm=new THREE.PMREMGenerator(renderer);const room=new RoomEnvironment(renderer),env=pm.fromScene(room,0.025);scene.environment=env.texture;room.dispose();
  const cam=new THREE.PerspectiveCamera(35,1,0.1,140);

  // lights
  scene.add(new THREE.HemisphereLight(0xcfe8e6,0x0a1830,0.35));
  const key=new THREE.DirectionalLight(0xfff4e2,2.1);key.position.set(6,14,9);key.castShadow=true;
  key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-16,right:16,top:12,bottom:-10,near:1,far:44});key.shadow.radius=6;key.shadow.bias=-0.0002;key.shadow.normalBias=.015;key.shadow.autoUpdate=false;key.shadow.needsUpdate=true;scene.add(key);
  const rim=new THREE.PointLight(TEAL,30,30,1.6);rim.position.set(-8,4,-6);scene.add(rim);
  const kLight=new THREE.PointLight(TEAL,0,10,1.8);scene.add(kLight);
  const pppLight=new THREE.PointLight(0x5fd3cd,0,9,1.6);scene.add(pppLight);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(140,140),new THREE.MeshStandardMaterial({color:0x0c1d3a,roughness:.8,metalness:.15}));
  floor.rotation.x=-Math.PI/2;floor.position.y=-0.12;floor.receiveShadow=true;scene.add(floor);

  // atlas: 118 symbols, word letters, P tiles
  const SYM='H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og'.split(' ');
  const LET=['K','h','e','m','i','s','t','r','y'],PP=[['Pp','People','02'],['Pl','Place','03'],['Pu','Purpose','04']];
  const CELL=256,COLS=16,N=SYM.length+LET.length+PP.length,ROWS=Math.ceil(N/COLS);
  const ac=document.createElement('canvas');const atlasScale=Math.min(1.5,renderer.capabilities.maxTextureSize/(CELL*COLS));ac.width=CELL*COLS*atlasScale;ac.height=CELL*ROWS*atlasScale;const g=ac.getContext('2d');g.scale(atlasScale,atlasScale);
  const cell=i=>[(i%COLS)*CELL,Math.floor(i/COLS)*CELL];
  SYM.forEach((s,i)=>{const[x,y]=cell(i);g.fillStyle='#F5F0E6';g.textAlign='center';g.textBaseline='middle';g.font='500 112px Fraunces, Georgia, serif';g.fillText(s,x+CELL/2,y+CELL*.56);g.font='600 30px Inter, sans-serif';g.textAlign='left';g.fillText(String(i+1),x+24,y+38)});
  LET.forEach((s,i)=>{const[x,y]=cell(SYM.length+i);g.fillStyle='#F5F0E6';g.textAlign='center';g.textBaseline='middle';g.font='500 168px Fraunces, Georgia, serif';g.fillText(s,x+CELL/2,y+CELL*.5)});
  PP.forEach(([s,n,num],i)=>{const[x,y]=cell(SYM.length+LET.length+i);g.fillStyle='#FFFFFF';g.textAlign='center';g.textBaseline='middle';g.font='500 120px Fraunces, Georgia, serif';g.fillText(s,x+CELL/2,y+CELL*.44);
    g.font='600 26px Inter, sans-serif';g.letterSpacing='4px';g.fillText(n.toUpperCase(),x+CELL/2,y+CELL*.8);g.textAlign='left';g.font='600 26px Inter, sans-serif';g.fillText(num,x+22,y+36)});
  const atlas=new THREE.CanvasTexture(ac);atlas.colorSpace=THREE.SRGBColorSpace;atlas.anisotropy=renderer.capabilities.getMaxAnisotropy();atlas.generateMipmaps=true;atlas.minFilter=THREE.LinearMipmapLinearFilter;atlas.magFilter=THREE.LinearFilter;
  const planeFor=i=>{const geo=new THREE.PlaneGeometry(.88,.88);const u0=(i%COLS)/COLS,v0=1-(Math.floor(i/COLS)+1)/ROWS,uv=geo.attributes.uv;for(let k=0;k<uv.count;k++)uv.setXY(k,u0+uv.getX(k)/COLS,v0+uv.getY(k)/ROWS);return geo};
  const symMat=new THREE.MeshBasicMaterial({map:atlas,transparent:true,opacity:.82,depthWrite:false,color:0xd9d2c4});

  // table
  const pos=z=>{if(z===1)return[1,1];if(z===2)return[1,18];if(z<=10)return[2,z<=4?z-2:z+8];if(z<=18)return[3,z<=12?z-10:z];if(z<=36)return[4,z-18];if(z<=54)return[5,z-36];if(z>=57&&z<=71)return[8.4,z-54];if(z>=89&&z<=103)return[9.4,z-86];if(z<=86)return[6,z<=56?z-54:z-68];return[7,z<=88?z-86:z-100]};
  const S=1.12,body=new RoundedBoxGeometry(1,1,.2,4,.08);
  const glass=new THREE.MeshPhysicalMaterial({color:0xbfdcda,roughness:.1,transmission:.92,thickness:.35,ior:1.45,clearcoat:1,clearcoatRoughness:.06,attenuationColor:new THREE.Color(TEAL),attenuationDistance:2.4,envMapIntensity:1.35});
  // 118 tiles as two InstancedMeshes (bodies + symbol faces): 2 draw calls instead of 236
  const tiles=[];const flat=new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,0));
  const NT=SYM.length,bodyI=new THREE.InstancedMesh(body,glass,NT);bodyI.castShadow=true;
  const symGeo=new THREE.PlaneGeometry(.88,.88),uvOff=new Float32Array(NT*2);
  const symI=new THREE.InstancedMesh(symGeo,symMat,NT);
  symMat.onBeforeCompile=sh=>{sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec2 uvOff;').replace('#include <uv_vertex>','#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv=uv*vec2('+(1/COLS).toFixed(6)+','+(1/ROWS).toFixed(6)+')+uvOff;\n#endif')};
  const mA=new THREE.Matrix4(),mB=new THREE.Matrix4(),off=new THREE.Matrix4().makeTranslation(0,0,.105),one=V(1,1,1),zero=V(0,0,0);
  const setTile=(i,show)=>{const t=tiles[i];if(t._shown===show)return;t._shown=show;mA.compose(t.position,flat,show?one:zero);bodyI.setMatrixAt(i,mA);mB.multiplyMatrices(mA,off);symI.setMatrixAt(i,mB);bodyI.instanceMatrix.needsUpdate=true;symI.instanceMatrix.needsUpdate=true};
  SYM.forEach((s,i)=>{const[r,c]=pos(i+1);tiles.push({position:V((c-9.5)*S,0,(r-5)*S),_shown:null});uvOff[i*2]=(i%COLS)/COLS;uvOff[i*2+1]=1-(Math.floor(i/COLS)+1)/ROWS;setTile(i,true)});
  symGeo.setAttribute('uvOff',new THREE.InstancedBufferAttribute(uvOff,2));scene.add(bodyI,symI);
  // flying tiles: word (K h e m i s t r y) + P/P/P
  const navyMetal=new THREE.MeshPhysicalMaterial({color:0x13294b,metalness:.35,roughness:.32,clearcoat:.6,clearcoatRoughness:.22,envMapIntensity:.8});
  const tealMat=new THREE.MeshPhysicalMaterial({color:0x0b6b6b,metalness:.3,roughness:.18,clearcoat:1,emissive:new THREE.Color(TEAL),emissiveIntensity:0,envMapIntensity:1.3});
  const mkFly=(srcZ,atlasIdx,mat)=>{const grp=new THREE.Group();const m=new THREE.Mesh(body,mat);m.castShadow=true;grp.add(m);
    const sym=new THREE.Mesh(planeFor(srcZ-1),new THREE.MeshBasicMaterial({map:atlas,transparent:true,opacity:.82,depthWrite:false,color:0xd9d2c4}));sym.position.z=.106;grp.add(sym);
    const lt=new THREE.Mesh(planeFor(atlasIdx),new THREE.MeshBasicMaterial({map:atlas,transparent:true,depthWrite:false,opacity:0,toneMapped:true}));lt.position.z=.107;grp.add(lt);
    grp.userData={src:tiles[srcZ-1],srcI:srcZ-1,sym,lt,m};grp.visible=false;scene.add(grp);return grp};
  const word=[19,1,99,12,53,16,22,37,39].map((z,i)=>mkFly(z,SYM.length+i,i===0?tealMat:navyMetal.clone()));word[0].userData.lt.material.color.set(0x0A1830);
  const pppMats=[0,1,2].map(()=>new THREE.MeshPhysicalMaterial({color:0x0b6b6b,metalness:.25,roughness:.16,clearcoat:1,clearcoatRoughness:.04,transmission:.25,thickness:.5,emissive:new THREE.Color(TEAL),emissiveIntensity:0,envMapIntensity:1.3}));
  const ppp=[15,61,94].map((z,i)=>mkFly(z,SYM.length+LET.length+i,pppMats[i]));

  // portrait: approved still image, composited with rim light + edge glow (shader), soft floor shadow
  const ptex=await new THREE.TextureLoader().loadAsync('assets/maidlin.webp');ptex.colorSpace=THREE.SRGBColorSpace;ptex.anisotropy=renderer.capabilities.getMaxAnisotropy();ptex.generateMipmaps=true;ptex.minFilter=THREE.LinearMipmapLinearFilter;
  const IMG_A=1012/1505,PAD=.14;
  const pMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,toneMapped:false,
    uniforms:{map:{value:ptex},uRim:{value:0},uLight:{value:1},uAlpha:{value:0},uPad:{value:PAD},uTexel:{value:new THREE.Vector2(1/1012,1/1505)}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`uniform sampler2D map;uniform float uRim,uLight,uPad,uAlpha;uniform vec2 uTexel;varying vec2 vUv;
      vec4 tx(vec2 u){if(u.x<0.||u.x>1.||u.y<0.||u.y>1.)return vec4(0.);return texture2D(map,u);}
      void main(){vec2 u=(vUv-vec2(uPad,0.))/vec2(1.-2.*uPad,1.-uPad*.5);vec4 c=tx(u);
        float edge=0.;for(int i=0;i<8;i++){float a=float(i)*0.7854;edge+=tx(u+vec2(cos(a),sin(a))*uTexel*1.5).a;}edge=c.a-edge/8.;
        float side=smoothstep(.35,1.,u.x)*.85+.15;
        vec3 teal=vec3(.32,.86,.82);
        vec3 col=c.rgb*uLight*vec3(.95,.97,1.0);
        col+=teal*max(edge,0.)*uRim*.65*side;
        float fade=smoothstep(0.,.16,u.y);
        float border=smoothstep(0.,uTexel.x*2.,min(u.x,1.-u.x))*smoothstep(0.,uTexel.y*2.,1.-u.y);
        float a=smoothstep(.012,.99,c.a)*fade*border;vec3 outc=col;
        gl_FragColor=vec4(outc,a*uAlpha);}`.replace('IMG','('+(1/IMG_A).toFixed(3)+')')});
  const portrait=new THREE.Mesh(new THREE.PlaneGeometry(1,1),pMat);portrait.renderOrder=5;scene.add(portrait);
  const sc=document.createElement('canvas');sc.width=sc.height=256;{const c=sc.getContext('2d'),gr=c.createRadialGradient(128,128,0,128,128,128);gr.addColorStop(0,'rgba(0,0,0,.75)');gr.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=gr;c.fillRect(0,0,256,256)}
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(sc),transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;scene.add(shadow);
  const pFill=new THREE.PointLight(0x5fd3cd,0,8,1.5);scene.add(pFill);

  // connectors (energy pulses)
  const conMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,uniforms:{uT:{value:0},uP:{value:0},uI:{value:1}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform float uT,uP,uI;varying vec2 vUv;void main(){float x=vUv.x;if(x>uP)discard;float b=exp(-pow((fract(x*1.2-uT*.42)-.5)*9.,2.));float head=exp(-pow((x-uP)*28.,2.))*step(uP,.999);vec3 c=vec3(.25,.78,.74)*(.45+2.6*b+3.*head);gl_FragColor=vec4(c*uI,(.55+.45*b)*uI);}'});
  const connectors=[0,1,2].map(()=>{const m=new THREE.Mesh(new THREE.BufferGeometry(),conMat);scene.add(m);return m});

  // particles
  const NP=CAPTURE?900:650,pg=new THREE.BufferGeometry(),pp=new Float32Array(NP*3),seed=new Float32Array(NP);
  for(let i=0;i<NP;i++){pp[i*3]=(Math.random()-.5)*30;pp[i*3+1]=Math.random()*9;pp[i*3+2]=-6+Math.random()*20;seed[i]=Math.random()*100}
  pg.setAttribute('position',new THREE.BufferAttribute(pp,3));pg.setAttribute('seed',new THREE.BufferAttribute(seed,1));
  const dc=document.createElement('canvas');dc.width=dc.height=64;{const c=dc.getContext('2d'),gr=c.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.4,'rgba(200,245,240,.35)');gr.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=gr;c.fillRect(0,0,64,64)}
  const pmat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{uT:{value:0},uA:{value:0},map:{value:new THREE.CanvasTexture(dc)},uS:{value:1}},
    vertexShader:'attribute float seed;uniform float uT,uS;varying float vA;void main(){vec3 p=position;p.x+=sin(uT*.13+seed)*.6;p.y+=mod(uT*.12+seed*.37,9.)-4.5+sin(uT*.3+seed*2.)*.2;p.y=mod(p.y+9.,9.);p.z+=cos(uT*.11+seed*1.3)*.5;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=uS*(28.+fract(seed)*34.)/-mv.z;vA=.35+.65*fract(seed*7.);}',
    fragmentShader:'uniform sampler2D map;uniform float uA;varying float vA;void main(){vec4 c=texture2D(map,gl_PointCoord);gl_FragColor=vec4(vec3(.62,.9,.86)*c.rgb,c.a*uA*vA*.55);}'});
  const points=new THREE.Points(pg,pmat);scene.add(points);

  // post
  const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,cam));
  const bokeh=new HalfResolutionBokehPass(scene,cam,{focus:10,aperture:.0012,maxblur:.008});composer.addPass(bokeh);
  const bloom=new UnrealBloomPass(new THREE.Vector2(256,256),.3,.35,1.05);composer.addPass(bloom);
  const grain=new ShaderPass({uniforms:{tDiffuse:{value:null},uTime:{value:0},uAmt:{value:.004},uVig:{value:.95}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform sampler2D tDiffuse;uniform float uTime,uAmt,uVig;varying vec2 vUv;float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}void main(){vec4 c=texture2D(tDiffuse,vUv);float n=h(vUv*vec2(1920.,1080.)+fract(uTime*7.)*100.)-.5;c.rgb+=n*uAmt;vec2 d=vUv-.5;c.rgb*=mix(1.,smoothstep(.85,.2,length(d)),uVig*.5);gl_FragColor=c;}'});
  composer.addPass(grain);composer.addPass(new OutputPass());
  // Antialias the actual composed output (canvas antialiasing cannot smooth render targets).
  const fxaa=new ShaderPass(FXAAShader);composer.addPass(fxaa);

  // final composition from shared NDC layout
  const FIN={pos:V(0,3.4,14.5),tgt:V(0,2.2,5)};const vcam=new THREE.PerspectiveCamera();
  const lay={};let camPos,camTgt;
  function layout(){const L=window.KhemPick(),W=CAPTURE?(+Q.get('w')||innerWidth):innerWidth,H=CAPTURE?(+Q.get('h')||innerHeight):innerHeight,A=W/H;
    vcam.fov=L.fov;vcam.aspect=A;vcam.near=.1;vcam.far=140;vcam.position.copy(FIN.pos);vcam.lookAt(FIN.tgt);vcam.updateProjectionMatrix();vcam.updateMatrixWorld();
    const fwd=new THREE.Vector3();vcam.getWorldDirection(fwd);const right=V(1,0,0).applyQuaternion(vcam.quaternion),up=V(0,1,0).applyQuaternion(vcam.quaternion);
    const tanH=Math.tan(THREE.MathUtils.degToRad(L.fov/2));
    const at=(x,y,d)=>{const p=V(x,y,.5).unproject(vcam).sub(vcam.position).normalize();return vcam.position.clone().addScaledVector(p,d/p.dot(fwd))};
    const D=10,Hv=2*D*tanH;
    const wh=L.word.h*Hv,wc=at(L.word.x,L.word.y,D);
    lay.word=LET.map((_,i)=>wc.clone().addScaledVector(right,(i-4)*1.16*wh));lay.wscale=wh;lay.q=vcam.quaternion.clone();lay.right=right;lay.up=up;lay.fwd=fwd;
    const ph=L.ppp.h*Hv,pc=at(L.ppp.x,L.ppp.y,D);lay.ppp=[0,1,2].map(i=>pc.clone().addScaledVector(right,(i-1)*L.ppp.gap*ph));lay.pscale=ph;
    // connectors: from under the credit line to each P tile top
    const start=at(L.word.x,L.word.y-L.word.h-L.credit*2.5,D);
    connectors.forEach((m,i)=>{const end=lay.ppp[i].clone().addScaledVector(up,ph*.52);const mid=start.clone().lerp(end,.5);
      const s0=start.clone().addScaledVector(right,(i-1)*wh*.18);const c=new THREE.CubicBezierCurve3(s0,s0.clone().addScaledVector(up,-ph*.55),end.clone().addScaledVector(up,ph*.55),end);
      m.geometry.dispose();m.geometry=new THREE.TubeGeometry(c,64,Math.max(.012,ph*.018),8,false)});
    // portrait: feet on the floor at the designed screen spot
    const ray=V(L.por.x,L.por.feet,.5).unproject(vcam).sub(vcam.position).normalize();const tF=(-0.12-vcam.position.y)/ray.y;const F=vcam.position.clone().addScaledVector(ray,tF);
    const dz=F.clone().sub(vcam.position).dot(fwd);const Hd=2*dz*tanH;const Hp=(L.por.top-L.por.feet)/2*Hd;
    const wP=Hp*IMG_A/(1-2*PAD),hP=Hp/(1-PAD*.5);
    portrait.scale.set(wP,hP,1);portrait.quaternion.copy(vcam.quaternion);portrait.position.copy(F).addScaledVector(up,hP/2);
    shadow.position.set(F.x,-0.11,F.z);shadow.scale.set(Hp*.75,Hp*.28,1);
    pFill.position.copy(F).add(V(1.2,Hp*.8,1.4));
    lay.focusD=D;
    // camera spline into the final composition
    camPos=new THREE.CatmullRomCurve3([V(14,1.5,5.2),V(5,2.1,4.4),V(-4,2.6,4.6),V(-6,3.6,9.5),V(-1.4,3.5,13.8),FIN.pos.clone()],false,'centripetal');
    camTgt=new THREE.CatmullRomCurve3([V(8,0,-.6),V(0,0,-1),V(-8.5,.2,-1),V(-5,2,3.5),V(-.4,2.2,5),FIN.tgt.clone()],false,'centripetal');
    renderer.setPixelRatio(dpr);renderer.setSize(W,H,!CAPTURE);composer.setPixelRatio(dpr);composer.setSize(W,H);fxaa.uniforms.resolution.value.set(1/(W*dpr),1/(H*dpr));cam.aspect=A;cam.fov=L.fov;cam.updateProjectionMatrix();
    // Keep mobile letters legible under the room reflections, with a restrained clearcoat.
    word.forEach((w,i)=>{const m=w.userData.m.material;
      m.roughness=A<1?.5:(i===0?.18:.32);m.clearcoat=A<1?.25:(i===0?1:.6);
      m.clearcoatRoughness=A<1?.18:(i===0?.1:.22);m.envMapIntensity=A<1?.35:(i===0?1.3:.8);});
    pmat.uniforms.uS.value=dpr*H/800;key.shadow.needsUpdate=true;}
  layout();addEventListener('resize',()=>{layout();if(!CAPTURE&&!running)frame(clock)});

  // interaction state (smoothed)
  let hoverK=null,focusK=null;const KS=['people','place','purpose'];const hov=[0,0,0];let foc=0,focIdx=0,par=V(0,0,0),parT=V(0,0,0);
  addEventListener('khem:hover',e=>hoverK=e.detail);addEventListener('khem:focus',e=>{focusK=e.detail;if(e.detail)focIdx=KS.indexOf(e.detail)});
  addEventListener('pointermove',e=>{parT.set(e.clientX/innerWidth-.5,e.clientY/innerHeight-.5,0)});
  addEventListener('deviceorientation',e=>{if(e.gamma!=null)parT.set(cl(e.gamma/40,-.5,.5),cl((e.beta-45)/40,-.5,.5),0)});

  const tq=new THREE.Quaternion(),tmp=V(0,0,0),dom={credit:hero.querySelector('.credit'),tc:hero.querySelector('.titlecard'),chars:[...hero.querySelectorAll('.headline .c')],ctas:hero.querySelector('.ctas')};
  function place(w,from,to,p,arc,spin,scaleTo,kind){// bezier flight from table to slot, flat->camera-facing
    const mid=from.clone().lerp(to,.5);mid.y+=arc;const k=p;
    w.position.set(0,0,0).addScaledVector(from,(1-k)*(1-k)).addScaledVector(mid,2*k*(1-k)).addScaledVector(to,k*k);
    w.quaternion.slerpQuaternions(flat,lay.q,ss(.1,.9,p));if(spin)w.rotateY((1-p)*spin);
    w.scale.setScalar(1+(scaleTo-1)*ss(.2,1,p));}
  function frame(t,dt=1/60){
    const mob=innerWidth/innerHeight<1;
    // camera
    const ct=cl(t/T_SETTLE),u=ct*ct*ct*(ct*(ct*6-15)+10);camPos.getPointAt(u,cam.position);camTgt.getPointAt(u,tmp);
    {const wc=lay.word[4],pc=lay.ppp[1];const fp=wc.clone().lerp(pc,ss(5.2,6.6,t)*.6);const fw=ss(2.4,3.6,t)*(1-ss(7.0,8.2,t));
     const kp=word[0].visible&&t<3.9?word[0].position:null;if(kp)fp.lerp(kp,1-ss(3.2,3.9,t));tmp.lerp(fp,fw*.85);}
    const live=ss(T_SETTLE-.6,T_SETTLE+.4,t);
    const kA=1-Math.exp(-dt*3),kB=1-Math.exp(-dt*3.6),kC=1-Math.exp(-dt*7.5);par.lerp(parT,kA);foc+=((focusK?1:0)-foc)*kB;
    for(let i=0;i<3;i++)hov[i]+=((hoverK===KS[i]?1:0)-hov[i])*kC;
    cam.position.addScaledVector(lay.right,par.x*.55*live).addScaledVector(lay.up,-par.y*.3*live);
    cam.position.y+=Math.sin(t*.25)*.05*live;
    if(foc>.001){const tp=lay.ppp[focIdx];const e=eio(foc);const back=tp.clone().addScaledVector(lay.fwd,-lay.pscale*8.5).addScaledVector(lay.right,mob?0:lay.pscale*1.7);
      cam.position.lerp(back,e*.55);tmp.lerp(tp.clone().addScaledVector(lay.right,mob?0:lay.pscale*1.7).addScaledVector(lay.up,mob?-lay.pscale*.9:0),e*.55);}
    cam.lookAt(tmp);
    bokeh.uniforms.focus.value=foc>.5?cam.position.distanceTo(lay.ppp[focIdx]):cam.position.distanceTo(tmp)*(1-live)+lay.focusD*1.02*live;
    bokeh.uniforms.aperture.value=.0012*(1-ss(5.6,7.2,t));
    // Avoid a full-screen depth/blur pass once the hero is in focus.
    bokeh.enabled=dofAllowed&&t<7.2;
    symMat.opacity=.82*(1-ss(5.2,7.5,t)*.5);
    rim.position.set(-14+((t*1.6)%28),4,-6);rim.intensity=26+8*Math.sin(t*.5);
    // word
    word.forEach((w,i)=>{const t0=i===0?2.3:3.35+i*.13,dur=i===0?1.5:1.3,p=cl((t-t0)/dur);
      setTile(w.userData.srcI,t<t0);w.visible=t>=t0;if(!w.visible)return;
      const e=i===0?eio(p):expo(p);place(w,w.userData.src.position,lay.word[i],e,i===0?2.2:3.2+(i%3)*.4,(i%2?1.2:-1.2)*(i?1:.4),lay.wscale,'w');
      const sw=ss(.35,.75,p);w.userData.sym.material.opacity=.82*(1-sw);w.userData.lt.material.opacity=sw;
      if(i>0)w.userData.m.material.color.lerpColors(new THREE.Color(0x2f6670),new THREE.Color(0x13294b),sw);
      w.position.addScaledVector(lay.up,Math.sin(t*1.1+i*.7)*.012*live);});
    tealMat.emissiveIntensity=.9*ss(2.2,2.7,t)*(1-.8*ss(4.2,6,t));
    kLight.intensity=16*ss(2.3,2.8,t)*(1-.93*ss(4,6,t));kLight.position.copy(word[0].position).addScaledVector(lay.fwd,-.8);
    // P/P/P fly up, then bond
    ppp.forEach((w,i)=>{const t0=5.0+i*.18,p=cl((t-t0)/1.35);setTile(w.userData.srcI,t<t0);w.visible=t>=t0;if(!w.visible)return;
      place(w,w.userData.src.position,lay.ppp[i],expo(p),2.6+i*.3,(i-1)*1.4,lay.pscale,'p');
      const sw=ss(.3,.7,p);w.userData.sym.material.opacity=.82*(1-sw);w.userData.lt.material.opacity=sw;
      const h=hov[i]+(focusK===KS[i]?foc:0);w.position.addScaledVector(lay.fwd,-h*lay.pscale*.35).addScaledVector(lay.up,h*lay.pscale*.12+Math.sin(t*1.3+i*2)*.01*live);
      pppMats[i].emissiveIntensity=.12+.35*ss(6.2,6.9,t)+.9*h+.15*Math.sin(t*1.7+i*2.1)*live;});
    pppLight.position.copy(lay.ppp[1]).addScaledVector(lay.up,lay.pscale*2.2).addScaledVector(lay.fwd,-.6);pppLight.intensity=4*ss(6.2,7,t)+5*Math.max(...hov);
    const cp=eio(cl((t-6.25)/1.1));conMat.uniforms.uP.value=cp;conMat.uniforms.uT.value=t;conMat.uniforms.uI.value=ss(6.2,6.4,t);
    connectors.forEach(m=>m.visible=cp>0);
    // portrait lighting reveal (image itself never moves)
    pMat.uniforms.uAlpha.value=ss(5.9,7.0,t);pMat.uniforms.uLight.value=.25+.75*ss(6.3,7.6,t);pMat.uniforms.uRim.value=ss(6.8,8,t)*(.85+.15*Math.sin(t*.6));
    portrait.visible=pMat.uniforms.uAlpha.value>0;
    pFill.intensity=6*ss(6.6,7.8,t);
    shadow.material.opacity=ss(6.4,7.6,t);
    pmat.uniforms.uT.value=t;pmat.uniforms.uA.value=.5+.5*ss(5,8,t);
    bloom.strength=(mob?.15:.22)+.18*Math.exp(-Math.pow((t-5.6)*2,2))+.12*Math.exp(-Math.pow((t-7.2)*2.2,2));
    grain.uniforms.uTime.value=t;
    // DOM title card, driven by the same clock
    const c1=ss(7.0,7.8,t)*(1-foc);dom.credit.style.opacity=c1;dom.credit.style.transform=`translate(-50%,calc(-50% + ${(1-c1)*10}px))`;dom.credit.style.letterSpacing=(.34+.2*(1-c1))+'em';
    dom.tc.style.opacity=t>=7.3?1:0;const n=dom.chars.length;dom.chars.forEach((c,i)=>{const p=ss(7.3+i*.012,7.3+i*.012+.6,t);c.style.opacity=p;c.style.transform=`translateY(${(1-p)*.5}em)`});
    const b=ss(8.3,8.9,t);dom.ctas.style.opacity=b;dom.ctas.style.transform=`translateY(${(1-b)*12}px)`;
    // The settled table is static; retain its soft shadow until a flying/hovered tile moves.
    key.shadow.needsUpdate=key.shadow.needsUpdate||(t>=2.3&&t<7.2)||foc>.001||Math.max(...hov)>.001;
    composer.render();
  }

  // run loop + adaptive quality
  let start=null,running=true,clock=0,last=0,acc=0,cnt=0,offset=0,dofAllowed=true,lowStreak=0;
  const ladder=()=>{if(dpr>1){dpr=Math.max(1,dpr-.5);stats.dpr=dpr;layout();stats.quality='dpr'+dpr}else if(dofAllowed){dofAllowed=false;bokeh.enabled=false;stats.quality='no-dof'}else if(glass.transmission>0){glass.transmission=0;glass.transparent=true;glass.opacity=.88;glass.needsUpdate=true;key.castShadow=false;stats.quality='low'}};
  function loop(now){if(start===null)start=now;clock=(now-start)/1000+offset;
    if(last){const d=now-last;acc+=d;cnt++;stats.frames++;if(acc>=1000){const fps=cnt*1000/acc;stats.samples.push(+fps.toFixed(1));acc=0;cnt=0;if(Q.has('fps')){console.log('[khem fps]',fps.toFixed(1),stats.quality,'dpr',dpr,'t',clock.toFixed(2),'replay',stats.replays||0);root.dataset.khemFps=JSON.stringify({fps:+fps.toFixed(1),quality:stats.quality,dpr,time:+clock.toFixed(2),replays:stats.replays||0,frames:stats.frames});}if(fps<45&&stats.samples.length>2){if(++lowStreak>=2){ladder();lowStreak=0}}else lowStreak=0}}
    const dt=last?Math.min(.1,(now-last)/1000):1/60;last=now;frame(clock,dt);if(clock>T_SETTLE+1)root.classList.add('done3d');if(running&&!document.hidden)requestAnimationFrame(loop);}
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&running&&!CAPTURE){last=0;requestAnimationFrame(loop)}});
  addEventListener('khem:skip',()=>{if(clock<T_SETTLE+1){offset+=T_SETTLE+1-clock}});
  addEventListener('khem:replay',()=>{
    start=null;offset=0;clock=0;last=0;acc=0;cnt=0;lowStreak=0;
    hoverK=focusK=null;foc=0;hov.fill(0);par.set(0,0,0);parT.set(0,0,0);
    word.concat(ppp).forEach(w=>{w.visible=false;w.position.copy(w.userData.src.position)});
    root.classList.remove('done3d');stats.replays=(stats.replays||0)+1;key.shadow.needsUpdate=true;frame(0);if(Q.has('fps'))root.dataset.khemFps=JSON.stringify({time:0,replays:stats.replays,dpr,quality:stats.quality});
  });
  addEventListener('pagehide',()=>{running=false;scene.traverse(o=>{o.geometry&&o.geometry.dispose();const m=o.material;if(m)(Array.isArray(m)?m:[m]).forEach(x=>{x.map&&x.map.dispose();x.dispose()})});atlas.dispose();ptex.dispose();composer.dispose&&composer.dispose();renderer.dispose();env.dispose();pm.dispose()});
  window.KhemScene={frame,stats,T_SETTLE,layout,get time(){return clock}};
  if(CAPTURE){running=false;frame(0);window.KhemReady=true;return}
  // Warm every material/postprocess variant before starting the measured timeline.
  // Keep the first visible/DOM frame at t=0; replay then reuses these GPU programs.
  frame(0,0);frame(4.8,0);frame(7,0);frame(9.2,0);key.shadow.needsUpdate=true;frame(0,0);

  requestAnimationFrame(loop);
}
