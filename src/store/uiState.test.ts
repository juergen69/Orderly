import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  loadUiState,
  saveUiState,
  reconcileFocusSlots,
  defaultUiState,
} from './uiState';

describe('uiState', () => {
  let originalLocalStorage: Storage | undefined;

  beforeEach(() => {
    originalLocalStorage = globalThis.localStorage;
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: originalLocalStorage,
      configurable: true,
    });
  });

  function unsetLocalStorage() {
    Object.defineProperty(globalThis, 'localStorage', {
      value: undefined,
      configurable: true,
    });
  }

  it('falls back to defaults when localStorage is absent', () => {
    unsetLocalStorage();
    expect(loadUiState()).toEqual(defaultUiState());
  });

  it('falls back to defaults when localStorage throws', () => {
    const throwing = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    } as unknown as Storage;
    Object.defineProperty(globalThis, 'localStorage', {
      value: throwing,
      configurable: true,
    });
    expect(loadUiState()).toEqual(defaultUiState());
    expect(() => saveUiState(defaultUiState())).not.toThrow();
  });

  it('falls back to defaults when stored value is corrupt JSON', () => {
    const store = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => {
          store.set(k, v);
        },
        removeItem: (k: string) => {
          store.delete(k);
        },
        clear: () => store.clear(),
        key: () => null,
        length: 0,
      } as Storage,
      configurable: true,
    });
    store.set('orderly.uiState', '{not valid json');
    expect(loadUiState()).toEqual(defaultUiState());
  });

  it('persists and reloads valid ui state', () => {
    const store = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => {
          store.set(k, v);
        },
        removeItem: (k: string) => {
          store.delete(k);
        },
        clear: () => store.clear(),
        key: () => null,
        length: 0,
      } as Storage,
      configurable: true,
    });
    const ui = loadUiState();
    ui.activeView = 'calendar';
    ui.showAllRecurring = true;
    ui.focusAreas[1] = { index: 1, text: 'Deep work' };
    saveUiState(ui);
    const reloaded = loadUiState();
    expect(reloaded.activeView).toBe('calendar');
    expect(reloaded.showAllRecurring).toBe(true);
    expect(reloaded.focusAreas[1]?.text).toBe('Deep work');
  });

  it('reconcileFocusSlots clears stale refs but leaves matching refs', () => {
    const slots = [
      { index: 0, todoId: 'a' },
      { index: 1, todoId: 'gone' },
      { index: 2, todoId: null },
    ];
    const result = reconcileFocusSlots(slots, new Set(['a']));
    expect(result[0]?.todoId).toBe('a');
    expect(result[1]?.todoId).toBeNull();
    expect(result[2]?.todoId).toBeNull();
  });

  it('reconcileFocusSlots preserves focus areas (separate concept)', () => {
    const slots = [{ index: 0, todoId: 'gone' }];
    reconcileFocusSlots(slots, new Set());
    expect(slots[0]?.todoId).toBe('gone');
  });
});
