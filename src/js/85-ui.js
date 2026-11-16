/* ============================================================
   UI: sound, cursor, loader, floor plan, catalogue
   ============================================================ */
const AU = { ctx: null, on: false, master: null, filt: null, osc: [] };
const CHORDS = [[55, 82.41, 110, 164.81], [49, 73.42, 98, 146.83], [43.65, 65.41, 87.31, 130.81], [51.91, 77.78, 103.83, 155.56], [58.27, 87.31, 116.54, 174.61], [65.41, 98, 130.81, 196]];
const CUTS = [420, 640, 780, 560, 900, 1500];
function sndInit() {
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
  try {
    const c = new AC(); AU.ctx = c;
    AU.master = c.createGain(); AU.master.gain.value = 0; AU.master.connect(c.destination);
    AU.filt = c.createBiquadFilter(); AU.filt.type = 'lowpass'; AU.filt.frequency.value = CUTS[S.dimIdx]; AU.filt.Q.value = 0.7;
    const pg = c.createGain(); pg.gain.value = 0.11; AU.filt.connect(pg); pg.connect(AU.master);
    const dl = c.createDelay(1); dl.delayTime.value = 0.41; const fb = c.createGain(); fb.gain.value = 0.38; pg.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(AU.master);
    CHORDS[S.dimIdx].forEach((f, i) => { const o = c.createOscillator(); o.type = i % 2 ? 'sawtooth' : 'triangle'; o.frequency.value = f; o.detune.value = (i - 1.5) * 8; const g = c.createGain(); g.gain.value = i < 2 ? 0.5 : 0.2; o.connect(g); g.connect(AU.filt); o.start(); AU.osc.push(o); });
    const l = c.createOscillator(); l.frequency.value = 0.06; const lg = c.createGain(); lg.gain.value = 140; l.connect(lg); lg.connect(AU.filt.frequency); l.start();
    return true;
  } catch (e) { return false; }
}
function sndToggle() {
  if (!AU.ctx && !sndInit()) return;
  AU.on = !AU.on;
  if (AU.ctx.state === 'suspended') AU.ctx.resume();
  AU.master.gain.setTargetAtTime(AU.on ? 0.9 : 0, AU.ctx.currentTime, 0.25);
  $('#snd').setAttribute('aria-pressed', AU.on); $('#sndt').textContent = AU.on ? 'Sound on' : 'Sound off';
}
function blip(f, dur, vol, type = 'sine', delay = 0) {
  const c = AU.ctx, t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.value = f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(AU.master); o.start(t); o.stop(t + dur + 0.05);
}
function noise(dur, vol, freq, sweep) {
  const c = AU.ctx, t = c.currentTime, n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const s = c.createBufferSource(); s.buffer = buf; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.9; f.frequency.setValueAtTime(freq, t);
  if (sweep) f.frequency.exponentialRampToValueAtTime(freq * 3.2, t + dur);
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(AU.master); s.start(t);
}
function snd(name, arg) {
  if (!AU.on) return;
  try {
    if (name === 'tick') blip(1500, 0.04, 0.045);
    else if (name === 'drop') blip(380, 0.1, 0.1, 'triangle');
    else if (name === 'win') [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => blip(f, 0.22, 0.1, 'triangle', i * 0.07));
    else if (name === 'whoosh') noise(0.7, 0.07, 500, true);
    else if (name === 'place') { blip(660, 0.14, 0.09); blip(990, 0.22, 0.07, 'sine', 0.06); }
    else if (name === 'pad') blip(330, 0.07, 0.11, 'square');
    else if (name === 'wall') blip(220, 0.04, 0.05, 'square');
    else if (name === 'brick') blip(520 + (6 - (arg || 0)) * 70, 0.08, 0.09, 'square');
    else if (name === 'lose') { blip(196, 0.3, 0.12, 'sawtooth'); blip(147, 0.4, 0.12, 'sawtooth', 0.12); }
    else if (name === 'coin') { blip(988, 0.08, 0.1, 'square'); blip(1319, 0.3, 0.1, 'square', 0.08); }
    else if (name === 'lights') noise(0.09, 0.2, 180, false);
  } catch (e) {}
}
function sndRoom(i) {
  if (!AU.ctx) return;
  const t = AU.ctx.currentTime;
  AU.osc.forEach((o, k) => o.frequency.setTargetAtTime(CHORDS[i][k], t, 0.7));
  AU.filt.frequency.setTargetAtTime(CUTS[i], t, 0.9);
}

/* ---------- cursor ---------- */
const CUR = { el: null, ring: null, dot: null, x: 0, y: 0, rx: 0, ry: 0, on: false, label: '', pt: 0 };
function initCursor() {
  CUR.el = $('#cur'); CUR.ring = $('.cur__r'); CUR.dot = $('.cur__d');
  window.addEventListener('pointermove', e => {
    S.px = e.clientX / S.w; S.py = e.clientY / S.h; S.pin = true;
    if (e.pointerType === 'mouse' && !TOUCH && (e.clientX > 0 || e.clientY > 0)) {
      CUR.x = e.clientX; CUR.y = e.clientY;
      if (!CUR.on) { CUR.on = true; CUR.rx = CUR.x; CUR.ry = CUR.y; document.documentElement.classList.add('has-cur'); }
      cursorProbe(e.target);
      CUR.el.classList.remove('is-out');
    }
  }, { passive: true });
  const out = () => { S.pin = false; CUR.el.classList.add('is-out'); };
  document.addEventListener('pointerleave', out); document.documentElement.addEventListener('mouseleave', out);
  window.addEventListener('blur', () => { S.pin = false; });
}
function cursorProbe(target) {
  const t = target && target.closest ? target.closest('[data-cursor],a,button,input,.deal') : null;
  const lab = t ? (t.closest('[data-cursor]') ? t.closest('[data-cursor]').dataset.cursor : '') : '';
  const label = (t && t.matches('a,button,input,.deal') && !t.dataset.cursor) ? '' : lab;
  if (label !== CUR.label) { CUR.label = label; $('#curt').textContent = label; }
  CUR.el.classList.toggle('is-label', !!label && S.mode === 'walk');
  CUR.el.classList.toggle('is-link', !!t && !label);
}
function updateCursor(dt) {
  S.spx = damp(S.spx, S.pin ? S.px : 0.5, 4, dt); S.spy = damp(S.spy, S.pin ? S.py : 0.5, 4, dt);
  if (!CUR.on) return;
  CUR.pt += dt;
  if (CUR.pt > 0.12) { CUR.pt = 0; cursorProbe(document.elementFromPoint(CUR.x, CUR.y)); }
  CUR.rx = damp(CUR.rx, CUR.x, 16, dt); CUR.ry = damp(CUR.ry, CUR.y, 16, dt);
  CUR.dot.style.transform = 'translate(' + CUR.x + 'px,' + CUR.y + 'px)';
  CUR.ring.style.transform = 'translate(' + CUR.rx.toFixed(1) + 'px,' + CUR.ry.toFixed(1) + 'px)';
}

/* ---------- loader ---------- */
const LD = { p: 0, shown: 0, done: false, msgs: ['Unlocking the doors', 'Dusting the plinths', 'Hanging the screens', 'Warming up the cabinet', 'Finding the light switch'] };
function loadStep(p) { LD.p = Math.max(LD.p, p); }
function updateLoader(dt) {
  if (LD.done) return;
  LD.shown = Math.min(LD.p, LD.shown + dt * 130);
  const n = Math.floor(LD.shown);
  $('#ldn').textContent = pad(n, 3); $('#ldb').style.setProperty('--p', (n / 100).toFixed(2));
  $('#ldm').textContent = LD.msgs[Math.min(4, Math.floor(n / 20.01))];
  if (n >= 100) {
    LD.done = true; $('#loader').classList.add('is-done');
    S.ready = true;
    if (RM || (DBG && DBG.fast)) { S.intro = 1; FX.fade = 1; }
    else { tween(1.0, k => { FX.fade = k; }); tween(3.6, k => { S.intro = k; }, null, t => t); }
  }
}

/* ---------- floor plan ---------- */
const PL = { W: 21, x0: 2, y0: 3, H: 20, first: [0, 1, 2, 5, 9, 11], dot: null };
function buildPlan() {
  const W = PL.W, x0 = PL.x0, y0 = PL.y0, H = PL.H;
  let s = '';
  ROOMS.forEach((r, k) => { s += `<rect class="pl__r" data-k="${k}" x="${x0 + k * W}" y="${y0}" width="${W}" height="${H}"/>`; });
  let d = `M${x0} ${y0}H${x0 + 6 * W}V${y0 + H}H${x0}Z`;
  for (let k = 1; k < 6; k++) { const x = x0 + k * W; d += `M${x} ${y0}V${y0 + H / 2 - 2.6}M${x} ${y0 + H / 2 + 2.6}V${y0 + H}`; }
  s += `<path class="pl__w" d="${d}"/>`;
  ROOMS.forEach((r, k) => { s += `<text class="pl__t" data-k="${k}" x="${x0 + k * W + W / 2}" y="${y0 + H + 7.4}">${r.num || 'F'}</text>`; });
  BEATS.forEach((b, i) => { if (!b.t) return; const px = x0 + ((6 - b.t[2]) / 72) * 6 * W, py = y0 + H / 2 + (b.t[0] / 6.5) * (H / 2 - 1.8); s += `<rect class="pl__e" data-i="${i}" x="${(px - 1).toFixed(2)}" y="${(py - 1).toFixed(2)}" width="2" height="2"/>`; });
  s += `<circle class="pl__d" id="pld" r="1.5" cx="${x0 + 3}" cy="${y0 + H / 2}"/>`;
  $('#plan').innerHTML = `<svg viewBox="0 0 ${x0 * 2 + 6 * W} ${y0 + H + 10}" aria-hidden="true">${s}</svg>` +
    ROOMS.map((r, k) => `<button type="button" data-go="${PL.first[k]}" style="left:${((x0 + k * W) / (x0 * 2 + 6 * W) * 100).toFixed(2)}%;width:${(W / (x0 * 2 + 6 * W) * 100).toFixed(2)}%" aria-label="Go to ${r.num ? 'Room ' + r.num + ', ' + r.name : 'the foyer'}" title="${r.num ? 'Room ' + r.num + ': ' + r.name : 'Foyer'}"></button>`).join('');
  PL.dot = $('#pld');
}
function planDot(x, z, p) {
  if (!PL.dot) return;
  PL.dot.setAttribute('cx', (PL.x0 + ((6 - z) / 72) * 6 * PL.W).toFixed(2)); PL.dot.setAttribute('cy', (PL.y0 + PL.H / 2 + (x / 6.5) * (PL.H / 2 - 1.8)).toFixed(2));
  const bar = PL.bar || (PL.bar = $('#prog')); if (bar && p !== PL.p) { PL.p = p; bar.style.setProperty('--p', p.toFixed(4)); }
}
function planMark(i) {
  const k = BEATS[i].room;
  $$('#plan .pl__r,#plan .pl__t').forEach(el => el.classList.toggle('is-on', +el.dataset.k === k));
  $$('#plan .pl__e').forEach(el => el.classList.toggle('is-on', +el.dataset.i === i));
  $('#stopn').textContent = i === 0 ? 'Floor plan' : 'Stop ' + pad(i, 2) + ' of ' + (BEATS.length - 1);
  $('#prev').disabled = i === 0; $('#next').disabled = i === BEATS.length - 1;
}

/* ---------- guided tour: the page walks itself, pausing at each piece, until you take over ---------- */
const TOUR = { on: false, y: 0 };
function tourSet(on) {
  if (on === TOUR.on || (on && !S.gl)) return;
  TOUR.on = on; TOUR.y = window.scrollY;
  $$('[data-tour]').forEach(b => b.setAttribute('aria-pressed', on));
  $('#tourb').textContent = on ? 'Stop the tour' : 'Guided tour';
  $('#hintt').textContent = on ? (TOUCH ? 'Guided tour. Touch to take over.' : 'Guided tour. Scroll to take over.') : (TOUCH ? 'Swipe up to walk' : 'Scroll to walk');
  $('#hint').classList.toggle('is-off', !on && S.scrolled); $('#hint').classList.toggle('is-tour', on);
  if (on) { closeSheet(); snd('place'); }
}
function updateTour(dt) {
  if (!TOUR.on) return;
  if (S.mode !== 'walk' || VR.busy) return;                      // it waits while you play with something
  const end = LAY.top + (TOTAL - 0.35) * LAY.U;
  const speed = (WK.hold ? (WK.i === 0 ? 0.3 : 0.16) : 0.36) * LAY.U;
  TOUR.y = Math.min(end, Math.max(TOUR.y, window.scrollY) + speed * dt);
  window.scrollTo(0, TOUR.y);
  if (TOUR.y >= end) tourSet(false);
}

/* ---------- catalogue ---------- */
const contactHTML = () => `<button class="mail" type="button" data-copy><b>hello@your-domain.com</b><small class="mono">Click to copy</small></button>`;
function buildCatalogue() {
  const rows = BEATS.map((b, i) => ({ b, i, x: EXH[b.id] })).filter(r => r.x).sort((p, q) => p.x.acc.slice(-2) - q.x.acc.slice(-2));
  $('#catp').innerHTML = `<div class="cat__top"><p class="mono"><span data-studio>${STUDIO}</span> / The Collection</p><button class="btn" type="button" data-close>Close</button></div>
    <h2 class="cat__h" id="cat-h">Catalogue</h2>
    <p class="cat__l">Ten pieces in five rooms. Each one stands for something we build. The works shown are samples, there to be replaced with real projects.</p>
    <ol class="cat">${rows.map(r => `<li><button type="button" data-go="${r.i}">
      <span class="cat__n mono">${r.x.acc}</span>
      <span class="cat__t"><span><em>${r.x.title}</em>, ${r.x.year}</span><small>${CAPS[r.b.cap].n}</small></span>
      <span class="cat__b">${CAPS[r.b.cap].p}<span class="tags mono">${CAPS[r.b.cap].t.map(t => `<i>${t}</i>`).join('')}</span></span>
      <span class="cat__r mono">Room ${ROOMS[r.b.room].num}</span></button></li>`).join('')}</ol>
    <div class="cat__c"><p class="mono">Commission a piece</p>${contactHTML()}<p class="cat__s">[Phone number] &nbsp;/&nbsp; [City], United Kingdom. We reply within one working day.</p></div>`;
}
function openSheet() { const s = $('#cat'); if (s.classList.contains('is-on')) return; s.classList.add('is-on'); lockScroll(true); snd('whoosh'); setTimeout(() => { const b = $('#cat [data-close]'); if (b) b.focus({ preventScroll: true }); }, 80); }
function closeSheet() { const s = $('#cat'); if (!s.classList.contains('is-on')) return; s.classList.remove('is-on'); lockScroll(false); }

function initUI() {
  $$('[data-studio]').forEach(el => { el.textContent = STUDIO; });
  $$('[data-yr]').forEach(el => { el.textContent = new Date().getFullYear(); });
  buildPlan(); buildCatalogue(); arUI();
  if (TOUCH) $('#hintt').textContent = 'Swipe up to walk';
  $('#commission-mail').innerHTML = contactHTML();
  $('#snd').addEventListener('click', sndToggle);
  $('#catb').addEventListener('click', openSheet);
  $$('[data-tour]').forEach(b => b.addEventListener('click', () => tourSet(!TOUR.on)));
  ['wheel', 'touchstart', 'keydown'].forEach(ev => window.addEventListener(ev, e => { if (TOUR.on && !(ev === 'keydown' && (e.key === 'Enter' || e.key === ' ' || e.key === 'Tab'))) tourSet(false); }, { passive: true }));
  $('#cat').addEventListener('click', e => { if (e.target.id === 'cat' || e.target.closest('[data-close]')) closeSheet(); });
  $('#logo').addEventListener('click', e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: RM ? 'auto' : 'smooth' }); });
  $('#prev').addEventListener('click', () => { goBeat(Math.max(0, WK.hold ? WK.i - 1 : WK.i)); snd('tick'); });
  $('#next').addEventListener('click', () => { goBeat(Math.min(BEATS.length - 1, WK.i + 1)); snd('tick'); });
  initCursor();
  document.addEventListener('click', e => {
    const m = e.target.closest ? e.target.closest('[data-copy]') : null; if (!m) return;
    const b = $('b', m), sm = $('small', m), ok = () => { sm.textContent = 'Copied'; setTimeout(() => { sm.textContent = 'Click to copy'; }, 1800); };
    const fb = () => { const r = document.createRange(); r.selectNodeContents(b); const s = getSelection(); s.removeAllRanges(); s.addRange(r); sm.textContent = 'Selected. Press Ctrl or Cmd + C'; };
    try { navigator.clipboard.writeText(b.textContent).then(ok, fb); } catch (err) { fb(); }
    snd('place');
  });
  const clock = () => { try { $('#clock').textContent = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' }).format(new Date()) + ' UK'; } catch (e) {} };
  clock(); setInterval(clock, 20000);
  document.addEventListener('pointerover', e => { if (AU.on && e.target.closest && e.target.matches('a,button') && e.pointerType === 'mouse') snd('tick'); });
}
