import { describe, expect, it } from 'vitest';
import { imageToAscii } from './convert.js';

describe('imageToAscii', () => {
  it('converts a grayscale image into ASCII cells', () => {
    const ascii = imageToAscii({
      image: { width: 3, height: 1, channels: 1, data: new Uint8Array([0, 128, 255]) },
      ramp: ' .#',
    });

    expect(ascii).toEqual({ width: 3, height: 1, cells: ['#', '.', ' '] });
  });

  it('converts RGB images through luminance', () => {
    const ascii = imageToAscii({
      image: { width: 2, height: 1, channels: 3, data: new Uint8Array([255, 255, 255, 0, 0, 0]) },
      ramp: ' .#',
    });

    expect(ascii.cells).toEqual([' ', '#']);
  });

  it('samples rectangular cells by averaging luminance', () => {
    const ascii = imageToAscii({
      image: {
        width: 2,
        height: 2,
        channels: 1,
        data: new Uint8Array([0, 255, 255, 255]),
      },
      ramp: ' .#',
      cellWidth: 2,
      cellHeight: 2,
    });

    expect(ascii).toEqual({ width: 1, height: 1, cells: ['.'] });
  });

  it('rounds partial edge cells into the output grid', () => {
    const ascii = imageToAscii({
      image: { width: 3, height: 1, channels: 1, data: new Uint8Array([0, 255, 0]) },
      ramp: ' .#',
      cellWidth: 2,
    });

    expect(ascii).toEqual({ width: 2, height: 1, cells: ['.', '#'] });
  });

  it('applies brightness, contrast, and gamma tone mapping before ramp lookup', () => {
    expect(
      imageToAscii({
        image: { width: 1, height: 1, channels: 1, data: new Uint8Array([0]) },
        ramp: ' .#',
        brightness: 255,
      }).cells,
    ).toEqual([' ']);

    expect(
      imageToAscii({
        image: { width: 2, height: 1, channels: 1, data: new Uint8Array([0, 255]) },
        ramp: ' .#',
        contrast: 0,
      }).cells,
    ).toEqual(['.', '.']);

    expect(
      imageToAscii({
        image: { width: 1, height: 1, channels: 1, data: new Uint8Array([100]) },
        ramp: ' .#',
        gamma: 2,
      }).cells,
    ).toEqual(['#']);
  });

  it('validates tone mapping options', () => {
    const image = { width: 1, height: 1, channels: 1 as const, data: new Uint8Array([128]) };

    expect(() => imageToAscii({ image, gamma: 0 })).toThrow(/gamma/);
    expect(() => imageToAscii({ image, contrast: Number.NaN })).toThrow(/contrast/);
    expect(() => imageToAscii({ image, brightness: Number.POSITIVE_INFINITY })).toThrow(/brightness/);
  });
});
