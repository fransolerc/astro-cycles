globalThis.AstroUtils = {
  fmtD: jd => {
    const d = new Date((jd - 2440587.5) * 86400000);
    const p = n => String(n).padStart(2, '0');
    return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear().toString().slice(2)}`;
  },

  signOf: (lon, Astro) => {
    const s = Math.floor(Astro.n360(lon) / 30);
    return globalThis.AstroCfg.SIGNS[s] + (Math.floor(Astro.n360(lon) % 30)) + '°';
  },

  stepFor: (p1) => {
    if (p1 === 'Moon') return 0.2;
    if (['Mercury', 'Venus'].includes(p1)) return 0.4;
    if (['Sun', 'Mars'].includes(p1)) return 0.8;
    if (['Jupiter', 'Saturn'].includes(p1)) return 2;
    return 5;
  },

  smoothArr: (arr, days) => {
    if (!arr?.length) return arr;
    const step = arr.length > 1 ? arr[1].jd - arr[0].jd : 1;
    const w = Math.max(1, Math.round(days / step));
    return arr.map((pt, i) => {
      const lo = Math.max(0, i - w), hi = Math.min(arr.length - 1, i + w);
      let sum = 0, n = 0;
      for (let k = lo; k <= hi; k++) { sum += arr[k].v; n++; }
      return { jd: pt.jd, v: sum / n };
    });
  },

  placeLabels: (cands) => {
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
};
