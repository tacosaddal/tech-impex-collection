/* ============================================================
   THE WALK: scroll moves you through the building. Twelve stops,
   each framed for the screen you are on, with a wall label.
   ============================================================ */
const HOLD = 0.9, MOVE = 1.05, SPAN = HOLD + MOVE, HOLD_END = 1.25;
/* vh is the height you can always see (browser bars showing); sh is the full stage. On upright screens (p) the piece is framed
   above its text; lt, heroT and comT are where that text starts, measured from the page itself. */
const LAY = { top: 0, U: 600, vh: 800, sh: 800, p: false, phone: false, hud: 60, lr: 0.3, lt: [], heroT: 400, comT: 400, m: null };
const BEATS = [
  { id: 'hero', room: 0 },
  { id: 'arcade', room: 1, cap: 0, t: [-5.9, 1.56, -12], n: [1, 0, 0.28], w: 3.9, h: 3.5 },
  { id: 'ar', room: 2, cap: 1, t: [-3.2, 1.05, -21.6], n: [0.9, 0, 0.44], w: 2.3, h: 2.5 },
  { id: 'vr', room: 2, cap: 2, t: [3.4, 1.42, -24.4], n: [-0.85, 0, 0.53], w: 1.5, h: 1.75 },
  { id: 'mr', room: 2, cap: 3, t: [-3.0, 1.75, -27.2], n: [0.68, 0, 0.733], w: 5.4, wn: 4.1, h: 2.9 },
  { id: 'meridian', room: 3, cap: 4, t: [-6.5, 1.6, -33.4], n: [1, 0, 0.2], w: 3.9, h: 3.1 },
  { id: 'kestrel', room: 3, cap: 5, t: [-6.5, 1.6, -38.6], n: [1, 0, 0.13], w: 3.9, h: 3.1 },
  { id: 'northstar', room: 3, cap: 6, t: [4.05, 1.6, -41.7], n: [-0.2, 0, 1], w: 3.9, h: 3.1 },
  { id: 'pulse', room: 3, cap: 7, t: [6.5, 1.8, -36], n: [-1, 0, 0.1], w: 5.3, h: 4.0 },
  { id: 'tandem', room: 4, cap: 9, t: [-3.3, 1.55, -46.5], n: [0.92, 0, 0.39], w: 2.2, h: 3.3 },
  { id: 'ledgerly', room: 4, cap: 8, t: [6.5, 1.72, -50], n: [-1, 0, 0.12], w: 5.0, h: 3.8 },
  { id: 'commission', room: 5, t: [0, 1.3, -60.5], n: [0, 0, 1], w: 3.0, h: 3.0, wn: 2.6, hn: 2.5, tyn: 1.05 }
];
/* points to pass through between stops (doorways, and wide turns) */
const VIA = {
  0: [{ p: [0, 1.62, -6], t: [-2.6, 1.5, -13.5] }],
  1: [{ p: [0.3, 1.62, -18], t: [-1.4, 1.4, -23] }],
  4: [{ p: [0, 1.62, -30], t: [-2.8, 1.9, -35] }],
  8: [{ p: [0, 1.62, -42], t: [-1.2, 1.6, -47] }],
  9: [{ p: [1.3, 1.62, -46.9], t: [0.9, 2.0, -55] }],
  10: [{ p: [0, 1.62, -54], t: [0, 1.35, -60.5] }]
};
const EXH = {
  arcade: { acc: 'TI.2025.01', title: 'Emberfall', year: 2025, medium: 'Arcade cabinet running a game built for it', body: 'We build games for PC, console, mobile and the web, from first prototype to the updates after launch. This one is switched on. Step up and play.', bodyN: 'Games for PC, console, mobile and the web, from first prototype to live updates. This one is switched on.', act: 'Play the cabinet', cur: 'Play' },
  ar: { acc: 'TI.2025.02', title: 'Roomline', year: 2025, medium: 'True-to-scale hologram on a tracked plinth', body: 'Product visualisers, try-before-you-buy and on-site overlays that stay locked to the real world. Choose a piece, then drag to turn it.', bodyN: 'Product visualisers and on-site overlays that stay locked to the real world. Pick a piece, then drag to turn it.', cur: 'Turn' },
  vr: { acc: 'TI.2024.03', title: 'Deepshift', year: 2024, medium: 'Headset and a safety drill for offshore crews', body: 'Training simulators, virtual showrooms and immersive experiences for standalone and PC headsets. The case is unlocked. Put it on.', bodyN: 'Training simulators, virtual showrooms and immersive experiences for any headset. The case is unlocked.', act: 'Put on the headset', cur: 'Wear' },
  mr: { acc: 'TI.2025.04', title: 'Halo Room', year: 2025, medium: 'Three spatial panels anchored to the floor', body: 'Mixed reality apps where the interface leaves the screen and works beside your team in the room. Touch a panel to bring it forward.', bodyN: 'Apps where the interface leaves the screen and works beside your team in the room. Tap a panel to bring it forward.', hint: 'a panel', cur: 'Touch' },
  meridian: { acc: 'TI.2024.05', title: 'Meridian', year: 2024, medium: 'Operations platform, shown live', body: 'One system for the whole operation: people, jobs, assets, compliance and reporting, with the permissions and audit trail to match.', bodyN: 'One system for the whole operation: people, jobs, assets, compliance and reporting, with the audit trail to match.', act: 'Use the system', cur: 'Use', tab: 1 },
  kestrel: { acc: 'TI.2024.06', title: 'Kestrel', year: 2024, medium: 'Sales pipeline, shown live', body: 'Every lead, conversation and deal in one pipeline, shaped around how your team sells. Open it and drag a deal across to Won.', bodyN: 'Every lead, conversation and deal in one pipeline, shaped around how your team sells. Open it and move a deal to Won.', act: 'Open the pipeline', cur: 'Use', tab: 0 },
  northstar: { acc: 'TI.2023.07', title: 'Northstar', year: 2023, medium: 'Targets, commission and forecast, shown live', body: 'Targets, quotes, commission and forecasts in one place, updated the moment a deal moves.', act: 'See the numbers', cur: 'Use', tab: 2 },
  pulse: { acc: 'TI.2025.08', title: 'Pulse Board', year: 2025, medium: 'Real-time dashboard, 4.5 metres wide', body: 'Your numbers in real time, from every source, on one screen people can read.', tip: 'Run your pointer across the chart.', tipT: 'Tap it and watch it answer.', hint: 'the board', cur: '' },
  tandem: { acc: 'TI.2024.09', title: 'Tandem', year: 2024, medium: 'Class booking app, shown at 17 times life size', body: 'iOS and Android from one codebase, with offline built in and the store submission handled. Tap the screen to book a class.', bodyN: 'iOS and Android from one codebase, with offline built in and store submission handled. Tap the screen to book a class.', act: 'Tap the phone', cur: 'Tap' },
  ledgerly: { acc: 'TI.2023.10', title: 'Ledgerly', year: 2023, medium: 'Scheduling platform for clinics', body: 'Fast, secure web platforms that scale from ten users to ten thousand without a rewrite.', tip: 'Go on, touch it.', tipT: 'Go on, touch it.', hint: 'the screen', cur: 'Touch' }
};
const WK = { i: 0, f: 0, hold: true, li: -1, lon: false, room: 0, hov: null, paths: [], ray: null, ndc: null, pd: null, tmp: null, moved: false, lastPx: -1, lastPy: -1 };
const OV = { k: 0, pos: null, tgt: null, fov: 44, sx: 0, sy: 0, tw: null };
const _A = { pos: null, tgt: null, fov: 44, sx: 0, sy: 0 }, _B = { pos: null, tgt: null, fov: 44, sx: 0, sy: 0 };
const TOTAL = (BEATS.length - 1) * SPAN + HOLD_END;
const SVH = !!(window.CSS && CSS.supports && CSS.supports('height', '100svh'));

function fovFor() { return lerp(44, 60, ss(1.25, 0.6, S.w / S.h)); }
function fitDist(w, h, fw, fh, fov) { const tv = Math.tan(fov * Math.PI / 360), asp = S.w / S.h; return Math.max((h / 2) / (tv * fh), (w / 2) / (tv * asp * fw)); }
/* upright screens: the free strip between the top bar and the text at the bottom of the screen, in canvas pixels */
function band(i) {
  const N = BEATS.length - 1, top = LAY.hud + 4, edge = i === 0 ? LAY.heroT - 4 : i === N ? LAY.comT - 4 : LAY.lt[i] - 12;
  return [top, Math.max(top + 120, edge || 0)];
}
/* stand `dist` in front of a piece, inside its room. Returns how far away we really ended up */
function place(b, hh, dist, ty, o) {
  const a = (hh - 0.5) * (b.drift === undefined ? 0.1 : b.drift), nl = Math.hypot(b.n[0], b.n[2]), nx = b.n[0] / nl, nz = b.n[2] / nl, ca = Math.cos(a), sa = Math.sin(a);
  const dx = nx * ca + nz * sa, dz = -nx * sa + nz * ca, z0 = zc(b.room);
  o.tgt.set(b.t[0], ty, b.t[2]);
  o.pos.set(clamp(b.t[0] + dx * dist, -5.6, 5.6), 1.62, clamp(b.t[2] + dz * dist, z0 - 5.0, z0 + 5.05));
  return Math.hypot(o.pos.x - b.t[0], o.pos.z - b.t[2]);
}
function beatPose(i, hh, o) {
  const b = BEATS[i], N = BEATS.length - 1, fov = fovFor(), tv = Math.tan(fov * Math.PI / 360);
  o.fov = fov;
  if (LAY.p) {
    const bd = band(i), bh = bd[1] - bd[0], bc = (bd[0] + bd[1]) / 2;
    if (i === 0) {
      /* the first doorway and its numeral, whole, above the headline. If the foyer is not deep enough, the lens widens */
      const k = 5.6 * S.h / (2 * bh * 0.97), dn = clamp(k / tv, 7.6, 10.4), tv2 = clamp(k / dn, tv, 0.754), d = dn + (1 - hh) * 0.65;
      o.fov = Math.atan(tv2) * 360 / Math.PI;
      o.pos.set(0, 1.62, d - 6); o.tgt.set(0, 1.62, -30);
      o.sx = 0; o.sy = 0.5 - bc / S.h - (2.75 - 1.62) / (2 * d * tv2);
      return;
    }
    const need = fitDist(b.wn || b.w, b.hn || b.h, 0.9, bh / S.h * 0.95, fov) * (1.03 - 0.06 * hh);
    const real = place(b, hh, need, b.tyn === undefined ? b.t[1] : b.tyn, o);
    if (real < need * 0.985) o.fov = Math.min(78, Math.atan(tv * need / real) * 360 / Math.PI);
    o.sx = 0; o.sy = 0.5 - bc / S.h;
    return;
  }
  if (i === 0) { o.pos.set(0, 1.62, 4.7 - hh * 1.7); o.tgt.set(0, 2.55, -30); o.sx = 0.17; o.sy = 0; return; }
  /* on wide screens the piece is framed in the space to the right of its wall label */
  const lr = LAY.lr, free = Math.max(0.3, 0.975 - lr);
  place(b, hh, fitDist(b.w, b.h, i === N ? 0.5 : free * 0.92, 0.68, fov) * (1.03 - 0.06 * hh), b.t[1], o);
  o.sx = i === N ? 0.12 : lr + free / 2 - 0.5; o.sy = 0;
}
function buildPaths() {
  WK.paths = [];
  for (let i = 0; i < BEATS.length - 1; i++) {
    const P = [new THREE.Vector3()], T = [new THREE.Vector3()];
    beatPose(i, 1, { pos: P[0], tgt: T[0] });
    (VIA[i] || []).forEach(v => { P.push(new THREE.Vector3(v.p[0], v.p[1], v.p[2])); T.push(new THREE.Vector3(v.t[0], v.t[1], v.t[2])); });
    const pe = new THREE.Vector3(), te = new THREE.Vector3(); beatPose(i + 1, 0, { pos: pe, tgt: te }); P.push(pe); T.push(te);
    const L = [0]; for (let k = 1; k < P.length; k++) L.push(L[k - 1] + Math.max(0.6, P[k].distanceTo(P[k - 1])));
    WK.paths.push({ P, T, L });
  }
}
function cr(pts, i, t, out) {
  const p0 = pts[Math.max(i - 1, 0)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(i + 2, pts.length - 1)], t2 = t * t, t3 = t2 * t;
  out.x = 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
  out.y = 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
  out.z = 0.5 * ((2 * p1.z) + (-p0.z + p2.z) * t + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 + (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3);
}
function pathPose(i, t, o) {
  const ph = WK.paths[i], e = t * t * (3 - 2 * t), n = ph.L.length - 1, d = e * ph.L[n];
  let k = 0; while (k < n - 1 && d > ph.L[k + 1]) k++;
  const lt = clamp((d - ph.L[k]) / (ph.L[k + 1] - ph.L[k]));
  cr(ph.P, k, lt, o.pos); cr(ph.T, k, lt, o.tgt);
  beatPose(i, 1, _A); beatPose(i + 1, 0, _B);
  o.fov = lerp(_A.fov, _B.fov, e); o.sx = lerp(_A.sx, _B.sx, e); o.sy = lerp(_A.sy, _B.sy, e);
}

function measure() {
  const j = $('#walk'), st = $('#stage'), pr = $('#svh'), de = document.documentElement;
  LAY.sh = (S.gl && st.offsetHeight) || S.h;
  LAY.vh = (S.gl && pr && pr.offsetHeight) || LAY.sh;
  if (S.gl && !SVH) { if (LAY.w0 !== S.w) { LAY.w0 = S.w; LAY.vh0 = Math.min(LAY.vh, window.innerHeight || LAY.vh); } LAY.vh = LAY.vh0; }   // older phones: take the height seen on arrival and keep it
  LAY.p = S.gl && S.w / LAY.vh < 0.9; LAY.phone = LAY.p && S.w <= 760;
  /* the page styles take the same switches as the camera, so the two can never disagree */
  de.classList.toggle('is-p', LAY.p); de.classList.toggle('is-tall', LAY.p && LAY.vh >= 740); de.classList.toggle('is-short', LAY.p && LAY.vh < 610);
  LAY.U = LAY.vh * (S.w < 760 ? 0.52 : 0.6);
  if (S.gl) j.style.height = Math.round(TOTAL * LAY.U + LAY.sh) + 'px';
  LAY.top = j.offsetTop;
  if (!S.gl) return;
  /* where the type sits decides where the camera puts each piece: measure every label without showing it */
  if (!LAY.m) { const a = document.createElement('aside'); a.className = 'label'; a.setAttribute('aria-hidden', 'true'); a.style.cssText = 'visibility:hidden;pointer-events:none;transition:none'; st.appendChild(a); LAY.m = a; }
  const m = LAY.m;
  LAY.hud = $('.hud__top').offsetHeight;
  /* on phones the text is pinned to the bottom of the visible page, so its top is worked out from the short (bars showing) height:
     the camera then never has to move when the browser bar slides away */
  const pin = getComputedStyle(m).position === 'fixed', off = pin ? parseFloat(getComputedStyle(m).bottom) || 0 : 0;
  for (let i = 1; i < BEATS.length - 1; i++) { m.innerHTML = labelHTML(i); LAY.lt[i] = pin ? LAY.vh - off - m.offsetHeight : m.offsetTop; }
  LAY.lr = (m.offsetLeft + m.offsetWidth) / S.w;
  m.innerHTML = '';
  const top = (box, inner) => getComputedStyle(box).position === 'fixed' ? LAY.vh - box.offsetHeight : inner.offsetTop;
  LAY.heroT = top($('#hero'), $('.hero__in')); LAY.comT = top($('#commission'), $('.com__in'));
  st.style.setProperty('--art', (LAY.hud + 12) + 'px'); st.style.setProperty('--arb', Math.max(0, LAY.sh - LAY.lt[beatOf('ar')] + 14) + 'px');
  WK.li = -1;                                   // the label is lettered again for this layout
  buildPaths();
}
/* our own scroller for touch screens: a tap on next walks at a human pace, and a flick that stops between
   two pieces carries on to the nearest one instead of leaving you in a doorway */
const GLD = { on: false, y0: 0, y1: 0, ye: 0, t: 0, d: 1, last: -1, idle: 0, dir: 1, touch: false };
function glide(y, dur) { GLD.on = true; GLD.y0 = GLD.ye = window.scrollY; GLD.y1 = y; GLD.t = 0; GLD.d = dur; }
function updateGlide(dt) {
  const y = window.scrollY;
  if (GLD.on) {
    if (GLD.touch || Math.abs(y - GLD.ye) > 4) GLD.on = false;             // a finger takes over at once
    else {
      GLD.t += dt; const k = Math.min(1, GLD.t / GLD.d);
      window.scrollTo(0, GLD.y0 + (GLD.y1 - GLD.y0) * eio(k)); GLD.ye = GLD.last = window.scrollY; GLD.idle = 0;
      if (k >= 1) GLD.on = false;
      return;
    }
  }
  if (!TOUCH) return;
  if (Math.abs(y - GLD.last) > 0.5) { if (GLD.last >= 0) GLD.dir = y > GLD.last ? 1 : -1; GLD.last = y; GLD.idle = 0; return; }
  GLD.idle += dt;
  if (GLD.idle < 0.18 || GLD.touch || !S.ready || S.mode !== 'walk' || TOUR.on || VR.busy || _lock.n) return;
  const s = (y - LAY.top) / LAY.U, i = Math.floor(s / SPAN), f = s - i * SPAN;
  if (s <= 0 || i >= BEATS.length - 1 || f <= HOLD) return;                 // already standing in front of something
  const t = (f - HOLD) / MOVE, on = GLD.dir > 0 ? t > 0.14 : t > 0.86;
  const to = LAY.top + ((on ? i + 1 : i) * SPAN + HOLD * 0.5) * LAY.U;
  GLD.idle = 0;
  if (RM) { window.scrollTo(0, to); GLD.last = window.scrollY; } else glide(to, clamp(0.45 + Math.abs(to - y) / (SPAN * LAY.U) * 0.9, 0.55, 1.3));
}
function goBeat(i, mid) {
  if (TOUR.on) tourSet(false);
  const y = LAY.top + (i * SPAN + (mid === undefined ? HOLD * 0.5 : mid)) * LAY.U + 1;
  if (TOUCH && !RM) glide(y, clamp(0.5 + Math.abs(y - window.scrollY) / (SPAN * LAY.U) * 0.7, 0.6, 2.4));
  else window.scrollTo({ top: y, behavior: RM ? 'auto' : 'smooth' });
}
function beatOf(id) { return BEATS.findIndex(b => b.id === id); }

/* ---------- wall label ---------- */
const ARW = d => `<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="${d}"/></svg>`;
function labelHTML(i) {
  const b = BEATS[i], x = EXH[b.id], rm = ROOMS[b.room], N = BEATS.length - 1;
  let act = '', dots = '';
  if (b.id === 'ar') act = `<div class="seg" id="arseg" role="group" aria-label="Choose a piece">${HOLO.map((h, k) => `<button type="button" data-ar="${k}"${k === AR.i ? ' class="is-on"' : ''}>${h.n}</button>`).join('')}</div>`;
  else if (x.act) act = `<button type="button" class="btn btn--k" data-act="${b.id}">${x.act}${ARW('M1 7h11M8 3l4 4-4 4')}</button>`;
  else act = `<span class="lb__h mono"><i></i>${TOUCH ? 'Tap' : 'Click'} ${x.hint}</span>`;
  for (let k = 1; k <= N; k++) dots += `<i${k < i ? ' class="is-past"' : k === i ? ' class="is-on"' : ''}></i>`;
  /* phones get the stop markers, shorter wording and previous / next under the thumb; the style sheet hides what a layout does not use */
  return `<div class="lb__s" aria-hidden="true">${dots}</div>
    <p class="lb__k mono"><span><i></i>${CAPS[b.cap].n}</span><span class="lb__rm">Room ${rm.num}</span><span class="lb__sp">Sample piece</span></p>
    <h2 class="lb__t"><em>${x.title}</em>, ${x.year}</h2>
    <p class="lb__m">${x.medium}</p>
    <p class="lb__b">${(LAY.phone && x.bodyN) || x.body}${x.tip ? ' ' + (TOUCH ? x.tipT : x.tip) : ''}</p>
    <div class="lb__a${b.id === 'ar' ? ' lb__a--seg' : ''}">${act}<span class="lb__n mono"><span>${x.acc}</span><span>Sample piece</span></span><span class="lb__nav"><button type="button" data-step="-1" aria-label="Previous stop">${ARW('M13 7H2M6 3L2 7l4 4')}</button><button type="button" data-step="1" aria-label="Next stop">${ARW('M1 7h11M8 3l4 4-4 4')}</button></span></div>`;
}
function setLabel(i, on) {
  const E = WK.el || (WK.el = { label: $('#label'), hero: $('#hero'), com: $('#commission'), arf: $('#arf'), tag: $('#artag'), rm: $('#rm') });
  const el = E.label, b = BEATS[i], show = on && i > 0 && i < BEATS.length - 1 && S.mode === 'walk';
  if (i !== WK.li) {
    WK.li = i;
    if (i > 0 && i < BEATS.length - 1) { el.innerHTML = labelHTML(i); el.dataset.id = b.id; }
    document.documentElement.style.setProperty('--room', ROOMS[b.room].ui); document.documentElement.style.setProperty('--wall', ROOMS[b.room].wall);
    planMark(i);
  }
  if (show !== WK.lon) { WK.lon = show; el.classList.toggle('is-on', show); }
  const arOn = show && b.id === 'ar'; if (arOn !== WK.arOn) { WK.arOn = arOn; E.arf.classList.toggle('is-on', arOn); }
  const h = E.hero, hOn = i === 0 && on; if (h._on !== hOn) { h._on = hOn; h.classList.toggle('is-in', hOn); }
  const c = E.com, cOn = i === BEATS.length - 1 && on; if (c._on !== cOn) { c._on = cOn; c.classList.toggle('is-in', cOn); }
}

/* ---------- touching things ---------- */
function act(id, idx) {
  const bi = beatOf(id);
  if (bi < 0) return;
  if (bi !== WK.i || !WK.hold) { goBeat(bi); snd('tick'); return; }      // the first touch walks you over
  primary(id, idx);
}
function primary(id, idx) {
  const h = SC.hits.find(x => x.id === id && x.scr);
  if (h && h.scr) h.scr.pulse = 0.001;
  if (id === 'arcade') gameEnter();
  else if (id === 'ar') arSet((AR.i + 1) % HOLO.length);
  else if (id === 'vr') vrEnter();
  else if (id === 'mr') mrFocus(idx === undefined ? (MR.focus + 2) % 3 : idx);
  else if (id === 'meridian' || id === 'kestrel' || id === 'northstar') sysOpen(id);
  else if (id === 'tandem') phoneNext();
  else if (id === 'commission') { const m = $('#commission-mail .mail'); if (m) m.focus({ preventScroll: true }); snd('place'); }
  else snd('place');
}
function rayAt(cx, cy) {
  if (!S.gl || S.mode !== 'walk') return null;
  WK.ndc.set((cx / S.w) * 2 - 1, -((cy / S.h) * 2 - 1));
  WK.ray.setFromCamera(WK.ndc, camera);
  let best = null, bd = 1e9;
  for (let i = 0; i < SC.hits.length; i++) {
    const h = SC.hits[i]; if (Math.abs(BEATS[beatOf(h.id)].room - WK.room) > 0) continue;
    const r = WK.ray.intersectObject(h.mesh, false); if (r.length && r[0].distance < bd) { bd = r[0].distance; best = { h, uv: r[0].uv }; }
  }
  return best;
}
function hoverUpdate() {
  const st = WK.st || (WK.st = $('#stage')); let hit = null;
  if (S.mode === 'walk' && S.pin && !TOUCH && WK.over) hit = rayAt(S.px * S.w, S.py * S.h);
  SC.screens.forEach(s => { s.th = 0; }); MR.panels.forEach(p => { p.th = 0; }); UIX.h = -1;
  let lab = '';
  if (hit) {
    const h = hit.h, here = beatOf(h.id) === WK.i && WK.hold;
    if (h.scr && hit.uv) { h.scr.th = 1; h.scr.u.uM.value.copy(hit.uv); }
    if (h.id === 'mr') MR.panels[h.idx].th = 1;
    if (h.id === 'pulse' && hit.uv) UIX.h = clamp((hit.uv.x - 0.15) / 0.58);
    lab = here ? (EXH[h.id] ? EXH[h.id].cur : 'Touch') : 'Visit';
    if (h.id === 'commission') lab = here ? '' : 'Visit';
  }
  const id = hit ? hit.h.id : null;
  if (id !== WK.hov) { WK.hov = id; if (id) snd('tick'); }
  if (st.dataset.cursor !== lab) { if (lab) st.dataset.cursor = lab; else delete st.dataset.cursor; }
}

/* ---------- modes: playing, wearing, using ---------- */
function ovTo(pose, dur, done) {
  if (OV.tw) { const i = tweens.indexOf(OV.tw); if (i >= 0) tweens.splice(i, 1); }
  const k0 = OV.k; if (k0 < 0.01) { OV.pos.copy(pose.pos); OV.tgt.copy(pose.tgt); OV.fov = pose.fov; OV.sx = pose.sx; OV.sy = pose.sy; }
  const p0 = OV.pos.clone(), t0 = OV.tgt.clone(), f0 = OV.fov, x0 = OV.sx, y0 = OV.sy;
  OV.tw = tween(dur, k => { OV.k = lerp(k0, 1, k); OV.pos.lerpVectors(p0, pose.pos, k); OV.tgt.lerpVectors(t0, pose.tgt, k); OV.fov = lerp(f0, pose.fov, k); OV.sx = lerp(x0, pose.sx, k); OV.sy = lerp(y0, pose.sy, k); }, done);
}
function ovOff(dur, done) { if (OV.tw) { const i = tweens.indexOf(OV.tw); if (i >= 0) tweens.splice(i, 1); } const k0 = OV.k; OV.tw = tween(dur, k => { OV.k = lerp(k0, 0, k); }, done); }

function gamePose() {
  const c = new THREE.Vector3(0, 0.02, 0.004).applyMatrix4(GM.MB), n = new THREE.Vector3().setFromMatrixColumn(GM.MB, 2).normalize(), fov = fovFor();
  if (LAY.p) {                                  // upright: the tube fills the screen between the top bar and the hint
    const t0 = LAY.hud + 8, t1 = LAY.vh - 46, dp = fitDist(0.5, 0.63, 0.94, (t1 - t0) / S.h * 0.98, fov);
    return { pos: c.clone().addScaledVector(n, dp), tgt: c, fov, sx: 0, sy: 0.5 - (t0 + t1) / 2 / S.h };
  }
  const d = fitDist(0.5, 0.63, 0.86, 0.7, fov);
  return { pos: c.clone().addScaledVector(n, d), tgt: c, fov, sx: 0, sy: 0 };
}
function gameEnter() {
  if (S.mode !== 'walk' || !S.gl) return;
  S.mode = 'game'; lockScroll(true); document.body.classList.add('is-busy'); setLabel(WK.li, false);
  gmStart('play'); gmHud(); $('#ghud').classList.add('is-on'); $('#gover').classList.remove('is-on');
  ovTo(gamePose(), RM ? 0.01 : 1.0); snd('coin');
  setTimeout(() => { const b = $('#gx'); if (b) b.focus({ preventScroll: true }); }, 60);
}
function gameExit() {
  if (S.mode !== 'game') return;
  S.mode = 'walk'; lockScroll(false); document.body.classList.remove('is-busy'); $('#ghud').classList.remove('is-on'); $('#gover').classList.remove('is-on');
  gmStart('attract'); GM.key = 0; ovOff(RM ? 0.01 : 0.9); snd('drop');
}
function gmHud() { $('#gscore').textContent = pad(GM.score, 6); $$('#glives i').forEach((el, i) => el.classList.toggle('is-off', i >= GM.lives)); $('#glv').textContent = pad(GM.level, 2); }
function gmOver() { $('#gfinal').textContent = pad(GM.score, 6); $('#gbest').textContent = GM.score >= GM.hi ? 'New high score' : 'High score ' + pad(GM.hi, 6); $('#gover').classList.add('is-on'); setTimeout(() => { const b = $('#gagain'); if (b) b.focus({ preventScroll: true }); }, 60); }
function gameAgain() { $('#gover').classList.remove('is-on'); gmStart('play'); gmHud(); snd('coin'); }
function gameEdges() {
  const a = new THREE.Vector3(-0.235, 0, 0).applyMatrix4(GM.MB).project(camera), b = new THREE.Vector3(0.235, 0, 0).applyMatrix4(GM.MB).project(camera);
  GM.edge[0] = (a.x * 0.5 + 0.5) * S.w; GM.edge[1] = (b.x * 0.5 + 0.5) * S.w;
}

function vrEnter() {
  if (S.mode !== 'walk' || VR.busy || !S.gl) return;
  VR.busy = true; lockScroll(true); document.body.classList.add('is-busy'); setLabel(WK.li, false); snd('whoosh');
  const fov = fovFor(), hp = VR.base, cur = { pos: CAMB.pos.clone(), tgt: CAMB.tgt.clone() };
  const dir = cur.pos.clone().sub(hp).setY(0).normalize();
  tween(RM ? 0.01 : 0.7, k => { VR.lift = k; });
  ovTo({ pos: new THREE.Vector3(hp.x + dir.x * 0.75, 1.5, hp.z + dir.z * 0.75), tgt: hp.clone(), fov, sx: 0, sy: 0 }, RM ? 0.01 : 1.1);
  tween(RM ? 0.01 : 0.45, k => { FX.fade = 1 - Math.max(0, k * 2.4 - 1.4); VR.pull = k; }, () => {
    FX.fade = 0; S.mode = 'vr'; S.lens = 0; vrReset(); $('#vrhud').classList.add('is-on');
    tween(0.6, k => { FX.fade = k; }, () => { tween(RM ? 0.01 : 0.9, k => { S.lens = k; }, () => { $('#vrhud').classList.add('is-stereo'); VR.busy = false; const b = $('#vrx'); if (b) b.focus({ preventScroll: true }); }); });
  }, t => t).t = RM ? 0 : -0.75;
}
function vrExit() {
  if (S.mode !== 'vr' || VR.busy) return;
  VR.busy = true; snd('whoosh'); $('#vrhud').classList.remove('is-stereo');
  tween(0.35, k => { FX.fade = 1 - k; }, () => {
    S.mode = 'walk'; S.lens = 0; VR.pull = 0; $('#vrhud').classList.remove('is-on'); OV.k = 0;
    tween(0.6, k => { FX.fade = k; VR.lift = 1 - k; }, () => { VR.busy = false; lockScroll(false); document.body.classList.remove('is-busy'); });
  });
}

function sysOpen(id) {
  if (S.mode !== 'walk') return;
  const x = EXH[id], bi = beatOf(id), b = BEATS[bi], fov = fovFor();
  S.mode = 'sys'; S.ch = 'demo'; lockScroll(true); document.body.classList.add('is-busy'); setLabel(WK.li, false);
  $('#sys-t').textContent = x.title; $('#sys-c').textContent = CAPS[b.cap].n;
  const wn = $('.win__name'); if (wn) wn.innerHTML = x.title + ' <span>/ ' + ['Pipeline', 'Operations', 'Analytics'][x.tab] + '</span>';
  $('#sys').classList.add('is-on'); demoTab(x.tab); setTimeout(() => { demoShow(); const c = $('#sysx'); if (c) c.focus({ preventScroll: true }); }, 380);
  const nl = Math.hypot(b.n[0], b.n[2]), d = fitDist(3.0, 2.0, 1.0, 1.0, fov) * 0.92;
  ovTo({ pos: new THREE.Vector3(b.t[0] + b.n[0] / nl * d, b.t[1], b.t[2] + b.n[2] / nl * d), tgt: new THREE.Vector3(b.t[0], b.t[1], b.t[2]), fov, sx: 0, sy: 0 }, RM ? 0.01 : 0.9);
  snd('whoosh');
}
function sysClose() {
  if (S.mode !== 'sys') return;
  S.mode = 'walk'; S.ch = ''; lockScroll(false); document.body.classList.remove('is-busy'); $('#sys').classList.remove('is-on'); ovOff(RM ? 0.01 : 0.8); snd('drop');
}

/* ---------- input ---------- */
function initWalk() {
  if (S.gl) {
    WK.ray = new THREE.Raycaster(); WK.ndc = new THREE.Vector2(); WK.tmp = new THREE.Vector3();
    OV.pos = new THREE.Vector3(); OV.tgt = new THREE.Vector3();
    [_A, _B].forEach(o => { o.pos = new THREE.Vector3(); o.tgt = new THREE.Vector3(); });
  }
  const st = $('#stage');
  window.addEventListener('touchstart', () => { GLD.touch = true; GLD.on = false; }, { passive: true });
  const tend = e => { GLD.touch = e.touches.length > 0; GLD.idle = 0; };
  window.addEventListener('touchend', tend, { passive: true }); window.addEventListener('touchcancel', tend, { passive: true });
  if (TOUCH) $('.ghud__hint').textContent = 'Drag to move the paddle';
  const free = t => !(t.closest && t.closest('button,a,input,.label,.plan,.hud,.sheet,.sys,.gover'));
  st.addEventListener('pointerenter', () => { WK.over = true; }); st.addEventListener('pointerleave', () => { WK.over = false; });
  st.addEventListener('pointermove', e => { WK.over = free(e.target); }, { passive: true });
  st.addEventListener('pointerdown', e => {
    if (!free(e.target) && S.mode === 'walk') return;
    WK.pd = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, moved: 0 };
    if (S.mode === 'walk' && BEATS[WK.i].id === 'ar' && WK.hold) { AR.drag = true; }
    if (S.mode === 'game') { gameEdges(); GM.tx = 6 + clamp((e.clientX - GM.edge[0]) / (GM.edge[1] - GM.edge[0])) * 228; }
  });
  window.addEventListener('pointermove', e => {
    if (S.mode === 'game' && (e.pointerType === 'mouse' || WK.pd)) { gameEdges(); GM.tx = 6 + clamp((e.clientX - GM.edge[0]) / (GM.edge[1] - GM.edge[0])) * 228; }
    const p = WK.pd; if (!p) return;
    const dx = e.clientX - p.lx, dy = e.clientY - p.ly; p.lx = e.clientX; p.ly = e.clientY; p.moved += Math.abs(dx) + Math.abs(dy);
    if (S.mode === 'vr') { VRC.ty += dx * 0.0046; VRC.tp = clamp(VRC.tp + dy * 0.0034, -0.75, 0.9); }
    else if (AR.drag) { AR.trot += dx * 0.009; AR.auto = 0; }
  }, { passive: true });
  const up = e => {
    const p = WK.pd; if (!p) return; WK.pd = null;
    if (AR.drag) { AR.drag = false; setTimeout(() => { AR.auto = 1; }, 2500); }
    if (e.type !== 'pointerup' || p.moved > 9 || S.mode !== 'walk' || !free(e.target)) return;
    const hit = rayAt(e.clientX, e.clientY); if (hit) act(hit.h.id, hit.h.idx);
  };
  window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (S.mode === 'game') gameExit(); else if (S.mode === 'vr') vrExit(); else if (S.mode === 'sys') sysClose(); else closeSheet(); return; }
    const dir = (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') ? -1 : (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') ? 1 : 0;
    if (S.mode === 'game' && dir) { GM.key = dir; e.preventDefault(); }
    else if (S.mode === 'vr' && dir) { VR.key = -dir; e.preventDefault(); }
    /* while you are playing, wearing or using something, the page behind stays put */
    const busy = S.mode !== 'walk' || VR.busy || $('#cat').classList.contains('is-on');
    if (busy && [' ', 'PageDown', 'PageUp', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key) && !(e.target.closest && e.target.closest('input,textarea,button,a,[data-scrollable]'))) e.preventDefault();
  });
  window.addEventListener('keyup', e => { if (/^(Arrow(Left|Right)|[adAD])$/.test(e.key)) { GM.key = 0; VR.key = 0; } });
  document.addEventListener('click', e => {
    const t = e.target.closest ? e.target : null; if (!t) return;
    const sb = t.closest('[data-step]'); if (sb) { goBeat(+sb.dataset.step < 0 ? Math.max(0, WK.hold ? WK.i - 1 : WK.i) : Math.min(BEATS.length - 1, WK.i + 1)); snd('tick'); return; }
    const a = t.closest('[data-act]'); if (a) { primary(a.dataset.act); return; }
    const r = t.closest('[data-ar]'); if (r) { arSet(+r.dataset.ar); return; }
    const g = t.closest('[data-go]'); if (g) { closeSheet(); goBeat(+g.dataset.go); snd('tick'); return; }
  });
  $('#gx').addEventListener('click', gameExit); $('#gleave').addEventListener('click', gameExit); $('#gagain').addEventListener('click', gameAgain);
  $('#vrx').addEventListener('click', vrExit); $('#sysx').addEventListener('click', sysClose);
  $('#sys').addEventListener('click', e => { if (e.target.id === 'sys') sysClose(); });
}

/* ---------- every frame ---------- */
function updateWalk(dt) {
  const s = clamp((S.sm - LAY.top) / LAY.U, 0, TOTAL); S.s = s;
  const N = BEATS.length;
  let i = Math.min(N - 1, Math.floor(s / SPAN)), f = s - i * SPAN;
  const last = i === N - 1, hold = last || f <= HOLD;
  WK.i = i; WK.f = f; WK.hold = hold;
  const li = (hold || f < HOLD + MOVE * 0.5) ? i : i + 1, lon = li === i ? f < HOLD + 0.16 : f > SPAN - 0.2;
  if (S.ready) setLabel(li, lon);
  if (!S.gl) return;
  if (hold) beatPose(i, clamp(f / (last ? HOLD_END : HOLD)), CAMB); else pathPose(i, (f - HOLD) / MOVE, CAMB);
  /* a breath of movement, and the pointer leans the view */
  const ease = 1 - OV.k;
  if (!RM) { CAMB.pos.y += Math.sin(S.time * 0.7) * 0.006 + (hold ? 0 : Math.sin(f * 9.5) * 0.014); }
  CAMB.yaw = (0.5 - S.spx) * 0.085 * (TOUCH ? 0 : 1) * ease; CAMB.pitch = (0.5 - S.spy) * 0.05 * (TOUCH ? 0 : 1) * ease;
  if (OV.k > 0.0005) {
    const k = OV.k; CAMB.pos.lerp(OV.pos, k); CAMB.tgt.lerp(OV.tgt, k); CAMB.fov = lerp(CAMB.fov, OV.fov, k); CAMB.sx = lerp(CAMB.sx, OV.sx, k); CAMB.sy = lerp(CAMB.sy, OV.sy, k);
  }
  const room = clamp(Math.floor((6 - CAMB.pos.z) / RD), 0, 5);
  if (room !== WK.room) { WK.room = room; S.dimIdx = room; sndRoom(room); $('#rm').textContent = room ? 'Room ' + ROOMS[room].num + '  ·  ' + ROOMS[room].name : 'Foyer'; }
  const light = CAMB.pos.z < -52.4;
  if (light !== WK.light) { WK.light = light; document.documentElement.classList.toggle('is-light', light); }
  FX.exp = damp(FX.exp, room === 5 ? 0.86 : 1.0, 2.5, dt);
  planDot(CAMB.pos.x, CAMB.pos.z, s / TOTAL);
  if (S.mode === 'game') gameEdges();
  /* AR dimension tag follows the hologram */
  const tag = WK.el ? WK.el.tag : $('#artag');
  if (BEATS[li].id === 'ar' && lon && S.mode === 'walk') {
    WK.tmp.set(AR.grp.position.x, 0.2 + AR.tops[AR.i] + 0.24, AR.grp.position.z).project(camera);
    tag.style.transform = 'translate(' + ((WK.tmp.x * 0.5 + 0.5) * S.w).toFixed(1) + 'px,' + Math.max(118, (-WK.tmp.y * 0.5 + 0.5) * S.h).toFixed(1) + 'px) translate(-50%,-100%)'; tag.classList.add('is-on');
  } else tag.classList.remove('is-on');
}
