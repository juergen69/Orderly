import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore } from '../../store/store';
import { InMemoryRepository } from '../../storage/InMemoryRepository';
import { setActiveStore } from '../../store/storeInstance';
import { FocusAreas } from './FocusAreas';

describe('FocusAreas', () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(async () => {
    localStorage.clear();
    store = createStore({ repository: new InMemoryRepository() });
    setActiveStore(store);
    await store.getState().hydrate();
  });

  afterEach(() => {
    cleanup();
    setActiveStore(null);
    localStorage.clear();
  });

  it('saves on Enter and persists via uiState', async () => {
    render(<FocusAreas />);
    const textarea = screen.getByLabelText('Focus area 1');

    await userEvent.type(textarea, 'Ship the v1{Enter}');
    expect(store.getState().ui.focusAreas[0]!.text).toBe('Ship the v1');
    expect(localStorage.getItem('orderly.uiState')).toContain('Ship the v1');
  });

  it('saves on blur', async () => {
    render(<FocusAreas />);
    const textarea = screen.getByLabelText('Focus area 2');

    await userEvent.type(textarea, 'A weekly theme');
    await userEvent.tab();
    expect(store.getState().ui.focusAreas[1]!.text).toBe('A weekly theme');
  });

  it('cancels edits on Escape without saving', async () => {
    render(<FocusAreas />);
    const textarea = screen.getByLabelText('Focus area 3');

    await userEvent.type(textarea, 'temp');
    await userEvent.keyboard('{Escape}');
    expect(store.getState().ui.focusAreas[2]!.text).toBe('');
    expect(textarea).toHaveValue('');
  });
});
