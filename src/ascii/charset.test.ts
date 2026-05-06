import { describe, expect, it } from 'vitest';
import { DENSE_RAMP, SIMPLE_RAMP, charForLuminance, validateRamp } from './charset.js';

describe('ASCII character ramps', () => {
  it('exports light-to-dark default ramps', () => {
    expect(SIMPLE_RAMP).toBe(' .:-=+*#%@');
    expect(DENSE_RAMP.startsWith(' .')).toBe(true);
    expect(DENSE_RAMP.endsWith('@')).toBe(true);
  });

  it('rejects ramps with fewer than two characters', () => {
    expect(() => validateRamp('x')).toThrow(/at least two/i);
    expect(() => validateRamp('')).toThrow(/at least two/i);
  });

  it('maps low luminance to dense chars and high luminance to light chars by default', () => {
    expect(charForLuminance(0, ' .#')).toBe('#');
    expect(charForLuminance(128, ' .#')).toBe('.');
    expect(charForLuminance(255, ' .#')).toBe(' ');
  });

  it('can invert ramp mapping for dark text on light backgrounds', () => {
    expect(charForLuminance(0, ' .#', { invert: true })).toBe(' ');
    expect(charForLuminance(255, ' .#', { invert: true })).toBe('#');
  });
});
