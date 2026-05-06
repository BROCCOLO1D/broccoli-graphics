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
}

export const imageToAscii = (options: ImageToAsciiOptions): AsciiCanvas => {
  const { image, ramp = SIMPLE_RAMP, cellWidth = 1, cellHeight = 1, invert } = options;
  assertValidImage(image);
  validateRamp(ramp);
  assertPositiveInteger('cellWidth', cellWidth);
  assertPositiveInteger('cellHeight', cellHeight);

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

      cells[cellIndex] = charForLuminance(sum / count, ramp, { invert });
    }
  }

  return { width, height, cells };
};
