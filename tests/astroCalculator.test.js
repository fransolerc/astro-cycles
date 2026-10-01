import { describe, it, expect, vi } from 'vitest';
import '../js/utils.js';
import '../js/astroCalculator.js';

describe('AstroCalculator', () => {
  const { AstroCalculator } = globalThis;
  
  // Mock Astro engine
  const mockAstro = {
    toJDt: vi.fn(() => 2451545),
    getLon: vi.fn((p) => p === 'Jupiter' ? 10 : 20),
    n360: vi.fn((val) => (val + 360) % 360),
    sep180: vi.fn((l1, l2) => Math.abs(l1 - l2))
  };

  describe('calcNatal', () => {
    it('should calculate natal positions by calling getLon', () => {
      const planets = ['Jupiter', 'Saturn'];
      const result = AstroCalculator.calcNatal('2000-01-01', '12:00', mockAstro, planets);
      
      expect(mockAstro.getLon).toHaveBeenCalled();
      expect(result).toHaveProperty('Jupiter');
      expect(result).toHaveProperty('Saturn');
    });
  });

  describe('calcSeriesTT', () => {
    it('should generate a series of points between two dates', () => {
      const result = AstroCalculator.calcSeriesTT('Jupiter', 'Saturn', 2451545, 2451550, 180, mockAstro);
      
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('jd');
      expect(result[0]).toHaveProperty('a');
    });
  });

  describe('series con diferencia con signo', () => {
    it('calcSeriesTT incluye d', () => {
      // mock: Jupiter=10, resto=20 → l2 - l1 = 10 para Jupiter→Saturn
      const result = AstroCalculator.calcSeriesTT('Jupiter', 'Saturn', 2451545, 2451550, 180, mockAstro);
      expect(result[0].d).toBe(10);
    });

    it('calcSeriesTN incluye d', () => {
      // mock: Saturn=20, natalLon=5 → lt - natalLon = 15
      const result = AstroCalculator.calcSeriesTN('Saturn', 5, 2451545, 2451550, 180, mockAstro);
      expect(result[0].d).toBe(15);
    });
  });

  describe('findCrossings', () => {
    it('detecta la conjunción (cruce 359° → 1°)', () => {
      const r = AstroCalculator.findCrossings([{ jd: 0, d: 359 }, { jd: 1, d: 1 }], 0);
      expect(r).toHaveLength(1);
      expect(r[0].jd).toBeCloseTo(0.5);
    });

    it('detecta la oposición (179° → 181°)', () => {
      const r = AstroCalculator.findCrossings([{ jd: 0, d: 179 }, { jd: 1, d: 181 }], 180);
      expect(r).toHaveLength(1);
      expect(r[0].jd).toBeCloseTo(0.5);
    });

    it('detecta el aspecto por ambos lados (60° y 300°)', () => {
      expect(AstroCalculator.findCrossings([{ jd: 0, d: 58 }, { jd: 1, d: 62 }], 60)).toHaveLength(1);
      expect(AstroCalculator.findCrossings([{ jd: 0, d: 298 }, { jd: 1, d: 302 }], 60)).toHaveLength(1);
    });

    it('no confunde el antípoda con un cruce', () => {
      expect(AstroCalculator.findCrossings([{ jd: 0, d: 179 }, { jd: 1, d: 181 }], 0)).toHaveLength(0);
    });

    it('no cuenta dos veces una muestra exacta sobre el aspecto', () => {
      const pts = [{ jd: 0, d: 59 }, { jd: 1, d: 60 }, { jd: 2, d: 61 }];
      expect(AstroCalculator.findCrossings(pts, 60)).toHaveLength(1);
    });
  });
});
