/**
 * @file Application Entry Point
 * Orchestrates modules, initializes the application, and manages integration.
 */

(function() {
  // --- MODULE INITIALIZATION ---
  const Config = globalThis.AstroCfg;
  const Utils = globalThis.AstroUtils;
  const UI = globalThis.UIManager;
  const CanvasMgr = globalThis.CanvasManager;
  const Handlers = globalThis.EventHandlers;

  // --- STATE INITIALIZATION ---
  const stateManager = new globalThis.StateManager({
    aspEn: Object.fromEntries(Config.ASPECTS.map(a => [a.angle, a.en])),
    pairs: [],
    pairData: [],
    colorIdx: 0,
    nColorIdx: 0,
    natalLons: null,
    cachedRaw: null,
    CW: 0,
    CH: 0
  });

  // --- RENDER COORDINATION ---

  /**
   * Re-renders all UI components when state changes.
   */
  function renderApp() {
    const state = stateManager.getState();

    UI.renderChips(
      state.pairs,
      Config,
      id => Handlers.removePair(id, stateManager),
      id => Handlers.togglePair(id, stateManager)
    );

    UI.renderAspBar(
      state.aspEn,
      Config,
      angle => Handlers.toggleAspect(angle, stateManager),
      (aspect, newScore) => Handlers.changeAspectScore(aspect, newScore, stateManager)
    );

    drawChart();
  }

  /**
   * Initiates canvas rendering.
   */
  function drawChart() {
    const canvasData = CanvasMgr.setupCanvas();
    if (canvasData) {
      CanvasMgr.drawChart(canvasData, stateManager);
    }
  }

  // --- STATE LISTENERS ---

  /**
   * Listen for state changes and re-render.
   */
  stateManager.addEventListener('stateChange', () => {
    renderApp();
  });

  // --- MOUSE TOOLTIP LOGIC ---

  const cv = document.getElementById('cv');
  const tt = document.getElementById('tt');
  const vline = document.getElementById('vline');

  if (cv && tt && vline) {
    cv.addEventListener('mouseenter', () => {
      vline.style.display = 'block';
    });

    cv.addEventListener('mousemove', e => {
      const state = stateManager.getState();
      const CW = stateManager.CW || state.CW; // Use live width from instance if available

      if (!state.pairData.length) {
        tt.style.display = 'none';
        vline.style.display = 'none';
        return;
      }

      const r = cv.getBoundingClientRect();
      const mx = e.clientX - r.left;
      const my = e.clientY - r.top;

      const sJD = globalThis.Astro.toJD(document.getElementById('sd').value);
      const eJD = globalThis.Astro.toJD(document.getElementById('ed').value);
      const iw = CW - Config.MARGIN_LEFT - Config.MARGIN_RIGHT;

      if (mx < Config.MARGIN_LEFT || mx > CW - Config.MARGIN_RIGHT) {
        tt.style.display = 'none';
        vline.style.display = 'none';
        return;
      }

      vline.style.display = 'block';
      vline.style.left = mx + 'px';

      const hJD = sJD + (mx - Config.MARGIN_LEFT) / iw * (eJD - sJD);
      const d = new Date((hJD - 2440587.5) * 86400000);
      const padZero = n => String(n).padStart(2, '0');
      let html = `<div class="tt-date">${padZero(d.getUTCDate())}/${padZero(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}</div>`;

      state.pairData.filter(p => p.vis).forEach(pd => {
        if (!pd.pts?.length) return;

        const closestPoint = pd.pts.reduce((a, b) =>
          Math.abs(b.jd - hJD) < Math.abs(a.jd - hJD) ? b : a
        );

        const tag = pd.type === 'tn' ? '<span class="tt-tn">T→N</span> ' : '';
        html += `<div>${tag}<span style="color:${pd.col}">${Config.SYM[pd.p1]}${pd.p1}–${Config.SYM[pd.p2]}${pd.p2}${pd.type === 'tn' ? '(n)' : ''}</span> <span class="tt-angle">${closestPoint.a.toFixed(1)}°</span></div>`;
      });

      if (state.cachedRaw) {
        const smoothing = parseInt(document.getElementById('sm-sl').value, 10) || 5;
        const scores = Utils.smoothArr(state.cachedRaw, smoothing);
        if (scores.length) {
          const closestScore = scores.reduce((a, b) =>
            Math.abs(b.jd - hJD) < Math.abs(a.jd - hJD) ? b : a
          );
          const col = closestScore.v > Config.SCORE_THRESHOLD_POS
            ? '#34d399'
            : (closestScore.v < Config.SCORE_THRESHOLD_NEG ? '#f87171' : '#fcd34d');
          html += `<div class="tt-index">Index: <span style="color:${col}">${closestScore.v.toFixed(2)}</span></div>`;
        }
      }

      tt.innerHTML = html;
      tt.style.display = 'block';
      tt.style.left = (mx + 12) + 'px';
      tt.style.top = (my - 8) + 'px';
    });

    cv.addEventListener('mouseleave', () => {
      tt.style.display = 'none';
      vline.style.display = 'none';
    });
  }

  // --- EVENT LISTENERS ---

  UI.initPlanetSelects(Config.PLANETS, Config);

  // Set default values
  document.getElementById('np1').value = 'Jupiter';
  document.getElementById('np2').value = 'Saturn';
  document.getElementById('tp1').value = 'Saturn';
  document.getElementById('tp2').value = 'Mars';

  // Mode selector
  document.getElementById('mode-sel').addEventListener('change', () => {
    Handlers.runCalc(stateManager);
  });

  // Calculate button
  document.querySelector('.btn-calcular').addEventListener('click', () => {
    Handlers.runCalc(stateManager);
  });

  // Add T-T pair button
  document.querySelector('.btn2').addEventListener('click', () => {
    Handlers.addPairTT(null, null, stateManager);
  });

  // Add 10 outer planets button
  document.querySelector('.btn-externos').addEventListener('click', () => {
    Handlers.add10Externos(stateManager);
  });

  // Add T-N pair button
  document.querySelector('.btn3').addEventListener('click', () => {
    Handlers.addPairTN(stateManager);
  });

  // Calculate natal button
  document.querySelector('.natal-bar .btn3').addEventListener('click', () => {
    Handlers.calcNatal(stateManager);
  });

  // Orb slider - changes orb tolerance, must invalidate score cache
  document.getElementById('orb-sl').addEventListener('input', function() {
    document.getElementById('orb-v').textContent = this.value + '°';
    this.setAttribute('aria-valuenow', this.value);
    // Invalidate score cache and let state listener re-render
    stateManager.setState({ cachedRaw: null });
  });

  // Smoothing slider - doesn't change state, just redraw
  document.getElementById('sm-sl').addEventListener('input', function() {
    document.getElementById('sm-v').textContent = this.value + 'pts';
    this.setAttribute('aria-valuenow', this.value);
    // Direct render without state change to avoid infinite loop
    drawChart();
  });

  // Window resize
  window.addEventListener('resize', () => {
    drawChart();
  });

  // --- INITIALIZATION ---

  renderApp();
  Handlers.addPairTT('Jupiter', 'Saturn', stateManager);
  Handlers.runCalc(stateManager);
})();
