/**
 * @file Application Entry Point
 * Orchestrates modules, initializes the application, and manages integration.
 */

(function() {
  // --- MODULE INITIALIZATION ---
  const Config    = globalThis.AstroCfg;
  const Utils     = globalThis.AstroUtils;
  const UI        = globalThis.UIManager;
  const CanvasMgr = globalThis.CanvasManager;
  const Handlers  = globalThis.EventHandlers;

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
   * stateManager is passed to setupCanvas so it can compute the dynamic
   * timeline height from the current visible planets.
   */
  function drawChart() {
    const canvasData = CanvasMgr.setupCanvas(stateManager);
    if (canvasData) {
      CanvasMgr.drawChart(canvasData, stateManager);
    }
  }

  // --- STATE LISTENERS ---

  stateManager.addEventListener('stateChange', () => {
    renderApp();
  });

  // --- MOUSE TOOLTIP LOGIC ---

  const cv     = document.getElementById('cv');
  const tt     = document.getElementById('tt');
  const vline  = document.getElementById('vline');

  /**
   * Positions the tooltip safely within the viewport.
   * @param {MouseEvent|TouchEvent} e - The event object.
   * @param {boolean} isTouch - True if it's a touch event, false otherwise.
   */
  function positionTooltip(e, isTouch = false) {
    const state = stateManager.getState();
    const r  = cv.getBoundingClientRect();
    let mx, my; // Coordinates relative to the canvas

    if (isTouch) {
      const touch = e.touches[0];
      mx = touch.clientX - r.left;
      my = touch.clientY - r.top;
    } else {
      mx = e.clientX - r.left;
      my = e.clientY - r.top;
    }

    const canvasWidth = r.width;

    // Always check bounds and show/hide vline accordingly
    if (mx < Config.MARGIN_LEFT || mx > canvasWidth - Config.MARGIN_RIGHT) {
      tt.style.display   = 'none';
      vline.style.display = 'none';
      return;
    }

    // Show vline regardless of pairData
    vline.style.display = 'block';
    vline.style.left    = mx + 'px';

    // Only show tooltip if there's pairData
    if (!state.pairData.length) {
      tt.style.display = 'none';
      return;
    }

    const sJD = globalThis.Astro.toJD(document.getElementById('sd').value);
    const eJD = globalThis.Astro.toJD(document.getElementById('ed').value);
    const iw  = canvasWidth - Config.MARGIN_LEFT - Config.MARGIN_RIGHT;

    const hJD    = sJD + (mx - Config.MARGIN_LEFT) / iw * (eJD - sJD);
    const d      = new Date((hJD - 2440587.5) * 86400000);
    const padZero = n => String(n).padStart(2, '0');
    let html = `<div class="tt-date">${padZero(d.getUTCDate())}/${padZero(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}</div>`;

    // Pair angle lines
    state.pairData.filter(p => p.vis).forEach(pd => {
      if (!pd.pts?.length) return;
      const closestPoint = pd.pts.reduce((a, b) =>
        Math.abs(b.jd - hJD) < Math.abs(a.jd - hJD) ? b : a
      );
      const tag = pd.type === 'tn' ? '<span class="tt-tn">T→N</span> ' : '';
      html += `<div>${tag}<span style="color:${pd.col}">${Config.SYM[pd.p1]}${pd.p1}–${Config.SYM[pd.p2]}${pd.p2}${pd.type === 'tn' ? '(n)' : ''}</span> <span class="tt-angle">${closestPoint.a.toFixed(1)}°</span></div>`;
    });

    // Sign tooltip for timeline planets
    const tlPlanets = CanvasMgr._timelinePlanets(state.pairData, Config.PLANETS);
    if (tlPlanets.length) {
      const T = (hJD - 2451545) / 36525;
      html += '<div class="tt-index" style="margin-top:2px;padding-top:2px">';
      tlPlanets.forEach(pl => {
        const lon  = globalThis.Astro.getLon(pl, T);
        const sign = Math.floor(globalThis.Astro.n360(lon) / 30);
        const deg  = Math.floor(globalThis.Astro.n360(lon) % 30);
        html += `<span style="margin-right:8px">${Config.SYM[pl]}<span style="color:#9090c0">${Config.SIGNS[sign]}${deg}°</span></span>`;
      });
      html += '</div>';
    }

    // Index score
    if (state.cachedRaw) {
      const smoothing    = parseInt(document.getElementById('sm-sl').value, 10) || 5;
      const scores       = Utils.smoothArr(state.cachedRaw, smoothing);
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

    tt.innerHTML       = html;
    tt.style.display   = 'block';

    // Calculate tooltip position relative to the viewport
    let viewportLeft = e.clientX + (isTouch ? 20 : 12);
    let viewportTop = e.clientY + (isTouch ? -40 : -8);

    // Get tooltip dimensions (must be visible to get correct dimensions)
    const tooltipWidth = tt.offsetWidth;
    const tooltipHeight = tt.offsetHeight;

    // Adjust if tooltip goes off right edge of the viewport
    if (viewportLeft + tooltipWidth > window.innerWidth) {
      viewportLeft = e.clientX - tooltipWidth - (isTouch ? 20 : 12); // Position to the left of cursor
    }
    // Adjust if tooltip goes off left edge of the viewport
    if (viewportLeft < 0) {
        viewportLeft = e.clientX + (isTouch ? 20 : 12); // Fallback to right if it goes off left
    }

    // Adjust if tooltip goes off bottom edge of the viewport
    if (viewportTop + tooltipHeight > window.innerHeight) {
      viewportTop = e.clientY - tooltipHeight - (isTouch ? -40 : -8); // Position above cursor
    }
    // Adjust if tooltip goes off top edge of the viewport
    if (viewportTop < 0) {
        viewportTop = e.clientY + (isTouch ? -40 : -8); // Fallback to below if it goes off top
    }

    tt.style.left = viewportLeft + 'px';
    tt.style.top = viewportTop + 'px';
  }

  if (cv && tt && vline) {
    cv.addEventListener('mouseenter', () => {
      vline.style.display = 'block';
    });

    cv.addEventListener('mousemove', e => positionTooltip(e, false));

    cv.addEventListener('mouseleave', () => {
      tt.style.display    = 'none';
      vline.style.display = 'none';
    });

    // Touch support for mobile - Removed e.preventDefault() to allow page scroll
    cv.addEventListener('touchstart', e => {
      vline.style.display = 'block';
    }, { passive: true });

    cv.addEventListener('touchmove', e => positionTooltip(e, true), { passive: true });

    cv.addEventListener('touchend', () => {
      tt.style.display    = 'none';
      vline.style.display = 'none';
    }, { passive: true });
  }

  // --- EVENT LISTENERS ---

  UI.initPlanetSelects(Config.PLANETS, Config);

  document.getElementById('np1').value = 'Jupiter';
  document.getElementById('np2').value = 'Saturn';
  document.getElementById('tp1').value = 'Saturn';
  document.getElementById('tp2').value = 'Mars';

  document.getElementById('mode-sel').addEventListener('change', () => {
    Handlers.runCalc(stateManager);
  });

  document.querySelector('.btn-calcular').addEventListener('click', () => {
    Handlers.runCalc(stateManager);
  });

  document.querySelector('.btn2').addEventListener('click', () => {
    Handlers.addPairTT(null, null, stateManager);
  });

  document.querySelector('.btn-externos').addEventListener('click', () => {
    Handlers.add10Externos(stateManager);
  });

  document.querySelector('.btn3').addEventListener('click', () => {
    Handlers.addPairTN(stateManager);
  });

  document.querySelector('.natal-bar .btn3').addEventListener('click', () => {
    Handlers.calcNatal(stateManager);
  });

  document.getElementById('orb-sl').addEventListener('input', function() {
    document.getElementById('orb-v').textContent = this.value + '°';
    this.setAttribute('aria-valuenow', this.value);
    stateManager.setState({ cachedRaw: null });
  });

  document.getElementById('sm-sl').addEventListener('input', function() {
    document.getElementById('sm-v').textContent = this.value + 'pts';
    this.setAttribute('aria-valuenow', this.value);
    drawChart();
  });

  window.addEventListener('resize', () => {
    drawChart();
  });

  // --- INITIALIZATION ---

  // Onboarding panel
  const obPanel = document.getElementById('ob-panel');
  const obDismiss = document.getElementById('ob-dismiss');
  if (obPanel) {
    if (localStorage.getItem('ob-dismissed')) {
      obPanel.classList.add('ob-hidden');
    }
    obDismiss.addEventListener('click', () => {
      obPanel.classList.add('ob-hidden');
      localStorage.setItem('ob-dismissed', '1');
    });
  }
  renderApp();
  Handlers.addPairTT('Jupiter', 'Saturn', stateManager);
  Handlers.runCalc(stateManager);
})();
