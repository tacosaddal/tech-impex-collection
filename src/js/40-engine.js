/* ============================================================
   ENGINE: renderer, mirrored floor pass, HDR bloom, lens, FXAA
   ============================================================ */
let renderer, HDR = false, GL2 = false, rtScene, rtRefl, rtReflB, rtReflC, rtLDR, bloom = [], fsScene, fsCam, fsMesh, scene, root, camera, vrScene;
const MAT = {};
const U = {
  uEye: { value: null }, uMir: { value: 1 }, uTime: { value: 0 }, uFogC: { value: null }, uFogD: { value: 0.0052 },
  uRes: { value: null }, tRefl: { value: null }, tReflB: { value: null }, uProj: { value: 800 }
};
const CAMB = { pos: null, tgt: null, fov: 44, sx: 0, sy: 0, yaw: 0, pitch: 0, ipd: 0.3 };   // camera state computed by the walk
const VRC = { yaw: 0, pitch: 0, ty: 0, tp: 0 };
const FX = { fade: 1, exp: 1.0 };
const RSZ = { w: 0, h: 0, d: 0 };            // what the render targets were last built for

function makeRT(w, h, depth, ldr) {
  const rt = new THREE.WebGLRenderTarget(w, h, {
    type: (HDR && !ldr) ? THREE.HalfFloatType : THREE.UnsignedByteType, format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: !!depth, stencilBuffer: !!depth   // depth + stencil gives a 24-bit depth buffer
  });
  rt.texture.generateMipmaps = false;
  return rt;
}
/* 4x multisampling on desktop when the GPU proves it can resolve it; otherwise a plain target (FXAA still runs) */
function makeSceneRT(W, H) {
  if (S.msaa) {
    try {
      const gl = renderer.getContext();
      const rt = new THREE.WebGLMultisampleRenderTarget(W, H, { type: HDR ? THREE.HalfFloatType : THREE.UnsignedByteType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true, stencilBuffer: true });
      rt.samples = 4; rt.texture.generateMipmaps = false;
      let n = 0; while (gl.getError() && n++ < 8) {}
      renderer.setRenderTarget(rt); renderer.clear(true, true, true);
      const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      fsMesh.material = MAT.down; MAT.down.uniforms.tMap.value = null;
      if (ok) renderer.render(fsScene, fsCam);
      renderer.setRenderTarget(null);
      if (ok && !gl.getError()) return rt;
      rt.dispose();
    } catch (e) {}
    S.msaa = false;
  }
  return makeRT(W, H, true);
}

function initGL() {
  if (!window.THREE) return false;
  const canvas = $('#gl');
  if (DBG && DBG.nogl) return false;
  try {
    const o = { canvas, antialias: false, alpha: false, powerPreference: 'high-performance', stencil: false };
    if (DBG && DBG.gl1) o.context = canvas.getContext('webgl', { antialias: false, alpha: false, stencil: false });
    renderer = new THREE.WebGLRenderer(o);
  } catch (e) { return false; }
  const cap = renderer.capabilities, ext = renderer.extensions;
  GL2 = cap.isWebGL2;
  HDR = GL2 ? !!(ext.get('EXT_color_buffer_float') || ext.get('EXT_color_buffer_half_float'))
    : !!(ext.get('OES_texture_half_float') && ext.get('OES_texture_half_float_linear') && ext.get('EXT_color_buffer_half_float'));
  if (DBG && DBG.ldr) HDR = false;
  renderer.autoClear = false;
  renderer.setClearColor(0x000000, 1);

  S.tier = (window.__Q !== undefined) ? window.__Q : ((TOUCH || Math.min(S.w, S.h) < 620) ? 0 : 1);
  S.dpr = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt((S.tier ? 3.4e6 : 1.7e6) / Math.max(1, S.w * S.h)));
  if (DBG && DBG.dpr) S.dpr = DBG.dpr;
  S.msaa = GL2 && HDR && S.tier === 1 && (!DBG || !!DBG.msaa);
  S.rq = 1;                                  // floor reflection: 1 = half resolution, 2 = quarter, 3 = none (the last resort on a slow GPU)

  CAMB.pos = new THREE.Vector3(0, 1.62, 3.4); CAMB.tgt = new THREE.Vector3(0, 2.2, -30);
  U.uEye.value = new THREE.Vector3(); U.uFogC.value = new THREE.Vector3(0.010, 0.010, 0.014); U.uRes.value = new THREE.Vector2(2, 2);
  scene = new THREE.Scene(); root = new THREE.Group(); scene.add(root);
  vrScene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(44, S.w / S.h, 0.12, 170);
  camera.layers.enable(1);
  fsScene = new THREE.Scene();
  fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const tri = new THREE.BufferGeometry();
  tri.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  tri.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
  fsMesh = new THREE.Mesh(tri, null); fsMesh.frustumCulled = false; fsScene.add(fsMesh);

  const fsm = (frag, uniforms, add) => new THREE.ShaderMaterial({
    uniforms, vertexShader: GL_FS_V, fragmentShader: frag, depthTest: false, depthWrite: false,
    blending: add ? THREE.AdditiveBlending : THREE.NoBlending
  });
  const V2 = () => new THREE.Vector2();
  MAT.pre = fsm(GL_PRE_F, { tMap: { value: null }, uTexel: { value: V2() }, uThr: { value: HDR ? 0.92 : 0.6 }, uKnee: { value: 0.5 } });
  MAT.down = fsm(GL_DOWN_F, { tMap: { value: null }, uTexel: { value: V2() } });
  MAT.up = fsm(GL_UP_F, { tMap: { value: null }, uTexel: { value: V2() }, uW: { value: 1 } }, true);
  MAT.comp = fsm(GL_COMP_F, {
    tScene: { value: null }, tBloom: { value: null }, uRes: { value: V2() },
    uBloom: { value: 0.34 }, uCA: { value: 0.0011 }, uVig: { value: 0.5 }, uLens: { value: 0 }, uFade: { value: 1 }, uExp: { value: 1.0 }, uSV: { value: 0 }, uWarm: { value: 1 }
  });
  MAT.fxaa = fsm(GL_FXAA_F, { tMap: { value: null }, uTexel: { value: V2() }, uTime: U.uTime, uGrain: { value: 0.028 } });

  resizeGL();
  return true;
}

function resizeGL() {
  if (!renderer) return;
  const w = S.w, h = S.h;
  RSZ.w = w; RSZ.h = h; RSZ.d = S.dpr;
  renderer.setPixelRatio(S.dpr); renderer.setSize(w, h, false);
  const W = Math.max(2, Math.floor(w * S.dpr)), H = Math.max(2, Math.floor(h * S.dpr));
  [rtScene, rtRefl, rtReflB, rtReflC, rtLDR].forEach(r => { if (r) r.dispose(); });
  bloom.forEach(b => b.dispose()); bloom = [];
  rtScene = makeSceneRT(W, H);
  rtLDR = makeRT(W, H, false, true);
  const rs = Math.min(S.rq, 2), rw = Math.max(2, W >> rs), rh = Math.max(2, H >> rs);
  rtRefl = makeRT(rw, rh, true); rtReflB = makeRT(Math.max(2, rw >> 1), Math.max(2, rh >> 1), false);
  rtReflC = rs > 1 ? null : makeRT(Math.max(2, rw >> 2), Math.max(2, rh >> 2), false);       // the soft copy is an eighth of the screen either way
  let bw = W, bh = H; const L = S.tier ? 6 : 5;
  for (let i = 0; i < L; i++) { bw = Math.max(2, bw >> 1); bh = Math.max(2, bh >> 1); bloom.push(makeRT(bw, bh, false)); }
  U.uRes.value.set(W, H); U.tRefl.value = rtRefl.texture; U.tReflB.value = (rtReflC || rtReflB).texture;
  MAT.comp.uniforms.uRes.value.set(W, H); MAT.fxaa.uniforms.uTexel.value.set(1 / W, 1 / H);
}

function setVP(rt, x, y, w, h, sc) { rt.viewport.set(x, y, w, h); rt.scissor.set(x, y, w, h); rt.scissorTest = sc; }
function pass(m, target) { fsMesh.material = m; renderer.setRenderTarget(target); renderer.render(fsScene, fsCam); }

function camWalk(aspect) {
  camera.fov = CAMB.fov; camera.aspect = aspect;
  camera.position.copy(CAMB.pos); camera.up.set(0, 1, 0); camera.lookAt(CAMB.tgt);
  camera.rotateY(CAMB.yaw); camera.rotateX(CAMB.pitch);
  if (Math.abs(CAMB.sx) > 1e-4 || Math.abs(CAMB.sy) > 1e-4) camera.setViewOffset(S.w, S.h, -CAMB.sx * S.w, CAMB.sy * S.h, S.w, S.h);
  else camera.clearViewOffset();
  camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
}
const _vrE = { e: null, r: null };
function camVR(eye, aspect) {
  if (!_vrE.e) { _vrE.e = new THREE.Euler(0, 0, 0, 'YXZ'); _vrE.r = new THREE.Vector3(); }
  camera.fov = LAY.p ? lerp(64, 80, S.lens) : (S.lens > 0.02 ? 82 : 64); camera.aspect = aspect; camera.clearViewOffset();
  _vrE.e.set(VRC.pitch, VRC.yaw, 0); camera.quaternion.setFromEuler(_vrE.e);
  camera.position.set(0, 1.72, 0);
  if (eye) { _vrE.r.set(1, 0, 0).applyQuaternion(camera.quaternion); camera.position.addScaledVector(_vrE.r, eye * CAMB.ipd * 0.5); }
  camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
}

function renderWalk() {
  const W = rtScene.width, H = rtScene.height;
  camWalk(W / H);
  const pj = 1 / (2 * Math.tan(camera.fov * Math.PI / 360));
  /* 1. the room, mirrored in the floor (half resolution) */
  if (S.rq < 3) {
    U.uMir.value = -1; U.uEye.value.set(camera.position.x, -camera.position.y, camera.position.z);
    U.uProj.value = rtRefl.height * pj;
    root.scale.y = -1; camera.layers.set(0);
    setVP(rtRefl, 0, 0, rtRefl.width, rtRefl.height, false);
    renderer.setRenderTarget(rtRefl); renderer.clear(true, true, true); renderer.render(scene, camera);
    root.scale.y = 1; camera.layers.enable(1);
    MAT.down.uniforms.tMap.value = rtRefl.texture; MAT.down.uniforms.uTexel.value.set(1 / rtRefl.width, 1 / rtRefl.height); pass(MAT.down, rtReflB);
  }
  if (rtReflC) { MAT.down.uniforms.tMap.value = rtReflB.texture; MAT.down.uniforms.uTexel.value.set(1 / rtReflB.width, 1 / rtReflB.height); pass(MAT.down, rtReflC); }
  /* 2. the room itself */
  U.uMir.value = 1; U.uEye.value.copy(camera.position); U.uProj.value = H * pj;
  setVP(rtScene, 0, 0, W, H, false);
  renderer.setRenderTarget(rtScene); renderer.clear(true, true, true); renderer.render(scene, camera);
}

function renderVR() {
  const W = rtScene.width, H = rtScene.height, mono = LAY.p;     // upright screens get one big lens instead of a pair
  setVP(rtScene, 0, 0, W, H, false);
  renderer.setRenderTarget(rtScene); renderer.clear(true, true, true);
  MAT.comp.uniforms.uSV.value = mono ? 2 : 0;
  if (mono || S.lens <= 0.02) { camVR(0, W / H); renderer.render(vrScene, camera); return; }
  const hw = Math.floor(W / 2);
  for (let e = 0; e < 2; e++) {
    setVP(rtScene, e * hw, 0, hw, H, true); camVR(e ? 1 : -1, hw / H);
    renderer.setRenderTarget(rtScene); renderer.render(vrScene, camera);
  }
  setVP(rtScene, 0, 0, W, H, false);
}

function renderGL() {
  U.uTime.value = S.time;
  if (S.mode === 'vr') renderVR(); else renderWalk();
  let src = rtScene;
  for (let i = 0; i < bloom.length; i++) {
    const m = i ? MAT.down : MAT.pre;
    m.uniforms.tMap.value = src.texture; m.uniforms.uTexel.value.set(1 / src.width, 1 / src.height);
    pass(m, bloom[i]); src = bloom[i];
  }
  for (let i = bloom.length - 2; i >= 0; i--) {
    const s2 = bloom[i + 1];
    MAT.up.uniforms.tMap.value = s2.texture; MAT.up.uniforms.uTexel.value.set(0.6 / s2.width, 0.6 / s2.height);
    pass(MAT.up, bloom[i]);
  }
  const c = MAT.comp.uniforms;
  c.tScene.value = rtScene.texture; c.tBloom.value = bloom[0].texture;
  c.uLens.value = S.mode === 'vr' ? S.lens : 0; c.uFade.value = FX.fade; c.uExp.value = FX.exp;
  c.uWarm.value = S.mode === 'vr' ? 0 : 1; c.uVig.value = S.mode === 'vr' ? 0.25 : 0.5;
  pass(MAT.comp, rtLDR);
  MAT.fxaa.uniforms.tMap.value = rtLDR.texture;
  pass(MAT.fxaa, null);
}

/* What a frame really costs. Timing between screen refreshes cannot tell a slow GPU from a screen (or a phone in power
   saving) that only refreshes 30 times a second, so this draws frames and waits for the GPU to finish them. */
const _px = new Uint8Array(4);
function frameCost(n) {
  const gl = renderer.getContext(), sync = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, _px);
  renderGL(); sync();
  const t0 = performance.now(); for (let i = 0; i < n; i++) renderGL(); sync();
  return (performance.now() - t0) / n;
}
/* quality steps, gentlest first: multisampling off, pixels down to one per CSS pixel, a smaller floor reflection,
   fewer pixels still, and last of all no reflection */
function stepDown(ms, goal) {
  const k = Math.max(0.62, Math.sqrt(goal / ms));
  if (S.msaa) S.msaa = false;
  else if (S.dpr > 1) S.dpr = Math.max(1, S.dpr * k);
  else if (S.rq === 1) S.rq = 2;
  else if (S.dpr > 0.7) S.dpr = Math.max(0.7, S.dpr * k);
  else if (S.rq === 2 && ms > goal * 1.6) S.rq = 3;
  else return false;
  resizeGL(); return true;
}
/* before the doors open: pick a level this GPU can hold */
function calibrate() {
  if (DBG && !DBG.cal) return;
  try {
    let ms = frameCost(3), n = 0;
    while (ms > 14 && n++ < 8 && stepDown(ms, 12)) ms = frameCost(3);
    S.calMs = ms;
  } catch (e) {}
}
/* afterwards: if frames come slowly, measure, and only step down when the GPU is what is holding them up */
let _fa = 0, _fn = 0, _low = 0, _warm = 0;
function adaptQuality(rawDt) {
  if ((DBG && !DBG.adapt) || !S.ready) return;
  _warm += rawDt; if (_warm < 3.5) return;
  _fa += Math.min(rawDt, 0.25); _fn++;                 // one long stall (a tab switch) should not count as thirty slow frames
  if (_fn < 36) return;
  const avg = _fa / _fn; _fa = 0; _fn = 0;
  if (avg <= 1 / 38) { _low = 0; return; }
  if (++_low < 2) return;
  _low = 0;
  try {
    const ms = frameCost(1); S.costMs = ms;
    if (ms < 13 || !stepDown(ms, 11)) _warm = -8;      // the GPU has room to spare (or there is nothing left to give up): look again later
  } catch (e) { _warm = -30; }
}

/* ---------- geometry helpers ---------- */
const lin = (hex, k = 1) => { const n = parseInt(hex.slice(1), 16); return new THREE.Color(Math.pow((n >> 16 & 255) / 255, 2.2) * k, Math.pow((n >> 8 & 255) / 255, 2.2) * k, Math.pow((n & 255) / 255, 2.2) * k); };
function TRS(x, y, z, ry = 0, rx = 0, rz = 0, s = 1) {
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), new THREE.Vector3(s, s, s));
}
/* collects many small parts into one mesh; colour and finish ride along as vertex data */
function Builder() { this.p = []; this.n = []; this.c = []; this.m = []; this.u = []; }
Builder.prototype.add = function (geo, mat4, col, rough, metal, emis) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  if (mat4) g.applyMatrix4(mat4);
  const P = g.attributes.position.array, N = g.attributes.normal.array, T = g.attributes.uv ? g.attributes.uv.array : null, n = P.length / 3;
  for (let i = 0; i < n; i++) {
    this.p.push(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); this.n.push(N[i * 3], N[i * 3 + 1], N[i * 3 + 2]);
    this.c.push(col.r, col.g, col.b); this.m.push(rough === undefined ? 0.8 : rough, metal || 0, emis || 0);
    this.u.push(T ? T[i * 2] : 0, T ? T[i * 2 + 1] : 0);
  }
  g.dispose();
  return this;
};
Builder.prototype.build = function () {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
  g.setAttribute('aM', new THREE.Float32BufferAttribute(this.m, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
  this.p = this.n = this.c = this.m = this.u = null;
  return g;
};
const _I4 = () => new THREE.Matrix4();
function bx(b, M, w, h, d, x, y, z, col, rough, metal, emis, ry) {
  const m = (M || _I4()).clone().multiply(TRS(x, y, z, ry || 0));
  return b.add(new THREE.BoxGeometry(w, h, d), m, col, rough, metal, emis);
}
function cyl(b, M, rt, rb, h, x, y, z, col, rough, metal, emis, seg, rx, rz) {
  const m = (M || _I4()).clone().multiply(TRS(x, y, z, 0, rx || 0, rz || 0));
  return b.add(new THREE.CylinderGeometry(rt, rb, h, seg || 24), m, col, rough, metal, emis);
}
function rrShape(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
/* plain merge (position + normal) for the unlit hologram models */
function mergeGeos(list) {
  const pos = [], nor = [];
  list.forEach(([geo, m]) => {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (m) g.applyMatrix4(m);
    const P = g.attributes.position.array, N = g.attributes.normal.array;
    for (let i = 0; i < P.length; i++) { pos.push(P[i]); nor.push(N[i]); }
  });
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return out;
}
const hdrc = (hex, k = 1) => lin(hex, k);
