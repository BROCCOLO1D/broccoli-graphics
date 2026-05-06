import { describe, expect, it } from 'vitest';
import {
  nearestColor,
  nearestPaletteIndex,
  normalizePalette,
  quantizeToPalette,
  quantizeToPaletteIndices,
  squaredRgbDistance,
} from './palette.js';

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

  it('quantizes RGB images to nearest palette colors without mutating the palette', () => {
    const palette = normalizePalette([
      [0, 0, 0],
      [255, 255, 255],
      [255, 0, 0],
    ]);

    const output = quantizeToPalette({
      image: {
        width: 3,
        height: 1,
        channels: 3,
        data: new Uint8Array([10, 10, 10, 250, 250, 250, 240, 20, 20]),
      },
      palette,
      outputChannels: 3,
    });

    expect([...output.data]).toEqual([0, 0, 0, 255, 255, 255, 255, 0, 0]);
    expect(output).toMatchObject({ width: 3, height: 1, channels: 3 });
    expect(palette[0]).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  });

  it('supports grayscale input, RGBA output, stride, and caller-provided output buffers', () => {
    const outputBuffer = new Uint8Array(8);
    const output = quantizeToPalette({
      image: {
        width: 2,
        height: 1,
        channels: 1,
        stride: 4,
        data: new Uint8Array([30, 220, 99, 99]),
      },
      palette: [
        [0, 0, 0, 128],
        [255, 255, 255, 64],
      ],
      output: outputBuffer,
    });

    expect(output.data).toBe(outputBuffer);
    expect([...outputBuffer]).toEqual([0, 0, 0, 128, 255, 255, 255, 64]);
    expect(output).toMatchObject({ width: 2, height: 1, channels: 4 });
  });

  it('uses a custom color distance when quantizing', () => {
    const output = quantizeToPalette({
      image: { width: 1, height: 1, channels: 3, data: new Uint8Array([120, 250, 250]) },
      palette: [
        [0, 255, 255],
        [255, 0, 0],
      ],
      outputChannels: 3,
      distance: (a, b) => Math.abs(a.r - b.r),
    });

    expect([...output.data]).toEqual([0, 255, 255]);
  });

  it('quantizes images to palette indices with stride and reusable output buffers', () => {
    const outputBuffer = new Uint8Array(4);
    const indexed = quantizeToPaletteIndices({
      image: {
        width: 3,
        height: 1,
        channels: 3,
        stride: 12,
        data: new Uint8Array([8, 8, 8, 240, 240, 240, 250, 20, 20, 99, 99, 99]),
      },
      palette: [
        [0, 0, 0],
        [255, 255, 255],
        [255, 0, 0],
      ],
      output: outputBuffer,
    });

    expect(indexed.data).toBe(outputBuffer);
    expect([...indexed.data.slice(0, 3)]).toEqual([0, 1, 2]);
    expect(indexed).toMatchObject({ width: 3, height: 1, channels: 1 });
  });

  it('rejects palettes too large for one-byte index output', () => {
    expect(() =>
      quantizeToPaletteIndices({
        image: { width: 1, height: 1, channels: 1, data: new Uint8Array([0]) },
        palette: Array.from({ length: 257 }, () => [0, 0, 0]),
      }),
    ).toThrow(/256/);
  });
});
