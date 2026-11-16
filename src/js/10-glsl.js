/* ============================================================
   SHADERS
   Every lit surface uses one hand-written shader: six gallery
   spotlights per room, corner occlusion, haze. The floor adds a
   planar reflection of the whole scene.
   ============================================================ */
const NL = 6;        // spotlights per room
const NC = 24;       // light cones that dust can drift through

const GL_HASH = `
float h13(vec3 p){p=fract(p*.1031);p+=dot(p,p.zyx+31.32);return fract((p.x+p.y)*p.z);}
float h12(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
float vn3(vec3 p){vec3 i=floor(p);vec3 f=fract(p);f=f*f*(3.0-2.0*f);
  return mix(mix(mix(h13(i),h13(i+vec3(1.,0.,0.)),f.x),mix(h13(i+vec3(0.,1.,0.)),h13(i+vec3(1.,1.,0.)),f.x),f.y),
             mix(mix(h13(i+vec3(0.,0.,1.)),h13(i+vec3(1.,0.,1.)),f.x),mix(h13(i+vec3(0.,1.,1.)),h13(i+vec3(1.,1.,1.)),f.x),f.y),f.z);}
float vn2(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.0-2.0*f);
  return mix(mix(h12(i),h12(i+vec2(1.,0.)),f.x),mix(h12(i+vec2(0.,1.)),h12(i+vec2(1.,1.)),f.x),f.y);}
`;

/* shared lighting: spotlights, corner occlusion, haze */
const GL_LIGHT = `
uniform vec3 uEye; uniform vec3 uLP[${NL}]; uniform vec3 uLD[${NL}]; uniform vec3 uLC[${NL}]; uniform vec2 uLK[${NL}];
uniform vec3 uAmb; uniform vec3 uEnv; uniform vec4 uRoom; uniform float uOn; uniform vec3 uFogC; uniform float uFogD;
void lights(vec3 P,vec3 N,vec3 V,float shin,out vec3 dif,out vec3 spc){
  dif=vec3(0.0); spc=vec3(0.0);
  for(int i=0;i<${NL};i++){
    vec3 L=uLP[i]-P; float d2=max(dot(L,L),1e-4); L*=inversesqrt(d2);
    float sp=smoothstep(uLK[i].x,uLK[i].y,dot(-L,uLD[i]));
    float att=sp/(1.0+0.08*d2);
    float ndl=max(dot(N,L),0.0);
    dif+=uLC[i]*(att*ndl);
    vec3 Hv=L+V; vec3 H=Hv*inversesqrt(max(dot(Hv,Hv),1e-6));
    spc+=uLC[i]*(att*ndl*pow(clamp(dot(N,H),0.0,1.0),shin));
  }
  dif*=uOn; spc*=uOn;
}
float roomAO(vec3 P){
  float dx=uRoom.z-abs(P.x); float dz=uRoom.y-abs(P.z-uRoom.x); float dy=min(P.y,uRoom.w-P.y);
  float a=min(dx,dz); float b=max(dx,dz);
  float m2=min(max(a,dy),b);
  return 1.0-0.46*exp(-max(m2,0.0)*1.7);
}
vec3 haze(vec3 c,float d){ return mix(uFogC,c,exp(-d*uFogD)); }
`;

const GL_LIT_V = `
attribute vec3 color; attribute vec3 aM;
uniform float uMir;
varying vec3 vW; varying vec3 vN; varying vec3 vC; varying vec3 vM; varying vec2 vUv;
void main(){
  vec4 wp=modelMatrix*vec4(position,1.0);
  vW=vec3(wp.x,wp.y*uMir,wp.z);
  vec3 n=normalize(mat3(modelMatrix)*normal);
  vN=vec3(n.x,n.y*uMir,n.z);
  vC=color; vM=aM; vUv=uv;
  gl_Position=projectionMatrix*viewMatrix*wp;
}`;

const GL_LIT_F = `
varying vec3 vW; varying vec3 vN; varying vec3 vC; varying vec3 vM; varying vec2 vUv;
#ifdef HAS_MAP
uniform sampler2D tMap; uniform vec3 uTint; uniform float uAlpha;
#endif
${GL_HASH}
${GL_LIGHT}
void main(){
  vec3 N=normalize(vN);
  vec3 Vv=uEye-vW; float dist=length(Vv); vec3 V=Vv/dist;
  float rough=vM.x; float metal=vM.y; float emis=vM.z;
  vec3 alb=vC; float alpha=1.0;
  #ifdef HAS_MAP
  vec4 tx=texture2D(tMap,vUv); alb=uTint; alpha=tx.a*uAlpha; rough=0.9; metal=0.0; emis=0.0;
  if(alpha<0.004) discard;
  #endif
  float n=vn3(vW*2.3)*0.6+vn3(vW*9.0)*0.4;
  alb*=1.0+(n-0.5)*0.2*rough;
  float shin=mix(260.0,5.0,sqrt(clamp(rough,0.0,1.0)));
  vec3 dif; vec3 spc; lights(vW,N,V,shin,dif,spc);
  float ao=roomAO(vW);
  vec3 amb=uAmb*(0.72+0.28*N.y)*ao*(0.22+0.78*uOn);
  vec3 f0=mix(vec3(0.04),alb,metal);
  vec3 col=alb*(1.0-metal)*(dif*ao+amb);
  col+=f0*spc*((shin+8.0)*0.04);
  vec3 R=reflect(-V,N);
  float up=smoothstep(-0.3,0.9,R.y);
  float band=pow(max(0.0,1.0-abs(R.y-0.12)*2.4),3.0);
  float fr=pow(1.0-clamp(dot(N,V),0.0,1.0),4.0);
  vec3 env=uEnv*(0.2+0.8*up+1.6*band)*uOn+uAmb*(0.22+0.78*uOn);
  col+=mix(f0,vec3(1.0),fr*(1.0-rough))*env*(1.0-rough)*(0.35+0.65*metal)*ao;
  col+=vC*emis*uOn;
  gl_FragColor=vec4(max(haze(col,dist),vec3(0.0)),alpha);
}`;

/* polished terrazzo floor with a planar reflection */
const GL_FLOOR_V = `
uniform float uMir; varying vec3 vW;
void main(){ vec4 wp=modelMatrix*vec4(position,1.0); vW=vec3(wp.x,wp.y*uMir,wp.z); gl_Position=projectionMatrix*viewMatrix*wp; }`;
const GL_FLOOR_F = `
uniform sampler2D tRefl; uniform sampler2D tReflB; uniform vec2 uRes; uniform vec3 uAlb; uniform vec3 uChip; uniform float uReflK; uniform vec4 uGlow[4]; uniform vec3 uGlowC[4];
varying vec3 vW;
${GL_HASH}
${GL_LIGHT}
void main(){
  vec3 N=vec3(0.0,1.0,0.0);
  vec3 Vv=uEye-vW; float dist=length(Vv); vec3 V=Vv/dist;
  vec2 p=vW.xz;
  float big=vn2(p*0.33)*0.6+vn2(p*1.25)*0.4;
  vec2 g=p*27.0; vec2 cell=floor(g); vec2 f=fract(g)-0.5;
  float rnd=h12(cell);
  vec2 off=(vec2(h12(cell+7.3),h12(cell+13.1))-0.5)*0.5;
  float chip=step(0.8,rnd)*(1.0-smoothstep(0.08,0.2+0.2*h12(cell+3.7),length(f-off)));
  float nearK=1.0-smoothstep(4.5,12.0,dist);
  chip*=nearK;
  vec3 alb=uAlb*(0.72+0.56*big)+uChip*chip*(0.5+0.5*h12(cell+1.9));
  vec3 dif; vec3 spc; lights(vW,N,V,60.0,dif,spc);
  float ed=min(uRoom.z-abs(vW.x),uRoom.y-abs(vW.z-uRoom.x));
  float ao=1.0-0.5*exp(-max(ed,0.0)*2.0);
  vec3 glow=vec3(0.0);
  for(int i=0;i<4;i++){ vec2 d=(p-uGlow[i].xy)/uGlow[i].zw; glow+=uGlowC[i]*exp(-dot(d,d)); }
  float nv=clamp(dot(N,V),0.0,1.0);
  float fr=0.05+0.95*pow(1.0-nv,4.0);
  vec2 suv=gl_FragCoord.xy/uRes;
  vec2 wob=(vec2(vn2(p*7.0),vn2(p*7.0+4.7))-0.5)*0.0045*nearK;
  vec3 r0=texture2D(tRefl,suv+wob).rgb; vec3 r1=texture2D(tReflB,suv+wob).rgb;
  vec3 refl=mix(r0,r1,clamp(0.3+0.5*big-chip*0.3,0.0,1.0));
  vec3 col=alb*(dif*ao+uAmb*ao*(0.22+0.78*uOn)+glow)+refl*(fr*uReflK*(0.5+0.5*ao));
  gl_FragColor=vec4(max(haze(col,dist),vec3(0.0)),1.0);
}`;

/* live screens: paintings, cabinet tubes, the phone */
const GL_SCREEN_V = `
uniform float uMir; varying vec2 vUv; varying vec3 vW;
void main(){ vUv=uv; vec4 wp=modelMatrix*vec4(position,1.0); vW=vec3(wp.x,wp.y*uMir,wp.z); gl_Position=projectionMatrix*viewMatrix*wp; }`;
const GL_SCREEN_F = `
uniform sampler2D tMap; uniform vec3 uEye; uniform vec3 uFogC; uniform float uFogD;
uniform float uGain; uniform float uHover; uniform float uTime; uniform float uPulse; uniform float uAsp; uniform float uRad; uniform float uOn; uniform float uBias; uniform vec2 uM;
varying vec2 vUv; varying vec3 vW;
float hsh(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
void main(){
  vec2 uv=vUv;
  #ifdef CRT
  vec2 cc=uv-0.5; uv=0.5+cc*(1.0+0.16*dot(cc,cc));
  #endif
  vec2 dm=uv-uM; dm.x*=uAsp; float dl=length(dm); vec2 dn=dm/(dl+1e-4);
  uv+=dn*sin(dl*30.0-uTime*6.0)*0.005*uHover*exp(-dl*4.0);
  float ring=smoothstep(0.05,0.0,abs(dl-uPulse*1.3))*(1.0-uPulse)*step(0.001,uPulse);
  uv+=dn*ring*0.018;
  vec3 c=pow(texture2D(tMap,uv,uBias).rgb,vec3(2.2))*uGain;
  c*=1.0+0.55*uHover*exp(-dl*2.6);
  c+=vec3(0.75,0.85,1.0)*ring*0.9;
  #ifdef CRT
  float sl=0.72+0.28*sin(uv.y*640.0*3.14159);
  float mk=0.86+0.14*sin(uv.x*480.0*3.14159);
  c*=sl*mk*(0.96+0.04*sin(uTime*52.0));
  c+=vec3(0.012,0.014,0.02);
  c*=smoothstep(0.0,0.03,uv.x)*smoothstep(1.0,0.97,uv.x)*smoothstep(0.0,0.03,uv.y)*smoothstep(1.0,0.97,uv.y);
  c*=1.0-0.55*dot(cc,cc)*2.0;
  #else
  vec2 q=abs((vUv-0.5)*vec2(uAsp,1.0))-vec2(uAsp,1.0)*0.5+uRad;
  float dd=length(max(q,0.0))-uRad;
  if(dd>0.0) discard;
  c+=vec3(0.006,0.007,0.010);
  #endif
  c*=mix(0.05,1.0,uOn);
  float dist=length(uEye-vW);
  gl_FragColor=vec4(mix(uFogC,c,exp(-dist*uFogD)),1.0);
}`;

/* light you can see: cones from the track heads */
const GL_CONE_V = `
varying vec3 vVN; varying vec3 vVP; varying float vH; varying vec3 vWp;
void main(){
  vH=uv.y; vec4 mv=modelViewMatrix*vec4(position,1.0); vVP=mv.xyz; vVN=normalMatrix*normal;
  vWp=(modelMatrix*vec4(position,1.0)).xyz; gl_Position=projectionMatrix*mv;
}`;
const GL_CONE_F = `
uniform vec3 uCol; uniform float uA; uniform float uTime; uniform float uOn;
varying vec3 vVN; varying vec3 vVP; varying float vH; varying vec3 vWp;
${GL_HASH}
void main(){
  float f=clamp(abs(dot(normalize(vVN),normalize(vVP))),0.0,1.0);
  float e=pow(f,2.4);
  float h=1.0-vH;
  float fall=exp(-h*2.4)*smoothstep(0.0,0.05,h)*(1.0-smoothstep(0.7,1.0,h));
  float n=0.7+0.6*vn3(vec3(vWp.x*1.4,abs(vWp.y)*0.6-uTime*0.04,vWp.z*1.4+uTime*0.03));
  gl_FragColor=vec4(uCol*(e*fall*n*uA*uOn),1.0);
}`;

/* dust that only shows inside the light */
const GL_DUST_V = `
attribute vec4 aR;
uniform float uTime; uniform float uProj; uniform float uOn; uniform vec3 uCP[${NC}]; uniform vec3 uCD[${NC}]; uniform vec2 uCK[${NC}];
varying float vA;
void main(){
  vec3 p=position;
  p.x+=sin(uTime*0.11+aR.x*40.0)*0.3; p.y+=sin(uTime*0.07+aR.y*50.0)*0.25; p.z+=cos(uTime*0.09+aR.z*30.0)*0.3;
  float lit=0.0;
  for(int i=0;i<${NC};i++){
    vec3 d=p-uCP[i]; float l=length(d)+1e-3;
    lit+=smoothstep(uCK[i].x,uCK[i].x+0.04,dot(d/l,uCD[i]))*uCK[i].y/(1.0+0.06*l*l);
  }
  vec4 mv=modelViewMatrix*vec4(p,1.0);
  float depth=max(-mv.z,0.01);
  gl_PointSize=clamp((0.009+0.013*aR.w)*uProj/depth,1.0,4.0);
  vA=(0.006+lit*uOn*0.7)*smoothstep(0.35,1.6,depth)*(1.0-smoothstep(16.0,30.0,depth))*(0.5+0.5*sin(uTime*0.9+aR.w*40.0));
  gl_Position=projectionMatrix*mv;
}`;
const GL_DUST_F = `
varying float vA;
void main(){ float r=length(gl_PointCoord-0.5)*2.0; gl_FragColor=vec4(vec3(1.0,0.93,0.82)*(vA*(1.0-smoothstep(0.2,1.0,r))),1.0); }`;

/* soft contact shadows (multiplied over what is behind them) */
const GL_UV_V = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const GL_BLOB_F = `
uniform float uA; uniform float uKind; varying vec2 vUv;
void main(){
  float a;
  if(uKind<0.5){ float r=length(vUv-0.5)*2.0; a=1.0-smoothstep(0.15,1.0,r); a*=a; }
  else { a=pow(clamp(vUv.y,0.0,1.0),1.8)*(1.0-smoothstep(0.55,1.0,abs(vUv.x-0.5)*2.0)); }
  gl_FragColor=vec4(vec3(clamp(1.0-a*uA,0.0,1.0)),1.0);
}`;

/* additive bits: neon, glow discs, holograms, glass */
const GL_ADD_F = `
uniform sampler2D tMap; uniform float uGain; uniform vec3 uTint; varying vec2 vUv;
void main(){ vec4 t=texture2D(tMap,vUv); gl_FragColor=vec4(pow(t.rgb,vec3(2.2))*uTint*(uGain*t.a),1.0); }`;
const GL_DISC_F = `
uniform vec3 uCol; uniform float uA; uniform float uRing; uniform float uTime; varying vec2 vUv;
void main(){
  float r=length(vUv-0.5)*2.0;
  float soft=(1.0-smoothstep(0.0,1.0,r))*0.3;
  float ring=smoothstep(0.035,0.0,abs(r-uRing))*step(r,1.0);
  float ring2=smoothstep(0.02,0.0,abs(r-fract(uTime*0.25)))*(1.0-fract(uTime*0.25))*0.6;
  float tk=step(0.5,fract(atan(vUv.y-0.5,vUv.x-0.5)*5.72958))*smoothstep(0.02,0.0,abs(r-0.86))*0.7;
  gl_FragColor=vec4(uCol*((soft+ring*1.6+ring2+tk)*uA),1.0);
}`;
const GL_HOLO_V = `
varying vec3 vN; varying vec3 vVP; varying vec3 vL;
void main(){ vN=normalMatrix*normal; vL=position; vec4 mv=modelViewMatrix*vec4(position,1.0); vVP=mv.xyz; gl_Position=projectionMatrix*mv; }`;
const GL_HOLO_F = `
uniform vec3 uCol; uniform float uTime; uniform float uReveal; uniform float uTop; uniform float uA;
varying vec3 vN; varying vec3 vVP; varying vec3 vL;
void main(){
  float cut=uReveal*(uTop+0.08);
  if(vL.y>cut) discard;
  float fr=pow(clamp(1.0-abs(dot(normalize(vN),normalize(vVP))),0.0,1.0),2.0);
  float sc=0.5+0.5*sin(vL.y*90.0-uTime*4.0);
  float lead=smoothstep(0.06,0.0,cut-vL.y)*step(uReveal,0.995);
  gl_FragColor=vec4(uCol*((0.05+fr*0.85+sc*0.035)*uA)+vec3(0.8,0.95,1.0)*lead*2.0,1.0);
}`;
const GL_GLASS_F = `
uniform vec3 uCol; uniform float uA;
varying vec3 vN; varying vec3 vVP; varying vec3 vL;
void main(){
  float fr=pow(clamp(1.0-abs(dot(normalize(vN),normalize(vVP))),0.0,1.0),2.6);
  gl_FragColor=vec4(uCol*((0.012+fr*0.22)*uA),1.0);
}`;
const GL_PANEL_F = `
uniform sampler2D tMap; uniform float uReveal; uniform float uTime; uniform float uAsp; uniform float uHover; varying vec2 vUv;
void main(){
  vec3 c=pow(texture2D(tMap,vUv).rgb,vec3(2.2))*(1.5+0.9*uHover)+vec3(0.012,0.014,0.02);
  vec2 q=abs((vUv-0.5)*vec2(uAsp,1.0))-vec2(uAsp,1.0)*0.5+0.04;
  float d=length(max(q,0.0))-0.04;
  if(d>0.0) discard;
  float border=smoothstep(-0.014,-0.004,d);
  c+=vec3(0.45,0.85,1.0)*border*(0.8+1.4*uHover);
  c*=0.94+0.06*sin(vUv.y*240.0+uTime*3.0);
  float edge=uReveal*1.12-(1.0-vUv.y);
  float rev=smoothstep(0.0,0.12,edge);
  if(rev<0.01) discard;
  float lead=smoothstep(0.05,0.0,abs(edge-0.03))*step(uReveal,0.98);
  gl_FragColor=vec4(c*rev+vec3(0.7,0.9,1.0)*lead*2.0,1.0);
}`;

/* ---------- virtual reality world ---------- */
const GL_SKY_V = `varying vec3 vD; void main(){ vD=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const GL_SKY_F = `
uniform float uTime; varying vec3 vD;
${GL_HASH}
void main(){
  vec3 d=normalize(vD);
  float h=d.y;
  vec3 c=mix(vec3(0.05,0.022,0.11),vec3(0.003,0.004,0.014),smoothstep(-0.05,0.55,h));
  c+=vec3(0.75,0.2,0.42)*exp(-abs(h)*9.0)*0.2;
  vec2 sp=vec2(atan(d.z,d.x)*40.0,asin(clamp(h,-1.0,1.0))*64.0);
  vec2 id=floor(sp); vec2 f=fract(sp)-0.5;
  float st=step(0.985,h12(id))*smoothstep(0.24,0.0,length(f))*step(0.02,h);
  c+=vec3(0.9,0.95,1.0)*st*(0.5+0.5*sin(uTime*2.0+h12(id+3.0)*40.0));
  vec3 md=normalize(vec3(-0.45,0.36,-0.82));
  float m=dot(d,md);
  c+=vec3(1.0,0.86,0.7)*smoothstep(0.9965,0.9972,m)*1.7;
  c+=vec3(1.0,0.5,0.4)*pow(max(m,0.0),70.0)*0.3;
  gl_FragColor=vec4(c,1.0);
}`;
const GL_SEA_V = `
uniform float uTime; varying vec3 vP; varying float vWv;
void main(){
  vec3 p=position;
  float w=sin(p.x*0.11+uTime*0.7)*0.7+sin(p.z*0.16-uTime*0.9)*0.5+sin((p.x+p.z)*0.31+uTime*1.3)*0.22;
  float k=smoothstep(11.0,26.0,length(p.xz));
  p.y+=w*k; vWv=w*k; vP=p;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
}`;
const GL_SEA_F = `
varying vec3 vP; varying float vWv;
void main(){
  float d=length(vP.xz);
  vec2 g=abs(fract(vP.xz/3.0)-0.5);
  float lw=0.012+d*0.0011;
  float line=1.0-smoothstep(lw,lw*2.2,min(g.x,g.y));
  vec3 c=mix(vec3(0.02,0.5,0.75),vec3(0.55,0.2,0.9),smoothstep(20.0,120.0,d))*line*(0.3+0.5*smoothstep(-0.5,1.0,vWv));
  c*=1.0-smoothstep(70.0,150.0,d);
  c+=vec3(0.004,0.007,0.016);
  gl_FragColor=vec4(c,1.0);
}`;
const GL_RET_F = `
uniform float uP; uniform vec3 uCol; varying vec2 vUv;
void main(){
  vec2 q=vUv-0.5; float r=length(q)*2.0;
  float a=atan(q.x,q.y)/6.2831853+0.5;
  float base=smoothstep(0.05,0.0,abs(r-0.5))*0.5+smoothstep(0.09,0.03,r);
  float prog=smoothstep(0.07,0.0,abs(r-0.84))*step(a,uP)*step(0.001,uP);
  gl_FragColor=vec4(uCol*base+vec3(0.35,1.0,0.6)*prog*2.2,1.0);
}`;

/* ---------- full-screen passes ---------- */
const GL_FS_V = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }`;
const GL_PRE_F = `
uniform sampler2D tMap; uniform vec2 uTexel; uniform float uThr; uniform float uKnee; varying vec2 vUv;
void main(){
  vec3 c=texture2D(tMap,vUv).rgb*4.0;
  c+=texture2D(tMap,vUv-uTexel).rgb+texture2D(tMap,vUv+uTexel).rgb;
  c+=texture2D(tMap,vUv+vec2(uTexel.x,-uTexel.y)).rgb+texture2D(tMap,vUv-vec2(uTexel.x,-uTexel.y)).rgb;
  c*=0.125;
  if(!(c.r>=0.0)||!(c.g>=0.0)||!(c.b>=0.0)) c=vec3(0.0);
  c=clamp(c,vec3(0.0),vec3(64.0));
  float br=max(c.r,max(c.g,c.b));
  float so=clamp(br-uThr+uKnee,0.0,2.0*uKnee); so=so*so/(4.0*uKnee+1e-4);
  c*=max(so,br-uThr)/max(br,1e-4);
  gl_FragColor=vec4(min(c,vec3(10.0)),1.0);
}`;
const GL_DOWN_F = `
uniform sampler2D tMap; uniform vec2 uTexel; varying vec2 vUv;
void main(){
  vec3 c=texture2D(tMap,vUv).rgb*4.0;
  c+=texture2D(tMap,vUv-uTexel).rgb+texture2D(tMap,vUv+uTexel).rgb;
  c+=texture2D(tMap,vUv+vec2(uTexel.x,-uTexel.y)).rgb+texture2D(tMap,vUv-vec2(uTexel.x,-uTexel.y)).rgb;
  gl_FragColor=vec4(c*0.125,1.0);
}`;
const GL_UP_F = `
uniform sampler2D tMap; uniform vec2 uTexel; uniform float uW; varying vec2 vUv;
void main(){
  vec2 h=uTexel;
  vec3 c=texture2D(tMap,vUv+vec2(-h.x*2.0,0.0)).rgb+texture2D(tMap,vUv+vec2(0.0,h.y*2.0)).rgb+texture2D(tMap,vUv+vec2(h.x*2.0,0.0)).rgb+texture2D(tMap,vUv+vec2(0.0,-h.y*2.0)).rgb;
  c+=(texture2D(tMap,vUv+vec2(-h.x,h.y)).rgb+texture2D(tMap,vUv+vec2(h.x,h.y)).rgb+texture2D(tMap,vUv+vec2(h.x,-h.y)).rgb+texture2D(tMap,vUv+vec2(-h.x,-h.y)).rgb)*2.0;
  gl_FragColor=vec4(c/12.0*uW,1.0);
}`;
const GL_COMP_F = `
uniform sampler2D tScene; uniform sampler2D tBloom; uniform vec2 uRes;
uniform float uBloom; uniform float uCA; uniform float uVig; uniform float uLens; uniform float uFade; uniform float uExp; uniform float uSV; uniform float uWarm;
varying vec2 vUv;
vec3 aces(vec3 x){return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0);}
vec3 samp(vec2 uv){vec3 s=texture2D(tScene,uv).rgb; if(!(s.r>=0.0)||!(s.g>=0.0)||!(s.b>=0.0)) s=vec3(0.0); return clamp(s,vec3(0.0),vec3(64.0))+texture2D(tBloom,uv).rgb*uBloom;}
void main(){
  vec2 uv=vUv; float mask=1.0; float asp=uRes.x/uRes.y; vec2 cc=(uv-0.5)*vec2(min(asp,1.7),1.0);
  if(uLens>0.001){
    vec2 n=uSV>1.5?vec2(1.0,1.0):vec2(2.0,1.0);
    vec2 cell=floor(uv*n); vec2 e=fract(uv*n)-0.5;
    vec2 ea=vec2(asp*n.y/n.x,1.0);
    vec2 q=e*ea; float r2=dot(q,q);
    vec2 e2=q*(1.0+uLens*(0.26*r2+0.2*r2*r2))/ea;
    if(uSV>1.5) e2/=1.0+uLens*0.0672;
    float edge=mix(1.7,0.47,uLens);
    mask=1.0-smoothstep(edge-0.014,edge,length(q));
    mask*=step(abs(e2.x),0.5)*step(abs(e2.y),0.5);
    uv=(clamp(e2,vec2(-0.5),vec2(0.5))+0.5+cell)/n;
    cc=q;
  }
  vec2 dir=cc*uCA*(0.35+dot(cc,cc)*2.2)/vec2(asp,1.0);
  vec3 col=vec3(samp(uv+dir).r,samp(uv).g,samp(uv-dir).b);
  col*=1.0-uVig*smoothstep(0.35,1.2,length(cc)*1.12);
  col=aces(col*uExp);
  float l=dot(col,vec3(0.299,0.587,0.114));
  col=mix(col,col*vec3(1.035,1.0,0.955),uWarm*smoothstep(0.1,0.9,l));
  col=mix(col,col*vec3(0.94,0.985,1.07),uWarm*(1.0-smoothstep(0.0,0.3,l)));
  col=pow(col,vec3(1.0/2.2));
  gl_FragColor=vec4(col*mask*uFade,1.0);
}`;
const GL_FXAA_F = `
uniform sampler2D tMap; uniform vec2 uTexel; uniform float uTime; uniform float uGrain; varying vec2 vUv;
float hash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
void main(){
  vec3 lw=vec3(0.299,0.587,0.114);
  vec3 cM=texture2D(tMap,vUv).rgb;
  float lNW=dot(texture2D(tMap,vUv+vec2(-1.0,-1.0)*uTexel).rgb,lw);
  float lNE=dot(texture2D(tMap,vUv+vec2(1.0,-1.0)*uTexel).rgb,lw);
  float lSW=dot(texture2D(tMap,vUv+vec2(-1.0,1.0)*uTexel).rgb,lw);
  float lSE=dot(texture2D(tMap,vUv+vec2(1.0,1.0)*uTexel).rgb,lw);
  float lM=dot(cM,lw);
  float lMin=min(lM,min(min(lNW,lNE),min(lSW,lSE)));
  float lMax=max(lM,max(max(lNW,lNE),max(lSW,lSE)));
  vec2 dir=vec2(-((lNW+lNE)-(lSW+lSE)),((lNW+lSW)-(lNE+lSE)));
  float red=max((lNW+lNE+lSW+lSE)*0.03125,0.0078125);
  float rcp=1.0/(min(abs(dir.x),abs(dir.y))+red);
  dir=clamp(dir*rcp,vec2(-8.0),vec2(8.0))*uTexel;
  vec3 a=0.5*(texture2D(tMap,vUv+dir*(1.0/3.0-0.5)).rgb+texture2D(tMap,vUv+dir*(2.0/3.0-0.5)).rgb);
  vec3 b=a*0.5+0.25*(texture2D(tMap,vUv-dir*0.5).rgb+texture2D(tMap,vUv+dir*0.5).rgb);
  float lB=dot(b,lw);
  vec3 col=(lB<lMin||lB>lMax)?a:b;
  col+=(hash(vUv/uTexel+fract(uTime)*91.7)-0.5)*uGrain;
  gl_FragColor=vec4(col,1.0);
}`;
