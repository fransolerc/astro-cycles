globalThis.ChartRenderer = {
  drawBands: (rc, mode) => {
    const { ctx, MARGIN_LEFT, yd, iw } = rc;
    const bands = mode === 360 ? [[0, 60], [120, 180], [240, 300]] : [[0, 60], [120, 180]];
    bands.forEach(([lo, hi]) => {
      ctx.fillStyle = 'rgba(255,255,255,0.01)';
      ctx.fillRect(MARGIN_LEFT, yd(hi), iw, yd(lo) - yd(hi));
    });
  },

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
      let lbl;
      if (ticks.length > 1 && (ticks[1] - ticks[0]) < 300) {
        lbl = `${String(mo).padStart(2, '0')}/${yr.toString().slice(2)}`;
      } else {
        lbl = String(yr);
      }

      ctx.fillStyle = '#2a3a50';
      ctx.font = '12px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(lbl, x, sBot + 11);
    });
  },

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

  drawCycles: (rc, pairData, mode, actAsps, maxY) => {
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
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x, y);
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
      const lbl = pd.type === 'tn' ? `${globalThis.AstroCfg.SYM[pd.p1]}→${globalThis.AstroCfg.SYM[pd.p2]}n` : `${globalThis.AstroCfg.SYM[pd.p1]}${globalThis.AstroCfg.SYM[pd.p2]}`;
      ctx.fillText(lbl, Math.min(lx, W - MARGIN_RIGHT - 22), ly);
      ctx.globalAlpha = 1;
    });

    placed.forEach(c => {
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.isNatal ? 2 : 2.5, 0, Math.PI * 2);
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
  },

  drawScoreChart: (rc, scores, scoreBounds, ticks) => {
    const { ctx, xj, MARGIN_LEFT, W, MARGIN_RIGHT, iw } = rc;
    const { sTop, sMid, sBot } = scoreBounds;
    const { SCORE_H } = globalThis.AstroCfg;
    if (!scores.length) return;

    const maxAbs = Math.max(0.01, scores.reduce((m, s) => Math.max(m, Math.abs(s.v)), 0));
    const svY = v => sMid - ((v / maxAbs) * (SCORE_H / 2 - 5));

    ctx.fillStyle = '#0e0e18';
    ctx.fillRect(MARGIN_LEFT, sTop, iw, SCORE_H);

    ticks.forEach(jd => {
      const x = xj(jd);
      ctx.strokeStyle = '#161622';
      ctx.lineWidth = 0.3;
      ctx.beginPath();
      ctx.moveTo(x, sTop);
      ctx.lineTo(x, sBot);
      ctx.stroke();
    });

    ctx.strokeStyle = '#1e2e3e';
    ctx.lineWidth = 0.6;
    ctx.setLineDash([3, 6]);
    ctx.beginPath();
    ctx.moveTo(MARGIN_LEFT, sMid);
    ctx.lineTo(W - MARGIN_RIGHT, sMid);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#1e3a2a';
    ctx.font = '12px Inter, system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('+', MARGIN_LEFT - 3, sTop + 8);
    ctx.fillText('0', MARGIN_LEFT - 3, sMid + 3);
    ctx.fillText('–', MARGIN_LEFT - 3, sBot - 2);
    ctx.fillStyle = '#162414';
    ctx.fillText('ÍNDICE', MARGIN_LEFT - 3, sTop + 18);

    ctx.beginPath();
    ctx.moveTo(xj(scores[0].jd), sMid);
    scores.forEach(s => ctx.lineTo(xj(s.jd), svY(Math.max(0, s.v))));
    ctx.lineTo(xj(scores[scores.length - 1].jd), sMid);
    ctx.closePath();
    ctx.fillStyle = 'rgba(52,211,153,0.18)';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(xj(scores[0].jd), sMid);
    scores.forEach(s => ctx.lineTo(xj(s.jd), svY(Math.min(0, s.v))));
    ctx.lineTo(xj(scores[scores.length - 1].jd), sMid);
    ctx.closePath();
    ctx.fillStyle = 'rgba(248,113,113,0.18)';
    ctx.fill();

    ctx.lineWidth = 1.2;
    ctx.globalAlpha = 0.9;
    for (let i = 1; i < scores.length; i++) {
      const vm = (scores[i - 1].v + scores[i].v) / 2;
      if (vm > 0.08) ctx.strokeStyle = '#34d399';
      else if (vm < -0.08) ctx.strokeStyle = '#f87171';
      else ctx.strokeStyle = '#fcd34d';
      ctx.beginPath();
      ctx.moveTo(xj(scores[i - 1].jd), svY(scores[i - 1].v));
      ctx.lineTo(xj(scores[i].jd), svY(scores[i].v));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#1e2e3e';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(MARGIN_LEFT, sTop, iw, SCORE_H);
  }
};
