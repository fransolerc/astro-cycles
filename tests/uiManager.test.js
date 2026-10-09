import { describe, it, expect, beforeEach } from 'vitest';
import '../js/constants.js';
import '../js/uiManager.js';

describe('UIManager.renderPositions', () => {
    const { UIManager, AstroCfg } = globalThis;
    const items = [
        { planet: 'Sun', sign: 0, deg: 15, retro: false },
        { planet: 'Mercury', sign: 11, deg: 3, retro: true }
    ];

    beforeEach(() => {
        document.body.innerHTML = '<div id="pos-bar"></div>';
    });

    it('pinta título, fecha, pista y una celda por planeta', () => {
        UIManager.renderPositions(items, '01/10/2026', false, AstroCfg);
        const bar = document.getElementById('pos-bar');
        expect(bar.querySelector('.pos-title').textContent).toBe('POSITIONS');
        expect(bar.querySelector('.pos-date').textContent).toBe('01/10/2026');
        expect(bar.querySelector('.pos-hint').textContent).toBe('click chart to pin');
        expect(bar.querySelectorAll('.pos-item')).toHaveLength(2);
    });

    it('muestra signo y grado de cada planeta', () => {
        UIManager.renderPositions(items, '01/10/2026', false, AstroCfg);
        const first = document.querySelector('.pos-item');
        expect(first.querySelector('.pos-sym').textContent).toBe('☉');
        expect(first.querySelector('.pos-sign').textContent).toBe('♈');
        expect(first.querySelector('.pos-deg').textContent).toBe('15°');
    });

    it('emite ℞ solo en los retrógrados', () => {
        UIManager.renderPositions(items, '01/10/2026', false, AstroCfg);
        const cells = document.querySelectorAll('.pos-item');
        expect(cells[0].querySelector('.pos-rx')).toBeNull();
        expect(cells[1].querySelector('.pos-rx')).not.toBeNull();
    });

    it('marca la fecha fijada y cambia la pista', () => {
        UIManager.renderPositions(items, '01/10/2026', true, AstroCfg);
        expect(document.querySelector('.pos-date').classList.contains('pinned')).toBe(true);
        expect(document.querySelector('.pos-hint').textContent).toBe('click chart to unpin');
    });

    it('no falla si la barra no existe', () => {
        document.body.innerHTML = '';
        expect(() => UIManager.renderPositions(items, '01/10/2026', false, AstroCfg)).not.toThrow();
    });
});