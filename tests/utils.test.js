import { describe, it, expect } from 'vitest';
import '../js/utils.js';

describe('AstroUtils', () => {
  const { AstroUtils } = globalThis;

  describe('fmtD', () => {
    it('should correctly format a Julian Day to DD/MM/YY', () => {
      // 2460000.5 is 2023-02-25
      expect(AstroUtils.fmtD(2460000.5)).toBe('25/02/23');
    });
  });

  describe('stepFor', () => {
    it('should return short steps for fast planets', () => {
      expect(AstroUtils.stepFor('Moon')).toBe(0.2);
      expect(AstroUtils.stepFor('Mercury')).toBe(0.4);
    });

    it('should return long steps for slow planets', () => {
      expect(AstroUtils.stepFor('Saturn')).toBe(2);
      expect(AstroUtils.stepFor('Pluto')).toBe(5); // Default
    });
  });

  describe('smoothArr', () => {
    it('should smooth an array of values', () => {
      const data = [
        { jd: 1, v: 10 },
        { jd: 2, v: 20 },
        { jd: 3, v: 30 }
      ];
      // With window 1, middle point (i=1) averages lo, i, hi (10, 20, 30) = 20
      const smoothed = AstroUtils.smoothArr(data, 1);
      expect(smoothed[1].v).toBe(20);
    });

    it('should handle empty arrays', () => {
      expect(AstroUtils.smoothArr([], 5)).toEqual([]);
    });
  });
});
