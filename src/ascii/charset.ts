export const SIMPLE_RAMP = ' .:-=+*#%@';
export const DENSE_RAMP = ' .\'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B$@';

export interface RampMapOptions {
  /** When true, low luminance maps to the lightest ramp character instead of the darkest. */
  readonly invert?: boolean;
}

const clampUnit = (value: number): number => (value <= 0 ? 0 : value >= 1 ? 1 : value);

export const validateRamp = (ramp: string): string => {
  if (ramp.length < 2) {
    throw new RangeError('ASCII ramp must contain at least two characters');
  }
  return ramp;
};

export const charForLuminance = (luminance: number, ramp = SIMPLE_RAMP, options: RampMapOptions = {}): string => {
  validateRamp(ramp);
  const normalized = clampUnit(luminance / 255);
  const density = options.invert ? normalized : 1 - normalized;
  const index = Math.round(density * (ramp.length - 1));
  return ramp[index] ?? ramp[ramp.length - 1]!;
};
