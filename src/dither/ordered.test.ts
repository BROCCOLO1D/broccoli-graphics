import { describe, expect, it } from 'vitest';
import { createBayerMatrix, orderedDither, thresholdAt } from './ordered.js';

describe('createBayerMatrix', () => {
  it('builds the canonical 2x2 Bayer rank pattern', () => {
    expect(createBayerMatrix(2)).toEqual({ size: 2, data: new Uint16Array([0, 2, 3, 1]) });
  });

  it('rejects sizes that are not powers of two', () => {
    expect(() => createBayerMatrix(3)).toThrow(/power of two/i);
  });
});

describe('thresholdAt', () => {
  it('normalizes ranks with a half-step offset', () => {
    const matrix = createBayerMatrix(2);

    expect(thresholdAt(matrix, 0, 0)).toBeCloseTo(0.125);
    expect(thresholdAt(matrix, 1, 0)).toBeCloseTo(0.625);
    expect(thresholdAt(matrix, 0, 1)).toBeCloseTo(0.875);
    expect(thresholdAt(matrix, 1, 1)).toBeCloseTo(0.375);
  });
});

describe('orderedDither', () => {
  it('applies binary ordered dithering to grayscale buffers', () => {
    const output = orderedDither({
      image: { width: 2, height: 2, channels: 1, data: new Uint8Array([32, 128, 224, 96]) },
      matrix: createBayerMatrix(2),
      levels: 2,
    });

    expect([...output.data]).toEqual([255, 0, 255, 255]);
    expect(output).toMatchObject({ width: 2, height: 2, channels: 1 });
  });

  it('supports multi-level quantization', () => {
    const output = orderedDither({
      image: { width: 1, height: 4, channels: 1, data: new Uint8Array([0, 85, 170, 255]) },
      matrix: createBayerMatrix(2),
      levels: 4,
    });

    expect([...output.data]).toEqual([0, 85, 170, 255]);
  });
});
