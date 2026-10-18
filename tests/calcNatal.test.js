import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '../js/constants.js';
import '../js/astronomy.js';
import '../js/utils.js';
import '../js/astroCalculator.js';
import '../js/stateManager.js';
import '../js/eventHandlers.js';

describe('EventHandlers.calcNatal', () => {
    const { EventHandlers, StateManager, AstroCfg } = globalThis;
    let sm;

    beforeEach(() => {
        document.body.innerHTML =
            '<input id="nb-date" value="2000-01-01"><input id="nb-time" value="12:00"><div id="natal-tag"></div>';
        sm = new StateManager({ natalLons: null, cachedRaw: null });
    });

    it('guarda las longitudes de los 10 planetas en el estado', () => {
        EventHandlers.calcNatal(sm);
        expect(Object.keys(sm.getState().natalLons)).toEqual(AstroCfg.PLANETS);
    });

    it('pinta una celda por planeta y rotula la hora como UT', () => {
        EventHandlers.calcNatal(sm);
        const tag = document.getElementById('natal-tag');
        expect(tag.querySelectorAll('.natal-item')).toHaveLength(10);
        expect(tag.querySelector('.natal-date').textContent).toBe('2000-01-01 12:00 UT');
    });

    it('con J2000 el Sol natal está en Capricornio 10°', () => {
        EventHandlers.calcNatal(sm);
        const first = document.querySelector('.natal-item');
        expect(first.querySelector('.natal-sym').textContent).toBe('☉');
        expect(first.querySelector('.natal-pos').textContent).toBe('♑10°');
    });

    describe('pares T-N ya en el gráfico', () => {
        beforeEach(() => {
            vi.useFakeTimers();
            document.body.insertAdjacentHTML('beforeend',
                '<input id="sd" value="2026-01-01"><input id="ed" value="2027-01-01">' +
                '<select id="mode-sel"><option value="180" selected>180</option></select>' +
                '<div id="stat"></div>');
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        const tnState = () => new StateManager({
            natalLons: null,
            cachedRaw: null,
            pairs: [{ id: 1, type: 'tn', p1: 'Saturn', p2: 'Sun', vis: true, col: '#fff', natalLon: 0 }],
            pairData: []
        });

        it('actualiza natalLon al recalcular la natal', () => {
            const state = tnState();
            EventHandlers.calcNatal(state);
            const s = state.getState();
            expect(s.pairs[0].natalLon).toBe(s.natalLons.Sun);
            expect(s.pairs[0].natalLon).not.toBe(0);
        });

        it('recalcula las series para que usen la natal nueva', () => {
            const state = tnState();
            EventHandlers.calcNatal(state);
            vi.advanceTimersByTime(10);
            const s = state.getState();
            expect(s.pairData).toHaveLength(1);
            expect(s.pairData[0].natalLon).toBe(s.natalLons.Sun);
            expect(s.pairData[0].pts.length).toBeGreaterThan(0);
        });
    });
});