import { assertValidImage, defaultStride, type ColorInput, type MutablePixelBuffer, type PixelBuffer, type RgbColor, type RgbaColor } from './types.js';

export type ColorDistance = (a: RgbColor, b: RgbColor) => number;

export const clampByte = (value: number): number => (value <= 0 ? 0 : value >= 255 ? 255 : Math.round(value));

export const normalizeColor = (color: ColorInput): RgbaColor => {
  if (Array.isArray(color)) {
    return {
      r: clampByte(color[0]),
      g: clampByte(color[1]),
      b: clampByte(color[2]),
      a: clampByte(color[3] ?? 255),
    };
  }

  const objectColor = color as Partial<RgbaColor>;
  return {
    r: clampByte(objectColor.r ?? 0),
    g: clampByte(objectColor.g ?? 0),
    b: clampByte(objectColor.b ?? 0),
    a: clampByte(objectColor.a ?? 255),
  };
};

export const normalizePalette = (palette: ReadonlyArray<ColorInput>): RgbaColor[] => palette.map(normalizeColor);

export const squaredRgbDistance: ColorDistance = (a, b) => {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
};

export const nearestPaletteIndex = (
  color: RgbColor,
  palette: ReadonlyArray<RgbaColor>,
  distance: ColorDistance = squaredRgbDistance,
): number => {
  if (palette.length === 0) {
    throw new RangeError('palette must contain at least one color');
  }

  let bestIndex = 0;
  let bestDistance = distance(color, palette[0]!);
  for (let index = 1; index < palette.length; index++) {
    const nextDistance = distance(color, palette[index]!);
    if (nextDistance < bestDistance) {
      bestDistance = nextDistance;
      bestIndex = index;
    }
  }

  return bestIndex;
};

export const nearestColor = (
  color: RgbColor,
  palette: ReadonlyArray<RgbaColor>,
  distance: ColorDistance = squaredRgbDistance,
): RgbaColor => palette[nearestPaletteIndex(color, palette, distance)]!;

export type PaletteOutputChannels = 3 | 4;

export interface QuantizeToPaletteOptions {
  readonly image: PixelBuffer;
  readonly palette: ReadonlyArray<ColorInput>;
  readonly distance?: ColorDistance;
  readonly outputChannels?: PaletteOutputChannels;
  readonly output?: Uint8Array;
}

const readPixelRgb = (image: PixelBuffer, offset: number): RgbColor => {
  if (image.channels === 1) {
    const value = image.data[offset] ?? 0;
    return { r: value, g: value, b: value };
  }

  return {
    r: image.data[offset] ?? 0,
    g: image.data[offset + 1] ?? 0,
    b: image.data[offset + 2] ?? 0,
  };
};

export const quantizeToPalette = (options: QuantizeToPaletteOptions): MutablePixelBuffer<Uint8Array> => {
  const { image, distance = squaredRgbDistance, outputChannels = 4 } = options;
  assertValidImage(image);
  if (outputChannels !== 3 && outputChannels !== 4) {
    throw new RangeError('outputChannels must be 3 or 4');
  }

  const palette = normalizePalette(options.palette);
  if (palette.length === 0) {
    throw new RangeError('palette must contain at least one color');
  }

  const pixelCount = image.width * image.height;
  const output = options.output ?? new Uint8Array(pixelCount * outputChannels);
  if (output.length < pixelCount * outputChannels) {
    throw new RangeError('output is too short for quantized image');
  }

  const stride = image.stride ?? defaultStride(image.width, image.channels);
  let outputOffset = 0;
  for (let y = 0; y < image.height; y++) {
    const rowOffset = y * stride;
    for (let x = 0; x < image.width; x++) {
      const inputOffset = rowOffset + x * image.channels;
      const color = nearestColor(readPixelRgb(image, inputOffset), palette, distance);
      output[outputOffset++] = color.r;
      output[outputOffset++] = color.g;
      output[outputOffset++] = color.b;
      if (outputChannels === 4) {
        output[outputOffset++] = color.a;
      }
    }
  }

  return { width: image.width, height: image.height, channels: outputChannels, data: output };
};
