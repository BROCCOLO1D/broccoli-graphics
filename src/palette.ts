import type { ColorInput, RgbColor, RgbaColor } from './types.js';

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
