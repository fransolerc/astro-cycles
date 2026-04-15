/**
 * Manages all DOM-related updates and UI rendering.
 * @namespace UIManager
 */
globalThis.UIManager = {
  /**
   * Renders the chips for active planet pairs.
   * @param {Array} pairs - Array of pair objects.
   * @param {Object} config - Configuration (SYM).
   * @param {Function} onRemove - Callback for removing a pair.
   * @param {Function} onToggle - Callback for toggling pair visibility.
   */
  renderChips: (pairs, config, onRemove, onToggle) => {
    const bar = document.getElementById('pairs-bar');
    if (!bar) return;
    
    bar.innerHTML = '<span class="pairs-title">PAIRS:</span>';
    pairs.forEach(p => {
      const c = document.createElement('div');
      c.className = `chip ${p.type === 'tn' ? 'natal-chip' : ''} ${p.vis ? '' : 'off'}`;
      
      const label = p.type === 'tt'
        ? `${config.SYM[p.p1]}${p.p1}–${config.SYM[p.p2]}${p.p2}`
        : `${config.SYM[p.p1]}${p.p1}<span class="chip-tn-label">-T</span>→${config.SYM[p.p2]}${p.p2}<span class="chip-tn-label">-N</span>`;
      
      c.innerHTML = `<div class="dot" style="background:${p.col}"></div><span style="color:${p.col}">${label}</span><span class="rx">✕</span>`;

      c.querySelector('.rx').addEventListener('click', (e) => {
        e.stopPropagation();
        onRemove(p.id);
      });
      c.addEventListener('click', () => onToggle(p.id));
      bar.appendChild(c);
    });
  },

  /**
   * Renders the aspect bar with scores.
   * @param {Object} aspEn - Enabled state of each aspect.
   * @param {Array} aspects - Aspect definitions.
   * @param {Function} onToggle - Callback for toggling an aspect.
   * @param {Function} onScoreChange - Callback for changing an aspect's score.
   */
  renderAspBar: (aspEn, aspects, onToggle, onScoreChange) => {
    const bar = document.getElementById('asp-bar');
    if (!bar) return;

    bar.innerHTML = '<span class="asp-title">ASPECTS:</span>';
    aspects.forEach(a => {
      const el = document.createElement('div');
      el.className = `at ${aspEn[a.angle] ? '' : 'off'}`;

      let scoreClass = 'at-score-neu';
      if (a.score > 0) {
        scoreClass = 'at-score-pos';
      } else if (a.score < 0) {
        scoreClass = 'at-score-neg';
      }

      const scoreSign = a.score > 0 ? '+' : '';

      el.innerHTML =
        `<div class="ald" style="background:${a.col}"></div>` +
        `<span style="color:${a.col}">${a.sym} ${a.angle}°</span>` +
        `<span class="at-score at-score-val ${scoreClass}" title="Click to edit score">${scoreSign}${a.score}</span>`;

      el.addEventListener('click', () => onToggle(a.angle));

      const scoreValueEl = el.querySelector('.at-score-val');
      scoreValueEl.addEventListener('click', e => {
        e.stopPropagation();
        globalThis.UIManager.openScoreInput(a, scoreValueEl, onScoreChange, () => 
          globalThis.UIManager.renderAspBar(aspEn, aspects, onToggle, onScoreChange)
        );
      });

      bar.appendChild(el);
    });
  },

  /**
   * Opens an input field to edit an aspect score.
   * @private
   */
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
      const val = Number.parseFloat(inp.value);
      const newScore = Number.isNaN(val) ? aspect.score : Math.max(-3, Math.min(3, Number.parseFloat(val.toFixed(1))));
      onScoreChange(aspect, newScore);
    };

    inp.addEventListener('blur', commit);
    inp.addEventListener('keydown', ev => {
      if (ev.key === 'Enter') inp.blur();
      if (ev.key === 'Escape') onCancel();
      ev.stopPropagation();
    });
  },

  /**
   * Fills the planet dropdowns.
   * @param {string[]} planets - List of planet names.
   * @param {Object} config - Configuration (SYM).
   */
  initPlanetSelects: (planets, config) => {
    [['np1', 'np2'], ['tp1', 'tp2']].forEach(([id1, id2]) => {
      const s1 = document.getElementById(id1), s2 = document.getElementById(id2);
      if (!s1 || !s2) return;
      planets.forEach(p => {
        [s1, s2].forEach(s => {
          const o = document.createElement('option');
          o.value = p;
          o.textContent = `${config.SYM[p]} ${p}`;
          s.appendChild(o);
        });
      });
    });
  }
};
