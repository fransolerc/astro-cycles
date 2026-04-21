// ─── ASTRONOMICAL ENGINE (VSOP87/MEEUS) ───
const Astro = {
  J2000: 2451545,
  d2r: d => d * Math.PI / 180,
  r2d: r => r * 180 / Math.PI,
  n360: d => ((d % 360) + 360) % 360,

  toJD: s => new Date(s + 'T12:00:00Z').getTime() / 86400000 + 2440587.5,
  
  toJDt: (date, time) => {
    const [h, m] = (time || '12:00').split(':').map(Number);
    return new Date(date + 'T12:00:00Z').getTime() / 86400000 + 2440587.5 + (h - 12) / 24 + m / 1440;
  },

  OE: {
    Mercury: [252.250906, 149472.6746358, 0.38709927, 0.20563593, 1.906e-5, 7.00497902, -5.94749e-3, 48.33076593, -0.12534081, 77.45779628, 0.16047689],
    Venus: [181.979801, 58517.815676, 0.72333566, 0.00677672, -4.107e-5, 3.39467605, -7.889e-4, 76.67984255, -0.27769418, 131.60246718, 2.68329e-3],
    Earth: [100.464457, 35999.372857, 1.00000261, 0.01671123, -4.392e-5, 0, 0, 0, 0, 102.93768193, 0.32327364],
    Mars: [355.433275, 19140.299314, 1.52371034, 0.0933941, 7.882e-5, 1.84969142, -8.131e-3, 49.55953891, -0.29257343, 336.04084002, 0.44441088],
    Jupiter: [34.351519, 3034.905961, 5.202887, 0.04838624, -1.3253e-4, 1.30439695, -1.83714e-3, 100.47390909, 0.20469106, 14.72847983, 0.21252668],
    Saturn: [50.077444, 1222.113794, 9.53667594, 0.05386179, -5.0991e-4, 2.48599187, 1.93609e-3, 113.66242448, -0.28867794, 92.59887831, -0.41897216],
    Uranus: [314.055005, 428.4669983, 19.1891846, 0.04725744, -4.397e-5, 0.77263783, -2.42939e-3, 74.01692503, 0.04240589, 170.9542763, 0.40805281],
    Neptune: [304.348665, 218.4862002, 30.0699701, 0.00859048, 5.105e-5, 1.77004347, 3.5372e-4, 131.78422574, -0.00508664, 44.96476227, -0.32241464],
    Pluto: [238.929, 145.2078, 39.48168677, 0.24880766, 6.32e-5, 17.1410426, 1.1e-5, 110.30347045, -1.841e-2, 224.06891629, -0.0409232]
  },

  kepler: (M, e) => {
    const Config = globalThis.AstroCfg;
    let E = M;
    for (let i = 0; i < Config.KEPLER_MAX_ITERATIONS; i++) {
      const dE = (M - E + e * Math.sin(E)) / (1 - e * Math.cos(E));
      E += dE;
      if (Math.abs(dE) < 1e-10) break;
    }
    return E;
  },

  helioXY: function(pl, T) {
    const [L0, L1, a, e0, e1, i0, i1, O0, O1, w0, w1] = this.OE[pl];
    const e = e0 + e1 * T, i = this.d2r(i0 + i1 * T);
    const Ov = this.d2r(this.n360(O0 + O1 * T)), wb = this.d2r(this.n360(w0 + w1 * T));
    const L = this.n360(L0 + L1 * T), M = this.d2r(this.n360(L - this.r2d(wb)));
    const E = this.kepler(M, e);
    const v = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
    const r = a * (1 - e * Math.cos(E)), w = wb - Ov, u = v + w;
    return {
      x: r * (Math.cos(Ov) * Math.cos(u) - Math.sin(Ov) * Math.sin(u) * Math.cos(i)),
      y: r * (Math.sin(Ov) * Math.cos(u) + Math.cos(Ov) * Math.sin(u) * Math.cos(i))
    };
  },

  getLon: function(pl, T) {
    if (pl === 'Sun') {
      const L0 = this.n360(280.46646 + 36000.76983 * T + 3.032e-4 * T * T);
      const M = this.d2r(this.n360(357.52911 + 35999.05029 * T - 1.537e-4 * T * T));
      const C = (1.914602 - 4.817e-3 * T - 1.4e-5 * T * T) * Math.sin(M) +
        (0.019993 - 1.01e-4 * T) * Math.sin(2 * M) + 2.89e-4 * Math.sin(3 * M);
      return this.n360(L0 + C);
    }
    if (pl === 'Moon') {
      const d = T * 36525;
      const L = this.n360(218.3165 + 13.176396 * d);
      const M = this.d2r(this.n360(134.9634 + 13.064993 * d));
      const Ms = this.d2r(this.n360(357.5291 + 0.9856 * d));
      const D = this.d2r(this.n360(297.8502 + 12.190749 * d));
      const F = this.d2r(this.n360(93.2721 + 13.22935 * d));
      return this.n360(L + 6.289 * Math.sin(M) + 1.274 * Math.sin(2 * D - M) + 0.658 * Math.sin(2 * D) +
        0.214 * Math.sin(2 * M) - 0.186 * Math.sin(Ms) - 0.114 * Math.sin(2 * F) +
        0.059 * Math.sin(2 * D - 2 * M) + 0.053 * Math.sin(2 * D + Math.sin(M)) + 0.046 * Math.sin(2 * D - Ms) +
        0.041 * Math.sin(M - Ms));
    }
    const { x: xp, y: yp } = this.helioXY(pl, T);
    const { x: xe, y: ye } = this.helioXY('Earth', T);
    return this.n360(this.r2d(Math.atan2(yp - ye, xp - xe)));
  },

  sep180: function(a, b) {
    const d = Math.abs(this.n360(b - a));
    return d > 180 ? 360 - d : d;
  }
};

globalThis.Astro = Astro;
