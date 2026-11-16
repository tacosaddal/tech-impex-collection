/* ============================================================
   THE EXHIBITS: ten working pieces. A playable cabinet, a
   hologram you can turn, a headset you can wear, panels you can
   rearrange, live systems you can open, a phone you can tap.
   ============================================================ */
const GM = { mode: 'attract', px: 120, tx: 120, bx: 120, by: 240, vx: 70, vy: -150, bricks: [], parts: [], trail: [], score: 0, hi: 0, lives: 3, level: 1, serve: 0.8, shake: 0, hits: 0, over: false, key: 0, scr: null, mesh: null, MB: null, edge: [0, 1] };
const HOLO = [{ n: 'Chair', dim: '0.5 × 1.1 m', c: '#b79cff' }, { n: 'Table', dim: 'Ø 1.2 m', c: '#4fe0ff' }, { n: 'Lamp', dim: '1.7 m tall', c: '#ffd24a' }, { n: 'Plant', dim: '1.0 m tall', c: '#6df0a8' }];
const AR = { i: 0, rot: 0.6, trot: 0.6, reveal: 0, grp: null, mesh: null, edges: null, geos: [], egeos: [], tops: [], u: null, disc: null, busy: false, auto: 1 };
const VR = { head: null, glass: null, gedges: null, lift: 0, pull: 0, beacons: [], gaze: 0, cur: -1, found: 0, t: 0, done: false, ret: null, panel: null, pk: null, ptex: null, base: null, flame: null, busy: false };
const MR = { panels: [], focus: -1, O: null };
const PH = { i: 0, prev: 0, t: 1, t0: -9, scr: null };
const UIX = { h: -1 };                       // pointer position across the dashboard painting (0..1), or -1

/* ---------- arcade game: Emberfall, a brick breaker that sheds embers ---------- */
const BR_COL = ['#fff3b0', '#ffd24a', '#ffa23d', '#ff6a3d', '#ff3d5a', '#d04dff', '#6f6bff'];
function gmBricks() { GM.bricks = []; for (let r = 0; r < 7; r++) for (let c = 0; c < 10; c++) GM.bricks.push({ x: 11 + c * 22, y: 54 + r * 12, w: 20, h: 9, r, on: true }); }
function gmServe(t) { GM.serve = t; GM.bx = GM.px; GM.by = 288; GM.hits = 0; GM.trail.length = 0; }
function gmStart(mode) {
  GM.mode = mode; GM.score = 0; GM.lives = 3; GM.level = 1; GM.over = false; GM.px = GM.tx = 120; gmBricks(); gmServe(mode === 'play' ? 1.1 : 0.6);
  GM.hi = store.get('ti-emberfall-hi', 2480);
}
function gmStep(dt) {
  const pw = 46;
  if (GM.over) return;
  if (GM.mode === 'attract') GM.tx = GM.bx + Math.sin(S.time * 1.7) * 13;
  else if (GM.key) GM.tx = clamp(GM.tx + GM.key * 330 * dt, 6 + pw / 2, 234 - pw / 2);
  GM.px = damp(GM.px, clamp(GM.tx, 6 + pw / 2, 234 - pw / 2), GM.mode === 'attract' ? 9 : 26, dt);
  GM.shake = Math.max(0, GM.shake - dt * 3);
  for (let i = GM.parts.length - 1; i >= 0; i--) { const p = GM.parts[i]; p.vy += 260 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.l -= dt; if (p.l <= 0 || p.y > 322) GM.parts.splice(i, 1); }
  if (GM.serve > 0) {
    GM.serve -= dt; GM.bx = GM.px; GM.by = 288;
    if (GM.serve <= 0) { const a = rnd(-0.5, 0.5), sp = 150 + GM.level * 16; GM.vx = Math.sin(a) * sp; GM.vy = -Math.cos(a) * sp; }
    return;
  }
  const sp = Math.min(330, 150 + GM.level * 16 + GM.hits * 2.2), cur = Math.hypot(GM.vx, GM.vy) || 1; GM.vx *= sp / cur; GM.vy *= sp / cur;
  const steps = 3;
  for (let s = 0; s < steps; s++) {
    GM.bx += GM.vx * dt / steps; GM.by += GM.vy * dt / steps;
    if (GM.bx < 9) { GM.bx = 9; GM.vx = Math.abs(GM.vx); snd('wall'); } else if (GM.bx > 231) { GM.bx = 231; GM.vx = -Math.abs(GM.vx); snd('wall'); }
    if (GM.by < 41) { GM.by = 41; GM.vy = Math.abs(GM.vy); snd('wall'); }
    if (GM.vy > 0 && GM.by > 291 && GM.by < 301 && Math.abs(GM.bx - GM.px) < pw / 2 + 3) {
      const a = clamp((GM.bx - GM.px) / (pw / 2), -1, 1) * 1.05; GM.vx = Math.sin(a) * sp; GM.vy = -Math.cos(a) * sp; GM.by = 291; snd('pad');
    }
    for (let i = 0; i < GM.bricks.length; i++) {
      const b = GM.bricks[i]; if (!b.on) continue;
      if (GM.bx > b.x - 3 && GM.bx < b.x + b.w + 3 && GM.by > b.y - 3 && GM.by < b.y + b.h + 3) {
        b.on = false; GM.hits++; GM.score += (7 - b.r) * 10 * GM.level;
        const ox = Math.min(GM.bx - (b.x - 3), b.x + b.w + 3 - GM.bx), oy = Math.min(GM.by - (b.y - 3), b.y + b.h + 3 - GM.by);
        if (ox < oy) GM.vx = -GM.vx; else GM.vy = -GM.vy;
        for (let k = 0; k < 6; k++) GM.parts.push({ x: b.x + rnd(b.w), y: b.y + rnd(b.h), vx: rnd(-40, 40), vy: rnd(-70, 10), l: rnd(0.5, 1.1), c: BR_COL[b.r] });
        if (GM.mode === 'play') { snd('brick', b.r); gmHud(); }
        break;
      }
    }
  }
  GM.trail.push(GM.bx, GM.by); if (GM.trail.length > 16) GM.trail.splice(0, 2);
  if (!GM.bricks.some(b => b.on)) { GM.level++; gmBricks(); gmServe(0.9); if (GM.mode === 'play') { snd('win'); gmHud(); } }
  if (GM.by > 328) {
    GM.shake = 1;
    if (GM.mode === 'play') {
      GM.lives--; snd('lose'); gmHud();
      if (GM.lives <= 0) { GM.over = true; if (GM.score > GM.hi) { GM.hi = GM.score; store.set('ti-emberfall-hi', GM.hi); } gmOver(); return; }
    }
    gmServe(0.9);
  }
}
function gmDraw(s, t) {
  const c = s.ctx, k = s.k, sh = GM.shake * GM.shake * 4;
  c.setTransform(2, 0, 0, 2, (Math.random() - 0.5) * sh * 2, (Math.random() - 0.5) * sh * 2);
  k.r(-4, -4, 248, 328, '#04040a');
  c.globalAlpha = 0.5; for (let i = 0; i < 12; i++) k.r(6, 40 + i * 24, 228, 1, '#11142a'); for (let i = 0; i <= 12; i++) k.r(6 + i * 19, 40, 1, 280, '#11142a'); c.globalAlpha = 1;
  k.r(4, 36, 232, 2, '#f3efe6'); k.r(4, 36, 2, 284, '#f3efe6'); k.r(234, 36, 2, 284, '#f3efe6');
  const MF = '"IBM Plex Mono", ui-monospace, Menlo, monospace';
  c.textBaseline = 'alphabetic'; c.font = '500 9px ' + MF; c.fillStyle = '#8f93a8'; c.textAlign = 'left'; c.fillText('SCORE', 8, 13); c.textAlign = 'right'; c.fillText('HIGH', 232, 13); c.textAlign = 'center'; c.fillText('LV ' + GM.level, 120, 13);
  c.font = '500 14px ' + MF; c.fillStyle = '#fff'; c.textAlign = 'left'; c.fillText(pad(GM.score, 6), 8, 29); c.textAlign = 'right'; c.fillStyle = '#ffd24a'; c.fillText(pad(Math.max(GM.hi, GM.mode === 'play' ? GM.score : 0), 6), 232, 29);
  for (let i = 0; i < 3; i++) k.r(102 + i * 13, 22, 10, 3, i < GM.lives ? '#ff6a3d' : '#2a2c3c');
  GM.bricks.forEach(b => { if (!b.on) return; k.r(b.x, b.y, b.w, b.h, BR_COL[b.r]); c.globalAlpha = 0.45; k.r(b.x, b.y, b.w, 2, '#fff'); c.globalAlpha = 0.3; k.r(b.x, b.y + b.h - 2, b.w, 2, '#000'); c.globalAlpha = 1; });
  GM.parts.forEach(p => { c.globalAlpha = clamp(p.l * 1.6); k.r(p.x, p.y, 2, 2, p.c); }); c.globalAlpha = 1;
  for (let i = 0; i < GM.trail.length; i += 2) { c.globalAlpha = (i + 2) / GM.trail.length * 0.4; k.c(GM.trail[i], GM.trail[i + 1], 2.4, '#ffb46a'); } c.globalAlpha = 1;
  k.rr(GM.px - 23, 296, 46, 6, 3, '#f3efe6'); k.r(GM.px - 15, 298, 30, 1, '#ff6a3d');
  k.c(GM.bx, GM.by, 3.2, '#fff');
  if (GM.mode === 'attract') {
    c.textAlign = 'center'; c.fillStyle = 'rgba(4,4,10,.62)'; c.fillRect(6, 150, 228, 92);
    c.font = 'italic 700 34px "Bodoni Moda", Didot, Georgia, serif'; c.fillStyle = '#ffd24a'; c.fillText('Emberfall', 120, 190);
    c.font = '500 10px ' + MF; c.fillStyle = Math.floor(t * 2.2) % 2 ? '#fff' : '#6f7388'; c.fillText('PRESS PLAY', 120, 212);
    c.fillStyle = '#8f93a8'; c.fillText('1 COIN  ·  1 PLAY', 120, 228);
  } else if (GM.over) { c.fillStyle = 'rgba(4,4,10,.55)'; c.fillRect(6, 38, 228, 280);
  } else if (GM.serve > 0) { c.textAlign = 'center'; c.font = '500 11px ' + MF; c.fillStyle = '#fff'; c.fillText('READY', 120, 250); }
}
function scrTunnel(s, t) {
  const c = s.ctx; c.setTransform(s.cv.width / 160, 0, 0, s.cv.height / 200, 0, 0);
  s.k.r(0, 0, 160, 200, '#03040c');
  for (let i = 0; i < 12; i++) {
    const z = ((i / 12 + t * 0.12) % 1), sc = z * z, w = 12 + sc * 190, cx = 80 + Math.sin(t * 0.7 + z * 4) * 22 * (1 - z), cy = 96 + Math.cos(t * 0.5 + z * 3) * 14 * (1 - z);
    c.strokeStyle = i % 3 === 0 ? '#ff4fd8' : '#35e0ff'; c.globalAlpha = 0.25 + z * 0.75; c.lineWidth = 0.6 + sc * 2.2;
    c.save(); c.translate(cx, cy); c.rotate(t * 0.25 + z * 1.2); c.strokeRect(-w / 2, -w / 2, w, w); c.restore();
  }
  c.globalAlpha = 1;
  const sx = 80 + Math.sin(t * 1.3) * 26; c.fillStyle = '#fff'; c.beginPath(); c.moveTo(sx, 160); c.lineTo(sx - 8, 176); c.lineTo(sx, 171); c.lineTo(sx + 8, 176); c.fill();
  c.font = '500 8px "IBM Plex Mono", monospace'; c.textAlign = 'left'; c.fillStyle = '#35e0ff'; c.fillText('VOLT RALLY', 8, 14); c.textAlign = 'right'; c.fillStyle = '#fff'; c.fillText(pad(31200 + Math.floor(t * 37) % 4000, 6), 152, 14);
}

/* ---------- phone screens (96 x 224 space) ---------- */
function phHome(k, t) { const c = k.ctx; c.save(); c.beginPath(); c.rect(0, 0, 96, 224); c.clip(); c.translate(-132, -8); scrMobile(k, t); c.restore(); }
function phList(k, t) {
  k.rr(0, 0, 96, 224, 13, UI.pan); k.rr(34, 6, 28, 6, 3, '#000');
  k.t('Timetable', 10, 34, 13, UI.hi, 600); k.t('Thursday 14', 10, 46, 7, UI.dim, 500);
  ['M', 'T', 'W', 'T', 'F', 'S'].forEach((d, i) => { k.rr(8 + i * 13.6, 54, 11.5, 18, 4, i === 3 ? UI.a3 : UI.pan2); k.t(d, 13.7 + i * 13.6, 61, 5.5, i === 3 ? '#000' : UI.dim, 600, 'center'); k.t(String(11 + i), 13.7 + i * 13.6, 69, 6, i === 3 ? '#000' : UI.tx, 600, 'center'); });
  [['06:30', 'Spin', UI.a2, 3], ['09:00', 'Yoga flow', UI.a4, 8], ['12:15', 'HIIT', UI.a3, 0], ['18:30', 'Strength', UI.a1, 5], ['19:45', 'Boxing', UI.ok, 2]].forEach((r, i) => {
    const y = 80 + i * 25; k.rr(8, y, 80, 21, 5, UI.pan2); k.r(8, y + 4, 2.5, 13, r[2]); k.t(r[0], 15, y + 9, 6, UI.dim, 500); k.t(r[1], 15, y + 17, 8, UI.hi, 600);
    const full = r[3] === 0; k.rr(62, y + 5.5, 22, 10, 5, full ? UI.pan : (i === 3 ? UI.a1 : UI.ln)); k.t(full ? 'Full' : (i === 3 ? 'Book' : r[3] + ' left'), 73, y + 12.8, 5.5, full ? UI.dim : (i === 3 ? '#000' : UI.tx), 600, 'center');
  });
  const py = 80 + 3 * 25, pu = (Math.sin(t * 3) + 1) / 2; k.rr(8 - pu, py - pu, 80 + pu * 2, 21 + pu * 2, 5, UI.a1, 0.8);
  k.r(8, 198, 80, 1, UI.ln); for (let i = 0; i < 4; i++) k.c(20 + i * 19, 210, 3.2, i === 1 ? UI.a3 : UI.dim);
}
function phTicket(k, t) {
  k.rr(0, 0, 96, 224, 13, UI.pan); k.rr(34, 6, 28, 6, 3, '#000');
  k.c(48, 44, 13, UI.ok); k.l([[42, 44], [46.5, 48.5], [54.5, 39.5]], '#000', 2.6);
  k.t("You're in", 48, 74, 13, UI.hi, 600, 'center'); k.t('Strength, 18:30 today', 48, 85, 6.5, UI.dim, 500, 'center');
  k.rr(10, 94, 76, 86, 8, UI.hi);
  for (let y = 0; y < 9; y++) for (let x = 0; x < 9; x++) { const on = ((x * 7 + y * 13 + x * y * 3) % 5 < 2) || ((x < 3 || x > 5) && (y < 3) && (x % 2 === 0 || y % 2 === 0)) || (x < 3 && y > 5 && (x % 2 === 0 || y % 2 === 0)); if (on) k.r(21 + x * 6, 100 + y * 6, 5.2, 5.2, '#000'); }
  const sy = 100 + ((t * 26) % 54); k.r(18, sy, 60, 1.2, UI.a3);
  k.t('Studio 2  ·  Mat 14', 48, 174, 6, '#333', 600, 'center');
  k.rr(10, 188, 76, 20, 7, UI.pan2); k.t('Add to calendar', 48, 200.5, 7, UI.tx, 600, 'center');
}
const PHS = [phHome, phList, phTicket];
function phDraw(s, t) {
  const c = s.ctx, sc = s.cv.width / 96;
  PH.t = clamp((S.time - PH.t0) / 0.42);
  const e = 1 - Math.pow(1 - PH.t, 3);
  if (PH.t < 1) s.acc = 9;
  c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#000'; c.fillRect(0, 0, s.cv.width, s.cv.height);
  if (PH.t < 1) { c.setTransform(sc, 0, 0, sc, -e * 96 * sc * 0.4, 0); c.globalAlpha = 1 - e * 0.7; PHS[PH.prev](s.k, t); c.globalAlpha = 1; }
  c.setTransform(sc, 0, 0, sc, (1 - e) * 96 * sc, 0); PHS[PH.i](s.k, t);
}

function buildExhibits() {
  const R = SC.rooms, white = lin('#aaa7a0');

  /* ===== ROOM I: three cabinets, one of them yours ===== */
  let r = R[1];
  const cabZ = [-10.72, -12, -13.28], cabC = ['#e9b21f', '#e2472a', '#18a7c9'];
  const cabS = [mkScreen(480, 600, covDraw('game'), { crt: true, room: 1, fps: 14, gain: 1.6 }), mkScreen(480, 640, gmDraw, { crt: true, room: 1, fps: 30, gain: 1.75 }), mkScreen(480, 600, scrTunnel, { crt: true, room: 1, fps: 14, gain: 1.6 })];
  const marq = cabS.map(() => mkScreen(512, 150, () => {}, { room: 1, fps: 0.001, gain: 1.35, rad: 0.02, asp: 512 / 150 }));
  cabZ.forEach((z, i) => {
    const M = TRS(-HW + 0.47, 0, z, Math.PI / 2), c = cabinet(r, M, { col: cabC[i], scr: cabS[i], marquee: marq[i] });
    if (i === 1) { GM.scr = cabS[1]; GM.mesh = c.scr; GM.MB = c.sc; }
    r.glow[i].set(-5.15, z, 1.0, 0.52);
  });
  r.glowC[0].set(0.5, 0.2, 0.34); r.glowC[1].set(0.6, 0.36, 0.2); r.glowC[2].set(0.12, 0.42, 0.6);
  const TITLES = [['Night Loop', '#ff4fd8', '#2a0a3a'], ['Emberfall', '#ffd24a', '#3a0d08'], ['Volt Rally', '#35e0ff', '#06223a']];
  SC.marq = () => marq.forEach((m, i) => {
    const c = m.ctx; c.setTransform(1, 0, 0, 1, 0, 0);
    const g = c.createLinearGradient(0, 0, 0, 150); g.addColorStop(0, TITLES[i][2]); g.addColorStop(1, '#050508'); c.fillStyle = g; c.fillRect(0, 0, 512, 150);
    c.fillStyle = TITLES[i][1]; c.globalAlpha = 0.16; for (let j = 0; j < 9; j++) c.fillRect(0, 12 + j * 16, 512, 3); c.globalAlpha = 1;
    c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.font = 'italic 800 86px "Bodoni Moda", Didot, Georgia, serif';
    c.fillStyle = '#000'; c.fillText(TITLES[i][0], 260, 104); c.fillStyle = TITLES[i][1]; c.fillText(TITLES[i][0], 256, 100);
    c.font = '500 15px "IBM Plex Mono", monospace'; c.fillStyle = '#f3efe6'; c.fillText('T E C H   I M P E X   G A M E S', 256, 132);
    m.tex.needsUpdate = true;
  });
  gmStart('attract');
  const cabHit = new THREE.Mesh(new THREE.BoxGeometry(0.95, 2.0, 0.85), new THREE.MeshBasicMaterial()); cabHit.position.set(-HW + 0.5, 1.0, -12); cabHit.visible = false; root.add(cabHit);
  SC.hits.push({ mesh: cabHit, id: 'arcade' });
  /* neon */
  const ncv = document.createElement('canvas'); ncv.width = 1024; ncv.height = 256; const ntex = new THREE.CanvasTexture(ncv); ntex.minFilter = THREE.LinearFilter; ntex.generateMipmaps = false;
  const nu = { tMap: { value: ntex }, uGain: { value: 2.3 }, uTint: { value: new THREE.Vector3(1, 1, 1) } };
  const neon = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 0.775), new THREE.ShaderMaterial({ uniforms: nu, vertexShader: GL_UV_V, fragmentShader: GL_ADD_F, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
  neon.applyMatrix4(onLeft(2.86, -12).multiply(TRS(0, 0, 0.05))); neon.renderOrder = 3; root.add(neon); SC.neonU = nu;
  SC.neon = () => {
    const c = ncv.getContext('2d'); c.clearRect(0, 0, 1024, 256); c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = 'italic 500 150px "Bodoni Moda", Didot, Georgia, serif'; c.lineJoin = 'round';
    c.shadowColor = '#ff3d6e'; c.shadowBlur = 38; c.strokeStyle = '#ff5c86'; c.lineWidth = 7; c.strokeText('insert coin', 512, 128); c.strokeText('insert coin', 512, 128);
    c.shadowBlur = 8; c.strokeStyle = '#ffe9ee'; c.lineWidth = 2.4; c.strokeText('insert coin', 512, 128); ntex.needsUpdate = true;
  };
  painting(r, onRight(1.9, -12.4), 2.0, 2.5, mkScreen(480, 600, covDraw('game'), { room: 1, fps: 10 }), null);
  bench(r, 3.1, -9.2, 0.0);
  addSpot(r, -2.9, 5.75, -12, -5.7, 0.9, -12, 9, 30, { cone: 0.07 });
  addSpot(r, 2.9, 5.75, -12.4, 6.5, 1.9, -12.4, 8, 30, {});
  addSpot(r, 3.1, 5.92, -9.2, 3.1, 0, -9.2, 7, 20, { cone: 0.06 });

  /* ===== ROOM II: hologram, headset, floating panels ===== */
  r = R[2];
  /* -- augmented reality: Roomline -- */
  const ax = -3.2, az = -21.6;
  cyl(r.b, null, 0.92, 0.96, 0.2, ax, 0.1, az, white, 0.8, 0, 0, 48); cyl(r.b, null, 0.96, 0.96, 0.012, ax, 0.006, az, lin('#020203'), 1, 0, 0, 48);
  floorBlob(ax, az, 2.9, 2.9, 0.6);
  const M4 = (x, y, z, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(sx, sy, sz));
  const B = () => new THREE.BoxGeometry(1, 1, 1), CY = (rt, rb, h, s = 24) => new THREE.CylinderGeometry(rt, rb, h, s);
  AR.geos = [
    mergeGeos([[B(), M4(0, 0.46, 0, 0.52, 0.06, 0.52)], [B(), M4(0, 0.80, -0.23, 0.52, 0.62, 0.06)], [B(), M4(-0.22, 0.215, -0.22, 0.06, 0.43, 0.06)], [B(), M4(0.22, 0.215, -0.22, 0.06, 0.43, 0.06)], [B(), M4(-0.22, 0.215, 0.22, 0.06, 0.43, 0.06)], [B(), M4(0.22, 0.215, 0.22, 0.06, 0.43, 0.06)]]),
    mergeGeos([[CY(0.62, 0.62, 0.05, 40), M4(0, 0.74, 0)], [CY(0.05, 0.05, 0.7, 12), M4(0, 0.37, 0)], [CY(0.3, 0.34, 0.04, 28), M4(0, 0.02, 0)]]),
    mergeGeos([[CY(0.2, 0.22, 0.03, 28), M4(0, 0.015, 0)], [CY(0.018, 0.018, 1.45, 8), M4(0, 0.75, 0)], [CY(0.13, 0.27, 0.32, 28), M4(0, 1.55, 0)]]),
    mergeGeos([[CY(0.2, 0.14, 0.32, 24), M4(0, 0.16, 0)]].concat([[0, 0.62, 0, 0.26], [0.16, 0.5, 0.08, 0.18], [-0.15, 0.52, -0.06, 0.19], [0.02, 0.86, 0.04, 0.17], [-0.08, 0.7, 0.14, 0.15]].map(s => [new THREE.IcosahedronGeometry(s[3], 0), M4(s[0], s[1], s[2])])))
  ];
  AR.geos.forEach(g => { g.computeBoundingBox(); AR.tops.push(g.boundingBox.max.y); AR.egeos.push(new THREE.EdgesGeometry(g, 24)); });
  AR.u = { uCol: { value: lin(HOLO[0].c, 1.5) }, uTime: U.uTime, uReveal: { value: 0 }, uTop: { value: AR.tops[0] }, uA: { value: 1 } };
  AR.grp = new THREE.Group(); AR.grp.position.set(ax, 0.2, az); root.add(AR.grp);
  AR.mesh = new THREE.Mesh(AR.geos[0], new THREE.ShaderMaterial({ uniforms: AR.u, vertexShader: GL_HOLO_V, fragmentShader: GL_HOLO_F, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  AR.edges = new THREE.LineSegments(AR.egeos[0], new THREE.LineBasicMaterial({ color: lin(HOLO[0].c, 2.4), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
  AR.mesh.renderOrder = 4; AR.edges.renderOrder = 4; AR.grp.add(AR.mesh); AR.grp.add(AR.edges);
  AR.du = { uCol: { value: lin(HOLO[0].c, 1.2) }, uA: { value: 1 }, uRing: { value: 0.72 }, uTime: U.uTime };
  AR.disc = new THREE.Mesh(SC.planeGeo, new THREE.ShaderMaterial({ uniforms: AR.du, vertexShader: GL_UV_V, fragmentShader: GL_DISC_F, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
  AR.disc.rotation.x = -Math.PI / 2; AR.disc.position.set(ax, 0.215, az); AR.disc.scale.setScalar(1.8); AR.disc.renderOrder = 3; root.add(AR.disc);
  r.glow[0].set(ax, az, 1.9, 1.9); r.glowC[0].set(0.16, 0.12, 0.3);
  const arHit = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.1, 1.7), new THREE.MeshBasicMaterial()); arHit.position.set(ax, 1.05, az); arHit.visible = false; root.add(arHit);
  SC.hits.push({ mesh: arHit, id: 'ar' });
  addSpot(r, -2.9, 5.75, -20.3, ax, 0.2, az, 4.6, 22, { cone: 0.05, col: '#e9e2ff' });

  /* -- virtual reality: Deepshift -- */
  const vx = 3.4, vz = -24.4;
  bx(r.b, null, 0.62, 1.05, 0.62, vx, 0.525, vz, white, 0.8); bx(r.b, null, 0.66, 0.012, 0.66, vx, 0.006, vz, lin('#020203'), 1);
  cyl(r.b, null, 0.2, 0.2, 0.008, vx, 1.054, vz, lin('#fff2dd', 1.3), 0.5, 0, 1, 32);
  floorBlob(vx, vz, 1.9, 1.9, 0.7);
  const hb = new Builder(), shell = lin('#c2c2c6'), dark = lin('#0a0a0c');
  const vis = new THREE.ExtrudeGeometry(rrShape(0.2, 0.11, 0.045), { depth: 0.07, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3, curveSegments: 10 });
  hb.add(vis, TRS(0, 0, -0.035), shell, 0.32, 0);
  hb.add(new THREE.ExtrudeGeometry(rrShape(0.19, 0.098, 0.042), { depth: 0.006, bevelEnabled: false, curveSegments: 10 }), TRS(0, 0, 0.049), dark, 0.08, 0.2);
  bx(hb, null, 0.17, 0.085, 0.03, 0, 0, -0.06, lin('#141416'), 0.9);
  [[-0.07, 0.03], [0.07, 0.03], [-0.075, -0.03], [0.075, -0.03]].forEach(p => cyl(hb, null, 0.007, 0.007, 0.004, p[0], p[1], 0.056, lin('#22252c'), 0.2, 0.6, 0, 10, Math.PI / 2));
  cyl(hb, null, 0.003, 0.003, 0.004, 0, -0.038, 0.056, lin('#6dffb0', 6), 0.5, 0, 1, 8, Math.PI / 2);
  bx(hb, null, 0.012, 0.03, 0.17, -0.106, 0, -0.1, shell, 0.4); bx(hb, null, 0.012, 0.03, 0.17, 0.106, 0, -0.1, shell, 0.4);
  hb.add(new THREE.ExtrudeGeometry(rrShape(0.12, 0.055, 0.025), { depth: 0.02, bevelEnabled: false, curveSegments: 8 }), TRS(0, 0, -0.205), dark, 0.7, 0);
  bx(hb, null, 0.03, 0.006, 0.19, 0, 0.062, -0.1, dark, 0.8);
  VR.head = new THREE.Mesh(hb.build(), r.mLit); VR.head.scale.setScalar(1.75); VR.head.position.set(vx, 1.42, vz); root.add(VR.head);
  VR.base = new THREE.Vector3(vx, 1.42, vz);
  const gg = new THREE.BoxGeometry(0.62, 0.74, 0.62);
  VR.gu = { uCol: { value: new THREE.Color(0.75, 0.9, 1) }, uA: { value: 1 } };
  VR.glass = new THREE.Mesh(gg, new THREE.ShaderMaterial({ uniforms: VR.gu, vertexShader: GL_HOLO_V, fragmentShader: GL_GLASS_F, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  VR.gedges = new THREE.LineSegments(new THREE.EdgesGeometry(gg), new THREE.LineBasicMaterial({ color: new THREE.Color(0.5, 0.56, 0.62), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
  VR.glass.position.set(vx, 1.05 + 0.37, vz); VR.glass.renderOrder = 4; VR.gedges.renderOrder = 4; VR.glass.add(VR.gedges); root.add(VR.glass);
  const vrHit = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.0, 0.9), new THREE.MeshBasicMaterial()); vrHit.position.set(vx, 1.0, vz); vrHit.visible = false; root.add(vrHit);
  SC.hits.push({ mesh: vrHit, id: 'vr' });
  addSpot(r, 2.9, 5.75, -23.2, vx, 1.2, vz, 4.2, 15, { cone: 0.075 });
  painting(r, onRight(1.75, -20.9), 1.6, 2.0, mkScreen(400, 500, covDraw('vr'), { room: 2, fps: 10 }), null);

  /* -- mixed reality: Halo Room -- */
  const C = new THREE.Vector3(-3.5, 0, -27.3), v = new THREE.Vector3(0.68, 0, 0.733).normalize(), RAD = 2.7;
  MR.O = C.clone().addScaledVector(v, RAD * 0.62);
  const mrd = new THREE.Mesh(SC.planeGeo, new THREE.ShaderMaterial({ uniforms: { uCol: { value: lin('#4fd8ff', 0.9) }, uA: { value: 1 }, uRing: { value: 0.95 }, uTime: U.uTime }, vertexShader: GL_UV_V, fragmentShader: GL_DISC_F, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
  mrd.rotation.x = -Math.PI / 2; mrd.position.set(MR.O.x - v.x * 1.5, 0.016, MR.O.z - v.z * 1.5); mrd.scale.setScalar(4.4); mrd.renderOrder = 3; root.add(mrd);
  r.glow[1].set(mrd.position.x, mrd.position.z, 2.6, 2.6); r.glowC[1].set(0.05, 0.16, 0.22);
  const lp = [];
  [[-0.7, 5, 1.62, 1.08, 1.72], [0, 2, 1.86, 1.24, 1.95], [0.7, 3, 1.62, 1.08, 1.72]].forEach((d, i) => {
    const dir = v.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), d[0]), pos = MR.O.clone().addScaledVector(dir, -RAD); pos.y = d[4];
    const s = mkScreen(720, 480, scrDraw(d[1]), { room: 2, fps: 12 });
    const u = { tMap: { value: s.tex }, uReveal: { value: 1 }, uTime: U.uTime, uAsp: { value: 1.5 }, uHover: { value: 0 } };
    const m = new THREE.Mesh(new THREE.PlaneGeometry(d[2], d[3]), new THREE.ShaderMaterial({ uniforms: u, vertexShader: GL_UV_V, fragmentShader: GL_PANEL_F, side: THREE.DoubleSide }));
    m.position.copy(pos); m.rotation.y = Math.atan2(dir.x, dir.z); root.add(m);
    MR.panels.push({ m, u, s, pos: pos.clone(), dir, k: 0, tk: 0, h: 0, th: 0, w: d[2], hh: d[3] });
    SC.hits.push({ mesh: m, id: 'mr', idx: i });
    lp.push(pos.x, pos.y - d[3] / 2 - 0.04, pos.z, pos.x, 0.02, pos.z);
  });
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
  const anch = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: new THREE.Color(0.1, 0.45, 0.6), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); anch.renderOrder = 3; root.add(anch);
  addSpot(r, -2.9, 5.75, -25.2, -6.5, 2.6, -25.6, 6, 34, { dust: false });

  /* ===== ROOM III: four live systems ===== */
  r = R[3];
  const zf3 = r.zc - RD / 2 + WT / 2;
  const PW = S.tier ? 1080 : 720, PHh = S.tier ? 720 : 480;
  painting(r, onLeft(1.74, -33.4), 3.0, 2.0, mkScreen(PW, PHh, scrDraw(2), { room: 3 }), 'meridian');
  painting(r, onLeft(1.74, -38.6), 3.0, 2.0, mkScreen(PW, PHh, scrDraw(3), { room: 3 }), 'kestrel');
  painting(r, TRS(4.05, 1.74, zf3, 0), 3.0, 2.0, mkScreen(PW, PHh, scrDraw(4), { room: 3 }), 'northstar');
  painting(r, onRight(1.98, -36), 4.5, 3.0, mkScreen(PW, PHh, scrDraw(5), { room: 3, fps: 16 }), 'pulse');
  bench(r, -4.3, -36, Math.PI / 2);
  addSpot(r, -2.9, 5.75, -33.4, -6.5, 1.74, -33.4, 6, 31, { cone: 0.05 });
  addSpot(r, -2.9, 5.75, -38.6, -6.5, 1.74, -38.6, 6, 31, {});
  addSpot(r, 2.9, 5.75, -36, 6.5, 1.98, -36, 7, 38, { cone: 0.05 });

  /* ===== ROOM IV: a very large phone and a web app ===== */
  r = R[4];
  const px = -3.3, pz = -46.5, pry = Math.atan2(5.6, 2.4), PM = TRS(px, 0, pz, pry);
  bx(r.b, PM, 1.7, 0.08, 0.7, 0, 0.04, 0, lin('#101114'), 0.4, 0.7);
  r.b.add(new THREE.ExtrudeGeometry(rrShape(1.2, 2.68, 0.17), { depth: 0.1, bevelEnabled: true, bevelThickness: 0.014, bevelSize: 0.014, bevelSegments: 3, curveSegments: 12 }), PM.clone().multiply(TRS(0, 1.34 + 0.11, -0.05)), lin('#2b2c31'), 0.28, 0.9);
  bx(r.b, PM, 0.02, 0.24, 0.05, 0.615, 1.9, 0, lin('#3a3b41'), 0.3, 0.9); bx(r.b, PM, 0.02, 0.14, 0.05, -0.615, 2.05, 0, lin('#3a3b41'), 0.3, 0.9);
  PH.scr = mkScreen(480, 1120, phDraw, { room: 4, fps: 20, rad: 0.062, asp: 96 / 224, gain: 1.4 });
  const pm = new THREE.Mesh(new THREE.PlaneGeometry(1.11, 2.59), PH.scr.mat); pm.applyMatrix4(PM.clone().multiply(TRS(0, 1.34 + 0.11, 0.066))); root.add(pm);
  SC.hits.push({ mesh: pm, id: 'tandem', scr: PH.scr });
  blob(PM.clone().multiply(TRS(0, 0.012, 0.1, 0, -Math.PI / 2)), 2.8, 2.0, 0.7, 0, true);
  r.glow[0].set(px + 0.9, pz + 0.4, 1.6, 1.4); r.glowC[0].set(0.3, 0.16, 0.1);
  painting(r, onRight(1.88, -50), 4.2, 2.8, mkScreen(PW, PHh, scrDraw(0), { room: 4 }), 'ledgerly');
  bench(r, -3.6, -51.6, 0.5);
  addSpot(r, -0.9, 5.75, -44.6, px, 1.6, pz, 12, 22, { cone: 0.06 });
  addSpot(r, 2.9, 5.75, -50, 6.5, 1.88, -50, 7.5, 36, {});
  addSpot(r, -3.6, 5.92, -51.6, -3.6, 0, -51.6, 7, 20, { cone: 0.05 });

  /* ===== ROOM V: the empty plinth ===== */
  r = R[5];
  const zf5 = r.zc - RD / 2 + WT / 2;
  bx(r.b, null, 0.95, 1.12, 0.95, 0, 0.56, -60.5, lin('#dedbd4'), 0.75); bx(r.b, null, 1.0, 0.014, 1.0, 0, 0.007, -60.5, lin('#1a1a1c'), 1);
  bx(r.b, null, 0.3, 0.004, 0.11, 0, 1.122, -60.2, lin(BRASS), 0.3, 1);
  floorBlob(0, -60.5, 3.0, 3.0, 0.42);
  const cHit = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.2, 1.3), new THREE.MeshBasicMaterial()); cHit.position.set(0, 1.1, -60.5); cHit.visible = false; root.add(cHit);
  SC.hits.push({ mesh: cHit, id: 'commission' });
  addSpot(r, -3.7, 5.75, zf5 + 2.9, -4.1, 2.6, zf5, 9, 44, {});
  addSpot(r, 3.7, 5.75, zf5 + 2.9, 4.1, 2.6, zf5, 9, 44, {});
  addSpot(r, 0.9, 5.92, -58.4, 0, 0.9, -60.5, 12, 15, { cone: 0.1, col: '#fff3e2' });
  addSpot(r, -2.9, 5.75, -60, -6.5, 2.6, -60, 8, 46, { dust: false });
  addSpot(r, 2.9, 5.75, -60, 6.5, 2.6, -60, 8, 46, { dust: false });
  addSpot(r, 0, 5.92, -56.4, 0, 0, -56.6, 7, 30, { dust: false });

  blob(onLeft(1.0, -12).multiply(TRS(0, 0, 0.004)), 4.6, 2.9, 0.42, 0);

  /* foyer: the rope is off its hook, and one pool of light to walk into */
  r = R[0];
  const brass = lin('#c9a25a');
  [-2.15, 2.15].forEach(x => {
    cyl(r.b, null, 0.17, 0.19, 0.03, x, 0.015, -4.2, brass, 0.3, 1, 0, 28); cyl(r.b, null, 0.024, 0.024, 0.92, x, 0.49, -4.2, brass, 0.26, 1, 0, 14);
    r.b.add(new THREE.SphereGeometry(0.05, 16, 12), TRS(x, 0.985, -4.2), brass, 0.22, 1); cyl(r.b, null, 0.034, 0.034, 0.02, x, 0.9, -4.2, brass, 0.3, 1, 0, 14);
    floorBlob(x, -4.2, 0.9, 0.9, 0.6);
  });
  const rope = new THREE.CatmullRomCurve3([[2.11, 0.9, -4.16], [2.06, 0.6, -4.12], [2.04, 0.25, -4.1], [2.0, 0.045, -4.06], [1.78, 0.03, -3.9], [1.5, 0.03, -3.84], [1.26, 0.03, -3.98], [1.14, 0.03, -4.16]].map(p => new THREE.Vector3(p[0], p[1], p[2])));
  r.b.add(new THREE.TubeGeometry(rope, 40, 0.028, 8, false), null, lin('#7c0f1d'), 0.95);
  cyl(r.b, null, 0.02, 0.02, 0.1, 1.1, 0.03, -4.21, brass, 0.3, 1, 0, 10, Math.PI / 2);
  addSpot(r, 0, 5.92, -1.6, 0, 0, -2.6, 10, 30, { cone: 0.07 });
  buildVR();
}

/* ---------- the world inside the headset: a night-time offshore deck in wireframe ---------- */
function buildVR() {
  vrScene.fog = new THREE.FogExp2(0x070616, 0.006);
  vrScene.add(camera);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(150, 32, 16), new THREE.ShaderMaterial({ uniforms: { uTime: U.uTime }, vertexShader: GL_SKY_V, fragmentShader: GL_SKY_F, side: THREE.BackSide, depthWrite: false }));
  sky.frustumCulled = false; vrScene.add(sky);
  const sg = new THREE.PlaneGeometry(360, 360, 110, 110); sg.rotateX(-Math.PI / 2);
  const sea = new THREE.Mesh(sg, new THREE.ShaderMaterial({ uniforms: { uTime: U.uTime }, vertexShader: GL_SEA_V, fragmentShader: GL_SEA_F })); sea.position.y = -9; sea.frustumCulled = false; vrScene.add(sea);
  const lines = (arr, hex, k) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: lin(hex, k || 1) })); vrScene.add(l); return l; };
  const deck = new THREE.Mesh(new THREE.CircleGeometry(8.6, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.006, 0.008, 0.02) })); deck.rotation.x = -Math.PI / 2; deck.position.y = -0.03; vrScene.add(deck);
  const cy = [], yl = [], wh = [], a8 = i => i / 8 * Math.PI * 2;
  for (let i = 0; i < 8; i++) {
    const x0 = Math.cos(a8(i)) * 8.6, z0 = Math.sin(a8(i)) * 8.6, x1 = Math.cos(a8(i + 1)) * 8.6, z1 = Math.sin(a8(i + 1)) * 8.6;
    cy.push(x0, 0, z0, x1, 0, z1, x0, 1.1, z0, x1, 1.1, z1, x0, 0.55, z0, x1, 0.55, z1, x0, 0, z0, x0, 1.1, z0);
    const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2; cy.push(mx, 0, mz, mx, 1.1, mz);
  }
  for (let i = 0; i < 64; i++) { const a = i / 64 * 6.2832, b = (i + 1) / 64 * 6.2832; yl.push(Math.cos(a) * 5.2, 0, Math.sin(a) * 5.2, Math.cos(b) * 5.2, 0, Math.sin(b) * 5.2); }
  wh.push(-1.3, 0, -1.9, -1.3, 0, 1.9, 1.3, 0, -1.9, 1.3, 0, 1.9, -1.3, 0, 0, 1.3, 0, 0);
  const gr = []; for (let i = -7; i <= 7; i++) { const w = Math.sqrt(Math.max(0, 62 - i * i)); gr.push(i, 0, -w, i, 0, w, -w, 0, i, w, 0, i); }
  lines(gr, '#2a5a9a', 0.7); lines(cy, '#35e0ff', 1.5); lines(yl, '#ffd24a', 1.8); lines(wh, '#ffffff', 1.8);
  /* walkway and main platform with its derrick */
  const pf = [], add = (a, b) => pf.push(a[0], a[1], a[2], b[0], b[1], b[2]);
  const d0 = [-6.1, 0, -6.1], d1 = [-17, 1, -19];
  [[-0.9, 0], [0.9, 0], [-0.9, 1.1], [0.9, 1.1]].forEach(o => add([d0[0] + o[0] * 0.7, d0[1] + o[1], d0[2] - o[0] * 0.7], [d1[0] + o[0] * 0.7, d1[1] + o[1], d1[2] - o[0] * 0.7]));
  for (let i = 0; i <= 10; i++) { const t = i / 10, x = lerp(d0[0], d1[0], t), y = lerp(d0[1], d1[1], t), z = lerp(d0[2], d1[2], t); add([x - 0.63, y, z + 0.63], [x + 0.63, y, z - 0.63]); if (i % 2 === 0) { add([x - 0.63, y, z + 0.63], [x - 0.63, y + 1.1, z + 0.63]); add([x + 0.63, y, z - 0.63], [x + 0.63, y + 1.1, z - 0.63]); } }
  const box = (cx, cy0, cz, w, h, d) => { const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy0, y1 = cy0 + h, z0 = cz - d / 2, z1 = cz + d / 2; [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].forEach((c, i, A) => { const n = A[(i + 1) % 4]; add([c[0], y0, c[1]], [n[0], y0, n[1]]); add([c[0], y1, c[1]], [n[0], y1, n[1]]); add([c[0], y0, c[1]], [c[0], y1, c[1]]); }); };
  box(-30, -3, -32, 28, 4, 22); box(-22, 1, -27, 9, 5, 7); box(-36, 1, -36, 8, 3.2, 8);
  [[-43, -42], [-17, -42], [-43, -22], [-17, -22]].forEach(c => { add([c[0], -3, c[1]], [c[0], -30, c[1]]); add([c[0] + 1.2, -3, c[1]], [c[0] + 1.2, -30, c[1]]); });
  const tw = (cx, cz, base, top, h, lv, y0) => {
    for (let l = 0; l < lv; l++) {
      const t0 = l / lv, t1 = (l + 1) / lv, s0 = lerp(base, top, t0) / 2, s1 = lerp(base, top, t1) / 2, ya = y0 + t0 * h, yb = y0 + t1 * h;
      const A = [[-s0, -s0], [s0, -s0], [s0, s0], [-s0, s0]], Bq = [[-s1, -s1], [s1, -s1], [s1, s1], [-s1, s1]];
      for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; add([cx + A[i][0], ya, cz + A[i][1]], [cx + A[j][0], ya, cz + A[j][1]]); add([cx + A[i][0], ya, cz + A[i][1]], [cx + Bq[i][0], yb, cz + Bq[i][1]]); add([cx + A[i][0], ya, cz + A[i][1]], [cx + Bq[j][0], yb, cz + Bq[j][1]]); add([cx + A[j][0], ya, cz + A[j][1]], [cx + Bq[i][0], yb, cz + Bq[i][1]]); }
    }
  };
  tw(-33, -30, 8, 2.2, 44, 8, 1);
  for (let i = 0; i < 9; i++) { const t0 = i / 9, t1 = (i + 1) / 9, P = t => [lerp(-20, -2, t), lerp(6, 21, t), lerp(-40, -52, t)]; const a = P(t0), b = P(t1); add([a[0], a[1], a[2]], [b[0], b[1], b[2]]); add([a[0], a[1] + 1.4, a[2]], [b[0], b[1] + 1.4, b[2]]); add([a[0], a[1], a[2]], [b[0], b[1] + 1.4, b[2]]); }
  add([-20, 1, -40], [-20, 7.4, -40]); add([-2, 21, -52], [-2, 6, -52]);
  for (let i = 0; i < 10; i++) { const t0 = i / 10, t1 = (i + 1) / 10, P = t => [lerp(-44, -70, t), lerp(1, 17, t), lerp(-26, -8, t)]; const a = P(t0), b = P(t1); add(a, b); add([a[0], a[1] - 1.2, a[2]], [b[0], b[1] - 1.2, b[2]]); add(a, [b[0], b[1] - 1.2, b[2]]); }
  lines(pf, '#7f8cff', 1.7);
  const fcv = document.createElement('canvas'); fcv.width = fcv.height = 64; const fc = fcv.getContext('2d'), fg = fc.createRadialGradient(32, 32, 0, 32, 32, 32); fg.addColorStop(0, '#fff'); fg.addColorStop(0.3, '#ffb060'); fg.addColorStop(1, 'rgba(255,60,0,0)'); fc.fillStyle = fg; fc.fillRect(0, 0, 64, 64);
  VR.flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(fcv), color: new THREE.Color(3, 1.6, 0.8), blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); VR.flame.position.set(-70, 19, -8); VR.flame.scale.set(9, 13, 1); vrScene.add(VR.flame);
  const tl = new THREE.Sprite(new THREE.SpriteMaterial({ map: VR.flame.material.map, color: new THREE.Color(4, 0.3, 0.3), blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); tl.position.set(-33, 46, -30); tl.scale.set(3, 3, 1); vrScene.add(tl); VR.tl = tl;

  /* three beacons to find by looking at them */
  [[-9.6, 1.5, -10.4], [11.5, 2.8, -5.5], [3.6, 1.3, 12.5]].forEach((p, i) => {
    const g = new THREE.Group(), mat = new THREE.LineBasicMaterial({ color: lin('#ff7a2e', 2.4), fog: false });
    const oct = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.OctahedronGeometry(0.55, 0)), mat); g.add(oct);
    const ring = []; for (let k = 0; k < 40; k++) { const a = k / 40 * 6.2832, b = (k + 1) / 40 * 6.2832; ring.push(Math.cos(a), 0, Math.sin(a), Math.cos(b), 0, Math.sin(b)); }
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(ring, 3)); const rl = new THREE.LineSegments(rg, mat); rl.position.y = -p[1] + 0.03; g.add(rl);
    const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.7, 0, 0, 34, 0, 0, -0.7, 0, 0, -p[1], 0], 3)); g.add(new THREE.LineSegments(bg, mat));
    g.position.set(p[0], p[1], p[2]); vrScene.add(g);
    const dir = new THREE.Vector3(p[0], p[1] - 1.72, p[2]).normalize();
    VR.beacons.push({ g, oct, rl, mat, dir, done: false, k: 0 });
  });
  /* briefing panel */
  const pcv = document.createElement('canvas'); pcv.width = 1024; pcv.height = 512; VR.pk = pcv.getContext('2d');
  VR.ptex = new THREE.CanvasTexture(pcv); VR.ptex.encoding = THREE.sRGBEncoding; VR.ptex.minFilter = THREE.LinearFilter; VR.ptex.generateMipmaps = false;
  VR.panel = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2.2), new THREE.MeshBasicMaterial({ map: VR.ptex, transparent: true, fog: false, depthWrite: false })); VR.panel.position.set(0, 2.7, -7.2); vrScene.add(VR.panel);
  /* gaze ring, fixed in front of each eye */
  VR.ru = { uP: { value: 0 }, uCol: { value: new THREE.Color(1.4, 1.4, 1.5) } };
  VR.ret = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), new THREE.ShaderMaterial({ uniforms: VR.ru, vertexShader: GL_UV_V, fragmentShader: GL_RET_F, blending: THREE.AdditiveBlending, transparent: true, depthTest: false, depthWrite: false }));
  VR.ret.position.set(0, 0, -2); VR.ret.renderOrder = 9; camera.add(VR.ret);
  vrPanel();
}
function vrPanel() {
  const c = VR.pk; c.clearRect(0, 0, 1024, 512);
  c.fillStyle = 'rgba(8,10,28,.82)'; c.fillRect(0, 0, 1024, 512); c.strokeStyle = VR.done ? '#59e39b' : '#35e0ff'; c.lineWidth = 4; c.strokeRect(2, 2, 1020, 508);
  const MF = '"IBM Plex Mono", ui-monospace, monospace', SF = '"Hanken Grotesk", "Helvetica Neue", Arial, sans-serif';
  c.textBaseline = 'alphabetic'; c.textAlign = 'left'; c.font = '500 30px ' + MF; c.fillStyle = VR.done ? '#59e39b' : '#35e0ff';
  c.fillText(VR.done ? 'SCENARIO 04  /  COMPLETE' : 'SCENARIO 04  /  GAS ALARM', 56, 92);
  c.font = '600 76px ' + SF; c.fillStyle = '#fff';
  if (VR.done) { c.fillText('Crew accounted for.', 56, 208); c.font = '400 40px ' + SF; c.fillStyle = '#c9cde0'; c.fillText('All three muster beacons confirmed in ' + VR.t.toFixed(1) + ' seconds.', 56, 282); c.fillText('Result sent to the training record.', 56, 338); }
  else { c.fillText('Find the muster beacons.', 56, 208); c.font = '400 40px ' + SF; c.fillStyle = '#c9cde0'; c.fillText('Look around the deck. Hold the ring on each', 56, 282); c.fillText('orange beacon until it turns green.', 56, 338); }
  for (let i = 0; i < 3; i++) { c.fillStyle = i < VR.found ? '#59e39b' : 'rgba(255,255,255,.14)'; c.fillRect(56 + i * 150, 404, 130, 14); }
  c.font = '500 30px ' + MF; c.fillStyle = '#fff'; c.textAlign = 'right'; c.fillText(VR.found + ' / 3', 968, 424);
  VR.ptex.needsUpdate = true;
}
function vrReset() {
  VR.found = 0; VR.t = 0; VR.done = false; VR.gaze = 0; VR.cur = -1; VRC.yaw = VRC.ty = 0; VRC.pitch = VRC.tp = 0.06;
  VR.beacons.forEach(b => { b.done = false; b.k = 0; b.mat.color.copy(lin('#ff7a2e', 2.4)); }); vrPanel(); vrHud();
}
function vrHud() { const el = $('#vrn'); if (el) el.textContent = VR.done ? 'Scenario complete' : VR.found + ' of 3 beacons found'; }
const _fw = { v: null };
function updateVR(dt) {
  if (!_fw.v) _fw.v = new THREE.Vector3();
  VRC.yaw = damp(VRC.yaw, VRC.ty, 9, dt); VRC.pitch = damp(VRC.pitch, VRC.tp, 9, dt);
  if (VR.key) VRC.ty += VR.key * dt * 1.5;
  const cp = Math.cos(VRC.pitch); _fw.v.set(-Math.sin(VRC.yaw) * cp, Math.sin(VRC.pitch), -Math.cos(VRC.yaw) * cp);
  if (!VR.done) VR.t += dt;
  let best = -1, bd = 0.993;
  VR.beacons.forEach((b, i) => {
    b.oct.rotation.y += dt * (b.done ? 0.5 : 1.4); const pu = 1 + Math.sin(S.time * 3 + i) * 0.08; b.oct.scale.setScalar(pu * (1 + b.k * 0.5)); b.rl.scale.setScalar(0.9 + ((S.time * 0.6 + i * 0.3) % 1) * 1.4);
    b.k = damp(b.k, 0, 3, dt);
    const d = b.dir.dot(_fw.v); if (!b.done && d > bd) { bd = d; best = i; }
  });
  if (best !== VR.cur) { VR.cur = best; VR.gaze = 0; }
  if (best >= 0) {
    VR.gaze += dt / 1.15;
    if (VR.gaze >= 1) {
      const b = VR.beacons[best]; b.done = true; b.k = 1; b.mat.color.copy(lin('#59e39b', 2.6)); VR.found++; VR.gaze = 0; VR.cur = -1; snd('place');
      if (VR.found >= 3) { VR.done = true; snd('win'); }
      vrPanel(); vrHud();
    }
  }
  VR.ru.uP.value = VR.gaze;
  VR.flame.scale.set(8 + Math.sin(S.time * 13) * 1.2, 12 + Math.sin(S.time * 9) * 2.2, 1); VR.tl.material.opacity = 0.4 + 0.6 * (Math.sin(S.time * 2.4) > 0 ? 1 : 0.15);
}

/* ---------- per-frame life for the room exhibits ---------- */
function arSet(i) {
  if (AR.busy || i === AR.i) return; AR.busy = true; snd('tick');
  tween(0.28, k => { AR.u.uReveal.value = 1 - k; AR.edges.material.opacity = 1 - k; }, () => {
    AR.i = i; const h = HOLO[i]; AR.mesh.geometry = AR.geos[i]; AR.edges.geometry = AR.egeos[i]; AR.u.uTop.value = AR.tops[i];
    AR.u.uCol.value.copy(lin(h.c, 1.5)); AR.edges.material.color.copy(lin(h.c, 2.4)); AR.du.uCol.value.copy(lin(h.c, 1.2)); arUI(); snd('place');
    tween(0.8, k => { AR.u.uReveal.value = k; AR.edges.material.opacity = k; }, () => { AR.busy = false; });
  });
}
function arUI() { $$('#arseg button').forEach((b, k) => b.classList.toggle('is-on', k === AR.i)); const t = $('#artag'); if (t) t.textContent = HOLO[AR.i].n + '  ' + HOLO[AR.i].dim; }
function mrFocus(i) { MR.focus = MR.focus === i ? -1 : i; MR.panels.forEach((p, k) => { p.tk = k === MR.focus ? 1 : 0; }); snd('place'); }
function phoneNext(auto) { PH.prev = PH.i; PH.i = (PH.i + 1) % PHS.length; PH.t = 0; PH.t0 = S.time; PH.scr.acc = 9; PH.idle = 0; if (!auto) snd('tick'); }

function updateExhibits(dt, camRoom) {
  /* cabinet */
  if (camRoom <= 2 || S.mode === 'game') gmStep(Math.min(dt, 0.033));
  if (SC.neonU) { const f = Math.sin(S.time * 31) * Math.sin(S.time * 7.3) > 0.93 ? 0.55 : 1; SC.neonU.uGain.value = 2.3 * f * SC.rooms[1].on.value; }
  /* hologram */
  if (!AR.drag) AR.trot += dt * 0.22 * AR.auto;
  AR.rot = damp(AR.rot, AR.trot, 7, dt); AR.grp.rotation.y = AR.rot; AR.grp.position.y = 0.2 + 0.025 + Math.sin(S.time * 1.1) * 0.02;
  /* headset */
  const hb = VR.base, bob = Math.sin(S.time * 1.2) * 0.02;
  VR.head.position.set(hb.x, hb.y + bob + VR.pull * 0.12, hb.z); VR.head.rotation.y = -0.95 + Math.sin(S.time * 0.45) * 0.42; VR.head.rotation.x = Math.sin(S.time * 0.7) * 0.05;
  VR.glass.position.y = 1.42 + VR.lift * 1.25; VR.gu.uA.value = 1 - VR.lift * 0.75; VR.gedges.material.opacity = 1 - VR.lift * 0.7;
  /* the phone moves on by itself if left alone */
  if (camRoom === 4) { PH.idle = (PH.idle || 0) + dt; if (PH.idle > 5.5) phoneNext(true); }
  /* floating panels */
  MR.panels.forEach((p, i) => {
    p.k = damp(p.k, p.tk, 6, dt); p.h = damp(p.h, p.th, 8, dt); p.u.uHover.value = Math.max(p.h, p.k * 0.6);
    const f = p.k * 1.0 + p.h * 0.12, sc = 1 + p.k * 0.34 + p.h * 0.04, dim = MR.focus >= 0 && MR.focus !== i ? 0.86 : 1;
    p.m.position.set(p.pos.x + p.dir.x * f, p.pos.y + Math.sin(S.time * 0.9 + i * 2.1) * 0.035 + p.k * 0.05, p.pos.z + p.dir.z * f); p.m.scale.setScalar(sc * dim);
  });
}
