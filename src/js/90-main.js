/* ============================================================
   MAIN
   ============================================================ */
let _rz = 0, _last = 0, _lit = -1, _cl = 0;
function layout() {
  const cv = $('#gl');
  S.w = (S.gl && cv.clientWidth) || document.documentElement.clientWidth || innerWidth;
  S.h = (S.gl && cv.clientHeight) || innerHeight;
  if (S.gl) {
    const cap = Math.sqrt((S.tier ? 3.4e6 : 1.7e6) / Math.max(1, S.w * S.h));
    if (!(DBG && DBG.dpr) && S.dpr > cap) S.dpr = Math.max(0.7, cap);
    /* phone browsers fire a resize every time their address bar slides away. The canvas is sized so that never changes it, and then nothing is rebuilt */
    if (S.w !== RSZ.w || S.h !== RSZ.h || S.dpr !== RSZ.d) resizeGL();
  }
  measure();
  if (S.gl && S.mode === 'game') ovTo(gamePose(), 0.01);
  if (DM.ok && DM.tab === 2) sizeChart();
}
function frame(ms) {
  requestAnimationFrame(frame);
  const now = ms / 1000, raw = _last ? now - _last : 0.016; _last = now;
  const dt = Math.min(raw, DBG && DBG.fast ? 0.6 : 0.05); S.dt = dt; S.time += dt * (RM ? 0.4 : 1);
  updateGlide(dt);
  S.y = window.scrollY;
  S.sm = (Math.abs(S.y - S.sm) < 0.05 || (DBG && DBG.snap)) ? S.y : damp(S.sm, S.y, RM ? 60 : 6.5, dt);
  runTweens(dt); updateLoader(dt); updateCursor(dt);
  updateTour(dt); updateWalk(dt);
  if (S.y > 40 && !S.scrolled) { S.scrolled = true; if (!TOUR.on) $('#hint').classList.add('is-off'); }
  if (S.gl && !S.lost) {
    /* the lights come on one room at a time, front to back */
    let lit = 0;
    SC.rooms.forEach((r, k) => {
      const x = S.intro * 8.2 - 0.5 - k * 1.1, v = ss(0, 1, x), fl = (x > 0 && x < 1 && Math.sin(x * 46) < -0.2) ? 0.35 : 1;
      r.on.value = v * fl; if (x > 0) lit++;
    });
    if (lit !== _lit) { if (_lit >= 0 && lit > _lit) snd('lights'); _lit = lit; }
    SC.dustU.uOn.value = S.intro;
    hoverUpdate();
    updateExhibits(dt, WK.room);
    if (S.mode === 'vr') updateVR(dt);
    updateScreens(dt, WK.room);
    renderGL(); adaptQuality(raw);
  }
  updateDemo(dt);
}
function glFail() {
  if (!S.gl) return;
  S.gl = false; S.lost = false; document.documentElement.classList.add('no-gl'); document.documentElement.classList.remove('gl-on', 'is-light', 'is-p', 'is-tall', 'is-short');
  $('#walk').style.height = ''; S.ready = true; LD.p = 100; setLabel(0, true);
  $('#hero').classList.add('is-in'); $('#commission').classList.add('is-in');
}
function glHealthy() {
  try {
    renderGL();
    return !(renderer.info.programs || []).some(p => p.diagnostics && p.diagnostics.runnable === false);
  } catch (e) { return false; }
}
function boot() {
  S.mode = 'walk'; S.lens = 0; S.intro = 0; FX.fade = 0;
  S.gl = initGL();
  document.documentElement.classList.toggle('no-gl', !S.gl);
  document.documentElement.classList.toggle('gl-on', S.gl);
  loadStep(18);
  if (S.gl) { try { buildScene(); } catch (e) { S.gl = false; document.documentElement.classList.add('no-gl'); document.documentElement.classList.remove('gl-on'); } }
  loadStep(52);
  initDemo(); initWalk(); initUI(); loadStep(74);
  layout(); S.y = S.sm = window.scrollY;
  window.addEventListener('resize', () => { clearTimeout(_rz); _rz = setTimeout(layout, 120); });
  if (S.gl) {
    try { renderer.compile(scene, camera); renderer.compile(vrScene, camera); } catch (e) {}
    if (!glHealthy()) glFail();
    else {
      /* phones take the graphics context away while a tab sits in the background and hand it back afterwards: wait for it,
         and only fall back to the plain page if it has not come back a few seconds after you return */
      const cv = $('#gl'), arm = () => { clearTimeout(_cl); if (S.lost && !document.hidden) _cl = setTimeout(() => { if (S.lost) glFail(); }, 4000); };
      cv.addEventListener('webglcontextlost', e => { e.preventDefault(); S.lost = true; arm(); });
      cv.addEventListener('webglcontextrestored', () => {
        clearTimeout(_cl);
        try { rtScene = rtRefl = rtReflB = rtReflC = rtLDR = null; bloom = []; resizeGL(); S.lost = false; if (!glHealthy()) glFail(); } catch (e) { S.lost = false; glFail(); }   // the old targets died with the old context
      });
      document.addEventListener('visibilitychange', arm);
      calibrate();
    }
  }
  loadStep(88);
  /* every screen gets its first picture before the doors open, so none is ever seen blank on a slow phone */
  const go = () => { if (S.gl) { paintDecals(); SC.screens.forEach(s => { try { s.draw(s, S.time + s.t0); s.tex.needsUpdate = true; } catch (e) {} }); } layout(); loadStep(100); };
  const fl = document.fonts;
  if (fl && fl.load) {
    const want = ['500 40px "Bodoni Moda"', 'italic 500 40px "Bodoni Moda"', 'italic 800 40px "Bodoni Moda"', '500 20px "Hanken Grotesk"', '600 20px "Hanken Grotesk"', '500 12px "IBM Plex Mono"'].map(f => fl.load(f).catch(() => 0));
    Promise.race([Promise.all(want), new Promise(r => setTimeout(r, 2200))]).then(go, go);
    if (fl.addEventListener) fl.addEventListener('loadingdone', () => { if (S.gl) { try { paintDecals(); } catch (e) {} } clearTimeout(_rz); _rz = setTimeout(layout, 120); });
  } else go();
  if (!S.gl) { S.ready = true; setLabel(0, true); }
  if (DBG) { window.__S = S; window.__L = LAY; window.__W = WK; window.__GM = GM; window.__VR = VR; window.__C = CAMB; window.__SC = SC; window.__X = { LAY, GLD, band, updateGlide, act, primary, goBeat, gameEnter, gameExit, vrEnter, vrExit, sysOpen, sysClose, arSet, mrFocus, phoneNext, VRC, OV, FX, pathPose, beatPose, BEATS, THREE, gmStep, gmStart }; }
  requestAnimationFrame(frame);
}
boot();
