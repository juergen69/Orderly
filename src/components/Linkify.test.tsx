import { describe, expect, it, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Linkify } from './Linkify';

describe('Linkify', () => {
  afterEach(cleanup);

  it('renders plain text unchanged when there are no URLs', () => {
    render(<p>{Linkify({ text: 'just some text' })}</p>);
    expect(screen.getByText('just some text')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('turns URLs into safe anchors', () => {
    render(<p>{Linkify({ text: 'see https://example.com/docs now' })}</p>);
    const link = screen.getByRole('link', { name: 'https://example.com/docs' });
    expect(link).toHaveAttribute('href', 'https://example.com/docs');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('prefixes www links with https', () => {
    render(<p>{Linkify({ text: 'visit www.example.com' })}</p>);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://www.example.com');
  });
});
