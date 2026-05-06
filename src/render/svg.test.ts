import { describe, expect, it } from 'vitest';
import { renderAsciiSvg } from './svg.js';
import type { AsciiCanvas } from '../ascii/convert.js';

const canvas: AsciiCanvas = {
  width: 2,
  height: 2,
  cells: ['A', '&', '<', ' '],
};

describe('renderAsciiSvg', () => {
  it('renders escaped monospace text cells into deterministic standalone SVG', () => {
    const svg = renderAsciiSvg(canvas, {
      cellWidth: 8,
      cellHeight: 12,
      fontSize: 10,
      padding: 2,
      foreground: '#123456',
      background: '#f8fafc',
    });

    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="28" viewBox="0 0 20 28" role="img">');
    expect(svg).toContain('<rect width="20" height="28" fill="#f8fafc"/>');
    expect(svg).toContain('<text x="2" y="12"');
    expect(svg).toContain('fill="#123456"');
    expect(svg).toContain('A&amp;');
    expect(svg).toContain('&lt;');
    expect(svg).not.toContain('undefined');
  });

  it('validates canvas geometry and positive metrics', () => {
    expect(() => renderAsciiSvg({ width: 1, height: 2, cells: ['x'] })).toThrow(/cells length/);
    expect(() => renderAsciiSvg(canvas, { cellWidth: 0 })).toThrow(/cellWidth/);
  });
});
