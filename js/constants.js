globalThis.AstroCfg = {
  SIGNS: ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'],
  PLANETS: ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'],
  SYM: {
    Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
    Jupiter: '♃', Saturn: '♄', Uranus: '⛢', Neptune: '♆', Pluto: '♇'
  },
  EXTERNOS: ['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'],
  PAIR_COLORS: ['#fb923c', '#fbbf24', '#67e8f9', '#818cf8', '#e879f9', '#34d399', '#f87171', '#c084fc', '#60a5fa', '#f472b6', '#a3e635', '#ff6090'],
  NATAL_COLORS: ['#d08af0', '#a06ad0', '#c060e0', '#e090ff', '#9050c0', '#b070e0', '#f0a0ff', '#8040b0'],
  ASPECTS: [
    { angle: 0,   name: 'Cnj',     sym: '☌', col: '#fcd34d', en: true,  score: 0,    w: 1 },
    { angle: 30,  name: 'Semi',    sym: '⚺', col: '#666666', en: false, score: 0.3,  w: 0.4 },
    { angle: 45,  name: 'Octile', sym: '∠', col: '#888888', en: false, score: -0.4, w: 0.4 },
    { angle: 60,  name: 'Sex',     sym: '⚹', col: '#34d399', en: true,  score: 1,    w: 0.8 },
    { angle: 90,  name: 'Cua',     sym: '□', col: '#f87171', en: true,  score: -1,   w: 1 },
    { angle: 120, name: 'Tri',     sym: '△', col: '#60a5fa', en: true,  score: 1,    w: 1.2 },
    { angle: 150, name: 'Qui',     sym: '⚻', col: '#fb923c', en: false, score: -0.5, w: 0.5 },
    { angle: 180, name: 'Opo',     sym: '☍', col: '#c084fc', en: true,  score: -1,   w: 1 },
  ],
  MARGIN_LEFT: 48,
  MARGIN_RIGHT: 8,
  MARGIN_TOP: 10,
  MARGIN_BOTTOM: 18,
  SCORE_H: 72,
  GAP: 8,
  SCORE_THRESHOLD_POS: 0.08,
  SCORE_THRESHOLD_NEG: -0.08,
  KEPLER_MAX_ITERATIONS: 50
};
