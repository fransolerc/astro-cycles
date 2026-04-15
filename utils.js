/**
 * Utility functions for astronomical and chart calculations.
 * @namespace AstroUtils
 */
globalThis.AstroUtils = {
  /**
   * Format a Julian Day number into a short date string (DD/MM/YY).
   * @param {number} jd - Julian Day number.
   * @returns {string} Formatted date.
   */
  fmtD: (jd) => {
    const d = new Date((jd - 2440587.5) * 86400000);
    const p = (n) => String(n).padStart(2, '0');
    return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear().toString().slice(2)}`;
  },

  /**
   * Convert longitude to a zodiacal sign representation.
   * @param {number} lon - Ecliptic longitude in degrees (0-360).
   * @param {Object} Astro - Astronomical calculation engine.
   * @param {string[]} signs - Array of zodiac symbols.
   * @returns {string} Sign symbol and degrees (e.g., ♈15°).
   */
  signOf: (lon, Astro, signs) => {
    const s = Math.floor(Astro.n360(lon) / 30);
    return signs[s] + (Math.floor(Astro.n360(lon) % 30)) + '°';
  },

  /**
   * Calculate step size for orbital calculations based on planetary speed.
   * @param {string} planet - Planet name.
   * @returns {number} Step size in days.
   */
  stepFor: (planet) => {
    const fastPlanets = { 'Moon': 0.2, 'Mercury': 0.4, 'Venus': 0.4 };
    const mediumPlanets = { 'Sun': 0.8, 'Mars': 0.8 };
    const slowPlanets = { 'Jupiter': 2, 'Saturn': 2 };

    return fastPlanets[planet] || mediumPlanets[planet] || slowPlanets[planet] || 5;
  },

  /**
   * Smooth an array of data points using a simple moving average.
   * @param {Array<{jd: number, v: number}>} arr - Raw data points.
   * @param {number} windowDays - Window size for smoothing in days.
   * @returns {Array<{jd: number, v: number}>} Smoothed data points.
   */
  smoothArr: (arr, windowDays) => {
    if (!arr?.length) return arr;
    const step = arr.length > 1 ? arr[1].jd - arr[0].jd : 1;
    const w = Math.max(1, Math.round(windowDays / step));
    return arr.map((pt, i) => {
      const lo = Math.max(0, i - w), hi = Math.min(arr.length - 1, i + w);
      let sum = 0, n = 0;
      for (let k = lo; k <= hi; k++) { sum += arr[k].v; n++; }
      return { jd: pt.jd, v: sum / n };
    });
  },

  /**
   * Distribute labels vertically to prevent overlap.
   * @param {Array<Object>} candidates - Label objects with x coordinate.
   * @returns {Array<Object>} Label objects with assigned row index.
   */
  placeLabels: (candidates) => {
    const placed = [];
    candidates.forEach(c => {
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
};
