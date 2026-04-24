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
});
