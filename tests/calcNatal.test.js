import { describe, it, expect, beforeEach } from 'vitest';
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
});