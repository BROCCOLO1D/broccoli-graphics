import { describe, expect, it } from 'vitest';
import {
  atkinsonKernel,
  errorDiffuse,
  floydSteinbergKernel,
  quantizeLevel,
} from './error-diffusion.js';

describe('error diffusion kernels', () => {
  it('defines Floyd-Steinberg as normalized forward offsets', () => {
    expect(floydSteinbergKernel).toEqual({
      name: 'floyd-steinberg',
      offsets: [
        { dx: 1, dy: 0, weight: 7 / 16 },
        { dx: -1, dy: 1, weight: 3 / 16 },
        { dx: 0, dy: 1, weight: 5 / 16 },
        { dx: 1, dy: 1, weight: 1 / 16 },
      ],
    });
  });

  it('defines Atkinson with six one-eighth neighbors', () => {
    expect(atkinsonKernel.offsets).toHaveLength(6);
    expect(atkinsonKernel.offsets.every((offset) => offset.weight === 1 / 8)).toBe(true);
  });
});

describe('quantizeLevel', () => {
  it('maps bytes to the nearest output level', () => {
    expect(quantizeLevel(0, 2)).toBe(0);
    expect(quantizeLevel(127, 2)).toBe(0);
    expect(quantizeLevel(128, 2)).toBe(255);
    expect(quantizeLevel(170, 4)).toBe(170);
  });
});

describe('errorDiffuse', () => {
  it('diffuses Floyd-Steinberg error through a grayscale scanline', () => {
    const output = errorDiffuse({
      image: { width: 3, height: 1, channels: 1, data: new Uint8Array([100, 100, 100]) },
      kernel: floydSteinbergKernel,
      levels: 2,
    });

    expect([...output.data]).toEqual([0, 255, 0]);
    expect(output).toMatchObject({ width: 3, height: 1, channels: 1 });
  });

  it('diffuses RGB input after grayscale conversion', () => {
    const output = errorDiffuse({
      image: {
        width: 2,
        height: 1,
        channels: 3,
        data: new Uint8Array([255, 255, 255, 0, 0, 0]),
      },
      levels: 2,
    });

    expect([...output.data]).toEqual([255, 0]);
  });

  it('supports caller-provided output buffers', () => {
    const outputBuffer = new Uint8Array(1);
    const output = errorDiffuse({
      image: { width: 1, height: 1, channels: 1, data: new Uint8Array([200]) },
      output: outputBuffer,
    });

    expect(output.data).toBe(outputBuffer);
    expect(outputBuffer[0]).toBe(255);
  });

  it('rejects invalid level counts', () => {
    expect(() =>
      errorDiffuse({
        image: { width: 1, height: 1, channels: 1, data: new Uint8Array([0]) },
        levels: 1,
      }),
    ).toThrow(/levels/i);
  });
});
