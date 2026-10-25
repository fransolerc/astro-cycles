import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '../js/constants.js';
import '../js/astronomy.js';
import '../js/utils.js';
import '../js/astroCalculator.js';
import '../js/chartRenderer.js';
import '../js/stateManager.js';
import '../js/canvasManager.js';

// A canvas context that accepts any call and any property assignment.
const makeCtx = () => new Proxy({}, {
    get: (t, k) => (k in t ? t[k] : (t[k] = vi.fn())),
    set: (t, k, v) => { t[k] = v; return true; }
});

describe('CanvasManager.drawChart', () => {
    const { CanvasManager, StateManager, AstroCalculator, AstroCfg, Astro, ChartRenderer } = globalThis;

    const makeState = () => {
        const sJD = Astro.toJD('2026-01-01');
        const eJD = Astro.toJD('2027-01-01');
        return new StateManager({
            aspEn: Object.fromEntries(AstroCfg.ASPECTS.map(a => [a.angle, a.en])),
            pairs: [],
            pairData: [{
                id: 1, vis: true, type: 'tt', p1: 'Jupiter', p2: 'Saturn', col: '#fff',
                pts: AstroCalculator.calcSeriesTT('Jupiter', 'Saturn', sJD, eJD, 180, Astro)
            }],
            cachedRaw: null
        });
    };

    const render = sm => CanvasManager.drawChart(CanvasManager.setupCanvas(sm), sm);

    // Same wiring as app.js: every stateChange re-renders. Without this listener
    // a stray event in the middle of a draw has no visible effect, so the
    // "drawn once" tests would pass even with the re-entrance bug present.
    const makeWiredState = () => {
        const sm = makeState();
        sm.addEventListener('stateChange', () => render(sm));
        return sm;
    };

    beforeEach(() => {
        document.body.innerHTML =
            '<div id="cwrap"><canvas id="cv"></canvas></div>' +
            '<select id="mode-sel"><option value="180" selected>180</option></select>' +
            '<input id="sd" value="2026-01-01"><input id="ed" value="2027-01-01">' +
            '<input id="orb-sl" value="7"><input id="sm-sl" value="5">';
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(makeCtx());
    });

    afterEach(() => {
        vi.restoreAllMocks();
        document.body.innerHTML = '';
    });

    it('filling the index cache does not emit stateChange', () => {
        const sm = makeState();
        let events = 0;
        sm.addEventListener('stateChange', () => { events++; });
        render(sm);
        expect(events).toBe(0);
        expect(sm.getState().cachedRaw.length).toBeGreaterThan(0);
    });

    it('draws the index once per render, even when the cache was empty', () => {
        const spy = vi.spyOn(ChartRenderer, 'drawScoreChart');
        render(makeWiredState());
        expect(spy).toHaveBeenCalledTimes(1);
    });

    it('draws the today line once per render, even when the cache was empty', () => {
        const spy = vi.spyOn(CanvasManager, 'drawTodayLine');
        render(makeWiredState());
        expect(spy).toHaveBeenCalledTimes(1);
    });

    it('reuses the cached index on the next render', () => {
        const calc = vi.spyOn(AstroCalculator, 'calcRawScores');
        const score = vi.spyOn(ChartRenderer, 'drawScoreChart');
        const sm = makeWiredState();
        render(sm);
        render(sm);
        expect(calc).toHaveBeenCalledTimes(1);
        expect(score).toHaveBeenCalledTimes(2);
    });
});