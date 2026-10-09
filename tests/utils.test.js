import { describe, it, expect, vi } from 'vitest';
import '../js/constants.js';
import '../js/astronomy.js';
import '../js/utils.js';

describe('AstroUtils', () => {
  const { AstroUtils } = globalThis;

  describe('fmtD', () => {
    it('should correctly format a Julian Day to DD/MM/YY', () => {
      // 2460000.5 is 2023-02-25
      expect(AstroUtils.fmtD(2460000.5)).toBe('25/02/23');
    });
  });

  describe('fmtD con año largo', () => {
    it('usa cuatro dígitos si se pide', () => {
      expect(AstroUtils.fmtD(2460000.5, true)).toBe('25/02/2023');
    });
  });

  describe('positionsAt', () => {
    it('calcula signo, grado y retrogradación con un motor simulado', () => {
      const mock = {
        n360: v => ((v % 360) + 360) % 360,
        getLon: vi.fn(p => ({ Sun: 15.5, Mercury: 359.9 })[p]),
        isRetro: vi.fn(p => p === 'Mercury')
      };
      expect(AstroUtils.positionsAt(2451545, mock, ['Sun', 'Mercury'])).toEqual([
        { planet: 'Sun', sign: 0, deg: 15, retro: false },
        { planet: 'Mercury', sign: 11, deg: 29, retro: true }
      ]);
    });

    it('con el motor real, el Sol en J2000 está en Capricornio 10°', () => {
      // λ☉ ≈ 280.38° el 2000-01-01 12:00 → signo 9 (Capricornio), grado 10
      const [sun] = AstroUtils.positionsAt(2451545, globalThis.Astro, ['Sun']);
      expect(sun).toEqual({ planet: 'Sun', sign: 9, deg: 10, retro: false });
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

  describe('aspectTargets', () => {
    it('devuelve un solo objetivo para 0° y 180°', () => {
      expect(AstroUtils.aspectTargets(0)).toEqual([0]);
      expect(AstroUtils.aspectTargets(180)).toEqual([180]);
    });

    it('devuelve el aspecto y su espejo para el resto', () => {
      expect(AstroUtils.aspectTargets(60)).toEqual([60, 300]);
      expect(AstroUtils.aspectTargets(90)).toEqual([90, 270]);
    });
  });
});
