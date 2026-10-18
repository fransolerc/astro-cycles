import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '../js/constants.js';
import '../js/astronomy.js';
import '../js/utils.js';
import '../js/astroCalculator.js';
import '../js/stateManager.js';
import '../js/eventHandlers.js';

const { EventHandlers, StateManager, AstroCalculator, AstroCfg } = globalThis;

const rangeDom = (sd = '2026-01-01', ed = '2027-01-01') => {
    document.body.innerHTML =
        `<input id="sd" value="${sd}"><input id="ed" value="${ed}">` +
        '<select id="mode-sel"><option value="180" selected>180</option></select>' +
        '<div id="stat"></div>';
};

afterEach(() => {
    document.body.innerHTML = '';
});

describe('EventHandlers.togglePair', () => {
    const makeState = () => new StateManager({
        pairs: [
            { id: 1, vis: true },
            { id: 2, vis: true }
        ],
        pairData: [
            { id: 1, vis: true, pts: [] },
            { id: 2, vis: true, pts: [] }
        ],
        cachedRaw: [{ jd: 0, v: 1 }]
    });

    it('propaga vis a pairs y a pairData', () => {
        const sm = makeState();
        EventHandlers.togglePair(1, sm);
        const s = sm.getState();
        expect(s.pairs[0].vis).toBe(false);
        expect(s.pairData[0].vis).toBe(false);
    });

    it('no toca los demás pares', () => {
        const sm = makeState();
        EventHandlers.togglePair(1, sm);
        const s = sm.getState();
        expect(s.pairs[1].vis).toBe(true);
        expect(s.pairData[1].vis).toBe(true);
    });

    it('invalida el índice cacheado (depende de qué pares son visibles)', () => {
        const sm = makeState();
        EventHandlers.togglePair(1, sm);
        expect(sm.getState().cachedRaw).toBeNull();
    });

    it('emite un único stateChange', () => {
        const sm = makeState();
        let events = 0;
        sm.addEventListener('stateChange', () => { events++; });
        EventHandlers.togglePair(1, sm);
        expect(events).toBe(1);
    });

    it('dos toggles devuelven el estado original', () => {
        const sm = makeState();
        EventHandlers.togglePair(1, sm);
        EventHandlers.togglePair(1, sm);
        const s = sm.getState();
        expect(s.pairs[0].vis).toBe(true);
        expect(s.pairData[0].vis).toBe(true);
    });
});

const emptyState = () => new StateManager({
    pairs: [], pairData: [], colorIdx: 0, nColorIdx: 0, natalLons: null, cachedRaw: null
});

describe('IDs de pares', () => {
    it('add10Externos genera 10 pares con IDs únicos', () => {
        const sm = emptyState();
        EventHandlers.add10Externos(sm);
        const ids = sm.getState().pairs.map(p => p.id);
        expect(ids).toHaveLength(10);
        expect(new Set(ids).size).toBe(10);
    });

    it('los IDs no colisionan entre llamadas distintas', () => {
        const sm = emptyState();
        EventHandlers.add10Externos(sm);
        EventHandlers.addPairTT('Sun', 'Moon', sm);
        EventHandlers.addPairTT('Mars', 'Venus', sm);
        const ids = sm.getState().pairs.map(p => p.id);
        expect(ids).toHaveLength(12);
        expect(new Set(ids).size).toBe(12);
    });

    it('removePair elimina solo el par indicado', () => {
        const sm = emptyState();
        EventHandlers.add10Externos(sm);
        const before = sm.getState().pairs;
        EventHandlers.removePair(before[3].id, sm);
        const after = sm.getState().pairs;
        expect(after).toHaveLength(9);
        expect(after.some(p => p.id === before[3].id)).toBe(false);
    });
});

describe('añadir pares calcula su serie al momento', () => {
    it('addPairTT rellena pairs y pairData con la serie', () => {
        rangeDom();
        const sm = emptyState();
        EventHandlers.addPairTT('Jupiter', 'Saturn', sm);
        const s = sm.getState();
        expect(s.pairs).toHaveLength(1);
        expect(s.pairData).toHaveLength(1);
        expect(s.pairData[0].id).toBe(s.pairs[0].id);
        expect(s.pairData[0].pts.length).toBeGreaterThan(100);
    });

    it('addPairTT emite un único stateChange', () => {
        rangeDom();
        const sm = emptyState();
        let events = 0;
        sm.addEventListener('stateChange', () => { events++; });
        EventHandlers.addPairTT('Jupiter', 'Saturn', sm);
        expect(events).toBe(1);
    });

    it('sin controles de rango añade el par con la serie vacía', () => {
        document.body.innerHTML = '';
        const sm = emptyState();
        EventHandlers.addPairTT('Jupiter', 'Saturn', sm);
        const s = sm.getState();
        expect(s.pairs).toHaveLength(1);
        expect(s.pairData[0].pts).toEqual([]);
    });

    it('con fechas inválidas añade el par con la serie vacía', () => {
        rangeDom('2027-01-01', '2026-01-01');
        const sm = emptyState();
        EventHandlers.addPairTT('Jupiter', 'Saturn', sm);
        expect(sm.getState().pairData[0].pts).toEqual([]);
    });

    it('add10Externos calcula la serie de los 10 pares', () => {
        rangeDom();
        const sm = emptyState();
        EventHandlers.add10Externos(sm);
        const { pairData } = sm.getState();
        expect(pairData).toHaveLength(10);
        expect(pairData.every(p => p.pts.length > 0)).toBe(true);
    });

    it('add10Externos no hace nada si los 10 ya existen', () => {
        rangeDom();
        const sm = emptyState();
        EventHandlers.add10Externos(sm);
        let events = 0;
        sm.addEventListener('stateChange', () => { events++; });
        EventHandlers.add10Externos(sm);
        expect(events).toBe(0);
        expect(sm.getState().pairs).toHaveLength(10);
    });

    it('addPairTN calcula la serie contra la natal guardada', () => {
        rangeDom();
        document.body.insertAdjacentHTML('beforeend',
            '<select id="tp1"><option value="Saturn" selected>Saturn</option></select>' +
            '<select id="tp2"><option value="Sun" selected>Sun</option></select>');
        const sm = emptyState();
        sm.setState({ natalLons: { Sun: 100 } });
        EventHandlers.addPairTN(sm);
        const { pairData } = sm.getState();
        expect(pairData).toHaveLength(1);
        expect(pairData[0].natalLon).toBe(100);
        expect(pairData[0].pts.length).toBeGreaterThan(0);
    });
});

describe('EventHandlers.runCalc', () => {
    const pair = { id: 1, p1: 'Jupiter', p2: 'Saturn', type: 'tt', vis: true, col: '#fff' };
    const makeState = () => new StateManager({ pairs: [pair], pairData: [], cachedRaw: null });
    const stat = () => document.getElementById('stat').textContent;

    beforeEach(() => {
        vi.useFakeTimers();
        rangeDom();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('calcula pairData y actualiza la barra de estado', () => {
        const sm = makeState();
        EventHandlers.runCalc(sm);
        expect(stat()).toBe('CALCULATING...');
        vi.advanceTimersByTime(10);
        const { pairData } = sm.getState();
        expect(pairData).toHaveLength(1);
        expect(pairData[0].pts.length).toBeGreaterThan(0);
        expect(stat()).toContain('1 PAIR(S) (0 T→N)');
        expect(stat()).toContain(AstroCfg.TEXTS.ENGINE_TAG);
    });

    it('varias llamadas seguidas calculan una sola vez', () => {
        const spy = vi.spyOn(AstroCalculator, 'calcSeriesTT');
        const sm = makeState();
        EventHandlers.runCalc(sm);
        EventHandlers.runCalc(sm);
        vi.advanceTimersByTime(10);
        expect(spy).toHaveBeenCalledTimes(1);
    });

    it('usa los pares vigentes cuando dispara el temporizador', () => {
        const sm = makeState();
        EventHandlers.runCalc(sm);
        sm.setState({ pairs: [pair, { ...pair, id: 2, p1: 'Saturn', p2: 'Uranus' }] });
        vi.advanceTimersByTime(10);
        expect(sm.getState().pairData).toHaveLength(2);
    });

    it('con fechas inválidas y silent, muestra el error en la barra y no calcula', () => {
        rangeDom('2027-01-01', '2026-01-01');
        const sm = makeState();
        EventHandlers.runCalc(sm, { silent: true });
        expect(stat()).toContain('End date must be after start date');
        vi.advanceTimersByTime(10);
        expect(sm.getState().pairData).toEqual([]);
    });

    it('con fechas inválidas y sin silent, avisa con alert', () => {
        rangeDom('2027-01-01', '2026-01-01');
        const alertMock = vi.fn();
        vi.stubGlobal('alert', alertMock);
        EventHandlers.runCalc(makeState());
        expect(alertMock).toHaveBeenCalledWith('End date must be after start date');
    });
});