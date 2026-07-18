import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { Card } from './Card';
import type { Todo } from '../../domain/types';

function makeTodo(tags: string[]): Todo {
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
    tags,
    isFrog: false,
  };
}

describe('Card tag chips', () => {
  it('renders all tags when within the limit', () => {
    render(<Card todo={makeTodo(['a', 'b'])} project={null} subSteps={[]} onToggleFrog={() => {}} />);
    expect(screen.getByText('#a')).toBeInTheDocument();
    expect(screen.getByText('#b')).toBeInTheDocument();
    expect(screen.queryByText(/\+\d/)).not.toBeInTheDocument();
  });

  it('collapses extra tags into a +N overflow', () => {
    const tags = ['a', 'b', 'c', 'd', 'e'];
    render(
      <Card todo={makeTodo(tags)} project={null} subSteps={[]} onToggleFrog={() => {}} maxTags={3} />,
    );
    const card = screen.getByText('t').closest('li')!;
    expect(within(card).getByText('#a')).toBeInTheDocument();
    expect(within(card).getByText('#b')).toBeInTheDocument();
    expect(within(card).getByText('#c')).toBeInTheDocument();
    expect(within(card).queryByText('#d')).not.toBeInTheDocument();
    expect(within(card).getByText('+2')).toBeInTheDocument();
  });
});
