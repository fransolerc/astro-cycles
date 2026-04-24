import { describe, it, expect, beforeEach } from 'vitest';
import '../js/stateManager.js';

describe('StateManager', () => {
  let stateManager;
  const initialState = { pairs: [], count: 0, cachedRaw: null };

  beforeEach(() => {
    stateManager = new globalThis.StateManager(initialState);
  });

  it('should initialize with the correct state', () => {
    expect(stateManager.getState()).toEqual(initialState);
  });

  it('should update state via setState', () => {
    stateManager.setState({ count: 5 });
    expect(stateManager.getState().count).toBe(5);
    expect(stateManager.getState().pairs).toEqual([]);
  });

  it('should invalidate cache when relevant keys change', () => {
    stateManager.setState({ cachedRaw: [1, 2, 3] });
    expect(stateManager.getState().cachedRaw).not.toBeNull();

    // Changing 'pairs' should set cachedRaw to null
    stateManager.setState({ pairs: ['Jupiter-Saturn'] });
    expect(stateManager.getState().cachedRaw).toBeNull();
  });

  it('should emit a stateChange event when updating', () => {
    let eventDetail = null;
    stateManager.addEventListener('stateChange', (e) => {
      eventDetail = e.detail;
    });

    stateManager.setState({ count: 10 });

    expect(eventDetail).not.toBeNull();
    expect(eventDetail.newState.count).toBe(10);
    expect(eventDetail.updates).toEqual({ count: 10 });
  });
});
