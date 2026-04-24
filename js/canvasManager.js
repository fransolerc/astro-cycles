/**
 * @file Canvas Management Module
 * Handles all canvas-related calculations and rendering coordination.
 */

globalThis.CanvasManager = {
  /**
   * Sets up canvas with proper DPR scaling and returns render context.
   * @returns {Object|null} Canvas setup data or null if canvas not found.
   */
  setupCanvas() {
    const cv = document.getElementById('cv');
    const wrap = document.getElementById('cwrap');
    if (!cv || !wrap) return null;

    const Config = globalThis.AstroCfg;
    const currentCW = wrap.clientWidth || 700;
    const mainH = Math.max(260, Math.min(460, Math.round(currentCW * 0.44)));
    const currentCH = mainH + Config.GAP + Config.SCORE_H + Config.MARGIN_BOTTOM;

    const dpr = window.devicePixelRatio || 1;
    cv.width = currentCW * dpr;
    cv.height = currentCH * dpr;
    cv.style.width = currentCW + 'px';
    cv.style.height = currentCH + 'px';

    const ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);

    const W = currentCW;
    const iw = W - Config.MARGIN_LEFT - Config.MARGIN_RIGHT;
    const ih = mainH - Config.MARGIN_TOP;
    const mode = Number.parseInt(document.getElementById('mode-sel').value, 10) || 180;
    const maxY = mode === 360 ? 360 : 180;

    const sJD = globalThis.Astro.toJD(document.getElementById('sd').value);
    const eJD = globalThis.Astro.toJD(document.getElementById('ed').value);
    const totalDays = eJD - sJD;

    const xj = jd => Config.MARGIN_LEFT + (jd - sJD) / totalDays * iw;
    const yd = d => Config.MARGIN_TOP + ih - (d / maxY) * ih;
    const sTop = Config.MARGIN_TOP + ih + Config.GAP;
    const sBot = sTop + Config.SCORE_H;
    const sMid = (sTop + sBot) / 2;

    const rc = {
      ctx,
      xj,
      yd,
      MARGIN_LEFT: Config.MARGIN_LEFT,
      MARGIN_RIGHT: Config.MARGIN_RIGHT,
      W,
      MARGIN_TOP: Config.MARGIN_TOP,
      ih,
      iw
    };

    return { rc, sJD, eJD, totalDays, mode, maxY, sTop, sMid, sBot, currentCW, currentCH };
  },

  /**
   * Renders all chart elements.
   * @param {Object} canvasData - Canvas setup data from setupCanvas().
   * @param {Object} state - Application state.
   */
  drawChart(canvasData, state) {
    if (!canvasData) return;

    const { rc, sJD, eJD, totalDays, mode, maxY, sTop, sMid, sBot, currentCW, currentCH } = canvasData;

    this.drawChartElements(rc, sJD, eJD, totalDays, mode, maxY, sTop, sMid, sBot, state);
    this.drawTodayLine(rc, sJD, eJD, sBot);

    // Store dimensions locally without triggering state change
    // This prevents infinite loops from slider events
    state.CW = currentCW;
    state.CH = currentCH;
  },

  /**
   * Internal: Draw chart background, grid, and cycles.
   * @private
   */
  drawChartElements(rc, sJD, eJD, totalDays, mode, maxY, sTop, sMid, sBot, state) {
    const { ctx } = rc;
    const Config = globalThis.AstroCfg;
    const Renderer = globalThis.ChartRenderer;
    const Utils = globalThis.AstroUtils;

    ctx.fillStyle = '#14141e';
    ctx.fillRect(0, 0, rc.W, rc.MARGIN_TOP + rc.ih + Config.GAP + Config.SCORE_H + Config.MARGIN_BOTTOM);

    Renderer.drawBands(rc, mode);
    Renderer.drawGrid(rc, mode);

    const yrs = totalDays / 365.25;
    const tickYears = yrs <= 5 ? 0.25 : (yrs <= 15 ? 1 : (yrs <= 40 ? 2 : (yrs <= 80 ? 5 : 10)));
    const tickDays = tickYears * 365.25;
    const refJD = 2451545 + (Math.ceil((sJD - 2451545) / tickDays)) * tickDays;
    const ticks = [];
    for (let jd = refJD; jd <= eJD; jd += tickDays) ticks.push(jd);

    Renderer.drawTimeTicks(rc, ticks, sBot);

    const currentState = state.getState();
    const actAsps = Config.ASPECTS.filter(a => currentState.aspEn[a.angle] && (mode === 360 || a.angle <= 180));
    Renderer.drawAspectLines(rc, actAsps, maxY);
    Renderer.drawCycles(rc, currentState.pairData, mode, actAsps, maxY, Config);

    ctx.strokeStyle = '#1e2e3e';
    ctx.lineWidth = 0.6;
    ctx.strokeRect(Config.MARGIN_LEFT, Config.MARGIN_TOP, rc.iw, rc.ih);

    if (currentState.pairData.filter(p => p.vis).length) {
      if (!currentState.cachedRaw) {
        const orb = Number.parseFloat(document.getElementById('orb-sl').value) || Config.SCORE_THRESHOLD_POS;
        const Calculator = globalThis.AstroCalculator;
        const Astro = globalThis.Astro;
          // Update cache directly without setState to avoid infinite loop
        currentState.cachedRaw = Calculator.calcRawScores(sJD, eJD, currentState.pairData, currentState.aspEn, orb, Astro, Config.ASPECTS);
      }
      const smoothing = Number.parseInt(document.getElementById('sm-sl').value, 10) || 5;
      const scores = Utils.smoothArr(currentState.cachedRaw, smoothing);
      Renderer.drawScoreChart(rc, scores, { sTop, sMid, sBot }, ticks, Config.SCORE_H);
    }
  },

  /**
   * Draws vertical line at today's date.
   * @private
   */
  drawTodayLine(rc, sJD, eJD, sBot) {
    const { ctx, xj } = rc;
    const Config = globalThis.AstroCfg;
    const todayJD = (Date.now() / 86400000) + 2440587.5;

    if (todayJD >= sJD && todayJD <= eJD) {
      const tx = xj(todayJD);
      ctx.strokeStyle = 'rgba(255,255,100,0.28)';
      ctx.lineWidth = 0.8;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(tx, Config.MARGIN_TOP);
      ctx.lineTo(tx, sBot);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(255,255,100,0.35)';
      ctx.font = '12px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('TODAY', tx, Config.MARGIN_TOP + 8);
    }
  }
};

