import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DatePicker } from './DatePicker';

describe('DatePicker', () => {
  afterEach(cleanup);

  it('emits the ISO date for a clicked day', async () => {
    const onChange = vi.fn();
    // Start from a known month via a selected value.
    render(<DatePicker value="2025-06-15" onChange={onChange} />);

    await userEvent.click(screen.getByRole('gridcell', { name: '2025-06-20' }));
    expect(onChange).toHaveBeenCalledWith('2025-06-20');
  });

  it('navigates to the previous and next month', async () => {
    const onChange = vi.fn();
    render(<DatePicker value="2025-06-15" onChange={onChange} />);

    expect(screen.getByText('June 2025')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(screen.getByText('May 2025')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next month' }));
    await userEvent.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByText('July 2025')).toBeInTheDocument();
  });

  it('Today emits today ISO and Clear emits null', async () => {
    const onChange = vi.fn();
    render(<DatePicker value="2025-06-15" onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Today' }));
    const emitted = onChange.mock.calls[0]![0] as string;
    expect(emitted).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('marks the selected day as aria-selected', () => {
    render(<DatePicker value="2025-06-15" onChange={() => {}} />);
    expect(screen.getByRole('gridcell', { name: '2025-06-15' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});
