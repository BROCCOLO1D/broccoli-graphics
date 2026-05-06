import { describe, expect, it } from 'vitest';
import { renderAsciiText } from './text.js';

describe('renderAsciiText', () => {
  it('renders ASCII cells into newline-delimited text', () => {
    expect(renderAsciiText({ width: 2, height: 2, cells: ['a', 'b', 'c', 'd'] })).toBe('ab\ncd');
  });

  it('can repeat cells horizontally for terminal aspect ratios', () => {
    expect(renderAsciiText({ width: 2, height: 1, cells: ['#', '.'] }, { repeatX: 2 })).toBe('##..');
  });

  it('rejects canvases with mismatched cell counts', () => {
    expect(() => renderAsciiText({ width: 2, height: 2, cells: ['x'] })).toThrow(/cells/i);
  });
});
