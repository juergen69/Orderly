import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore } from '../../store/store';
import { InMemoryRepository } from '../../storage/InMemoryRepository';
import { setActiveStore } from '../../store/storeInstance';
import { RecurringFilter } from './RecurringFilter';

describe('RecurringFilter', () => {
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

  it('defaults to Soon (showAllRecurring false)', () => {
    render(<RecurringFilter />);
    expect(screen.getByRole('button', { name: 'Soon' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('toggles to All and persists via uiState', async () => {
    render(<RecurringFilter />);
    await userEvent.click(screen.getByRole('button', { name: 'All' }));

    expect(store.getState().ui.showAllRecurring).toBe(true);
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    // Persisted to localStorage.
    expect(localStorage.getItem('orderly.uiState')).toContain('"showAllRecurring":true');
  });

  it('toggles back to Soon', async () => {
    render(<RecurringFilter />);
    await userEvent.click(screen.getByRole('button', { name: 'All' }));
    await userEvent.click(screen.getByRole('button', { name: 'Soon' }));
    expect(store.getState().ui.showAllRecurring).toBe(false);
  });
});
