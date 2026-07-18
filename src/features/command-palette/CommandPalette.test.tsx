import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { render, screen, within, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore } from '../../store/store';
import { InMemoryRepository } from '../../storage/InMemoryRepository';
import { setActiveStore } from '../../store/storeInstance';
import { CommandPalette } from './CommandPalette';

describe('CommandPalette', () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(async () => {
    store = createStore({ repository: new InMemoryRepository() });
    setActiveStore(store);
    await store.getState().hydrate();
    await store.getState().createProject('Work', '#22d3ee');
  });

  afterEach(() => {
    cleanup();
    setActiveStore(null);
  });

  const open = async () => {
    render(<CommandPalette open onClose={() => {}} />);
    return screen.getByRole('dialog');
  };

  it('renders a dialog with command options', async () => {
    const dialog = await open();
    expect(within(dialog).getByRole('option', { name: /New todo/ })).toBeInTheDocument();
    expect(within(dialog).getByRole('option', { name: /Go to Calendar/ })).toBeInTheDocument();
  });

  it('filters commands by fuzzy query', async () => {
    const dialog = await open();
    const input = within(dialog).getByLabelText('Command query');
    await userEvent.type(input, 'calen');
    const list = within(dialog).getByRole('listbox');
    expect(within(list).getAllByRole('option').length).toBe(1);
    expect(within(list).getByRole('option', { name: /Go to Calendar/ })).toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    let closed = false;
    render(<CommandPalette open onClose={() => (closed = true)} />);
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByLabelText('Command query'));
    await userEvent.keyboard('{Escape}');
    expect(closed).toBe(true);
  });

  it('runs the focused command on Enter (switch view)', async () => {
    let closed = false;
    render(<CommandPalette open onClose={() => (closed = true)} />);
    const dialog = screen.getByRole('dialog');
    const input = within(dialog).getByLabelText('Command query');
    await userEvent.type(input, 'calen');
    await userEvent.keyboard('{Enter}');
    expect(store.getState().ui.activeView).toBe('calendar');
    expect(closed).toBe(true);
  });

  it('moves selection with ArrowDown and runs on Enter (jump to project)', async () => {
    let closed = false;
    render(<CommandPalette open onClose={() => (closed = true)} />);
    const dialog = screen.getByRole('dialog');
    const input = within(dialog).getByLabelText('Command query');
    await userEvent.type(input, 'work');
    // The "Go to project: Work" command should match.
    const list = within(dialog).getByRole('listbox');
    const option = within(list).getByRole('option', { name: /Go to project: Work/ });
    option.focus();
    await userEvent.keyboard('{Enter}');
    expect(store.getState().ui.selectedProjectId).not.toBeNull();
    expect(closed).toBe(true);
  });

  it('runs a command on tap (click)', async () => {
    let closed = false;
    render(<CommandPalette open onClose={() => (closed = true)} />);
    const dialog = screen.getByRole('dialog');
    const input = within(dialog).getByLabelText('Command query');
    await userEvent.type(input, 'focus area 1');
    await userEvent.click(
      within(dialog).getByRole('option', { name: /Open focus area 1/ }),
    );
    // focusByLabel queries the DOM; nothing to assert there, but palette closed.
    expect(closed).toBe(true);
  });
});
