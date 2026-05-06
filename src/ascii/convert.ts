import { toGrayscale } from '../luminance.js';
import { assertPositiveInteger, assertValidImage, type PixelBuffer } from '../types.js';
import { charForLuminance, SIMPLE_RAMP, type RampMapOptions, validateRamp } from './charset.js';

export interface AsciiCanvas {
  readonly width: number;
  readonly height: number;
  readonly cells: string[];
}

export interface ImageToAsciiOptions extends RampMapOptions {
  readonly image: PixelBuffer;
  readonly ramp?: string;
  /** Number of source pixels to average into one ASCII cell horizontally. Defaults to 1. */
  readonly cellWidth?: number;
  /** Number of source pixels to average into one ASCII cell vertically. Defaults to 1. */
  readonly cellHeight?: number;
  /** Additive luminance offset applied after cell averaging. Defaults to 0. */
  readonly brightness?: number;
  /** Contrast multiplier around midpoint 128 applied after brightness. Defaults to 1. */
  readonly contrast?: number;
  /** Gamma exponent applied to normalized luminance after contrast. Values > 1 darken midtones. Defaults to 1. */
  readonly gamma?: number;
}

const clamp255 = (value: number): number => (value <= 0 ? 0 : value >= 255 ? 255 : value);

const assertFiniteNumber = (name: string, value: number): void => {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be a finite number`);
  }
};

const toneMapLuminance = (value: number, brightness: number, contrast: number, gamma: number): number => {
  const contrasted = (value + brightness - 128) * contrast + 128;
  const normalized = clamp255(contrasted) / 255;
  return Math.pow(normalized, gamma) * 255;
};

export const imageToAscii = (options: ImageToAsciiOptions): AsciiCanvas => {
  const {
    image,
    ramp = SIMPLE_RAMP,
    cellWidth = 1,
    cellHeight = 1,
    invert,
    brightness = 0,
    contrast = 1,
    gamma = 1,
  } = options;
  assertValidImage(image);
  validateRamp(ramp);
  assertPositiveInteger('cellWidth', cellWidth);
  assertPositiveInteger('cellHeight', cellHeight);
  assertFiniteNumber('brightness', brightness);
  assertFiniteNumber('contrast', contrast);
  assertFiniteNumber('gamma', gamma);
  if (gamma <= 0) {
    throw new RangeError('gamma must be greater than 0');
  }

  const gray = toGrayscale(image);
  const width = Math.ceil(image.width / cellWidth);
  const height = Math.ceil(image.height / cellHeight);
  const cells = new Array<string>(width * height);

  let cellIndex = 0;
  for (let cellY = 0; cellY < height; cellY++) {
    const yStart = cellY * cellHeight;
    const yEnd = Math.min(image.height, yStart + cellHeight);
    for (let cellX = 0; cellX < width; cellX++, cellIndex++) {
      const xStart = cellX * cellWidth;
      const xEnd = Math.min(image.width, xStart + cellWidth);
      let sum = 0;
      let count = 0;

      for (let y = yStart; y < yEnd; y++) {
        let offset = y * image.width + xStart;
        for (let x = xStart; x < xEnd; x++, offset++) {
          sum += gray[offset] ?? 0;
          count++;
        }
      }

      cells[cellIndex] = charForLuminance(toneMapLuminance(sum / count, brightness, contrast, gamma), ramp, { invert });
    }
  }

  return { width, height, cells };
};
