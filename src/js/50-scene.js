/* ============================================================
   THE BUILDING: six rooms in a row (an enfilade), each with its
   own paint, track lighting and floor. Everything is geometry
   made here; there are no model or image files.
   ============================================================ */
const RW = 13, RD = 12, RH = 6.2, DW = 3.2, DH = 4.4, WT = 0.6, HW = RW / 2;
const ROOMS = [
  { key: 'foyer', num: '', name: 'Foyer', wall: '#2b2b33', ui: '#f1ede4', gain: 1 },
  { key: 'play', num: 'I', name: 'Play', wall: '#8a1722', ui: '#ff7381', gain: 1 },
  { key: 'spatial', num: 'II', name: 'Spatial', wall: '#0d5b69', ui: '#58e3ea', gain: 1.25 },
  { key: 'systems', num: 'III', name: 'Systems', wall: '#1d3091', ui: '#94a6ff', gain: 1.1 },
  { key: 'apps', num: 'IV', name: 'Apps', wall: '#b87619', ui: '#ffc861', gain: 0.62 },
  { key: 'commission', num: 'V', name: 'Commission', wall: '#e9e6df', ui: '#17171b', gain: 0.5 }
];
const zc = k => -k * RD;
const SC = { rooms: [], screens: [], hits: [], cones: [], coneN: 0, dust: null, dustU: null, planeGeo: null, decals: [], si: 0, neon: null };
const WARM = '#ffdcb0', BRASS = '#b08a4f';

function addSpot(r, px, py, pz, tx, ty, tz, inten, ang, o) {
  o = o || {};
  const i = r.L.n++; if (i >= NL) return;
  const hex = o.col || WARM, p = r.L.p[i].set(px, py, pz), d = r.L.d[i].set(tx - px, ty - py, tz - pz), len = d.length(); d.normalize();
  const c = lin(hex, inten * r.gain); r.L.c[i].set(c.r, c.g, c.b);
  const a = ang * Math.PI / 180, soft = o.soft === undefined ? 0.5 : o.soft;
  r.L.k[i].set(Math.cos(a), Math.cos(a * (1 - soft)));
  /* the fitting: a can on a stem, with a lit rim so it reads from any side */
  const M = new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), d), new THREE.Vector3(1, 1, 1));
  const black = lin('#060607');
  cyl(r.b, M, 0.058, 0.066, 0.2, 0, 0.07, 0, black, 0.45, 0.7, 0, 14);
  cyl(r.b, M, 0.066, 0.066, 0.016, 0, -0.038, 0, lin(hex, 9), 0.5, 0, 1, 14);
  const sx = px - d.x * 0.07, sy = py - d.y * 0.07, sz = pz - d.z * 0.07, sh = Math.max(0.02, RH - sy);
  bx(r.b, null, 0.018, sh, 0.018, sx, sy + sh / 2, sz, black, 0.5, 0.6);
  if (o.cone) {
    const L = len * (o.coneLen || 1.02), g = new THREE.CylinderGeometry(0.05, 0.05 + L * Math.tan(a * 0.86), L, 40, 1, true);
    const m = new THREE.Mesh(g, new THREE.ShaderMaterial({
      uniforms: { uCol: { value: lin(hex) }, uA: { value: o.cone === true ? 0.085 : o.cone }, uTime: U.uTime, uOn: r.on },
      vertexShader: GL_CONE_V, fragmentShader: GL_CONE_F, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide
    }));
    m.position.copy(p).addScaledVector(d, L / 2); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), d); m.renderOrder = 5; root.add(m);
    SC.cones.push(m);
  }
  if (o.dust !== false && SC.coneN < NC) {
    const j = SC.coneN++; SC.dustU.uCP.value[j].copy(p); SC.dustU.uCD.value[j].copy(d); SC.dustU.uCK.value[j].set(Math.cos(a * 0.9), inten * r.gain * 0.11);
  }
}

function blob(M, w, h, a, kind, layer) {
  const m = new THREE.Mesh(SC.planeGeo, new THREE.ShaderMaterial({
    uniforms: { uA: { value: a }, uKind: { value: kind || 0 } }, vertexShader: GL_UV_V, fragmentShader: GL_BLOB_F,
    blending: THREE.MultiplyBlending, transparent: true, depthWrite: false
  }));
  m.applyMatrix4(M); m.scale.set(w, h, 1); m.renderOrder = 1; if (layer) m.layers.set(1); root.add(m); return m;
}
const floorBlob = (x, z, w, d, a) => blob(TRS(x, 0.012, z, 0, -Math.PI / 2), w, d, a, 0, true);

function mkScreen(pw, ph, draw, o) {
  o = o || {};
  const cv = document.createElement('canvas'); cv.width = pw; cv.height = ph;
  const ctx = cv.getContext('2d'), k = kit(ctx), tex = new THREE.CanvasTexture(cv);
  tex.generateMipmaps = GL2 && !o.crt; tex.minFilter = tex.generateMipmaps ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const u = {
    tMap: { value: tex }, uEye: U.uEye, uMir: U.uMir, uFogC: U.uFogC, uFogD: U.uFogD, uGain: { value: o.gain || 1.36 }, uHover: { value: 0 }, uTime: U.uTime,
    uPulse: { value: 0 }, uBias: { value: o.crt ? 0 : -0.75 }, uAsp: { value: o.asp || pw / ph }, uRad: { value: o.rad === undefined ? 0.004 : o.rad }, uOn: { value: 1 }, uM: { value: new THREE.Vector2(0.5, 0.5) }
  };
  const mat = new THREE.ShaderMaterial({ uniforms: u, vertexShader: GL_SCREEN_V, fragmentShader: GL_SCREEN_F, defines: o.crt ? { CRT: '' } : {} });
  const s = { cv, ctx, k, tex, mat, u, draw, room: o.room || 0, acc: 9, fps: o.fps || 12, th: 0, pulse: 0, t0: Math.random() * 9, always: !!o.always };
  SC.screens.push(s); return s;
}
const scrDraw = i => (s, t) => { s.ctx.setTransform(s.cv.width / 360, 0, 0, s.cv.height / 240, 0, 0); SCREENS[i](s.k, t); };
const covDraw = type => (s, t) => { s.ctx.setTransform(s.cv.width / 160, 0, 0, s.cv.height / 200, 0, 0); coverArt(s.k, type, t); };

/* a framed work on a wall. M places it: local +Z points into the room */
function painting(r, M, w, h, scr, id) {
  const b = r.b, f = 0.045, dep = 0.085, brass = lin(BRASS);
  bx(b, M, w + f * 2, f, dep, 0, h / 2 + f / 2, dep / 2, brass, 0.46, 1);
  bx(b, M, w + f * 2, f, dep, 0, -h / 2 - f / 2, dep / 2, brass, 0.46, 1);
  bx(b, M, f, h, dep, -w / 2 - f / 2, 0, dep / 2, brass, 0.46, 1);
  bx(b, M, f, h, dep, w / 2 + f / 2, 0, dep / 2, brass, 0.46, 1);
  bx(b, M, w, h, 0.04, 0, 0, 0.03, lin('#030304'), 0.6);
  bx(b, M, 0.25, 0.16, 0.012, w / 2 + 0.46, -h / 2 + 0.2, 0.006, lin('#96948d'), 0.9);          // the little wall label
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), scr.mat);
  mesh.applyMatrix4(M.clone().multiply(TRS(0, 0, 0.066))); root.add(mesh);
  blob(M.clone().multiply(TRS(0, -h / 2 - f - 0.33, 0.005)), w + 0.5, 0.66, 0.42, 1);
  if (id) SC.hits.push({ mesh, id, scr });
  return mesh;
}
const onLeft = (y, z) => TRS(-HW, y, z, Math.PI / 2), onRight = (y, z) => TRS(HW, y, z, -Math.PI / 2);

function bench(r, x, z, ry) {
  const M = TRS(x, 0, z, ry || 0), leather = lin('#1a1512'), steel = lin('#0c0c0e');
  bx(r.b, M, 1.9, 0.1, 0.52, 0, 0.43, 0, leather, 0.55);
  bx(r.b, M, 0.05, 0.38, 0.46, -0.8, 0.19, 0, steel, 0.35, 0.8); bx(r.b, M, 0.05, 0.38, 0.46, 0.8, 0.19, 0, steel, 0.35, 0.8);
  blob(M.clone().multiply(TRS(0, 0.012, 0, 0, -Math.PI / 2)), 2.5, 1.1, 0.6, 0, true);
}

/* ---------- arcade cabinet (front faces local +Z) ---------- */
function cabinet(r, M, o) {
  const b = r.b, body = lin('#0c0d11'), side = lin(o.col);
  const P = [[-0.42, 0], [0.36, 0], [0.36, 0.84], [0.5, 0.96], [0.5, 1.01], [0.24, 1.07], [0.10, 1.72], [0.38, 1.76], [0.38, 1.97], [-0.42, 1.97]];
  const sh = new THREE.Shape(); P.forEach((p, i) => (i ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1]))); sh.closePath();
  const eg = new THREE.ExtrudeGeometry(sh, { depth: 0.035, bevelEnabled: false }), rot = new THREE.Matrix4().makeRotationY(-Math.PI / 2);
  b.add(eg, M.clone().multiply(new THREE.Matrix4().makeTranslation(0.36, 0, 0)).multiply(rot), side, 0.4, 0);
  b.add(eg, M.clone().multiply(new THREE.Matrix4().makeTranslation(-0.325, 0, 0)).multiply(rot), side, 0.4, 0);
  const skin = (i, j, col, rough, metal, emis) => {
    const a = P[i], c = P[j], dz = c[0] - a[0], dy = c[1] - a[1], len = Math.hypot(dz, dy);
    const B = new THREE.Matrix4().makeBasis(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, dy / len, dz / len), new THREE.Vector3(0, -dz / len, dy / len));
    B.setPosition(0, (a[1] + c[1]) / 2, (a[0] + c[0]) / 2);
    const MB = M.clone().multiply(B);
    if (col) b.add(new THREE.PlaneGeometry(0.65, len), MB, col, rough, metal, emis);
    return MB;
  };
  skin(1, 2, body, 0.4); skin(2, 3, body, 0.5); skin(3, 4, lin('#2a2c33'), 0.3, 0.8);
  const cp = skin(4, 5, lin('#15171c'), 0.25), sc = skin(5, 6, lin('#050506'), 0.3);
  skin(6, 7, lin('#fff0d8', 1.5), 0.5, 0, 1);
  const mq = skin(7, 8, body, 0.4); skin(8, 9, body, 0.5); skin(9, 0, body, 0.6);
  /* controls */
  const steel = lin('#9a9ca3');
  cyl(b, cp, 0.011, 0.011, 0.085, -0.15, 0, 0.042, steel, 0.25, 1, 0, 10, Math.PI / 2);
  b.add(new THREE.SphereGeometry(0.033, 16, 12), cp.clone().multiply(TRS(-0.15, 0, 0.095)), lin('#e3262e'), 0.18, 0);
  ['#ffd23d', '#35e0ff', '#f3efe6'].forEach((c, i) => cyl(b, cp, 0.025, 0.025, 0.016, 0.03 + i * 0.085, (i % 2) * 0.03 - 0.015, 0.008, lin(c, 1.6), 0.3, 0, 0.5, 14, Math.PI / 2));
  /* coin door and trim */
  bx(b, M, 0.24, 0.32, 0.012, 0, 0.42, 0.366, lin('#191b21'), 0.3, 0.8);
  bx(b, M, 0.03, 0.06, 0.004, -0.05, 0.47, 0.374, lin('#ff3b2f', 5), 0.5, 0, 1); bx(b, M, 0.03, 0.06, 0.004, 0.05, 0.47, 0.374, lin('#ff3b2f', 5), 0.5, 0, 1);
  [-1, 1].forEach(sx => { bx(b, M, 0.004, 0.11, 0.66, sx * 0.3625, 1.38, -0.06, lin('#f3efe6'), 0.5); bx(b, M, 0.004, 0.035, 0.66, sx * 0.3625, 1.27, -0.06, body, 0.5); bx(b, M, 0.004, 0.035, 0.66, sx * 0.3625, 0.3, -0.03, body, 0.5); });
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.47, 0.61), o.scr.mat); scr.applyMatrix4(sc.clone().multiply(TRS(0, 0, 0.004))); root.add(scr);
  const mar = new THREE.Mesh(new THREE.PlaneGeometry(0.63, 0.185), o.marquee.mat); mar.applyMatrix4(mq.clone().multiply(TRS(0, 0, 0.004))); root.add(mar);
  blob(M.clone().multiply(TRS(0, 0.012, 0.05, 0, -Math.PI / 2)), 1.5, 1.7, 0.78, 0, true);
  return { scr, sc };
}

/* ---------- rooms ---------- */
function buildRoom(k) {
  const d = ROOMS[k], z0 = zc(k), zf = z0 - RD / 2, zn = z0 + RD / 2, wall = lin(d.wall), white = k === 5;
  const r = {
    k, d, zc: z0, b: new Builder(), on: { value: 0 }, gain: d.gain,
    L: { n: 0, p: [], d: [], c: [], k: [] }, glow: [], glowC: []
  };
  for (let i = 0; i < NL; i++) { r.L.p.push(new THREE.Vector3(0, 9, z0)); r.L.d.push(new THREE.Vector3(0, -1, 0)); r.L.c.push(new THREE.Vector3()); r.L.k.push(new THREE.Vector2(2, 3)); }
  for (let i = 0; i < 4; i++) { r.glow.push(new THREE.Vector4(0, 0, 1, 1)); r.glowC.push(new THREE.Vector3()); }
  r.amb = white ? new THREE.Vector3(0.2, 0.196, 0.186) : new THREE.Vector3(wall.r * 0.17 + 0.013, wall.g * 0.17 + 0.013, wall.b * 0.17 + 0.016);
  r.env = white ? new THREE.Vector3(0.5, 0.49, 0.46) : new THREE.Vector3(wall.r * 0.9 + 0.03, wall.g * 0.9 + 0.03, wall.b * 0.9 + 0.035);
  const base = {
    uEye: U.uEye, uMir: U.uMir, uFogC: U.uFogC, uFogD: U.uFogD, uLP: { value: r.L.p }, uLD: { value: r.L.d }, uLC: { value: r.L.c }, uLK: { value: r.L.k },
    uAmb: { value: r.amb }, uEnv: { value: r.env }, uRoom: { value: new THREE.Vector4(z0, RD / 2 - WT / 2, HW, RH) }, uOn: r.on
  };
  r.base = base;
  r.mLit = new THREE.ShaderMaterial({ uniforms: base, vertexShader: GL_LIT_V, fragmentShader: GL_LIT_F });
  r.mFloor = new THREE.ShaderMaterial({
    uniforms: Object.assign({
      tRefl: U.tRefl, tReflB: U.tReflB, uRes: U.uRes, uAlb: { value: white ? lin('#a9a69f') : lin('#1b1b20') }, uChip: { value: white ? lin('#ffffff', 0.22) : lin('#b9b4a8', 0.085) },
      uReflK: { value: white ? 0.5 : 0.9 }, uGlow: { value: r.glow }, uGlowC: { value: r.glowC }
    }, base), vertexShader: GL_FLOOR_V, fragmentShader: GL_FLOOR_F
  });
  r.decal = (tex, tint) => new THREE.ShaderMaterial({
    uniforms: Object.assign({ tMap: { value: tex }, uTint: { value: tint }, uAlpha: { value: 1 } }, base), defines: { HAS_MAP: '' },
    vertexShader: GL_LIT_V, fragmentShader: GL_LIT_F, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2
  });

  const b = r.b, ceil = white ? lin('#cfccc5') : lin('#0b0b0d'), gap = white ? lin('#6e6c67') : lin('#020203');
  bx(b, null, 0.3, RH, RD, -HW - 0.15, RH / 2, z0, wall, 0.93); bx(b, null, 0.3, RH, RD, HW + 0.15, RH / 2, z0, wall, 0.93);
  bx(b, null, RW + 0.6, 0.3, RD, 0, RH + 0.15, z0, ceil, 0.95);
  if (!white) { bx(b, null, 0.012, 0.07, RD - WT, -HW + 0.006, 0.035, z0, gap, 1); bx(b, null, 0.012, 0.07, RD - WT, HW - 0.006, 0.035, z0, gap, 1); }
  const slab = (zm, door) => {
    if (!door) { bx(b, null, RW, RH, WT / 2, 0, RH / 2, zm, wall, 0.93); return; }
    const sw = HW - DW / 2;
    bx(b, null, sw, RH, WT / 2, -(HW + DW / 2) / 2, RH / 2, zm, wall, 0.93); bx(b, null, sw, RH, WT / 2, (HW + DW / 2) / 2, RH / 2, zm, wall, 0.93);
    bx(b, null, DW, RH - DH, WT / 2, 0, DH + (RH - DH) / 2, zm, wall, 0.93);
  };
  slab(zf + WT / 4, k < 5); slab(zn - WT / 4, k > 0);
  if (k < 5) {                                  // bronze liner in the doorway ahead, and a brass strip in the floor
    const br = lin('#7d6238'), zw = zf;
    bx(b, null, 0.05, DH, WT + 0.12, -DW / 2 + 0.025, DH / 2, zw, br, 0.32, 1); bx(b, null, 0.05, DH, WT + 0.12, DW / 2 - 0.025, DH / 2, zw, br, 0.32, 1);
    bx(b, null, DW, 0.05, WT + 0.12, 0, DH - 0.025, zw, br, 0.32, 1);
    bx(b, null, DW - 0.1, 0.006, 0.07, 0, 0.003, zw + WT / 2 + 0.03, lin(BRASS), 0.3, 1);
    const sw = HW - DW / 2;
    bx(b, null, sw, 0.07, 0.012, -(HW + DW / 2) / 2, 0.035, zf + WT / 2 + 0.006, gap, 1); bx(b, null, sw, 0.07, 0.012, (HW + DW / 2) / 2, 0.035, zf + WT / 2 + 0.006, gap, 1);
  }
  /* lighting track */
  const tr = lin('#070708');
  [-2.9, 2.9].forEach(x => { bx(b, null, 0.05, 0.045, RD - 1.6, x, RH - 0.2, z0, tr, 0.5, 0.6); for (let i = -1; i <= 1; i++) bx(b, null, 0.016, 0.2, 0.016, x, RH - 0.1, z0 + i * 4, tr, 0.5, 0.6); });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(RW, RD), r.mFloor);
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, z0); floor.layers.set(1); root.add(floor); r.floor = floor;
  return r;
}

function buildScene() {
  SC.planeGeo = new THREE.PlaneGeometry(1, 1);
  /* dust */
  const N = S.tier ? 1500 : 800, pos = new Float32Array(N * 3), rn = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) { pos[i * 3] = rnd(-6.2, 6.2); pos[i * 3 + 1] = rnd(0.3, 5.6); pos[i * 3 + 2] = rnd(-65.5, 5.5); for (let j = 0; j < 4; j++) rn[i * 4 + j] = Math.random(); }
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); dg.setAttribute('aR', new THREE.BufferAttribute(rn, 4));
  SC.dustU = { uTime: U.uTime, uProj: U.uProj, uOn: { value: 0 }, uCP: { value: [] }, uCD: { value: [] }, uCK: { value: [] } };
  for (let i = 0; i < NC; i++) { SC.dustU.uCP.value.push(new THREE.Vector3(0, 50, 0)); SC.dustU.uCD.value.push(new THREE.Vector3(0, -1, 0)); SC.dustU.uCK.value.push(new THREE.Vector2(2, 0)); }
  SC.dust = new THREE.Points(dg, new THREE.ShaderMaterial({ uniforms: SC.dustU, vertexShader: GL_DUST_V, fragmentShader: GL_DUST_F, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
  SC.dust.frustumCulled = false; SC.dust.renderOrder = 6; root.add(SC.dust);

  for (let k = 0; k < 6; k++) SC.rooms.push(buildRoom(k));
  const R = SC.rooms;

  /* lights common to every room: two washes on the wall ahead and one on the room numeral */
  R.forEach((r, k) => {
    const zf = r.zc - RD / 2 + WT / 2, I = k === 0 ? 12 : 10;
    if (k < 5) {
      addSpot(r, -4.0, 5.75, zf + 1.75, -4.05, 1.1, zf, I, 35, { dust: k > 0, soft: 0.62 });
      addSpot(r, 4.0, 5.75, zf + 1.75, 4.05, 1.1, zf, I, 35, { dust: k > 0, soft: 0.62 });
      addSpot(r, 0, 5.92, zf + 2.5, 0, 5.05, zf, 2.1, 30, { dust: false, soft: 0.85 });
    }
  });
  buildExhibits();

  /* numerals over each doorway, on the side you approach from */
  for (let k = 1; k <= 5; k++) {
    const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 384;
    const tex = new THREE.CanvasTexture(cv); tex.generateMipmaps = GL2; tex.minFilter = GL2 ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter; tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const r = R[k - 1], m = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 1.0125), r.decal(tex, lin(k === 5 ? '#fbf6ea' : '#efe9dc')));
    m.position.set(0, 5.14, zc(k) + RD / 2 + WT / 2 + 0.012); m.renderOrder = 2; root.add(m);
    SC.decals.push({ cv, tex, num: ROOMS[k].num, name: ROOMS[k].name });
  }
  R.forEach(r => { const m = new THREE.Mesh(r.b.build(), r.mLit); root.add(m); r.mesh = m; r.b = null; });
  paintDecals();
}

function paintDecals() {
  SC.decals.forEach(d => {
    const c = d.cv.getContext('2d'); c.clearRect(0, 0, 1024, 384); c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    c.font = '500 232px "Bodoni Moda", Didot, "Bodoni MT", Georgia, serif'; c.fillText(d.num, 512, 232);
    c.font = '500 50px "Hanken Grotesk", "Helvetica Neue", Arial, sans-serif';
    const s = d.name.toUpperCase(), sp = 22; let w = 0; for (const ch of s) w += c.measureText(ch).width + sp; w -= sp;
    let x = 512 - w / 2; c.textAlign = 'left'; for (const ch of s) { c.fillText(ch, x, 338); x += c.measureText(ch).width + sp; }
    d.tex.needsUpdate = true;
  });
  if (SC.neon) SC.neon();
  if (SC.marq) SC.marq();
}

/* keep the canvases alive: only rooms near the camera redraw, one or two uploads a frame */
function updateScreens(dt, camRoom) {
  const A = SC.screens, n = A.length, lite = !S.tier; let budget = S.tier ? 2 : 1;
  /* on a phone a texture upload is the dearest thing in the frame: one every other frame, and the room you are standing in comes first */
  if (lite && S.mode !== 'game' && ((SC.fr = (SC.fr || 0) + 1) & 1)) budget = 0;
  if (S.mode === 'game' && GM.scr) { GM.scr.acc = 0; GM.scr.draw(GM.scr, S.time); GM.scr.tex.needsUpdate = true; budget = 1; }
  for (let i = 0; i < n; i++) {
    const s = A[i];
    s.u.uHover.value = damp(s.u.uHover.value, s.th, 7, dt);
    if (s.pulse > 0) { s.pulse = Math.min(1, s.pulse + dt * 1.3); s.u.uPulse.value = s.pulse >= 1 ? 0 : s.pulse; if (s.pulse >= 1) s.pulse = 0; }
    s.acc += dt;
  }
  const start = SC.si;
  for (let j = 0; j < n && budget > 0; j++) {
    const idx = (start + j) % n, s = A[idx];
    if (!s.always && Math.abs(s.room - camRoom) > 1) continue;
    if (s.acc < (lite && s.room !== camRoom && !s.always ? 0.45 : 1 / s.fps) || (S.mode === 'game' && s === GM.scr)) continue;
    s.acc = 0; s.draw(s, S.time + s.t0); s.tex.needsUpdate = true; budget--; SC.si = (idx + 1) % n;
  }
}
