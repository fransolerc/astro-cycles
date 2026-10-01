import { describe, it, expect } from 'vitest';
import '../js/constants.js';
import '../js/stateManager.js';
import '../js/eventHandlers.js';

const { EventHandlers, StateManager } = globalThis;

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

describe('IDs de pares', () => {
    const emptyState = () => new StateManager({
        pairs: [], pairData: [], colorIdx: 0, nColorIdx: 0, cachedRaw: null
    });

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