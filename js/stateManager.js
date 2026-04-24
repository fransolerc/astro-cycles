/**
 * @file State Management Module
 * Centralizes application state and provides a single source of truth.
 * Uses Observer pattern for reactive state updates.
 */

globalThis.StateManager = class StateManager extends EventTarget {
  constructor(initialState) {
    super();
    this.state = initialState;
  }

  /**
   * Updates state and emits 'stateChange' event.
   * @param {Partial<ApplicationState>} updates - State updates to apply.
   */
  setState(updates) {
    const oldState = { ...this.state };
    this.state = { ...this.state, ...updates };

    // Auto-invalidate score cache if relevant parts changed
    const cacheInvalidationKeys = ['aspEn', 'pairs', 'pairData', 'natalLons'];
    if (cacheInvalidationKeys.some(key => key in updates)) {
      this.state.cachedRaw = null;
    }

    // Emit change event with before/after state
    this.dispatchEvent(new CustomEvent('stateChange', {
      detail: { oldState, newState: this.state, updates }
    }));
  }

  /**
   * Gets the current state snapshot.
   * @returns {ApplicationState} Current state.
   */
  getState() {
    return { ...this.state };
  }

};

