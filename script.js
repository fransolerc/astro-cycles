(function() {
  const { 
    PLANETS, SYM, EXTERNOS, PAIR_COLORS, NATAL_COLORS, ASPECTS,
    MARGIN_LEFT, MARGIN_RIGHT, MARGIN_TOP, MARGIN_BOTTOM, SCORE_H, GAP
  } = globalThis.AstroCfg;

  const { signOf, smoothArr } = globalThis.AstroUtils;
  const { calcNatal: astroCalcNatal, calcSeriesTT, calcSeriesTN, calcRawScores } = globalThis.AstroCalculator;
  const { drawBands, drawGrid, drawTimeTicks, drawAspectLines, drawCycles, drawScoreChart } = globalThis.ChartRenderer;
  const { renderChips, renderAspBar, initPlanetSelects } = globalThis.UIManager;

  const Astro = globalThis.Astro;

  // ─── STATE ───
  let aspEn = Object.fromEntries(ASPECTS.map(a => [a.angle, a.en]));
  let pairs = [];
  let pairData = [];
  let colorIdx = 0;
  let nColorIdx = 0;
  let natalLons = null;
  let cachedRaw = null;
  let CW = 0;
  let CH = 0;

  // ─── ACTIONS ───

  function invalidateScore() {
    cachedRaw = null;
  }

  function handleRemovePair(id) {
    pairs = pairs.filter(p => p.id !== id);
    pairData = pairData.filter(p => p.id !== id);
    invalidateScore();
    updateUI();
    drawChart();
  }

  function handleTogglePair(id) {
    const p = pairs.find(q => q.id === id);
    if (p) {
      p.vis = !p.vis;
      invalidateScore();
      updateUI();
      drawChart();
    }
  }

  function handleToggleAspect(angle) {
    aspEn[angle] = !aspEn[angle];
    invalidateScore();
    updateUI();
    drawChart();
  }

  function handleScoreChange(aspect, newScore) {
    aspect.score = newScore;
    invalidateScore();
    updateUI();
    drawChart();
  }

  function updateUI() {
    renderChips(pairs, handleRemovePair, handleTogglePair);
    renderAspBar(aspEn, handleToggleAspect, handleScoreChange);
  }

  function calcNatal() {
    const date = document.getElementById('nb-date').value;
    const time = document.getElementById('nb-time').value;
    natalLons = astroCalcNatal(date, time, Astro);
    
    const tag = document.getElementById('natal-tag');
    const parts = PLANETS.map(p =>
      `<span class="natal-sym">${SYM[p]}</span><span class="natal-pos">${signOf(natalLons[p], Astro)}</span>`
    );
    tag.innerHTML = `<span class="natal-date">${date} ${time}</span>${parts.join(' ')}`;
    
    invalidateScore();
    if (pairData.length) drawChart();
  }

  function addPairTT(p1 = null, p2 = null) {
    const a = p1 || document.getElementById('np1').value;
    const b = p2 || document.getElementById('np2').value;
    if (a === b) { alert('Planetas diferentes'); return; }
    if (pairs.some(p => p.p1 === a && p.p2 === b && p.type === 'tt')) return;
    const col = PAIR_COLORS[colorIdx % PAIR_COLORS.length]; colorIdx++;
    pairs.push({ p1: a, p2: b, col, id: Date.now(), vis: true, type: 'tt' });
    updateUI();
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
    updateUI();
  }

  function runCalc() {
    const sDateVal = document.getElementById('sd').value;
    const eDateVal = document.getElementById('ed').value;
    const sJD = Astro.toJD(sDateVal);
    const eJD = Astro.toJD(eDateVal);
    
    if (eJD <= sJD) { alert('Rango inválido'); return; }
    if ((eJD - sJD) / 365.25 > 100) { alert('Máximo 100 años'); return; }

    const mode = Number.parseInt(document.getElementById('mode-sel').value, 10) || 180;
    document.getElementById('stat').textContent = 'CALCULANDO...';

    setTimeout(() => {
      pairData = pairs.map(p => {
        if (p.type === 'tt') return { ...p, pts: calcSeriesTT(p.p1, p.p2, sJD, eJD, mode, Astro) };
        return { ...p, pts: calcSeriesTN(p.p1, p.natalLon, sJD, eJD, mode, Astro) };
      });
      invalidateScore();
      const tnCount = pairs.filter(p => p.type === 'tn').length;
      document.getElementById('stat').textContent = `${pairs.length} PAR(ES) (${tnCount} T→N) · ${mode}° · VSOP87/MEEUS`;
      drawChart();
    }, 10);
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

    const sJD = Astro.toJD(document.getElementById('sd').value);
    const eJD = Astro.toJD(document.getElementById('ed').value);
    const totalDays = eJD - sJD;

    const xj = jd => MARGIN_LEFT + (jd - sJD) / totalDays * iw;
    const yd = d => MARGIN_TOP + ih - (d / maxY) * ih;
    const sTop = MARGIN_TOP + ih + GAP, sBot = sTop + SCORE_H, sMid = (sTop + sBot) / 2;

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
      if (!cachedRaw) {
        const orb = Number.parseFloat(document.getElementById('orb-sl').value) || 7;
        cachedRaw = calcRawScores(sJD, eJD, pairData, aspEn, orb, Astro);
      }
      const scores = smoothArr(cachedRaw, Number.parseInt(document.getElementById('sm-sl').value, 10) || 10);
      drawScoreChart(rc, scores, { sTop, sMid, sBot }, ticks);
    }

    const todayJD = (Date.now() / 86400000) + 2440587.5;
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

  cv.addEventListener('mouseenter', () => { vline.style.display = 'block'; });

  cv.addEventListener('mousemove', e => {
    if (!pairData.length) { tt.style.display = 'none'; return; }
    const r = cv.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    const sJD = Astro.toJD(document.getElementById('sd').value);
    const eJD = Astro.toJD(document.getElementById('ed').value);
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

  cv.addEventListener('mouseleave', () => { tt.style.display = 'none'; vline.style.display = 'none'; });

  initPlanetSelects();
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

  window.addEventListener('resize', () => { drawChart(); });

  updateUI();
  addPairTT();
  runCalc();
})();
