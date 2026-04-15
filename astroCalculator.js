/**
 * Core astronomical calculations for transits and natal positions.
 * @namespace AstroCalculator
 */
globalThis.AstroCalculator = {
  /**
   * Calculate natal positions for a given date and time.
   * @param {string} date - Local date in YYYY-MM-DD format.
   * @param {string} time - Local time in HH:mm format.
   * @param {Object} Astro - Astronomical calculation engine.
   * @param {string[]} planets - List of planets to calculate.
   * @returns {Object<string, number>} Object containing ecliptic longitude for each planet.
   */
  calcNatal: (date, time, Astro, planets) => {
    const jd = Astro.toJDt(date, time);
    const T = (jd - 2451545) / 36525;
    const natalLons = {};
    planets.forEach(p => { natalLons[p] = Astro.getLon(p, T); });
    return natalLons;
  },

  /**
   * Calculate a series of separation angles between two transiting planets.
   * @param {string} p1 - First planet.
   * @param {string} p2 - Second planet.
   * @param {number} sJD - Start Julian Day.
   * @param {number} eJD - End Julian Day.
   * @param {number} mode - Calculation mode (180 or 360).
   * @param {Object} Astro - Astronomical calculation engine.
   * @returns {Array<{jd: number, a: number}>} Data points with Julian Day and angle.
   */
  calcSeriesTT: (p1, p2, sJD, eJD, mode, Astro) => {
    const step = Math.min(globalThis.AstroUtils.stepFor(p1), globalThis.AstroUtils.stepFor(p2)), pts = [];
    for (let jd = sJD; jd <= eJD; jd += step) {
      const T = (jd - 2451545) / 36525, l1 = Astro.getLon(p1, T), l2 = Astro.getLon(p2, T);
      pts.push({ jd, a: mode === 360 ? Astro.n360(l2 - l1) : Astro.sep180(l1, l2) });
    }
    return pts;
  },

  /**
   * Calculate a series of separation angles between a transiting planet and a natal position.
   * @param {string} transitPlanet - Name of the transiting planet.
   * @param {number} natalLon - Natal longitude of the planet.
   * @param {number} sJD - Start Julian Day.
   * @param {number} eJD - End Julian Day.
   * @param {number} mode - Calculation mode (180 or 360).
   * @param {Object} Astro - Astronomical calculation engine.
   * @returns {Array<{jd: number, a: number}>} Data points with Julian Day and angle.
   */
  calcSeriesTN: (transitPlanet, natalLon, sJD, eJD, mode, Astro) => {
    const step = globalThis.AstroUtils.stepFor(transitPlanet), pts = [];
    for (let jd = sJD; jd <= eJD; jd += step) {
      const T = (jd - 2451545) / 36525, lt = Astro.getLon(transitPlanet, T);
      pts.push({ jd, a: mode === 360 ? Astro.n360(lt - natalLon) : Astro.sep180(lt, natalLon) });
    }
    return pts;
  },

  /**
   * Calculate raw harmonic index scores for a given time period.
   * @param {number} sJD - Start Julian Day.
   * @param {number} eJD - End Julian Day.
   * @param {Array<Object>} pairData - Array of planet pairs with pre-calculated positions.
   * @param {Object<number, boolean>} aspEn - Enabled state of each aspect angle.
   * @param {number} orb - Orbital tolerance in degrees.
   * @param {Object} Astro - Astronomical calculation engine.
   * @param {Array<Object>} aspects - Definitions of astrological aspects.
   * @returns {Array<{jd: number, v: number}>} Score data points.
   */
  calcRawScores: (sJD, eJD, pairData, aspEn, orb, Astro, aspects) => {
    const step = Math.max(1, Math.round((eJD - sJD) / 1000));
    const active = pairData.filter(p => p.vis);
    const activeAspects = aspects.filter(a => aspEn[a.angle]);
    const scores = [];

    for (let jd = sJD; jd <= eJD; jd += step) {
      const T = (jd - 2451545) / 36525;
      let tot = 0;

      active.forEach(pd => {
        const l1 = Astro.getLon(pd.p1, T);
        const l2 = pd.type === 'tn' ? pd.natalLon : Astro.getLon(pd.p2, T);
        const s = Astro.sep180(l1, l2);

        activeAspects.forEach(a => {
          const dev = Math.abs(s - a.angle);
          if (dev <= orb) {
            const proximity = Math.cos((dev / orb) * Math.PI / 2);
            tot += a.score * a.w * proximity;
          }
        });
      });
      scores.push({ jd, v: tot });
    }
    return scores;
  }
};
