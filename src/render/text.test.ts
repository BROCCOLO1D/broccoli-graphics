import { describe, expect, it } from 'vitest';
import { renderAsciiAnsi, renderAsciiText } from './text.js';

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

describe('renderAsciiAnsi', () => {
  it('renders foreground truecolor escape sequences and resets once per colored cell', () => {
    const text = renderAsciiAnsi(
      { width: 2, height: 1, cells: ['A', 'B'] },
      { foreground: ({ x }) => (x === 0 ? { r: 255, g: 0, b: 0 } : undefined) },
    );

    expect(text).toBe('\u001b[38;2;255;0;0mA\u001b[0mB');
  });

  it('supports background colors and repeatX for ANSI output', () => {
    const text = renderAsciiAnsi(
      { width: 1, height: 1, cells: ['#'] },
      { background: [0, 0, 255], repeatX: 2 },
    );

    expect(text).toBe('\u001b[48;2;0;0;255m##\u001b[0m');
  });

  it('passes cell coordinates and value to color callbacks', () => {
    const seen: Array<[string, number, number]> = [];
    renderAsciiAnsi(
      { width: 2, height: 2, cells: ['a', 'b', 'c', 'd'] },
      {
        foreground: ({ cell, x, y }) => {
          seen.push([cell, x, y]);
          return undefined;
        },
      },
    );

    expect(seen).toEqual([
      ['a', 0, 0],
      ['b', 1, 0],
      ['c', 0, 1],
      ['d', 1, 1],
    ]);
  });
});
