import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Brand } from '../src/components/Brand';

afterEach(cleanup);

describe('Brand', () => {
  it('renders the three-circle mark and wordmark', () => {
    const { container } = render(<Brand spinning={false} />);
    expect(container.querySelector('.brand__mark')).toBeTruthy();
    const tiles = container.querySelectorAll(
      '.brand__tile--one, .brand__tile--two, .brand__tile--three',
    );
    expect(tiles.length).toBe(3);
    expect(container.querySelector('.brand__tile--one')).toBeTruthy();
    expect(container.querySelector('.brand__tile--two')).toBeTruthy();
    expect(container.querySelector('.brand__tile--three')).toBeTruthy();
    const wordmark = container.querySelector('.brand__wordmark');
    expect(wordmark?.textContent?.replace(/\s+/g, ' ')).toMatch(/Letterboxd Roulette/i);
  });

  it('is labelled as the site logo', () => {
    render(<Brand spinning={false} />);
    expect(screen.getByRole('img', { name: /Letterboxd Roulette logo/i })).toBeTruthy();
  });

  it('applies the spinning class while pending', () => {
    const { container } = render(<Brand spinning />);
    expect(container.querySelector('.brand--spinning')).toBeTruthy();
  });

  it('drops the spinning class once the request settles', () => {
    const { container, rerender } = render(<Brand spinning />);
    rerender(<Brand spinning={false} />);
    expect(container.querySelector('.brand--spinning')).toBeNull();
  });
});