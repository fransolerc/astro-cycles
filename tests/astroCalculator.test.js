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
});
