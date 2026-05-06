import { describe, expect, it } from 'vitest';
import { nearestColor, nearestPaletteIndex, normalizePalette, squaredRgbDistance } from './palette.js';

describe('palette utilities', () => {
  it('normalizes tuple and object colors into clamped RGB palette entries', () => {
    expect(normalizePalette([[0, 128.4, 300], { r: 255, g: -1, b: 10.2 }])).toEqual([
      { r: 0, g: 128, b: 255, a: 255 },
      { r: 255, g: 0, b: 10, a: 255 },
    ]);
  });

  it('computes squared RGB distance without allocating', () => {
    expect(squaredRgbDistance({ r: 10, g: 20, b: 30 }, { r: 13, g: 24, b: 30 })).toBe(25);
  });

  it('returns the first nearest palette color for deterministic ties', () => {
    const palette = normalizePalette([
      [0, 0, 0],
      [255, 255, 255],
    ]);

    expect(nearestPaletteIndex({ r: 127.5, g: 127.5, b: 127.5 }, palette)).toBe(0);
    expect(nearestColor({ r: 250, g: 250, b: 250 }, palette)).toEqual({ r: 255, g: 255, b: 255, a: 255 });
  });

  it('rejects empty palettes', () => {
    expect(() => nearestPaletteIndex({ r: 0, g: 0, b: 0 }, [])).toThrow(/palette/i);
  });
});
