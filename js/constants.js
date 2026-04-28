/**
 * @file Configuration Constants
 * Defines astrological settings, UI constraints, and thematic colors.
 */

/**
 * @typedef {Object} Aspect
 * @property {number} angle - The angle in degrees (0, 90, 180, etc.).
 * @property {string} name - Short display name.
 * @property {string} sym - Astrological symbol glyph.
 * @property {string} col - Hex color for rendering.
 * @property {boolean} en - Default enabled state.
 * @property {number} score - Harmonic index contribution value.
 * @property {number} w - Visual weight for line drawing.
 */

/**
 * @typedef {Object} AstroConfig
 * @property {string[]} SIGNS - Zodiac sign symbols.
 * @property {string[]} PLANETS - List of supported planet names.
 * @property {Record<string, string>} SYM - Mapping of planet names to symbols.
 * @property {string[]} EXTERNOS - List of outer planets.
 * @property {string[]} PAIR_COLORS - Colors for transit-transit cycles.
 * @property {string[]} NATAL_COLORS - Colors for transit-natal cycles.
 * @property {Aspect[]} ASPECTS - List of astrological aspects.
 * @property {Record<string, string>} TEXTS - UI string constants for localization/accessibility.
 * @property {number} MARGIN_LEFT
 * @property {number} MARGIN_RIGHT
 * @property {number} MARGIN_TOP
 * @property {number} MARGIN_BOTTOM
 * @property {number} SCORE_H - Height of the harmonic index section.
 * @property {number} GAP - Vertical gap between sections.
 * @property {number} SCORE_THRESHOLD_POS - Threshold for positive harmonic index.
 * @property {number} SCORE_THRESHOLD_NEG - Threshold for negative harmonic index.
 * @property {number} KEPLER_MAX_ITERATIONS - Accuracy for orbital calculations.
 * @property {number} LABEL_MIN_DISTANCE - Minimum distance between chart labels.
 * @property {number} CIRCLE_RADIUS_NATAL
 * @property {number} CIRCLE_RADIUS_TRANSIT
 * @property {number} TIMELINE_ROW_H - Height of each row in the sign timeline.
 * @property {string[]} SIGN_ELEMENT_COLORS - Colors for Fire, Earth, Air, Water.
 * @property {string[]} SIGN_NAMES - Abbreviated sign names.
 */

/** @type {AstroConfig} */
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
  TEXTS: {
    PAIRS: 'PAIRS:',
    ASPECTS: 'ASPECTS:',
    INDEX: 'INDEX',
    NATAL_TAG_EMPTY: 'No natal data calculated',
    NATAL_TAG_READY: 'Natal data ready',
    STATUS_READY: 'READY · VSOP87/MEEUS · TRANSITS + NATAL',
    STATUS_CALC: 'CALCULATING...',
    TOOLTIP_INDEX: 'Index:',
    ARIA_REMOVE_PAIR: 'Remove pair',
    ARIA_TOGGLE_PAIR: 'Toggle visibility of ',
    ARIA_TOGGLE_ASPECT: 'Toggle ',
    TITLE_EDIT_SCORE: 'Click to edit score'
  },
  MARGIN_LEFT: 48,
  MARGIN_RIGHT: 8,
  MARGIN_TOP: 10,
  MARGIN_BOTTOM: 18,
  SCORE_H: 72,
  GAP: 8,
  SCORE_THRESHOLD_POS: 0.08,
  SCORE_THRESHOLD_NEG: -0.08,
  KEPLER_MAX_ITERATIONS: 50,
  LABEL_MIN_DISTANCE: 34,
  CIRCLE_RADIUS_NATAL: 2,
  CIRCLE_RADIUS_TRANSIT: 2.5,
  // Sign timeline
  TIMELINE_ROW_H: 15,
  // One color per astrological element in order Fire/Earth/Air/Water (sign % 4)
  SIGN_ELEMENT_COLORS: ['#6b1f1f', '#2a5225', '#1a3f6b', '#1f1f5a'],
  SIGN_NAMES: ['Ari','Tau','Gem','Can','Leo','Vir','Lib','Sco','Sag','Cap','Aqu','Pis']
};
