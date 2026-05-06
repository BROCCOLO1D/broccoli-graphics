export { version } from './version.js';

export type {
  BayerMatrix,
  ColorInput,
  ImageFrame,
  MutablePixelBuffer,
  PixelBuffer,
  PixelChannels,
  RgbColor,
  RgbaColor,
  Size,
} from './types.js';

export {
  assertPositiveInteger,
  assertValidImage,
  defaultStride,
} from './types.js';

export {
  bt709Luminance,
  luminance,
  toGrayscale,
  type LuminanceCoefficients,
  type LuminanceOptions,
  type ToGrayscaleOptions,
} from './luminance.js';

export {
  clampByte,
  nearestColor,
  nearestPaletteIndex,
  normalizeColor,
  normalizePalette,
  squaredRgbDistance,
  type ColorDistance,
} from './palette.js';

export {
  createBayerMatrix,
  orderedDither,
  thresholdAt,
  type OrderedDitherOptions,
} from './dither/ordered.js';

export {
  atkinsonKernel,
  errorDiffuse,
  floydSteinbergKernel,
  jarvisJudiceNinkeKernel,
  quantizeLevel,
  sierraKernel,
  sierraLiteKernel,
  stuckiKernel,
  twoRowSierraKernel,
  type ErrorDiffuseOptions,
  type ErrorDiffusionKernel,
  type ErrorDiffusionOffset,
} from './dither/error-diffusion.js';

export {
  DENSE_RAMP,
  SIMPLE_RAMP,
  charForLuminance,
  validateRamp,
  type RampMapOptions,
} from './ascii/charset.js';

export {
  imageToAscii,
  type AsciiCanvas,
  type ImageToAsciiOptions,
} from './ascii/convert.js';

export {
  renderAsciiText,
  type RenderAsciiTextOptions,
} from './render/text.js';

export {
  frameDurations,
  loopFrames,
  mapFrames,
  takeFrames,
  withFrameDuration,
  type FrameMapper,
  type WithFrameDurationOptions,
} from './animation/frames.js';
