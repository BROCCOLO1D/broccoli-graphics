import { assertPositiveInteger, assertValidImage, defaultStride, type BayerMatrix, type PixelBuffer } from '../types.js';
import { toGrayscale, type ToGrayscaleOptions } from '../luminance.js';

const isPowerOfTwo = (value: number): boolean => (value & (value - 1)) === 0;

export const createBayerMatrix = (size: number): BayerMatrix => {
  assertPositiveInteger('size', size);
  if (!isPowerOfTwo(size)) {
    throw new RangeError('Bayer matrix size must be a power of two');
  }
  if (size > 256) {
    throw new RangeError('Bayer matrix size must be <= 256');
  }

  let currentSize = 1;
  let current = new Uint16Array([0]);

  while (currentSize < size) {
    const nextSize = currentSize * 2;
    const next = new Uint16Array(nextSize * nextSize);

    for (let y = 0; y < currentSize; y++) {
      for (let x = 0; x < currentSize; x++) {
        const rank = current[y * currentSize + x]! * 4;
        const base = y * 2 * nextSize + x * 2;
        next[base] = rank;
        next[base + 1] = rank + 2;
        next[base + nextSize] = rank + 3;
        next[base + nextSize + 1] = rank + 1;
      }
    }

    current = next;
    currentSize = nextSize;
  }

  return { size, data: current };
};

export const thresholdAt = (matrix: BayerMatrix, x: number, y: number): number => {
  const wrappedX = ((x % matrix.size) + matrix.size) % matrix.size;
  const wrappedY = ((y % matrix.size) + matrix.size) % matrix.size;
  return ((matrix.data[wrappedY * matrix.size + wrappedX] ?? 0) + 0.5) / (matrix.size * matrix.size);
};

export interface OrderedDitherOptions extends ToGrayscaleOptions {
  readonly image: PixelBuffer;
  readonly matrix?: BayerMatrix;
  readonly levels?: number;
  readonly output?: Uint8Array;
}

const quantizeWithThreshold = (value: number, threshold: number, levels: number): number => {
  if (levels === 2) {
    return value / 255 > threshold ? 255 : 0;
  }

  const normalized = value / 255;
  const rank = Math.min(levels - 1, Math.max(0, Math.floor(normalized * levels + threshold - 0.5)));
  return Math.round((rank / (levels - 1)) * 255);
};

export const orderedDither = (options: OrderedDitherOptions): PixelBuffer<Uint8Array> => {
  const { image, matrix = createBayerMatrix(4), levels = 2 } = options;
  assertValidImage(image);
  assertPositiveInteger('levels', levels);
  if (levels < 2 || levels > 256) {
    throw new RangeError('levels must be between 2 and 256');
  }

  const output = options.output ?? new Uint8Array(image.width * image.height);
  if (output.length < image.width * image.height) {
    throw new RangeError('output is too short for dithered image');
  }

  const grayscale = image.channels === 1 && image.stride === undefined ? image.data : toGrayscale(image, options);
  const stride = image.channels === 1 ? (image.stride ?? defaultStride(image.width, 1)) : image.width;
  let out = 0;

  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++, out++) {
      output[out] = quantizeWithThreshold(grayscale[y * stride + x] ?? 0, thresholdAt(matrix, x, y), levels);
    }
  }

  return { width: image.width, height: image.height, channels: 1, data: output };
};
