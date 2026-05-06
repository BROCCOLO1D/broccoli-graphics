import { describe, expect, it } from 'vitest';
import { assertValidImage } from './types.js';

describe('assertValidImage', () => {
  it('rejects unsupported runtime channel counts before deriving stride requirements', () => {
    expect(() =>
      assertValidImage({
        width: 1,
        height: 1,
        channels: 2 as 1,
        data: new Uint8Array([0, 0]),
      }),
    ).toThrow(/channels must be 1, 3, or 4/);
  });

  it('rejects non-integer explicit strides', () => {
    expect(() =>
      assertValidImage({
        width: 1,
        height: 2,
        channels: 1,
        stride: 1.5,
        data: new Uint8Array([0, 0, 0]),
      }),
    ).toThrow(/stride must be a positive integer/);
  });
});
