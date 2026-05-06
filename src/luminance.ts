import { assertValidImage, defaultStride, type PixelBuffer, type RgbColor } from './types.js';

export interface LuminanceCoefficients {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

export const bt709Luminance: LuminanceCoefficients = Object.freeze({ r: 0.2126, g: 0.7152, b: 0.0722 });

export interface LuminanceOptions {
  readonly coefficients?: LuminanceCoefficients;
  /** Optional alpha byte (0..255) to composite against a background before measuring luma. */
  readonly alpha?: number;
  /** Background used when alpha is supplied. Defaults to white, matching common canvas compositing. */
  readonly background?: RgbColor;
}

const clampByte = (value: number): number => (value <= 0 ? 0 : value >= 255 ? 255 : Math.round(value));

export const luminance = (r: number, g: number, b: number, options: LuminanceOptions = {}): number => {
  const coefficients = options.coefficients ?? bt709Luminance;
  let rr = r;
  let gg = g;
  let bb = b;

  if (options.alpha !== undefined) {
    const alpha = Math.max(0, Math.min(255, options.alpha)) / 255;
    const background = options.background ?? { r: 255, g: 255, b: 255 };
    rr = rr * alpha + background.r * (1 - alpha);
    gg = gg * alpha + background.g * (1 - alpha);
    bb = bb * alpha + background.b * (1 - alpha);
  }

  return rr * coefficients.r + gg * coefficients.g + bb * coefficients.b;
};

export interface ToGrayscaleOptions extends LuminanceOptions {
  readonly output?: Uint8Array;
}

export const toGrayscale = (image: PixelBuffer, options: ToGrayscaleOptions = {}): Uint8Array => {
  assertValidImage(image);
  const output = options.output ?? new Uint8Array(image.width * image.height);
  if (output.length < image.width * image.height) {
    throw new RangeError('output is too short for grayscale image');
  }

  const stride = image.stride ?? defaultStride(image.width, image.channels);
  let out = 0;
  for (let y = 0; y < image.height; y++) {
    let offset = y * stride;
    for (let x = 0; x < image.width; x++, out++, offset += image.channels) {
      if (image.channels === 1) {
        output[out] = clampByte(image.data[offset] ?? 0);
        continue;
      }

      output[out] = clampByte(
        luminance(image.data[offset] ?? 0, image.data[offset + 1] ?? 0, image.data[offset + 2] ?? 0, {
          coefficients: options.coefficients,
          alpha: image.channels === 4 ? image.data[offset + 3] : options.alpha,
          background: options.background,
        }),
      );
    }
  }

  return output;
};
