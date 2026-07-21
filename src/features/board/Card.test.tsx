import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { Card } from './Card';
import type { Todo } from '../../domain/types';

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: 'id',
    projectId: null,
    title: 't',
    description: '',
    status: 'todo',
    dueDate: null,
    boardOrder: 'm',
    createdAt: '',
    updatedAt: '',
    doneAt: null,
    recurrence: 'none',
    reminderAt: null,
    reminderLead: null,
    tags: [],
    isFrog: false,
    tier: undefined,
    ...overrides,
  };
}

describe('Card tag chips', () => {
  it('renders all tags when within the limit', () => {
    render(<Card todo={makeTodo({ tags: ['a', 'b'] })} project={null} subSteps={[]} onToggleFrog={() => {}} />);
    expect(screen.getByText('#a')).toBeInTheDocument();
    expect(screen.getByText('#b')).toBeInTheDocument();
    expect(screen.queryByText(/\+\d/)).not.toBeInTheDocument();
  });

  it('collapses extra tags into a +N overflow', () => {
    const tags = ['a', 'b', 'c', 'd', 'e'];
    render(
      <Card todo={makeTodo({ tags })} project={null} subSteps={[]} onToggleFrog={() => {}} maxTags={3} />,
    );
    const card = screen.getByText('t').closest('li')!;
    expect(within(card).getByText('#a')).toBeInTheDocument();
    expect(within(card).getByText('#b')).toBeInTheDocument();
    expect(within(card).getByText('#c')).toBeInTheDocument();
    expect(within(card).queryByText('#d')).not.toBeInTheDocument();
    expect(within(card).getByText('+2')).toBeInTheDocument();
  });
});

describe('Card placeholder title', () => {
  it('renders italic placeholder when title is empty and onOpenTodo is provided', () => {
    const onOpenTodo = vi.fn();
    render(<Card todo={makeTodo({ title: '' })} project={null} subSteps={[]} onToggleFrog={() => {}} onOpenTodo={onOpenTodo} />);
    const button = screen.getByRole('button', { name: '(untitled)' });
    expect(button).toHaveClass(/titleButton/);
    expect(button).toHaveClass(/placeholderButton/);
  });

  it('renders italic placeholder span when title is empty and onOpenTodo is not provided', () => {
    render(<Card todo={makeTodo({ title: '' })} project={null} subSteps={[]} onToggleFrog={() => {}} />);
    const placeholder = screen.getByText('(untitled)');
    expect(placeholder.tagName).toBe('SPAN');
    expect(placeholder).toHaveClass(/placeholder/);
  });

  it('renders placeholder for whitespace-only title with onOpenTodo', () => {
    const onOpenTodo = vi.fn();
    render(<Card todo={makeTodo({ title: '   ' })} project={null} subSteps={[]} onToggleFrog={() => {}} onOpenTodo={onOpenTodo} />);
    const button = screen.getByRole('button', { name: '(untitled)' });
    expect(button).toHaveClass(/placeholderButton/);
  });

  it('clicking placeholder button opens the todo', async () => {
    const onOpenTodo = vi.fn();
    render(<Card todo={makeTodo({ title: '' })} project={null} subSteps={[]} onToggleFrog={() => {}} onOpenTodo={onOpenTodo} />);
    await userEvent.click(screen.getByRole('button', { name: '(untitled)' }));
    expect(onOpenTodo).toHaveBeenCalledWith('id');
  });

  it('renders normal title when title is non-empty', () => {
    render(<Card todo={makeTodo({ title: 'Real task' })} project={null} subSteps={[]} onToggleFrog={() => {}} onOpenTodo={() => {}} />);
    const button = screen.getByRole('button', { name: 'Real task' });
    expect(button).toHaveClass(/titleButton/);
    expect(button).not.toHaveClass(/placeholderButton/);
  });
});

describe('Card tier button', () => {
  it('does not render a tier button when onCycleTier is not provided', () => {
    render(<Card todo={makeTodo({ tier: 1 })} project={null} subSteps={[]} onToggleFrog={() => {}} />);
    expect(screen.queryByRole('button', { name: /tier/i })).not.toBeInTheDocument();
  });

  it('renders a tier button when onCycleTier is provided', () => {
    render(<Card todo={makeTodo({ tier: 1 })} project={null} subSteps={[]} onToggleFrog={() => {}} onCycleTier={() => {}} />);
    expect(screen.getByRole('button', { name: /Change tier/i })).toBeInTheDocument();
  });

  it('shows + when no tier is assigned', () => {
    render(<Card todo={makeTodo()} project={null} subSteps={[]} onToggleFrog={() => {}} onCycleTier={() => {}} />);
    expect(screen.getByRole('button', { name: /Assign tier/i })).toHaveTextContent('+');
  });

  it('shows the tier icon when tier is assigned', () => {
    render(<Card todo={makeTodo({ tier: 3 })} project={null} subSteps={[]} onToggleFrog={() => {}} onCycleTier={() => {}} />);
    expect(screen.getByRole('button', { name: /Change tier/i })).toHaveTextContent('⚡');
  });

  it('calls onCycleTier with the todo id when clicked', async () => {
    const onCycleTier = vi.fn();
    render(<Card todo={makeTodo({ id: 'abc' })} project={null} subSteps={[]} onToggleFrog={() => {}} onCycleTier={onCycleTier} />);
    await userEvent.click(screen.getByRole('button', { name: /Assign tier/i }));
    expect(onCycleTier).toHaveBeenCalledWith('abc');
  });

  it('disables the tier button when tierDisabled is true', () => {
    render(<Card todo={makeTodo()} project={null} subSteps={[]} onToggleFrog={() => {}} onCycleTier={() => {}} tierDisabled />);
    expect(screen.getByRole('button', { name: /Assign tier/i })).toBeDisabled();
  });
});
