import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore } from '../../store/store';
import { InMemoryRepository } from '../../storage/InMemoryRepository';
import { setActiveStore } from '../../store/storeInstance';
import { Board } from './Board';

describe('Tier cycling', () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(async () => {
    store = createStore({ repository: new InMemoryRepository() });
    setActiveStore(store);
    await store.getState().hydrate();
  });

  async function createTieredTodo(tier?: 1 | 3 | 5) {
    const todo = await store.getState().createTodo({ projectId: null, title: 'Task', status: 'todo' });
    if (tier !== undefined) {
      await store.getState().setTodoTier(todo.id, tier);
    }
    return todo;
  }

  it('cycles fire (1) to grey drop', async () => {
    await createTieredTodo(1);
    render(<Board filterProjectId={null} />);
    
    const card = screen.getByText('Task').closest('li')!;
    const tierButton = within(card).getByRole('button', { name: /Change tier \(currently 1\)/i });
    expect(tierButton).toHaveTextContent('🔥');
    
    await userEvent.click(tierButton);
    
    const assignButton = within(card).getByRole('button', { name: /Assign tier/i });
    expect(assignButton).toHaveTextContent('💧');
    expect(assignButton).not.toHaveAttribute('data-tier');
  });

  it('cycles null to blue drop (5)', async () => {
    await createTieredTodo(undefined);
    render(<Board filterProjectId={null} />);
    
    const card = screen.getByText('Task').closest('li')!;
    const tierButton = within(card).getByRole('button', { name: /Assign tier/i });
    expect(tierButton).toHaveTextContent('💧');
    
    await userEvent.click(tierButton);
    
    expect(within(card).getByRole('button', { name: /Change tier \(currently 5\)/i })).toHaveTextContent('💧');
  });

  it('cycles blue drop (5) to lightning (3)', async () => {
    await createTieredTodo(5);
    render(<Board filterProjectId={null} />);
    
    const card = screen.getByText('Task').closest('li')!;
    const tierButton = within(card).getByRole('button', { name: /Change tier \(currently 5\)/i });
    expect(tierButton).toHaveTextContent('💧');
    
    await userEvent.click(tierButton);
    
    expect(within(card).getByRole('button', { name: /Change tier \(currently 3\)/i })).toHaveTextContent('⚡');
  });

  it('cycles lightning (3) to fire (1)', async () => {
    await createTieredTodo(3);
    render(<Board filterProjectId={null} />);
    
    const card = screen.getByText('Task').closest('li')!;
    const tierButton = within(card).getByRole('button', { name: /Change tier \(currently 3\)/i });
    expect(tierButton).toHaveTextContent('⚡');
    
    await userEvent.click(tierButton);
    
    expect(within(card).getByRole('button', { name: /Change tier \(currently 1\)/i })).toHaveTextContent('🔥');
  });
});
