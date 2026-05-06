import { describe, expect, it } from 'vitest';
import { luminance, toGrayscale } from './luminance.js';

const closeTo = (actual: number, expected: number) => {
  expect(actual).toBeCloseTo(expected, 4);
};

describe('luminance', () => {
  it('uses BT.709 coefficients by default', () => {
    closeTo(luminance(255, 0, 0), 54.213);
    closeTo(luminance(0, 255, 0), 182.376);
    closeTo(luminance(0, 0, 255), 18.411);
    closeTo(luminance(255, 255, 255), 255);
  });

  it('can composite transparent pixels against a background before luminance', () => {
    closeTo(luminance(255, 255, 255, { alpha: 128, background: { r: 0, g: 0, b: 0 } }), 128);
  });
});

describe('toGrayscale', () => {
  it('converts RGB buffers to one grayscale byte per pixel', () => {
    const gray = toGrayscale({ width: 2, height: 1, channels: 3, data: new Uint8Array([255, 0, 0, 0, 0, 255]) });

    expect([...gray]).toEqual([54, 18]);
  });

  it('preserves single-channel buffers by copying them', () => {
    const input = new Uint8Array([0, 127, 255]);
    const gray = toGrayscale({ width: 3, height: 1, channels: 1, data: input });

    expect(gray).toEqual(input);
    expect(gray).not.toBe(input);
  });
});
