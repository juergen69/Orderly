import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { render, screen, within, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore } from '../../store/store';
import { InMemoryRepository } from '../../storage/InMemoryRepository';
import { setActiveStore } from '../../store/storeInstance';
import { TagsSidebar } from './TagsSidebar';

describe('TagsSidebar', () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(async () => {
    store = createStore({ repository: new InMemoryRepository() });
    setActiveStore(store);
    await store.getState().hydrate();
    await store.getState().createTodo({ projectId: null, title: 'A', tags: ['beta', 'alpha'] });
    await store.getState().createTodo({ projectId: null, title: 'B', tags: ['beta'] });
  });

  afterEach(() => {
    cleanup();
    setActiveStore(null);
  });

  it('sorts by frequency then alphabetically', () => {
    render(<TagsSidebar />);
    const section = screen.getByLabelText('Tags');
    const tagButtons = within(section).getAllByRole('button').filter((b) =>
      b.className.includes('tag'),
    );
    const names = tagButtons.map((b) => within(b).getByText(/^#/).textContent);
    // 'beta' appears on 2 todos, 'alpha' on 1 → beta first, then alpha.
    expect(names).toEqual(['#beta', '#alpha']);
    expect(within(tagButtons[0]!).getByText('2')).toBeInTheDocument();
  });

  it('clicking a tag adds it to the filter and a clear control appears', async () => {
    render(<TagsSidebar />);
    await userEvent.click(screen.getByRole('button', { name: /#alpha/ }));

    expect(store.getState().ui.selectedTags).toEqual(['alpha']);
    expect(screen.getByRole('button', { name: 'Clear tag filters' })).toBeInTheDocument();

    // Clicking again removes it.
    await userEvent.click(screen.getByRole('button', { name: /#alpha/ }));
    expect(store.getState().ui.selectedTags).toEqual([]);
  });

  it('can be collapsed via the header', async () => {
    render(<TagsSidebar />);
    await userEvent.click(screen.getByRole('button', { name: /^Tags/ }));
    expect(screen.queryByRole('button', { name: /#alpha/ })).not.toBeInTheDocument();
  });
});
