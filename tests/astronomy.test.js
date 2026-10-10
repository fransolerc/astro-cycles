import { describe, it, expect } from 'vitest';
import '../js/constants.js'; // Necesario para AstroCfg
import '../js/astronomy.js';

describe('Astro Engine', () => {
  const { Astro } = globalThis;

  describe('n360', () => {
    it('should normalize angles to 0-360 range', () => {
      expect(Astro.n360(370)).toBe(10);
      expect(Astro.n360(-10)).toBe(350);
      expect(Astro.n360(360)).toBe(0);
    });
  });

  describe('toJD', () => {
    it('should convert date string to correct Julian Day', () => {
      // 2000-01-01 at noon is exactly J2000 (2451545)
      expect(Astro.toJD('2000-01-01')).toBe(2451545);
    });
  });

  describe('sep180', () => {
    it('should calculate the shortest distance between two longitudes', () => {
      expect(Astro.sep180(10, 20)).toBe(10);
      expect(Astro.sep180(350, 10)).toBe(20);
      expect(Astro.sep180(0, 180)).toBe(180);
      expect(Astro.sep180(0, 200)).toBe(160);
    });
  });

  describe('getLon', () => {
    it('should return a longitude for a known planet', () => {
      const T = 0; // J2000
      const lon = Astro.getLon('Jupiter', T);
      expect(typeof lon).toBe('number');
      expect(lon).toBeGreaterThanOrEqual(0);
      expect(lon).toBeLessThan(360);
    });

    it('should handle Sun and Moon calculations', () => {
      const T = 0;
      expect(typeof Astro.getLon('Sun', T)).toBe('number');
      expect(typeof Astro.getLon('Moon', T)).toBe('number');
    });
  });

  describe('precession', () => {
    it('es cero en J2000', () => {
      expect(Astro.precession(0)).toBe(0);
    });

    it('acumula ~1.397° por siglo', () => {
      expect(Astro.precession(1)).toBeCloseTo(1.3972, 3);
    });
  });

  describe('getLon: marco de referencia', () => {
    const T2026 = 0.2626;

    it('los planetas se expresan respecto al equinoccio de la fecha', () => {
      ['Mars', 'Jupiter', 'Saturn', 'Neptune'].forEach(pl => {
        const p = Astro.helioXY(pl, T2026), e = Astro.helioXY('Earth', T2026);
        const j2000 = Astro.n360(Astro.r2d(Math.atan2(p.y - e.y, p.x - e.x)));
        const diff = Astro.n360(Astro.getLon(pl, T2026) - j2000);
        expect(diff).toBeCloseTo(Astro.precession(T2026), 6);
      });
    });

    // Primer cambio de signo del planeta en una ventana ±45 días alrededor de `centerDate`.
    const firstSignChange = (planet, centerDate, halfWindow = 45) => {
      const center = Astro.toJD(centerDate);
      const signAt = jd => Math.floor(Astro.getLon(planet, (jd - 2451545) / 36525) / 30);
      let prev = signAt(center - halfWindow);
      for (let jd = center - halfWindow + 0.25; jd <= center + halfWindow; jd += 0.25) {
        const s = signAt(jd);
        if (s !== prev) return jd;
        prev = s;
      }
      return null;
    };

    // Ingresos tropicales de 2025 (fechas de efemérides, UTC). La tolerancia de 4 días
    // cubre el error propio de los elementos keplerianos. Sin precesión, el retraso
    // sería de ~4 d en Saturno, ~9 d en Urano y ~18 d en Neptuno.
    it.each([
      ['Neptune', '2025-03-30'], // entra en Aries
      ['Uranus',  '2025-07-07'], // entra en Géminis
      ['Saturn',  '2025-05-25']  // entra en Aries
    ])('%s cambia de signo cerca de %s', (planet, date) => {
      const jd = firstSignChange(planet, date);
      expect(jd).not.toBeNull();
      expect(Math.abs(jd - Astro.toJD(date))).toBeLessThanOrEqual(4);
    });
  });
});
