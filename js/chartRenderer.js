/**
 * Handles all canvas-based drawing operations.
 * @namespace ChartRenderer
 */
globalThis.ChartRenderer = {
  /**
   * Draw decorative bands on the chart.
   * @param {Object} rc - Render context.
   * @param {number} mode - Chart mode (180 or 360).
   */
  drawBands: (rc, mode) => {
    const { ctx, MARGIN_LEFT, yd, iw } = rc;
    const bands = mode === 360 ? [[0, 60], [120, 180], [240, 300]] : [[0, 60], [120, 180]];
    bands.forEach(([lo, hi]) => {
      ctx.fillStyle = 'rgba(255,255,255,0.01)';
      ctx.fillRect(MARGIN_LEFT, yd(hi), iw, yd(lo) - yd(hi));
    });
  },

  /**
   * Draw the coordinate grid and degree labels.
   * @param {Object} rc - Render context.
   * @param {number} mode - Chart mode (180 or 360).
   */
  drawGrid: (rc, mode) => {
    const { ctx, MARGIN_LEFT, MARGIN_RIGHT, W, yd } = rc;
    const gDegs = mode === 360
      ? [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360]
      : [0, 30, 60, 90, 120, 150, 180];

    gDegs.forEach(deg => {
      const y = yd(deg);
      const isMajor = deg % 90 === 0;
      ctx.strokeStyle = isMajor ? '#1e2e3e' : '#161622';
      ctx.lineWidth = isMajor ? 0.8 : 0.4;
      ctx.beginPath();
      ctx.moveTo(MARGIN_LEFT, y);
      ctx.lineTo(W - MARGIN_RIGHT, y);
      ctx.stroke();

      ctx.fillStyle = isMajor ? '#3a4a5a' : '#2a3040';
      ctx.font = (isMajor ? 'bold ' : '') + '12px Inter, system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(deg + '°', MARGIN_LEFT - 3, y + 3);
    });
  },

  /**
   * Draw time-based vertical ticks and date labels.
   * @param {Object} rc - Render context.
   * @param {number[]} ticks - Array of Julian Days for ticks.
   * @param {number} sBot - Y coordinate for the bottom of the chart.
   */
  drawTimeTicks: (rc, ticks, sBot) => {
    const { ctx, xj, MARGIN_TOP } = rc;
    ticks.forEach(jd => {
      const x = xj(jd);
      ctx.strokeStyle = '#181828';
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.moveTo(x, MARGIN_TOP);
      ctx.lineTo(x, sBot);
      ctx.stroke();

      const d = new Date((jd - 2440587.5) * 86400000);
      const yr = d.getUTCFullYear();
      const mo = d.getUTCMonth() + 1;
      let lbl = ticks.length > 1 && (ticks[1] - ticks[0]) < 300 
        ? `${String(mo).padStart(2, '0')}/${yr.toString().slice(2)}`
        : String(yr);

      ctx.fillStyle = '#8090a8';
      ctx.font = '12px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(lbl, x, sBot + 11);
    });
  },

  /**
   * Draw horizontal dashed lines for enabled astrological aspects.
   * @param {Object} rc - Render context.
   * @param {Array} actAsps - Array of active aspect objects.
   * @param {number} maxY - Maximum Y value (180 or 360).
   */
  drawAspectLines: (rc, actAsps, maxY) => {
    const { ctx, MARGIN_LEFT, MARGIN_RIGHT, W, yd } = rc;
    actAsps.forEach(a => {
      if (a.angle > maxY) return;
      const y = yd(a.angle);
      ctx.strokeStyle = a.col;
      ctx.lineWidth = 0.6;
      ctx.setLineDash([2, 6]);
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.moveTo(MARGIN_LEFT, y);
      ctx.lineTo(W - MARGIN_RIGHT, y);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = a.col;
      ctx.font = '12px Inter, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(a.sym + ' ' + a.angle + '°', MARGIN_LEFT + 2, y - 2);
      ctx.globalAlpha = 1;
    });
  },

  /**
   * Draw the planetary cycle curves and crossing points.
   * @param {Object} rc - Render context.
   * @param {Array} pairData - Planet pair data.
   * @param {number} mode - Chart mode.
   * @param {Array} actAsps - Active aspects.
   * @param {number} maxY - Max Y value.
   * @param {Object} config - Configuration object (SYM).
   */
  drawCycles: (rc, pairData, mode, actAsps, maxY, config) => {
    const { ctx, xj, yd, MARGIN_RIGHT, W, MARGIN_TOP, ih } = rc;
    const jt = mode === 360 ? 270 : 90;
    const visible = pairData.filter(p => p.vis && p.pts?.length);

    const detectCrossings = (pd, actAsps, pts, maxY, jt, rc) => {
      const { xj, yd, MARGIN_LEFT, MARGIN_RIGHT, W } = rc;
      const hits = [];
      for (let i = 1; i < pts.length; i++) {
        const prev = pts[i - 1], cur = pts[i];
        if (Math.abs(cur.a - prev.a) >= jt) continue;
        actAsps.forEach(a => {
          if (a.angle > maxY) return;
          const dp = prev.a - a.angle, dc = cur.a - a.angle;
          if (dp * dc > 0) return;
          const frac = Math.abs(dp) / (Math.abs(dp) + Math.abs(dc));
          const cjd = prev.jd + frac * (cur.jd - prev.jd);
          const cx = xj(cjd);
          if (cx < MARGIN_LEFT || cx > W - MARGIN_RIGHT) return;
          if (hits.some(h => Math.abs(h.x - cx) < 20 && h.ang === a.angle && h.pid === pd.id)) return;
          hits.push({ x: cx, y: yd(a.angle), col: pd.col, date: globalThis.AstroUtils.fmtD(cjd), ang: a.angle, pid: pd.id, isNatal: pd.type === 'tn' });
        });
      }
      return hits;
    };

    const cands = visible.flatMap(pd => detectCrossings(pd, actAsps, pd.pts, maxY, jt, rc));
    const placed = globalThis.AstroUtils.placeLabels(cands);

    const drawCycleLines = (visible, ctx, xj, yd, jt, MARGIN_TOP, ih, W, MARGIN_RIGHT, config) => {
      visible.forEach(pd => {
        ctx.strokeStyle = pd.col;
        ctx.lineWidth = pd.type === 'tn' ? 1 : 1.1;
        ctx.globalAlpha = pd.type === 'tn' ? 0.75 : 0.85;
        ctx.setLineDash(pd.type === 'tn' ? [4, 3] : []);

        ctx.beginPath();
        let prev = null;
        pd.pts.forEach(pt => {
          const x = xj(pt.jd), y = yd(pt.a);
          if (!prev) {
            ctx.moveTo(x, y);
          } else if (Math.abs(pt.a - prev.a) > jt) {
            ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          prev = pt;
        });
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;

        const last = pd.pts[pd.pts.length - 1];
        const lx = xj(last.jd) + 4;
        const ly = Math.max(MARGIN_TOP + 5, Math.min(yd(last.a), MARGIN_TOP + ih - 2));
        ctx.fillStyle = pd.col;
        ctx.font = '12px Inter, system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.globalAlpha = 0.65;
        const lbl = pd.type === 'tn' ? `${config.SYM[pd.p1]}→${config.SYM[pd.p2]}n` : `${config.SYM[pd.p1]}${config.SYM[pd.p2]}`;
        ctx.fillText(lbl, Math.min(lx, W - MARGIN_RIGHT - 22), ly);
        ctx.globalAlpha = 1;
      });
    };

    const drawCycleLabels = (placed, ctx, MARGIN_TOP) => {
      placed.forEach(c => {
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.isNatal ? globalThis.AstroCfg.CIRCLE_RADIUS_NATAL : globalThis.AstroCfg.CIRCLE_RADIUS_TRANSIT, 0, Math.PI * 2);
        ctx.fillStyle = c.col;
        ctx.globalAlpha = 0.85;
        ctx.fill();
        ctx.strokeStyle = '#14141e';
        ctx.lineWidth = 0.7;
        ctx.stroke();
        ctx.globalAlpha = 1;

        const ly = c.y - 8 - (c.row * 13);
        if (ly > MARGIN_TOP) {
          ctx.fillStyle = c.col;
          ctx.font = '12px Inter, system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.globalAlpha = 0.7;
          ctx.fillText(c.date, c.x, ly);
          ctx.globalAlpha = 1;
        }
      });
    };

    drawCycleLines(visible, ctx, xj, yd, jt, MARGIN_TOP, ih, W, MARGIN_RIGHT, config);
    drawCycleLabels(placed, ctx, MARGIN_TOP);
  },

  /**
   * Draw a sign timeline for each visible planet.
   * For T-T pairs: both planets are shown.
   * For T-N pairs: only the transiting planet (p1) is shown.
   * Each row shows colored bands by astrological element with the sign glyph when space allows.
   *
   * @param {Object} rc - Render context.
   * @param {string[]} planets - Ordered list of unique planet names to display.
   * @param {number} sJD - Start Julian Day.
   * @param {number} eJD - End Julian Day.
   * @param {number} tTop - Y coordinate of the top of the timeline section.
   * @param {Object} config - AstroCfg (SIGNS, SYM, SIGN_ELEMENT_COLORS, SIGN_NAMES, TIMELINE_ROW_H).
   * @param {Object} Astro - Astronomical engine.
   * @param {Object} Utils - AstroUtils (stepFor).
   */
  drawSignTimeline: (rc, planets, sJD, eJD, tTop, config, Astro, Utils) => {
    if (!planets.length) return;

    const { ctx, xj, MARGIN_LEFT, iw } = rc;
    const rowH   = config.TIMELINE_ROW_H;
    const elCols = config.SIGN_ELEMENT_COLORS; // indexed by sign % 4

    planets.forEach((planet, idx) => {
      const y = tTop + idx * rowH;

      // Use a coarser step for display — max(stepFor, 1) keeps Moon manageable
      const step = Math.max(Utils.stepFor(planet), 1);

      // ── Segment detection ──────────────────────────────────────────────────
      // Walk the range, collect {jdStart, jdEnd, sign} segments
      const segments = [];
      let prevSign = null;
      let segStart  = sJD;

      for (let jd = sJD; jd <= eJD + step; jd += step) {
        const clampedJD = Math.min(jd, eJD);
        const T    = (clampedJD - 2451545) / 36525;
        const lon  = Astro.getLon(planet, T);
        const sign = Math.floor(Astro.n360(lon) / 30);

        if (prevSign !== null && sign !== prevSign) {
          // Linear interpolation to refine the crossing
          let lo = jd - step, hi = clampedJD;
          for (let iter = 0; iter < 6; iter++) {
            const mid = (lo + hi) / 2;
            const Tm  = (mid - 2451545) / 36525;
            const sm  = Math.floor(Astro.n360(Astro.getLon(planet, Tm)) / 30);
            if (sm === prevSign) lo = mid; else hi = mid;
          }
          const crossJD = (lo + hi) / 2;
          segments.push({ jdStart: segStart, jdEnd: crossJD, sign: prevSign });
          segStart = crossJD;
        }
        prevSign = sign;
        if (clampedJD >= eJD) break;
      }
      // Final segment
      if (prevSign !== null) {
        segments.push({ jdStart: segStart, jdEnd: eJD, sign: prevSign });
      }

      // ── Draw bands ────────────────────────────────────────────────────────
      segments.forEach(seg => {
        const x1 = xj(seg.jdStart);
        const x2 = xj(seg.jdEnd);
        const w  = x2 - x1;
        if (w <= 0) return;

        // Band fill
        ctx.fillStyle = elCols[seg.sign % 4];
        ctx.globalAlpha = 0.7;
        ctx.fillRect(x1, y + 1, w, rowH - 2);

        // Subtle border between segments
        ctx.strokeStyle = '#14141e';
        ctx.lineWidth = 0.5;
        ctx.globalAlpha = 0.6;
        ctx.strokeRect(x1, y + 1, w, rowH - 2);

        // Sign glyph — only render when the band is wide enough
        if (w >= 14) {
          ctx.globalAlpha = 0.9;
          ctx.fillStyle = '#d0d8f0';
          ctx.font = `${rowH <= 14 ? 10 : 11}px system-ui, sans-serif`;
          ctx.textAlign = 'center';

          const label = w >= 28
            ? config.SIGNS[seg.sign] + ' ' + config.SIGN_NAMES[seg.sign]
            : config.SIGNS[seg.sign];

          // Clip text to the band
          ctx.save();
          ctx.beginPath();
          ctx.rect(x1 + 1, y + 1, w - 2, rowH - 2);
          ctx.clip();
          ctx.fillText(label, x1 + w / 2, y + rowH - 3);
          ctx.restore();
        }

        ctx.globalAlpha = 1;
      });

      // ── Planet label (left margin) ────────────────────────────────────────
      ctx.fillStyle = '#8090a8';
      ctx.font = '10px Inter, system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.globalAlpha = 1;
      ctx.fillText(config.SYM[planet], MARGIN_LEFT - 5, y + rowH - 3);
    });

    // Section border
    const totalH = planets.length * rowH;
    ctx.strokeStyle = '#1e2e3e';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(MARGIN_LEFT, tTop + 1, iw, totalH - 2);
  },

  /**
   * Draw the harmonic index score chart.
   * @param {Object} rc - Render context.
   * @param {Array} scores - Score data points.
   * @param {Object} scoreBounds - Y boundaries for the score section.
   * @param {number[]} ticks - Julian Day ticks for vertical grid.
   * @param {number} scoreHeight - Height of the score section.
   */
  drawScoreChart: (rc, scores, scoreBounds, ticks, scoreHeight) => {
    const { ctx, xj, MARGIN_LEFT, W, MARGIN_RIGHT, iw } = rc;
    const { sTop, sMid, sBot } = scoreBounds;
    if (!scores.length) return;

    const maxAbs = Math.max(0.01, scores.reduce((m, s) => Math.max(m, Math.abs(s.v)), 0));
    const svY = v => sMid - ((v / maxAbs) * (scoreHeight / 2 - 5));

    ctx.fillStyle = '#0e0e18';
    ctx.fillRect(MARGIN_LEFT, sTop, iw, scoreHeight);

    ticks.forEach(jd => {
      const x = xj(jd);
      ctx.strokeStyle = '#161622';
      ctx.lineWidth = 0.3;
      ctx.beginPath(); ctx.moveTo(x, sTop); ctx.lineTo(x, sBot); ctx.stroke();
    });

    ctx.strokeStyle = '#1e2e3e';
    ctx.lineWidth = 0.6;
    ctx.setLineDash([3, 6]);
    ctx.beginPath(); ctx.moveTo(MARGIN_LEFT, sMid); ctx.lineTo(W - MARGIN_RIGHT, sMid); ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#1e3a2a';
    ctx.font = '12px Inter, system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('+', MARGIN_LEFT - 3, sTop + 8);
    ctx.fillText('0', MARGIN_LEFT - 3, sMid + 3);
    ctx.fillText('–', MARGIN_LEFT - 3, sBot - 2);
    ctx.fillStyle = '#162414';
    ctx.fillText('INDEX', MARGIN_LEFT - 3, sTop + 18);

    const fillPath = (points, filterFn, color) => {
      ctx.beginPath();
      ctx.moveTo(xj(points[0].jd), sMid);
      points.forEach(s => ctx.lineTo(xj(s.jd), filterFn(s.v)));
      ctx.lineTo(xj(points[points.length - 1].jd), sMid);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    };

    fillPath(scores, v => svY(Math.max(0, v)), 'rgba(52,211,153,0.18)');
    fillPath(scores, v => svY(Math.min(0, v)), 'rgba(248,113,113,0.18)');

    ctx.lineWidth = 1.2;
    ctx.globalAlpha = 0.9;
    for (let i = 1; i < scores.length; i++) {
      const vm = (scores[i - 1].v + scores[i].v) / 2;
      
      let strokeStyle = '#fcd34d';
      if (vm > 0.08) strokeStyle = '#34d399';
      else if (vm < -0.08) strokeStyle = '#f87171';
      
      ctx.strokeStyle = strokeStyle;
      ctx.beginPath();
      ctx.moveTo(xj(scores[i - 1].jd), svY(scores[i - 1].v));
      ctx.lineTo(xj(scores[i].jd), svY(scores[i].v));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#1e2e3e';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(MARGIN_LEFT, sTop, iw, scoreHeight);
  }
};
