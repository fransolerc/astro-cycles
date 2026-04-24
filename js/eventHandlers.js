/**
 * @file Event Handlers and Actions Module
 * Handles user actions and interactions with validation and business logic.
 */

globalThis.EventHandlers = {
  /**
   * Validates date range inputs.
   * @returns {{valid: boolean, error?: string}}
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
   * @param {string|number} pairId - Pair ID to toggle.
   * @param {StateManager} stateManager - State manager instance.
   */
  togglePair(pairId, stateManager) {
    const currentState = stateManager.getState();
    const pairs = currentState.pairs.map(p =>
      p.id === pairId ? { ...p, vis: !p.vis } : p
    );
    stateManager.setState({ pairs });
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
        `<span class="natal-sym">${Config.SYM[p]}</span><span class="natal-pos">${Utils.signOf(natalLons[p], Astro, Config.SIGNS)}</span>`
      );
      tag.innerHTML = `<span class="natal-date">${date} ${time}</span>${parts.join(' ')}`;

      stateManager.setState({ natalLons });
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
      id: Date.now(),
      vis: true,
      type: 'tt'
    };

    stateManager.setState({
      pairs: [...currentState.pairs, newPair],
      colorIdx: currentState.colorIdx + 1
    });
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
            id: Date.now() + i + j,
            vis: true,
            type: 'tt'
          });
          cIdx++;
        }
      }
    }

    stateManager.setState({
      pairs: [...currentState.pairs, ...newPairs],
      colorIdx: cIdx
    });
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
      id: Date.now(),
      vis: true,
      type: 'tn',
      key,
      natalLon: currentState.natalLons[natalPlanet]
    };

    stateManager.setState({
      pairs: [...currentState.pairs, newPair],
      nColorIdx: currentState.nColorIdx + 1
    });
  },

  /**
   * Runs calculations for all pairs.
   * @param {StateManager} stateManager - State manager instance.
   */
  runCalc(stateManager) {
    const validation = this.validateInputs();
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    const Calculator = globalThis.AstroCalculator;
    const Astro = globalThis.Astro;
    const currentState = stateManager.getState();

    const sJD = Astro.toJD(document.getElementById('sd').value);
    const eJD = Astro.toJD(document.getElementById('ed').value);
    const mode = Number.parseInt(document.getElementById('mode-sel').value, 10) || 180;

    document.getElementById('stat').textContent = 'CALCULATING...';

    setTimeout(() => {
      const pairData = currentState.pairs.map(p => {
        if (p.type === 'tt') {
          return {
            ...p,
            pts: Calculator.calcSeriesTT(p.p1, p.p2, sJD, eJD, mode, Astro)
          };
        }
        return {
          ...p,
          pts: Calculator.calcSeriesTN(p.p1, p.natalLon, sJD, eJD, mode, Astro)
        };
      });

      const tnCount = currentState.pairs.filter(p => p.type === 'tn').length;
      document.getElementById('stat').textContent = `${currentState.pairs.length} PAIR(S) (${tnCount} T→N) · ${mode}° · VSOP87/MEEUS`;

      stateManager.setState({ pairData });
    }, 10);
  }
};

