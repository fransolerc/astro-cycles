import { describe, it, expect, vi } from 'vitest';
import '../js/constants.js';
import '../js/utils.js';
import '../js/astroCalculator.js';
import '../js/chartRenderer.js';

const makeCtx = () => ({
    beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(),
    fill: vi.fn(), arc: vi.fn(), fillText: vi.fn(), setLineDash: vi.fn()
});

describe('ChartRenderer.drawAspectLines', () => {
    const aspects = [{ angle: 60, col: '#34d399', sym: '⚹' }];
    const makeRc = ctx => ({ ctx, MARGIN_LEFT: 48, MARGIN_RIGHT: 8, W: 500, yd: d => d });

    it('en modo 180 dibuja una línea por aspecto', () => {
        const ctx = makeCtx();
        globalThis.ChartRenderer.drawAspectLines(makeRc(ctx), aspects, 180);
        expect(ctx.fillText).toHaveBeenCalledTimes(1);
        expect(ctx.fillText.mock.calls[0][0]).toBe('⚹ 60°');
    });

    it('en modo 360 dibuja también el espejo (300°)', () => {
        const ctx = makeCtx();
        globalThis.ChartRenderer.drawAspectLines(makeRc(ctx), aspects, 360);
        const labels = ctx.fillText.mock.calls.map(c => c[0]);
        expect(labels).toEqual(['⚹ 60°', '⚹ 300°']);
    });
});

describe('ChartRenderer.drawCycles: marcadores de cruce', () => {
    // Geometría realista: yd(180) cae sobre MARGIN_TOP, yd(0) en el fondo.
    const MARGIN_TOP = 10, ih = 190;
    const yd = d => MARGIN_TOP + ih - (d / 180) * ih;
    const xj = jd => 48 + (jd - 2451545) * 100;
    const config = { SYM: { Jupiter: 'J', Saturn: 'S' } };

    const run = (pts, aspect) => {
        const ctx = makeCtx();
        const rc = { ctx, xj, yd, MARGIN_LEFT: 48, MARGIN_RIGHT: 8, W: 500, MARGIN_TOP, ih };
        const pd = { id: 1, vis: true, col: '#fff', type: 'tt', p1: 'Jupiter', p2: 'Saturn', pts };
        globalThis.ChartRenderer.drawCycles(rc, [pd], 180, [aspect], 180, config);
        return ctx;
    };

    it('marca una conjunción aunque la curva plegada solo toque 0°', () => {
        const pts = [
            { jd: 2451545, a: 0.5, d: 359.5 },
            { jd: 2451546, a: 0.5, d: 0.5 }
        ];
        const ctx = run(pts, { angle: 0, col: '#fcd34d', sym: '☌' });
        expect(ctx.arc).toHaveBeenCalledTimes(1);
        expect(ctx.arc.mock.calls[0].slice(0, 2)).toEqual([98, yd(0)]);
    });

    it('marca una oposición y coloca la fecha debajo, porque arriba no cabe', () => {
        const pts = [
            { jd: 2451545, a: 179.5, d: 179.5 },
            { jd: 2451546, a: 179.5, d: 180.5 }
        ];
        const ctx = run(pts, { angle: 180, col: '#c084fc', sym: '☍' });
        expect(ctx.arc).toHaveBeenCalledTimes(1);
        // c.y = MARGIN_TOP → label en c.y + 14
        expect(ctx.fillText).toHaveBeenCalledWith(expect.any(String), 98, MARGIN_TOP + 14);
    });
});