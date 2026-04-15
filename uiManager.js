globalThis.UIManager = {
  renderChips: (pairs, onRemove, onToggle) => {
    const bar = document.getElementById('pairs-bar');
    const { SYM } = globalThis.AstroCfg;
    bar.innerHTML = '<span class="pairs-title">PARES:</span>';
    pairs.forEach(p => {
      const c = document.createElement('div');
      c.className = 'chip' + (p.type === 'tn' ? ' natal-chip' : '') + (p.vis ? '' : ' off');
      const label = p.type === 'tt'
        ? `${SYM[p.p1]}${p.p1}–${SYM[p.p2]}${p.p2}`
        : `${SYM[p.p1]}${p.p1}<span class="chip-tn-label">-T</span>→${SYM[p.p2]}${p.p2}<span class="chip-tn-label">-N</span>`;
      c.innerHTML = `<div class="dot" style="background:${p.col}"></div><span style="color:${p.col}">${label}</span><span class="rx">✕</span>`;

      const removeBtn = c.querySelector('.rx');
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        onRemove(p.id);
      });
      c.addEventListener('click', () => onToggle(p.id));
      bar.appendChild(c);
    });
  },

  renderAspBar: (aspEn, onToggle, onScoreChange) => {
    const bar = document.getElementById('asp-bar');
    const { ASPECTS } = globalThis.AstroCfg;
    bar.innerHTML = '<span class="asp-title">ASPECTOS:</span>';
    ASPECTS.forEach(a => {
      const el = document.createElement('div');
      el.className = 'at' + (aspEn[a.angle] ? '' : ' off');

      let scoreClass;
      if (a.score > 0) scoreClass = 'at-score at-score-pos';
      else if (a.score < 0) scoreClass = 'at-score at-score-neg';
      else scoreClass = 'at-score at-score-neu';
      const scoreSign = a.score > 0 ? '+' : '';

      el.innerHTML =
        `<div class="ald" style="background:${a.col}"></div>` +
        `<span style="color:${a.col}">${a.sym} ${a.angle}°</span>` +
        `<span class="${scoreClass} at-score-val" title="Clic para editar score">${scoreSign}${a.score}</span>`;

      el.addEventListener('click', () => {
        onToggle(a.angle);
      });

      const scoreValueEl = el.querySelector('.at-score-val');
      scoreValueEl.addEventListener('click', e => {
        e.stopPropagation();
        globalThis.UIManager.openScoreInput(a, scoreValueEl, onScoreChange, () => globalThis.UIManager.renderAspBar(aspEn, onToggle, onScoreChange));
      });

      bar.appendChild(el);
    });
  },

  openScoreInput: (aspect, scoreEl, onScoreChange, onCancel) => {
    const inp = document.createElement('input');
    inp.type = 'number';
    inp.className = 'at-score-input';
    inp.value = String(aspect.score);
    inp.min = "-3"; inp.max = "3"; inp.step = "0.1";
    scoreEl.replaceWith(inp);
    inp.focus();
    inp.select();

    const commit = () => {
      const raw = Number.parseFloat(inp.value);
      const newScore = Number.isNaN(raw) ? aspect.score : Math.max(-3, Math.min(3, Number.parseFloat(raw.toFixed(1))));
      onScoreChange(aspect, newScore);
    };

    inp.addEventListener('blur', commit);
    inp.addEventListener('keydown', ev => {
      if (ev.key === 'Enter')  inp.blur();
      if (ev.key === 'Escape') onCancel();
      ev.stopPropagation();
    });
  },

  initPlanetSelects: () => {
    const { PLANETS, SYM } = globalThis.AstroCfg;
    [['np1', 'np2'], ['tp1', 'tp2']].forEach(([id1, id2]) => {
      const s1 = document.getElementById(id1), s2 = document.getElementById(id2);
      PLANETS.forEach(p => {
        [s1, s2].forEach(s => {
          const o = document.createElement('option');
          o.value = String(p);
          o.textContent = SYM[p] + ' ' + p;
          s.appendChild(o);
        });
      });
    });
  }
};
