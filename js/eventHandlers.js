/**
 * @file Event Handlers and Actions Module
 * Handles user actions and interactions with validation and business logic.
 */

// Contador incremental: Date.now() + i + j colisionaba entre pares distintos.
let pairIdSeq = 1;
const newPairId = () => pairIdSeq++;

// Temporizador de runCalc: una llamada nueva cancela la pendiente.
let calcTimer = null;

/**
 * Current date range and display mode from the DOM.
 * @returns {{sJD: number, eJD: number, mode: number}|null} null if the inputs
 *   are missing or invalid.
 */
const currentRange = () => {
  const sd = document.getElementById('sd');
  const ed = document.getElementById('ed');
  const ms = document.getElementById('mode-sel');
  if (!sd || !ed || !ms) return null;
  if (!globalThis.EventHandlers.validateInputs().valid) return null;
  const Astro = globalThis.Astro;
  return {
    sJD: Astro.toJD(sd.value),
    eJD: Astro.toJD(ed.value),
    mode: Number.parseInt(ms.value, 10) || 180
  };
};

/**
 * Angle series of one pair over a range.
 * @param {Object} p - Pair (type 'tt' or 'tn').
 * @returns {Array<{jd: number, a: number, d: number}>}
 */
const computePts = (p, sJD, eJD, mode) => {
  const Calculator = globalThis.AstroCalculator;
  const Astro = globalThis.Astro;
  return p.type === 'tt'
      ? Calculator.calcSeriesTT(p.p1, p.p2, sJD, eJD, mode, Astro)
      : Calculator.calcSeriesTN(p.p1, p.natalLon, sJD, eJD, mode, Astro);
};

/**
 * Adds pairs to `pairs` and, with their series already computed, to
 * `pairData`, in a single setState. If the range is not valid, the series are
 * left empty until the next runCalc.
 * @param {Array<Object>} newPairs - Pairs without `pts`.
 * @param {Object} extra - Other state updates (colour indexes).
 * @param {StateManager} stateManager - State manager instance.
 */
const appendPairs = (newPairs, extra, stateManager) => {
  const { pairs, pairData } = stateManager.getState();
  const range = currentRange();
  const withPts = newPairs.map(p => ({
    ...p,
    pts: range ? computePts(p, range.sJD, range.eJD, range.mode) : []
  }));
  stateManager.setState({
    pairs: [...pairs, ...newPairs],
    pairData: [...pairData, ...withPts],
    ...extra
  });
};

globalThis.EventHandlers = {
  /**
   * Validates date range inputs.
   * @returns {{valid: boolean, error?: string, warning?: string}} `warning` is
   *   set when the range is valid but outside the validity of the engine.
   */
  validateInputs() {
    const sDate = document.getElementById('sd').value?.trim();
    const eDate = document.getElementById('ed').value?.trim();

    if (!sDate || !eDate) {
      return { valid: false, error: 'Select start and end dates' };
    }

    const startDate = new Date(sDate);
    const endDate = new Date(eDate);

    if (endDate <= startDate) {
      return { valid: false, error: 'End date must be after start date' };
    }

    const yearsDiff = (endDate - startDate) / (1000 * 60 * 60 * 24 * 365.25);
    if (yearsDiff > 100) {
      return { valid: false, error: 'Maximum 100 years allowed' };
    }

    // The JPL elements are only fitted for a limited range: valid, but warn.
    const { ENGINE_VALID_FROM: from, ENGINE_VALID_TO: to } = globalThis.AstroCfg;
    if (startDate.getUTCFullYear() < from || endDate.getUTCFullYear() > to) {
      return { valid: true, warning: `OUTSIDE ${from}–${to}: REDUCED ACCURACY` };
    }

    return { valid: true };
  },

  /**
   * Removes a pair from the state.
   * @param {string|number} pairId - Pair ID to remove.
   * @param {StateManager} stateManager - State manager instance.
   */
  removePair(pairId, stateManager) {
    const currentState = stateManager.getState();
    stateManager.setState({
      pairs: currentState.pairs.filter(p => p.id !== pairId),
      pairData: currentState.pairData.filter(p => p.id !== pairId)
    });
  },

  /**
   * Toggles pair visibility.
   * Updates both `pairs` (chips) and `pairData` (chart/index/tooltip) in a single
   * setState, since the render reads visibility from pairData.
   * @param {string|number} pairId - Pair ID to toggle.
   * @param {StateManager} stateManager - State manager instance.
   */
  togglePair(pairId, stateManager) {
    const { pairs, pairData } = stateManager.getState();
    const flip = p => (p.id === pairId ? { ...p, vis: !p.vis } : p);
    stateManager.setState({
      pairs: pairs.map(flip),
      pairData: pairData.map(flip)
    });
  },

  /**
   * Toggles aspect enabled state.
   * @param {number} angle - Aspect angle.
   * @param {StateManager} stateManager - State manager instance.
   */
  toggleAspect(angle, stateManager) {
    const currentState = stateManager.getState();
    const aspEn = { ...currentState.aspEn, [angle]: !currentState.aspEn[angle] };
    stateManager.setState({ aspEn });
  },

  /**
   * Changes aspect score.
   * @param {Object} aspect - Aspect object.
   * @param {number} newScore - New score value.
   * @param {StateManager} stateManager - State manager instance.
   */
  changeAspectScore(aspect, newScore, stateManager) {
    const Config = globalThis.AstroCfg;
    const target = Config.ASPECTS.find(a => a.angle === aspect.angle);
    if (target) {
      target.score = newScore;
      const currentState = stateManager.getState();
      stateManager.setState({ aspEn: { ...currentState.aspEn } });
    }
  },

  /**
   * Calculates and displays natal positions.
   * The time is read as UT: no timezone is applied.
   * Transit-natal pairs already on the chart are refreshed with the new natal.
   * @param {StateManager} stateManager - State manager instance.
   */
  calcNatal(stateManager) {
    const date = document.getElementById('nb-date').value;
    const time = document.getElementById('nb-time').value;

    if (!date || !time) {
      alert('Enter natal date and time');
      return;
    }

    try {
      const Calculator = globalThis.AstroCalculator;
      const Astro = globalThis.Astro;
      const Config = globalThis.AstroCfg;
      const Utils = globalThis.AstroUtils;

      const natalLons = Calculator.calcNatal(date, time, Astro, Config.PLANETS);

      const tag = document.getElementById('natal-tag');
      const parts = Config.PLANETS.map(p =>
          '<span class="natal-item">' +
          `<span class="natal-sym">${Config.SYM[p]}</span>` +
          `<span class="natal-pos">${Utils.signOf(natalLons[p], Astro, Config.SIGNS)}</span>` +
          '</span>'
      );
      tag.innerHTML = `<span class="natal-date">${date} ${time} UT</span>${parts.join('')}`;

      const pairs = stateManager.getState().pairs ?? [];
      const hasTN = pairs.some(p => p.type === 'tn');
      const updates = { natalLons };
      if (hasTN) {
        updates.pairs = pairs.map(p => (p.type === 'tn' ? { ...p, natalLon: natalLons[p.p2] } : p));
      }
      stateManager.setState(updates);
      if (hasTN) this.runCalc(stateManager, { silent: true });
    } catch (e) {
      console.error('Error calculating natal:', e);
      alert('Error calculating natal positions. Please check the data.');
    }
  },

  /**
   * Adds a Transit-Transit pair.
   * @param {string} p1 - First planet.
   * @param {string} p2 - Second planet.
   * @param {StateManager} stateManager - State manager instance.
   */
  addPairTT(p1, p2, stateManager) {
    const Config = globalThis.AstroCfg;
    const currentState = stateManager.getState();

    const planet1 = p1 || document.getElementById('np1').value;
    const planet2 = p2 || document.getElementById('np2').value;

    if (planet1 === planet2) {
      alert('Select two different planets');
      return;
    }

    if (currentState.pairs.some(p => p.p1 === planet1 && p.p2 === planet2 && p.type === 'tt')) {
      return;
    }

    const col = Config.PAIR_COLORS[currentState.colorIdx % Config.PAIR_COLORS.length];
    const newPair = {
      p1: planet1,
      p2: planet2,
      col,
      id: newPairId(),
      vis: true,
      type: 'tt'
    };

    appendPairs([newPair], { colorIdx: currentState.colorIdx + 1 }, stateManager);
  },

  /**
   * Adds 10 outer planet pairs automatically.
   * @param {StateManager} stateManager - State manager instance.
   */
  add10Externos(stateManager) {
    const Config = globalThis.AstroCfg;
    const currentState = stateManager.getState();
    const { EXTERNOS } = Config;
    const newPairs = [];
    let cIdx = currentState.colorIdx;

    for (let i = 0; i < EXTERNOS.length; i++) {
      for (let j = i + 1; j < EXTERNOS.length; j++) {
        const a = EXTERNOS[i];
        const b = EXTERNOS[j];

        if (!currentState.pairs.some(p => p.p1 === a && p.p2 === b && p.type === 'tt')) {
          const col = Config.PAIR_COLORS[cIdx % Config.PAIR_COLORS.length];
          newPairs.push({
            p1: a,
            p2: b,
            col,
            id: newPairId(),
            vis: true,
            type: 'tt'
          });
          cIdx++;
        }
      }
    }

    if (!newPairs.length) return;
    appendPairs(newPairs, { colorIdx: cIdx }, stateManager);
  },

  /**
   * Adds a Transit-Natal pair.
   * @param {StateManager} stateManager - State manager instance.
   */
  addPairTN(stateManager) {
    const Config = globalThis.AstroCfg;
    const currentState = stateManager.getState();

    if (!currentState.natalLons) {
      alert('First calculate the natal (CALCULATE NATAL button)');
      return;
    }

    const transitPlanet = document.getElementById('tp1').value;
    const natalPlanet = document.getElementById('tp2').value;
    const key = `${transitPlanet}-n${natalPlanet}`;

    if (currentState.pairs.some(p => p.key === key)) {
      return;
    }

    const col = Config.NATAL_COLORS[currentState.nColorIdx % Config.NATAL_COLORS.length];
    const newPair = {
      p1: transitPlanet,
      p2: natalPlanet,
      col,
      id: newPairId(),
      vis: true,
      type: 'tn',
      key,
      natalLon: currentState.natalLons[natalPlanet]
    };

    appendPairs([newPair], { nColorIdx: currentState.nColorIdx + 1 }, stateManager);
  },

  /**
   * Runs calculations for all pairs over the current range and mode.
   * Repeated calls collapse into one. The pairs are read when the timer
   * fires, so pairs added in between are included.
   * @param {StateManager} stateManager - State manager instance.
   * @param {{silent?: boolean}} [options] - With `silent`, an invalid range is
   *   reported in the status bar instead of an alert (for automatic recalcs).
   */
  runCalc(stateManager, { silent = false } = {}) {
    const stat = document.getElementById('stat');
    const validation = this.validateInputs();
    if (!validation.valid) {
      if (silent) stat.textContent = validation.error;
      else alert(validation.error);
      return;
    }

    const { warning } = validation;
    const { sJD, eJD, mode } = currentRange();
    stat.textContent = 'CALCULATING...';

    clearTimeout(calcTimer);
    calcTimer = setTimeout(() => {
      const { pairs } = stateManager.getState();
      const pairData = pairs.map(p => ({ ...p, pts: computePts(p, sJD, eJD, mode) }));

      const tnCount = pairs.filter(p => p.type === 'tn').length;
      stat.textContent =
          `${pairs.length} PAIR(S) (${tnCount} T→N) · ${mode}° · ${globalThis.AstroCfg.TEXTS.ENGINE_TAG}` +
          (warning ? ` · ⚠ ${warning}` : '');

      stateManager.setState({ pairData });
    }, 10);
  }
};