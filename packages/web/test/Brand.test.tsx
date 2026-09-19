import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Brand } from '../src/components/Brand';

afterEach(cleanup);

describe('Brand', () => {
  it('renders three vertical reels and the wordmark', () => {
    const { container } = render(<Brand spinning={false} />);
    expect(container.querySelector('.brand__mark')).toBeTruthy();
    expect(container.querySelectorAll('.brand__reel').length).toBe(3);
    const tiles = container.querySelectorAll('.brand__tile');
    const classes = [...tiles].map((el) => el.className);
    expect(tiles.length).toBe(9);
    expect(classes.some((c) => c.includes('brand__tile--one'))).toBe(true);
    expect(classes.some((c) => c.includes('brand__tile--two'))).toBe(true);
    expect(classes.some((c) => c.includes('brand__tile--three'))).toBe(true);
    expect(container.querySelectorAll('.brand__sym').length).toBe(39);
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