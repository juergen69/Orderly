import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore } from '../../store/store';
import { InMemoryRepository } from '../../storage/InMemoryRepository';
import { setActiveStore } from '../../store/storeInstance';
import { SEARCH_DEBOUNCE_MS, SearchBar } from './SearchBar';

describe('SearchBar', () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(async () => {
    store = createStore({ repository: new InMemoryRepository() });
    setActiveStore(store);
    await store.getState().hydrate();
  });

  afterEach(() => {
    cleanup();
    setActiveStore(null);
  });

  it('debounces ~150ms before pushing the query to the store', async () => {
    const user = userEvent.setup();
    render(<SearchBar />);

    await user.type(screen.getByLabelText('Search todos'), 'later');
    // Not yet applied immediately.
    expect(store.getState().ui.searchQuery).toBe('');

    await waitFor(
      () => expect(store.getState().ui.searchQuery).toBe('later'),
      { timeout: SEARCH_DEBOUNCE_MS + 300 },
    );
  });

  it('Escape clears the query', async () => {
    const user = userEvent.setup();
    render(<SearchBar />);

    await user.type(screen.getByLabelText('Search todos'), 'temp');
    await waitFor(() => expect(store.getState().ui.searchQuery).toBe('temp'));
    await user.keyboard('{Escape}');

    expect(store.getState().ui.searchQuery).toBe('');
    expect(screen.getByLabelText('Search todos')).toHaveValue('');
  });
});
