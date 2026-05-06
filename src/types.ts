export type PixelChannels = 1 | 3 | 4;

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface PixelBuffer<T extends ArrayLike<number> = Uint8Array> extends Size {
  readonly data: T;
  readonly channels: PixelChannels;
  /** Number of array entries between adjacent rows. Defaults to width * channels. */
  readonly stride?: number;
}

export interface MutablePixelBuffer<T extends Uint8Array | Uint8ClampedArray = Uint8Array> extends Size {
  readonly data: T;
  readonly channels: PixelChannels;
  readonly stride?: number;
}

export interface ImageFrame<T extends ArrayLike<number> = Uint8Array> extends PixelBuffer<T> {
  readonly durationMs?: number;
}

export interface RgbColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

export interface RgbaColor extends RgbColor {
  readonly a: number;
}

export type ColorInput = RgbColor | Partial<RgbaColor> | readonly [r: number, g: number, b: number, a?: number];

export interface BayerMatrix {
  readonly size: number;
  readonly data: Uint16Array;
}

export const assertPositiveInteger = (name: string, value: number): void => {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive integer`);
  }
};

export const defaultStride = (width: number, channels: PixelChannels): number => width * channels;

export const assertValidImage = (image: PixelBuffer): void => {
  assertPositiveInteger('width', image.width);
  assertPositiveInteger('height', image.height);
  const stride = image.stride ?? defaultStride(image.width, image.channels);
  if (stride < image.width * image.channels) {
    throw new RangeError('stride must be at least width * channels');
  }
  const required = stride * (image.height - 1) + image.width * image.channels;
  if (image.data.length < required) {
    throw new RangeError('image data is too short for dimensions, channels, and stride');
  }
};
