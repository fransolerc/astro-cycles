/**
 * @file Entry point for Astro-Cycles application.
 * Manages state, event listeners, and coordinates calculations and rendering.
 */
(function() {
  // --- DEPENDENCIES ---
  const Config = globalThis.AstroCfg;
  const Utils = globalThis.AstroUtils;
  const Calculator = globalThis.AstroCalculator;
  const Renderer = globalThis.ChartRenderer;
  const UI = globalThis.UIManager;
  const Astro = globalThis.Astro;

  /**
   * @typedef {Object} Aspect
   * @property {number} angle
   * @property {string} name
   * @property {string} sym
   * @property {string} col
   * @property {boolean} en
   * @property {number} score
   * @property {number} w
   */

  /**
   * @typedef {Object} ApplicationState
   * @property {Object<number, boolean>} aspEn - Enabled state for each aspect.
   * @property {Array} pairs - List of planet pairs added by user.
   * @property {Array} pairData - Calculated trajectory points for active pairs.
   * @property {number} colorIdx - Index for assigning T-T colors.
   * @property {number} nColorIdx - Index for assigning T-N colors.
   * @property {Object|null} natalLons - Calculated natal positions.
   * @property {Array|null} cachedRaw - Cached raw score points.
   * @property {number} CW - Current canvas width.
   * @property {number} CH - Current canvas height.
   */
  let state = {
    aspEn: Object.fromEntries(Config.ASPECTS.map(a => [a.angle, a.en])),
    pairs: [],
    pairData: [],
    colorIdx: 0,
    nColorIdx: 0,
    natalLons: null,
    cachedRaw: null,
    CW: 0,
    CH: 0
  };

  /**
   * Updates the application state and triggers necessary UI/Canvas updates.
   * @param {Partial<ApplicationState>} newState - Subset of state to update.
   */
  function setState(newState) {
    state = { ...state, ...newState };
    
    // Auto-invalidate score cache if relevant parts of state changed
    if ('aspEn' in newState || 'pairs' in newState || 'natalLons' in newState) {
      state.cachedRaw = null;
    }

    renderApp();
  }

  /**
   * Coordinates the rendering of UI components and the Chart.
   */
  function renderApp() {
    UI.renderChips(state.pairs, Config, handleRemovePair, handleTogglePair);
    UI.renderAspBar(state.aspEn, Config.ASPECTS, handleToggleAspect, handleScoreChange);
    drawChart();
  }

  // --- ACTIONS ---

  const handleRemovePair = (id) => {
    setState({
      pairs: state.pairs.filter(p => p.id !== id),
      pairData: state.pairData.filter(p => p.id !== id)
    });
  };

  const handleTogglePair = (id) => {
    const pairs = state.pairs.map(p => p.id === id ? { ...p, vis: !p.vis } : p);
    setState({ pairs });
  };

  const handleToggleAspect = (angle) => {
    const aspEn = { ...state.aspEn, [angle]: !state.aspEn[angle] };
    setState({ aspEn });
  };

  /**
   * Handle score changes for an aspect.
   * @param {Aspect} aspect - The aspect object being modified.
   * @param {number} newScore - The new score value.
   */
  const handleScoreChange = (aspect, newScore) => {
    // Buscamos el aspecto original en el Config para actualizarlo
    const target = Config.ASPECTS.find(a => a.angle === aspect.angle);
    if (target) {
      target.score = newScore;
      setState({ aspEn: { ...state.aspEn } }); // Disparamos actualización
    }
  };

  /**
   * Validates date and time inputs.
   * @returns {boolean}
   */
  function validateInputs() {
    const sDate = document.getElementById('sd').value;
    const eDate = document.getElementById('ed').value;
    if (!sDate || !eDate) { alert('Selecciona fechas de inicio y fin'); return false; }
    if (new Date(eDate) <= new Date(sDate)) { alert('La fecha de fin debe ser posterior a la de inicio'); return false; }
    return true;
  }

  function calcNatal() {
    const date = document.getElementById('nb-date').value;
    const time = document.getElementById('nb-time').value;
    if (!date || !time) { alert('Introduce fecha y hora natal'); return; }

    try {
      const natalLons = Calculator.calcNatal(date, time, Astro, Config.PLANETS);
      
      const tag = document.getElementById('natal-tag');
      const parts = Config.PLANETS.map(p =>
        `<span class="natal-sym">${Config.SYM[p]}</span><span class="natal-pos">${Utils.signOf(natalLons[p], Astro, Config.SIGNS)}</span>`
      );
      tag.innerHTML = `<span class="natal-date">${date} ${time}</span>${parts.join(' ')}`;
      
      setState({ natalLons });
    } catch (e) {
      console.error('Error calculating natal:', e);
      alert('Error al calcular posiciones natales. Verifica los datos.');
    }
  }

  function addPairTT(p1 = null, p2 = null) {
    const a = p1 || document.getElementById('np1').value;
    const b = p2 || document.getElementById('np2').value;
    if (a === b) { alert('Selecciona dos planetas diferentes'); return; }
    if (state.pairs.some(p => p.p1 === a && p.p2 === b && p.type === 'tt')) return;

    const col = Config.PAIR_COLORS[state.colorIdx % Config.PAIR_COLORS.length];
    const newPair = { p1: a, p2: b, col, id: Date.now(), vis: true, type: 'tt' };
    
    setState({ 
      pairs: [...state.pairs, newPair],
      colorIdx: state.colorIdx + 1 
    });
  }

  function add10Externos() {
    const { EXTERNOS } = Config;
    const newPairs = [];
    let cIdx = state.colorIdx;

    for (let i = 0; i < EXTERNOS.length; i++) {
      for (let j = i + 1; j < EXTERNOS.length; j++) {
        const a = EXTERNOS[i], b = EXTERNOS[j];
        if (!state.pairs.some(p => p.p1 === a && p.p2 === b && p.type === 'tt')) {
          const col = Config.PAIR_COLORS[cIdx % Config.PAIR_COLORS.length];
          newPairs.push({ p1: a, p2: b, col, id: Date.now() + i + j, vis: true, type: 'tt' });
          cIdx++;
        }
      }
    }
    setState({ pairs: [...state.pairs, ...newPairs], colorIdx: cIdx });
  }

  function addPairTN() {
    if (!state.natalLons) { alert('Primero calcula el natal (botón CALCULAR NATAL)'); return; }
    const a = document.getElementById('tp1').value;
    const b = document.getElementById('tp2').value;
    const key = `${a}-n${b}`;
    if (state.pairs.some(p => p.key === key)) return;

    const col = Config.NATAL_COLORS[state.nColorIdx % Config.NATAL_COLORS.length];
    const newPair = { p1: a, p2: b, col, id: Date.now(), vis: true, type: 'tn', key, natalLon: state.natalLons[b] };
    
    setState({ 
      pairs: [...state.pairs, newPair],
      nColorIdx: state.nColorIdx + 1
    });
  }

  function runCalc() {
    if (!validateInputs()) return;

    const sJD = Astro.toJD(document.getElementById('sd').value);
    const eJD = Astro.toJD(document.getElementById('ed').value);
    if ((eJD - sJD) / 365.25 > 100) { alert('Máximo 100 años'); return; }

    const mode = parseInt(document.getElementById('mode-sel').value, 10) || 180;
    document.getElementById('stat').textContent = 'CALCULANDO...';

    setTimeout(() => {
      const pairData = state.pairs.map(p => {
        if (p.type === 'tt') return { ...p, pts: Calculator.calcSeriesTT(p.p1, p.p2, sJD, eJD, mode, Astro) };
        return { ...p, pts: Calculator.calcSeriesTN(p.p1, p.natalLon, sJD, eJD, mode, Astro) };
      });
      
      const tnCount = state.pairs.filter(p => p.type === 'tn').length;
      document.getElementById('stat').textContent = `${state.pairs.length} PAR(ES) (${tnCount} T→N) · ${mode}° · VSOP87/MEEUS`;
      
      setState({ pairData });
    }, 10);
  }

  function drawChart() {
    const cv = document.getElementById('cv');
    const wrap = document.getElementById('cwrap');
    if (!cv || !wrap) return;

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

    const W = currentCW, iw = W - Config.MARGIN_LEFT - Config.MARGIN_RIGHT, ih = mainH - Config.MARGIN_TOP;
    const mode = parseInt(document.getElementById('mode-sel').value, 10) || 180;
    const maxY = mode === 360 ? 360 : 180;

    const sJD = Astro.toJD(document.getElementById('sd').value);
    const eJD = Astro.toJD(document.getElementById('ed').value);
    const totalDays = eJD - sJD;

    const xj = jd => Config.MARGIN_LEFT + (jd - sJD) / totalDays * iw;
    const yd = d => Config.MARGIN_TOP + ih - (d / maxY) * ih;
    const sTop = Config.MARGIN_TOP + ih + Config.GAP, sBot = sTop + Config.SCORE_H, sMid = (sTop + sBot) / 2;

    const rc = { ctx, xj, yd, MARGIN_LEFT: Config.MARGIN_LEFT, MARGIN_RIGHT: Config.MARGIN_RIGHT, W, MARGIN_TOP: Config.MARGIN_TOP, ih, iw };

    ctx.fillStyle = '#14141e';
    ctx.fillRect(0, 0, W, currentCH);

    Renderer.drawBands(rc, mode);
    Renderer.drawGrid(rc, mode);

    const yrs = totalDays / 365.25;
    const tickYears = yrs <= 5 ? 0.25 : (yrs <= 15 ? 1 : (yrs <= 40 ? 2 : (yrs <= 80 ? 5 : 10)));
    const tickDays = tickYears * 365.25;
    const refJD = 2451545 + (Math.ceil((sJD - 2451545) / tickDays)) * tickDays;
    const ticks = [];
    for (let jd = refJD; jd <= eJD; jd += tickDays) ticks.push(jd);

    Renderer.drawTimeTicks(rc, ticks, sBot);

    const actAsps = Config.ASPECTS.filter(a => state.aspEn[a.angle] && (mode === 360 || a.angle <= 180));
    Renderer.drawAspectLines(rc, actAsps, maxY);
    Renderer.drawCycles(rc, state.pairData, mode, actAsps, maxY, Config);

    ctx.strokeStyle = '#1e2e3e';
    ctx.lineWidth = 0.6;
    ctx.strokeRect(Config.MARGIN_LEFT, Config.MARGIN_TOP, iw, ih);

    if (state.pairData.filter(p => p.vis).length) {
      if (!state.cachedRaw) {
        const orb = parseFloat(document.getElementById('orb-sl').value) || 7;
        state.cachedRaw = Calculator.calcRawScores(sJD, eJD, state.pairData, state.aspEn, orb, Astro, Config.ASPECTS);
      }
      const smoothing = parseInt(document.getElementById('sm-sl').value, 10) || 10;
      const scores = Utils.smoothArr(state.cachedRaw, smoothing);
      Renderer.drawScoreChart(rc, scores, { sTop, sMid, sBot }, ticks, Config.SCORE_H);
    }

    // Today Line
    const todayJD = (Date.now() / 86400000) + 2440587.5;
    if (todayJD >= sJD && todayJD <= eJD) {
      const tx = xj(todayJD);
      ctx.strokeStyle = 'rgba(255,255,100,0.28)';
      ctx.lineWidth = 0.8;
      ctx.setLineDash([2, 4]);
      ctx.beginPath(); ctx.moveTo(tx, Config.MARGIN_TOP); ctx.lineTo(tx, sBot); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,255,100,0.35)';
      ctx.font = '12px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('HOY', tx, Config.MARGIN_TOP + 8);
    }
    
    // Guardamos el tamaño actual en el estado sin disparar re-render
    state.CW = currentCW;
    state.CH = currentCH;
  }

  // --- MOUSE TOOLTIP LOGIC ---
  const cv = document.getElementById('cv');
  const tt = document.getElementById('tt');
  const vline = document.getElementById('vline');

  if (cv && tt && vline) {
    cv.addEventListener('mouseenter', () => vline.style.display = 'block');
    cv.addEventListener('mousemove', e => {
      if (!state.pairData.length) { tt.style.display = 'none'; return; }
      const r = cv.getBoundingClientRect();
      const mx = e.clientX - r.left, my = e.clientY - r.top;
      const sJD = Astro.toJD(document.getElementById('sd').value);
      const eJD = Astro.toJD(document.getElementById('ed').value);
      const iw = state.CW - Config.MARGIN_LEFT - Config.MARGIN_RIGHT;

      if (mx < Config.MARGIN_LEFT || mx > state.CW - Config.MARGIN_RIGHT) {
        tt.style.display = 'none'; vline.style.display = 'none'; return; 
      }
      
      vline.style.display = 'block';
      vline.style.left = mx + 'px';

      const hJD = sJD + (mx - Config.MARGIN_LEFT) / iw * (eJD - sJD);
      const d = new Date((hJD - 2440587.5) * 86400000);
      const p = n => String(n).padStart(2, '0');
      let html = `<div class="tt-date">${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}</div>`;

      state.pairData.filter(p => p.vis).forEach(pd => {
        if (!pd.pts?.length) return;
        const cl = pd.pts.reduce((a, b) => Math.abs(b.jd - hJD) < Math.abs(a.jd - hJD) ? b : a);
        const tag = pd.type === 'tn' ? '<span class="tt-tn">T→N</span> ' : '';
        html += `<div>${tag}<span style="color:${pd.col}">${Config.SYM[pd.p1]}${pd.p1}–${Config.SYM[pd.p2]}${pd.p2}${pd.type === 'tn' ? '(n)' : ''}</span> <span class="tt-angle">${cl.a.toFixed(1)}°</span></div>`;
      });

      if (state.cachedRaw) {
        const smoothing = parseInt(document.getElementById('sm-sl').value, 10) || 10;
        const sc = Utils.smoothArr(state.cachedRaw, smoothing);
        if (sc.length) {
          const sv = sc.reduce((a, b) => Math.abs(b.jd - hJD) < Math.abs(a.jd - hJD) ? b : a);
          const col = sv.v > 0.08 ? '#34d399' : (sv.v < -0.08 ? '#f87171' : '#fcd34d');
          html += `<div class="tt-index">Índice: <span style="color:${col}">${sv.v.toFixed(2)}</span></div>`;
        }
      }
      tt.innerHTML = html;
      tt.style.display = 'block';
      tt.style.left = (mx + 12) + 'px';
      tt.style.top = (my - 8) + 'px';
    });
    cv.addEventListener('mouseleave', () => { tt.style.display = 'none'; vline.style.display = 'none'; });
  }

  // --- INITIALIZATION ---
  UI.initPlanetSelects(Config.PLANETS, Config);
  
  // Set default values
  document.getElementById('np1').value = 'Jupiter';
  document.getElementById('np2').value = 'Saturn';
  document.getElementById('tp1').value = 'Saturn';
  document.getElementById('tp2').value = 'Mars';

  // Event Listeners
  document.getElementById('mode-sel').addEventListener('change', runCalc);
  document.querySelector('.btn-calcular').addEventListener('click', runCalc);
  document.querySelector('.btn2').addEventListener('click', () => addPairTT());
  document.querySelector('.btn-externos').addEventListener('click', add10Externos);
  document.querySelector('.btn3').addEventListener('click', addPairTN);
  document.querySelector('.natal-bar .btn3').addEventListener('click', calcNatal);

  document.getElementById('orb-sl').addEventListener('input', function() {
    document.getElementById('orb-v').textContent = this.value + '°';
    state.cachedRaw = null;
    drawChart();
  });

  document.getElementById('sm-sl').addEventListener('input', function() {
    document.getElementById('sm-v').textContent = this.value + 'd';
    drawChart();
  });

  window.addEventListener('resize', () => drawChart());

  // First render
  renderApp();
  addPairTT();
  runCalc();
})();
