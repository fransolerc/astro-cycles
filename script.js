(function() {
  // ─── CONSTANTS & UTILS ───
  const J2000 = 2451545;
  const d2r = d => d * Math.PI / 180;
  const r2d = r => r * 180 / Math.PI;
  const n360 = d => ((d % 360) + 360) % 360;

  const toJD = s => new Date(s + 'T12:00:00Z').getTime() / 86400000 + 2440587.5;
  const toJDt = (date, time) => {
    const [h, m] = (time || '12:00').split(':').map(Number);
    return new Date(date + 'T12:00:00Z').getTime() / 86400000 + 2440587.5 + (h - 12) / 24 + m / 1440;
  };
  const fmtD = jd => {
    const d = new Date((jd - 2440587.5) * 86400000);
    const p = n => String(n).padStart(2, '0');
    return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear().toString().slice(2)}`;
  };

  // ─── ASTRONOMICAL CALCS ───
  function kepler(M, e) {
    let E = M;
    for (let i = 0; i < 50; i++) {
      const dE = (M - E + e * Math.sin(E)) / (1 - e * Math.cos(E));
      E += dE;
      if (Math.abs(dE) < 1e-10) break;
    }
    return E;
  }

  const OE = {
    Mercury: [252.250906, 149472.6746358, 0.38709927, 0.20563593, 1.906e-5, 7.00497902, -5.94749e-3, 48.33076593, -0.12534081, 77.45779628, 0.16047689],
    Venus: [181.979801, 58517.815676, 0.72333566, 0.00677672, -4.107e-5, 3.39467605, -7.889e-4, 76.67984255, -0.27769418, 131.60246718, 2.68329e-3],
    Earth: [100.464457, 35999.372857, 1.00000261, 0.01671123, -4.392e-5, 0, 0, 0, 0, 102.93768193, 0.32327364],
    Mars: [355.433275, 19140.299314, 1.52371034, 0.09339410, 7.882e-5, 1.84969142, -8.131e-3, 49.55953891, -0.29257343, 336.04084002, 0.44441088],
    Jupiter: [34.351519, 3034.905961, 5.202887, 0.04838624, -1.3253e-4, 1.30439695, -1.83714e-3, 100.47390909, 0.20469106, 14.72847983, 0.21252668],
    Saturn: [50.077444, 1222.113794, 9.53667594, 0.05386179, -5.0991e-4, 2.48599187, 1.93609e-3, 113.66242448, -0.28867794, 92.59887831, -0.41897216],
    Uranus: [314.055005, 428.4669983, 19.1891846, 0.04725744, -4.397e-5, 0.77263783, -2.42939e-3, 74.01692503, 0.04240589, 170.9542763, 0.40805281],
    Neptune: [304.348665, 218.4862002, 30.0699701, 0.00859048, 5.105e-5, 1.77004347, 3.5372e-4, 131.78422574, -0.00508664, 44.96476227, -0.32241464],
    Pluto: [238.929, 145.2078, 39.48168677, 0.24880766, 6.32e-5, 17.1410426, 1.1e-5, 110.30347045, -1.841e-2, 224.06891629, -0.0409232]
  };

  function helioXY(pl, T) {
    const [L0, L1, a, e0, e1, i0, i1, O0, O1, w0, w1] = OE[pl];
    const e = e0 + e1 * T;
    const i = d2r(i0 + i1 * T);
    const Ov = d2r(n360(O0 + O1 * T));
    const wb = d2r(n360(w0 + w1 * T));
    const L = n360(L0 + L1 * T);
    const M = d2r(n360(L - r2d(wb)));
    const E = kepler(M, e);
    const v = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
    const r = a * (1 - e * Math.cos(E));
    const w = wb - Ov;
    const u = v + w;
    return {
      x: r * (Math.cos(Ov) * Math.cos(u) - Math.sin(Ov) * Math.sin(u) * Math.cos(i)),
      y: r * (Math.sin(Ov) * Math.cos(u) + Math.cos(Ov) * Math.sin(u) * Math.cos(i))
    };
  }

  function sunLon(T) {
    const L0 = n360(280.46646 + 36000.76983 * T + 3.032e-4 * T * T);
    const M = d2r(n360(357.52911 + 35999.05029 * T - 1.537e-4 * T * T));
    const C = (1.914602 - 4.817e-3 * T - 1.4e-5 * T * T) * Math.sin(M) +
      (0.019993 - 1.01e-4 * T) * Math.sin(2 * M) + 2.89e-4 * Math.sin(3 * M);
    return n360(L0 + C);
  }

  function moonLon(T) {
    const d = T * 36525;
    const L = n360(218.3165 + 13.176396 * d);
    const M = d2r(n360(134.9634 + 13.064993 * d));
    const Ms = d2r(n360(357.5291 + 0.9856 * d));
    const D = d2r(n360(297.8502 + 12.190749 * d));
    const F = d2r(n360(93.2721 + 13.22935 * d));
    return n360(L + 6.289 * Math.sin(M) + 1.274 * Math.sin(2 * D - M) + 0.658 * Math.sin(2 * D) +
      0.214 * Math.sin(2 * M) - 0.186 * Math.sin(Ms) - 0.114 * Math.sin(2 * F) +
      0.059 * Math.sin(2 * D - 2 * M) + 0.053 * Math.sin(2 * D + M) + 0.046 * Math.sin(2 * D - Ms) +
      0.041 * Math.sin(M - Ms));
  }

  function getLon(pl, T) {
    if (pl === 'Sun') return sunLon(T);
    if (pl === 'Moon') return moonLon(T);
    const { x: xp, y: yp } = helioXY(pl, T);
    const { x: xe, y: ye } = helioXY('Earth', T);
    return n360(r2d(Math.atan2(yp - ye, xp - xe)));
  }

  function sep180(a, b) {
    const d = Math.abs(n360(b - a));
    return d > 180 ? 360 - d : d;
  }

  // ─── DATA & STATE ───
  const SIGNS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
  const signOf = lon => {
    const s = Math.floor(n360(lon) / 30);
    return SIGNS[s] + (Math.floor(n360(lon) % 30)) + '°';
  };

  const PLANETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
  const SYM = {
    Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
    Jupiter: '♃', Saturn: '♄', Uranus: '⛢', Neptune: '♆', Pluto: '♇'
  };
  const EXTERNOS = ['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
  const PAIR_COLORS = ['#fb923c', '#fbbf24', '#67e8f9', '#818cf8', '#e879f9', '#34d399', '#f87171', '#c084fc', '#60a5fa', '#f472b6', '#a3e635', '#ff6090'];
  const NATAL_COLORS = ['#d08af0', '#a06ad0', '#c060e0', '#e090ff', '#9050c0', '#b070e0', '#f0a0ff', '#8040b0'];

  const ASPECTS = [
    { angle: 0,   name: 'Cnj',     sym: '☌', col: '#fcd34d', en: true,  score: 0,    w: 1 },
    { angle: 30,  name: 'Semi',    sym: '⚺', col: '#666666', en: false, score: 0.3,  w: 0.4 },
    { angle: 45,  name: 'Octile', sym: '∠', col: '#888888', en: false, score: -0.4, w: 0.4 },
    { angle: 60,  name: 'Sex',     sym: '⚹', col: '#34d399', en: true,  score: 1,    w: 0.8 },
    { angle: 90,  name: 'Cua',     sym: '□', col: '#f87171', en: true,  score: -1,   w: 1 },
    { angle: 120, name: 'Tri',     sym: '△', col: '#60a5fa', en: true,  score: 1,    w: 1.2 },
    { angle: 150, name: 'Qui',     sym: '⚻', col: '#fb923c', en: false, score: -0.5, w: 0.5 },
    { angle: 180, name: 'Opo',     sym: '☍', col: '#c084fc', en: true,  score: -1,   w: 1 },
  ];
  let aspEn = Object.fromEntries(ASPECTS.map(a => [a.angle, a.en]));

  let pairs = [], pairData = [], colorIdx = 0, nColorIdx = 0;
  let natalLons = null;
  let cachedRaw = null;
  const MARGIN_LEFT = 48, MARGIN_RIGHT = 8, MARGIN_TOP = 10, MARGIN_BOTTOM = 18;
  const SCORE_H = 72, GAP = 8;
  let CW = 0, CH = 0;

  // ─── LOGIC ───
  function calcNatal() {
    const date = document.getElementById('nb-date').value;
    const time = document.getElementById('nb-time').value;
    const jd = toJDt(date, time);
    const T = (jd - J2000) / 36525;
    natalLons = {};
    PLANETS.forEach(p => { natalLons[p] = getLon(p, T); });
    const tag = document.getElementById('natal-tag');
    const parts = PLANETS.map(p =>
      `<span class="natal-sym">${SYM[p]}</span><span class="natal-pos">${signOf(natalLons[p])}</span>`
    );
    tag.innerHTML = `<span class="natal-date">${date} ${time}</span>${parts.join(' ')}`;
    invalidateScore();
    if (pairData.length) drawChart();
  }

  function stepFor(p1) {
    if (p1 === 'Moon') return 0.2;
    if (['Mercury', 'Venus'].includes(p1)) return 0.4;
    if (['Sun', 'Mars'].includes(p1)) return 0.8;
    if (['Jupiter', 'Saturn'].includes(p1)) return 2;
    return 5;
  }

  function addPairTT(p1 = null, p2 = null) {
    const a = p1 || document.getElementById('np1').value;
    const b = p2 || document.getElementById('np2').value;
    if (a === b) { alert('Planetas diferentes'); return; }
    if (pairs.some(p => p.p1 === a && p.p2 === b && p.type === 'tt')) return;
    const col = PAIR_COLORS[colorIdx % PAIR_COLORS.length]; colorIdx++;
    pairs.push({ p1: a, p2: b, col, id: Date.now(), vis: true, type: 'tt' });
    renderChips();
  }

  function add10Externos() {
    for (let i = 0; i < EXTERNOS.length; i++) {
      for (let j = i + 1; j < EXTERNOS.length; j++) {
        addPairTT(EXTERNOS[i], EXTERNOS[j]);
      }
    }
  }

  function addPairTN() {
    if (!natalLons) { alert('Primero calcula el natal (botón CALCULAR NATAL)'); return; }
    const a = document.getElementById('tp1').value;
    const b = document.getElementById('tp2').value;
    const key = `${a}-n${b}`;
    if (pairs.some(p => p.key === key)) return;
    const col = NATAL_COLORS[nColorIdx % NATAL_COLORS.length]; nColorIdx++;
    pairs.push({ p1: a, p2: b, col, id: Date.now(), vis: true, type: 'tn', key, natalLon: natalLons[b] });
    renderChips();
  }

  function removePair(id) {
    pairs = pairs.filter(p => p.id !== id);
    pairData = pairData.filter(p => p.id !== id);
    invalidateScore();
    renderChips();
    drawChart();
  }

  function togglePair(id) {
    const p = pairs.find(q => q.id === id);
    if (p) {
      p.vis = !p.vis;
      invalidateScore();
      renderChips();
      drawChart();
    }
  }

  function invalidateScore() { cachedRaw = null; }

  function renderChips() {
    const bar = document.getElementById('pairs-bar');
    bar.innerHTML = '<span class="pairs-title">PARES:</span>';
    pairs.forEach(p => {
      const c = document.createElement('div');
      c.className = 'chip' + (p.type === 'tn' ? ' natal-chip' : '') + (p.vis ? '' : ' off');
      const label = p.type === 'tt'
        ? `${SYM[p.p1]}${p.p1}–${SYM[p.p2]}${p.p2}`
        : `${SYM[p.p1]}${p.p1}<span class="chip-tn-label">-T</span>→${SYM[p.p2]}${p.p2}<span class="chip-tn-label">-N</span>`;
      c.innerHTML = `<div class="dot" style="background:${p.col}"></div><span style="color:${p.col}">${label}</span><span class="rx">✕</span>`;

      const removeBtn = c.querySelector('.rx');
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removePair(p.id);
      });
      c.addEventListener('click', () => togglePair(p.id));
      bar.appendChild(c);
    });
  }

  function renderAspBar() {
    const bar = document.getElementById('asp-bar');
    bar.innerHTML = '<span class="asp-title">ASPECTOS:</span>';
    ASPECTS.forEach(a => {
      const el = document.createElement('div');
      el.className = 'at' + (aspEn[a.angle] ? '' : ' off');

      let scoreClass;
      if (a.score > 0) scoreClass = 'at-score at-score-pos';
      else if (a.score < 0) scoreClass = 'at-score at-score-neg';
      else scoreClass = 'at-score at-score-neu';
      const scoreSign = a.score > 0 ? '+' : '';

      el.innerHTML =
        `<div class="ald" style="background:${a.col}"></div>` +
        `<span style="color:${a.col}">${a.sym} ${a.angle}°</span>` +
        `<span class="${scoreClass} at-score-val" title="Clic para editar score">${scoreSign}${a.score}</span>`;

      el.addEventListener('click', () => {
        aspEn[a.angle] = !aspEn[a.angle];
        el.className = 'at' + (aspEn[a.angle] ? '' : ' off');
        invalidateScore();
        drawChart();
      });

      const scoreEl = el.querySelector('.at-score-val');
      scoreEl.addEventListener('click', e => {
        e.stopPropagation();
        const inp = document.createElement('input');
        inp.type = 'number';
        inp.className = 'at-score-input';
        inp.value = String(a.score);
        inp.min = -3; inp.max = 3; inp.step = 0.1;
        scoreEl.replaceWith(inp);
        inp.focus();
        inp.select();

        const commit = () => {
          const raw = Number.parseFloat(inp.value);
          a.score = Number.isNaN(raw) ? a.score : Math.max(-3, Math.min(3, Number.parseFloat(raw.toFixed(1))));
          invalidateScore();
          renderAspBar();
          drawChart();
        };
        inp.addEventListener('blur', commit);
        inp.addEventListener('keydown', ev => {
          if (ev.key === 'Enter')  inp.blur();
          if (ev.key === 'Escape') renderAspBar();
          ev.stopPropagation();
        });
      });

      bar.appendChild(el);
    });
  }

  function calcSeriesTT(p1, p2, sJD, eJD, mode) {
    const step = Math.min(stepFor(p1), stepFor(p2)), pts = [];
    for (let jd = sJD; jd <= eJD; jd += step) {
      const T = (jd - J2000) / 36525, l1 = getLon(p1, T), l2 = getLon(p2, T);
      pts.push({ jd, a: mode === 360 ? n360(l2 - l1) : sep180(l1, l2) });
    }
    return pts;
  }

  function calcSeriesTN(transitPlanet, natalLon, sJD, eJD, mode) {
    const step = stepFor(transitPlanet), pts = [];
    for (let jd = sJD; jd <= eJD; jd += step) {
      const T = (jd - J2000) / 36525, lt = getLon(transitPlanet, T);
      pts.push({ jd, a: mode === 360 ? n360(lt - natalLon) : sep180(lt, natalLon) });
    }
    return pts;
  }

  function calcRawScores(sJD, eJD) {
    const step = Math.max(1, Math.round((eJD - sJD) / 1000));
    const orb = Number.parseFloat(document.getElementById('orb-sl').value) || 7;
    const active = pairData.filter(p => p.vis);
    const asps = ASPECTS.filter(a => aspEn[a.angle]);
    const scores = [];
    for (let jd = sJD; jd <= eJD; jd += step) {
      const T = (jd - J2000) / 36525;
      let tot = 0;
      active.forEach(pd => {
        const l1 = getLon(pd.p1, T), l2 = pd.type === 'tn' ? pd.natalLon : getLon(pd.p2, T);
        const s = sep180(l1, l2);
        asps.forEach(a => {
          const dev = Math.abs(s - a.angle);
          if (dev <= orb) {
            const prox = Math.cos((dev / orb) * Math.PI / 2);
            tot += a.score * a.w * prox;
          }
        });
      });
      scores.push({ jd, v: tot });
    }
    return scores;
  }

  function smoothArr(arr, days) {
    if (!arr?.length) return arr;
    const step = arr.length > 1 ? arr[1].jd - arr[0].jd : 1;
    const w = Math.max(1, Math.round(days / step));
    return arr.map((pt, i) => {
      const lo = Math.max(0, i - w), hi = Math.min(arr.length - 1, i + w);
      let sum = 0, n = 0;
      for (let k = lo; k <= hi; k++) { sum += arr[k].v; n++; }
      return { jd: pt.jd, v: sum / n };
    });
  }

  function placeLabels(cands) {
    const placed = [];
    cands.forEach(c => {
      let row = 0, ok = false;
      while (!ok) {
        ok = !placed.some(p => p.row === row && Math.abs(p.x - c.x) < 34);
        if (!ok) row++;
        if (row > 5) break;
      }
      placed.push({ ...c, row });
    });
    return placed;
  }

  function runCalc() {
    const sJD = toJD(document.getElementById('sd').value);
    const eJD = toJD(document.getElementById('ed').value);
    if (eJD <= sJD) { alert('Rango inválido'); return; }
    if ((eJD - sJD) / 365.25 > 100) { alert('Máximo 100 años'); return; }

    const mode = Number.parseInt(document.getElementById('mode-sel').value, 10) || 180;
    document.getElementById('stat').textContent = 'CALCULANDO...';

    setTimeout(() => {
      pairData = pairs.map(p => {
        if (p.type === 'tt') return { ...p, pts: calcSeriesTT(p.p1, p.p2, sJD, eJD, mode) };
        return { ...p, pts: calcSeriesTN(p.p1, p.natalLon, sJD, eJD, mode) };
      });
      cachedRaw = null;
      const tnCount = pairs.filter(p => p.type === 'tn').length;
      document.getElementById('stat').textContent = `${pairs.length} PAR(ES) (${tnCount} T→N) · ${mode}° · VSOP87/MEEUS`;
      drawChart();
    }, 10);
  }

  // ─── DRAW CHART COMPONENTS ───

  function drawBands(rc, mode) {
    const { ctx, MARGIN_LEFT, yd, iw } = rc;
    const bands = mode === 360 ? [[0, 60], [120, 180], [240, 300]] : [[0, 60], [120, 180]];
    bands.forEach(([lo, hi]) => {
      ctx.fillStyle = 'rgba(255,255,255,0.01)';
      ctx.fillRect(MARGIN_LEFT, yd(hi), iw, yd(lo) - yd(hi));
    });
  }

  function drawGrid(rc, mode) {
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
  }

  function drawTimeTicks(rc, ticks, sBot) {
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
  }

  function drawAspectLines(rc, actAsps, maxY) {
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
  }

  function detectCrossings(pd, actAsps, pts, maxY, jt, rc) {
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
        hits.push({ x: cx, y: yd(a.angle), col: pd.col, date: fmtD(cjd), ang: a.angle, pid: pd.id, isNatal: pd.type === 'tn' });
      });
    }
    return hits;
  }

  function drawCycles(rc, pairData, mode, actAsps, maxY) {
    const { ctx, xj, yd, MARGIN_RIGHT, W, MARGIN_TOP, ih } = rc;
    const jt = mode === 360 ? 270 : 90;
    const visible = pairData.filter(p => p.vis && p.pts?.length);

    const cands = visible.flatMap(pd => detectCrossings(pd, actAsps, pd.pts, maxY, jt, rc));
    const placed = placeLabels(cands);

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
      const lbl = pd.type === 'tn' ? `${SYM[pd.p1]}→${SYM[pd.p2]}n` : `${SYM[pd.p1]}${SYM[pd.p2]}`;
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
  }

  function drawScoreChart(rc, scores, scoreBounds, ticks) {
    const { ctx, xj, MARGIN_LEFT, W, MARGIN_RIGHT, iw } = rc;
    const { sTop, sMid, sBot } = scoreBounds;
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

  function drawChart() {
    const cv = document.getElementById('cv');
    const wrap = document.getElementById('cwrap');
    CW = wrap?.clientWidth || 700;
    const mainH = Math.max(260, Math.min(460, Math.round(CW * 0.44)));
    CH = mainH + GAP + SCORE_H + MARGIN_BOTTOM;

    const dpr = window.devicePixelRatio || 1;
    cv.width = CW * dpr;
    cv.height = CH * dpr;
    cv.style.width = CW + 'px';
    cv.style.height = CH + 'px';

    const ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);

    const W = CW, iw = W - MARGIN_LEFT - MARGIN_RIGHT, ih = mainH - MARGIN_TOP;
    const mode = Number.parseInt(document.getElementById('mode-sel').value, 10) || 180;
    const maxY = mode === 360 ? 360 : 180;

    const sJD = toJD(document.getElementById('sd').value);
    const eJD = toJD(document.getElementById('ed').value);
    const totalDays = eJD - sJD;

    const xj = jd => MARGIN_LEFT + (jd - sJD) / totalDays * iw;
    const yd = d => MARGIN_TOP + ih - (d / maxY) * ih;
    const sTop = MARGIN_TOP + ih + GAP, sBot = sTop + SCORE_H, sMid = (sTop + sBot) / 2;

    // Render context — shared by all draw functions
    const rc = { ctx, xj, yd, MARGIN_LEFT, MARGIN_RIGHT, W, MARGIN_TOP, ih, iw };

    ctx.fillStyle = '#14141e';
    ctx.fillRect(0, 0, W, CH);

    drawBands(rc, mode);
    drawGrid(rc, mode);

    const yrs = totalDays / 365.25;
    let tickYears = 10;
    if (yrs <= 5) tickYears = 0.25;
    else if (yrs <= 15) tickYears = 1;
    else if (yrs <= 40) tickYears = 2;
    else if (yrs <= 80) tickYears = 5;

    const tickDays = tickYears * 365.25;
    const refJD = 2451545 + (Math.ceil((sJD - 2451545) / tickDays)) * tickDays;
    const ticks = [];
    for (let jd = refJD; jd <= eJD; jd += tickDays) ticks.push(jd);

    drawTimeTicks(rc, ticks, sBot);

    const actAsps = ASPECTS.filter(a => aspEn[a.angle] && (mode === 360 || a.angle <= 180));
    drawAspectLines(rc, actAsps, maxY);
    drawCycles(rc, pairData, mode, actAsps, maxY);

    ctx.strokeStyle = '#1e2e3e';
    ctx.lineWidth = 0.6;
    ctx.setLineDash([]);
    ctx.strokeRect(MARGIN_LEFT, MARGIN_TOP, iw, ih);

    if (pairData.filter(p => p.vis).length) {
      if (!cachedRaw) cachedRaw = calcRawScores(sJD, eJD);
      const scores = smoothArr(cachedRaw, Number.parseInt(document.getElementById('sm-sl').value, 10) || 10);
      drawScoreChart(rc, scores, { sTop, sMid, sBot }, ticks);
    }

    // Today Line
    const todayJD = toJD(new Date().toISOString().slice(0, 10));
    if (todayJD >= sJD && todayJD <= eJD) {
      const tx = xj(todayJD);
      ctx.strokeStyle = 'rgba(255,255,100,0.28)';
      ctx.lineWidth = 0.8;
      ctx.setLineDash([2, 4]);
      ctx.beginPath(); ctx.moveTo(tx, MARGIN_TOP); ctx.lineTo(tx, sBot); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,255,100,0.35)';
      ctx.font = '12px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('HOY', tx, MARGIN_TOP + 8);
    }

    ctx.fillStyle = '#2a3a4a';
    ctx.font = '12px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('— T–T  - - T–N(natal)', MARGIN_LEFT + 2, MARGIN_TOP + ih - 3);
  }

  // ─── EVENTS ───
  const cv = document.getElementById('cv');
  const tt = document.getElementById('tt');
  const vline = document.getElementById('vline');

  cv.addEventListener('mouseenter', () => {
    vline.style.display = 'block';
  });

  cv.addEventListener('mousemove', e => {
    if (!pairData.length) { tt.style.display = 'none'; return; }
    const r = cv.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    const sJD = toJD(document.getElementById('sd').value);
    const eJD = toJD(document.getElementById('ed').value);
    const iw = CW - MARGIN_LEFT - MARGIN_RIGHT;

    if (mx < MARGIN_LEFT || mx > CW - MARGIN_RIGHT) { tt.style.display = 'none'; vline.style.display = 'none'; return; }
    
    vline.style.display = 'block';
    vline.style.left = mx + 'px';

    const hJD = sJD + (mx - MARGIN_LEFT) / iw * (eJD - sJD);
    const d = new Date((hJD - 2440587.5) * 86400000);
    const p = n => String(n).padStart(2, '0');
    let html = `<div class="tt-date">${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}</div>`;

    pairData.filter(p => p.vis).forEach(pd => {
      if (!pd.pts?.length) return;
      const cl = pd.pts.reduce((a, b) => Math.abs(b.jd - hJD) < Math.abs(a.jd - hJD) ? b : a);
      const tag = pd.type === 'tn' ? '<span class="tt-tn">T→N</span> ' : '';
      html += `<div>${tag}<span style="color:${pd.col}">${SYM[pd.p1]}${pd.p1}–${SYM[pd.p2]}${pd.p2}${pd.type === 'tn' ? '(n)' : ''}</span> <span class="tt-angle">${cl.a.toFixed(1)}°</span></div>`;
    });

    if (cachedRaw) {
      const sm = Number.parseInt(document.getElementById('sm-sl').value, 10) || 10;
      const sc = smoothArr(cachedRaw, sm);
      if (sc.length) {
        const sv = sc.reduce((a, b) => Math.abs(b.jd - hJD) < Math.abs(a.jd - hJD) ? b : a);

        let col = '#fcd34d';
        if (sv.v > 0.08) col = '#34d399';
        else if (sv.v < -0.08) col = '#f87171';

        html += `<div class="tt-index">Índice: <span style="color:${col}">${sv.v.toFixed(2)}</span></div>`;
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

  [['np1', 'np2'], ['tp1', 'tp2']].forEach(([id1, id2]) => {
    const s1 = document.getElementById(id1), s2 = document.getElementById(id2);
    PLANETS.forEach(p => {
      [s1, s2].forEach(s => {
        const o = document.createElement('option');
        o.value = String(p);
        o.textContent = SYM[p] + ' ' + p;
        s.appendChild(o);
      });
    });
  });
  document.getElementById('np1').value = 'Jupiter';
  document.getElementById('np2').value = 'Saturn';
  document.getElementById('tp1').value = 'Saturn';
  document.getElementById('tp2').value = 'Mars';

  document.getElementById('mode-sel').addEventListener('change', runCalc);
  document.querySelector('.btn-calcular').addEventListener('click', runCalc);
  document.querySelector('.btn2').addEventListener('click', () => addPairTT());
  document.querySelector('.btn-externos').addEventListener('click', add10Externos);
  document.querySelector('.btn3').addEventListener('click', addPairTN);
  document.querySelector('.natal-bar .btn3').addEventListener('click', calcNatal);

  document.getElementById('orb-sl').addEventListener('input', function() {
    document.getElementById('orb-v').textContent = this.value + '°';
    invalidateScore();
    drawChart();
  });

  document.getElementById('sm-sl').addEventListener('input', function() {
    document.getElementById('sm-v').textContent = this.value + 'd';
    drawChart();
  });

  renderAspBar();
  addPairTT();
  runCalc();
  window.addEventListener('resize', () => { invalidateScore(); drawChart(); });
})();