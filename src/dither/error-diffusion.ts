import { toGrayscale } from '../luminance.js';
import { assertPositiveInteger, assertValidImage, type PixelBuffer } from '../types.js';

export interface ErrorDiffusionOffset {
  readonly dx: number;
  readonly dy: number;
  readonly weight: number;
}

export interface ErrorDiffusionKernel {
  readonly name: string;
  readonly offsets: readonly ErrorDiffusionOffset[];
}

export const floydSteinbergKernel: ErrorDiffusionKernel = Object.freeze({
  name: 'floyd-steinberg',
  offsets: Object.freeze([
    Object.freeze({ dx: 1, dy: 0, weight: 7 / 16 }),
    Object.freeze({ dx: -1, dy: 1, weight: 3 / 16 }),
    Object.freeze({ dx: 0, dy: 1, weight: 5 / 16 }),
    Object.freeze({ dx: 1, dy: 1, weight: 1 / 16 }),
  ]),
});

export const atkinsonKernel: ErrorDiffusionKernel = Object.freeze({
  name: 'atkinson',
  offsets: Object.freeze([
    Object.freeze({ dx: 1, dy: 0, weight: 1 / 8 }),
    Object.freeze({ dx: 2, dy: 0, weight: 1 / 8 }),
    Object.freeze({ dx: -1, dy: 1, weight: 1 / 8 }),
    Object.freeze({ dx: 0, dy: 1, weight: 1 / 8 }),
    Object.freeze({ dx: 1, dy: 1, weight: 1 / 8 }),
    Object.freeze({ dx: 0, dy: 2, weight: 1 / 8 }),
  ]),
});

export const jarvisJudiceNinkeKernel: ErrorDiffusionKernel = Object.freeze({
  name: 'jarvis-judice-ninke',
  offsets: Object.freeze([
    Object.freeze({ dx: 1, dy: 0, weight: 7 / 48 }),
    Object.freeze({ dx: 2, dy: 0, weight: 5 / 48 }),
    Object.freeze({ dx: -2, dy: 1, weight: 3 / 48 }),
    Object.freeze({ dx: -1, dy: 1, weight: 5 / 48 }),
    Object.freeze({ dx: 0, dy: 1, weight: 7 / 48 }),
    Object.freeze({ dx: 1, dy: 1, weight: 5 / 48 }),
    Object.freeze({ dx: 2, dy: 1, weight: 3 / 48 }),
    Object.freeze({ dx: -2, dy: 2, weight: 1 / 48 }),
    Object.freeze({ dx: -1, dy: 2, weight: 3 / 48 }),
    Object.freeze({ dx: 0, dy: 2, weight: 5 / 48 }),
    Object.freeze({ dx: 1, dy: 2, weight: 3 / 48 }),
    Object.freeze({ dx: 2, dy: 2, weight: 1 / 48 }),
  ]),
});

export const stuckiKernel: ErrorDiffusionKernel = Object.freeze({
  name: 'stucki',
  offsets: Object.freeze([
    Object.freeze({ dx: 1, dy: 0, weight: 8 / 42 }),
    Object.freeze({ dx: 2, dy: 0, weight: 4 / 42 }),
    Object.freeze({ dx: -2, dy: 1, weight: 2 / 42 }),
    Object.freeze({ dx: -1, dy: 1, weight: 4 / 42 }),
    Object.freeze({ dx: 0, dy: 1, weight: 8 / 42 }),
    Object.freeze({ dx: 1, dy: 1, weight: 4 / 42 }),
    Object.freeze({ dx: 2, dy: 1, weight: 2 / 42 }),
    Object.freeze({ dx: -2, dy: 2, weight: 1 / 42 }),
    Object.freeze({ dx: -1, dy: 2, weight: 2 / 42 }),
    Object.freeze({ dx: 0, dy: 2, weight: 4 / 42 }),
    Object.freeze({ dx: 1, dy: 2, weight: 2 / 42 }),
    Object.freeze({ dx: 2, dy: 2, weight: 1 / 42 }),
  ]),
});

export const sierraKernel: ErrorDiffusionKernel = Object.freeze({
  name: 'sierra',
  offsets: Object.freeze([
    Object.freeze({ dx: 1, dy: 0, weight: 5 / 32 }),
    Object.freeze({ dx: 2, dy: 0, weight: 3 / 32 }),
    Object.freeze({ dx: -2, dy: 1, weight: 2 / 32 }),
    Object.freeze({ dx: -1, dy: 1, weight: 4 / 32 }),
    Object.freeze({ dx: 0, dy: 1, weight: 5 / 32 }),
    Object.freeze({ dx: 1, dy: 1, weight: 4 / 32 }),
    Object.freeze({ dx: 2, dy: 1, weight: 2 / 32 }),
    Object.freeze({ dx: -1, dy: 2, weight: 2 / 32 }),
    Object.freeze({ dx: 0, dy: 2, weight: 3 / 32 }),
    Object.freeze({ dx: 1, dy: 2, weight: 2 / 32 }),
  ]),
});

export const twoRowSierraKernel: ErrorDiffusionKernel = Object.freeze({
  name: 'two-row-sierra',
  offsets: Object.freeze([
    Object.freeze({ dx: 1, dy: 0, weight: 4 / 16 }),
    Object.freeze({ dx: 2, dy: 0, weight: 3 / 16 }),
    Object.freeze({ dx: -2, dy: 1, weight: 1 / 16 }),
    Object.freeze({ dx: -1, dy: 1, weight: 2 / 16 }),
    Object.freeze({ dx: 0, dy: 1, weight: 3 / 16 }),
    Object.freeze({ dx: 1, dy: 1, weight: 2 / 16 }),
    Object.freeze({ dx: 2, dy: 1, weight: 1 / 16 }),
  ]),
});

export const sierraLiteKernel: ErrorDiffusionKernel = Object.freeze({
  name: 'sierra-lite',
  offsets: Object.freeze([
    Object.freeze({ dx: 1, dy: 0, weight: 2 / 4 }),
    Object.freeze({ dx: -1, dy: 1, weight: 1 / 4 }),
    Object.freeze({ dx: 0, dy: 1, weight: 1 / 4 }),
  ]),
});

const clamp255 = (value: number): number => (value <= 0 ? 0 : value >= 255 ? 255 : value);

export const quantizeLevel = (value: number, levels = 2): number => {
  assertPositiveInteger('levels', levels);
  if (levels < 2 || levels > 256) {
    throw new RangeError('levels must be between 2 and 256');
  }

  const clamped = clamp255(value);
  const level = Math.round((clamped / 255) * (levels - 1));
  return Math.round((level / (levels - 1)) * 255);
};

export interface ErrorDiffuseOptions {
  readonly image: PixelBuffer;
  readonly kernel?: ErrorDiffusionKernel;
  readonly levels?: number;
  readonly output?: Uint8Array;
}

const validateKernel = (kernel: ErrorDiffusionKernel): void => {
  if (kernel.offsets.length === 0) {
    throw new RangeError('error diffusion kernel must include at least one offset');
  }
  for (const offset of kernel.offsets) {
    if (!Number.isInteger(offset.dx) || !Number.isInteger(offset.dy)) {
      throw new RangeError('error diffusion kernel offsets must use integer dx and dy values');
    }
    if (offset.dy < 0 || (offset.dy === 0 && offset.dx <= 0)) {
      throw new RangeError('error diffusion kernel offsets must point to future scanline positions');
    }
    if (!Number.isFinite(offset.weight)) {
      throw new RangeError('error diffusion kernel weights must be finite numbers');
    }
  }
};

export const errorDiffuse = (options: ErrorDiffuseOptions): PixelBuffer<Uint8Array> => {
  const { image, kernel = floydSteinbergKernel, levels = 2 } = options;
  assertValidImage(image);
  validateKernel(kernel);
  // Validate once before entering the pixel loop.
  quantizeLevel(0, levels);

  const pixelCount = image.width * image.height;
  const output = options.output ?? new Uint8Array(pixelCount);
  if (output.length < pixelCount) {
    throw new RangeError('output is too short for dithered image');
  }

  const work = new Float32Array(pixelCount);
  work.set(toGrayscale(image));

  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const index = y * image.width + x;
      const oldValue = work[index] ?? 0;
      const newValue = quantizeLevel(oldValue, levels);
      output[index] = newValue;

      const error = oldValue - newValue;
      if (error === 0) {
        continue;
      }

      for (const offset of kernel.offsets) {
        const xx = x + offset.dx;
        const yy = y + offset.dy;
        if (xx < 0 || xx >= image.width || yy < 0 || yy >= image.height) {
          continue;
        }
        work[yy * image.width + xx] += error * offset.weight;
      }
    }
  }

  return { width: image.width, height: image.height, channels: 1, data: output };
};
