import { describe, expect, it } from 'vitest';
import { version } from './index.js';

describe('package entrypoint', () => {
  it('exports the current package version placeholder', () => {
    expect(version).toBe('0.0.0');
  });
});
