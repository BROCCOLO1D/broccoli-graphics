import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('example asset verification', () => {
  it('verifies generated README assets and reports the animated GIF', () => {
    const output = execFileSync(process.execPath, ['scripts/verify-examples.mjs'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });

    expect(output).toContain('doll-face-conversion-stages.gif');
    expect(output).toContain('Verified');
  });
});
