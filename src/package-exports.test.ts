import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')) as {
  exports: Record<string, unknown>;
  scripts: Record<string, string>;
};

const expectedSubpaths = [
  './types',
  './luminance',
  './palette',
  './dither/ordered',
  './dither/error-diffusion',
  './ascii/charset',
  './ascii/convert',
  './render/text',
  './animation/frames',
];

describe('package exports', () => {
  it('declares subpath exports for tree-shakable modules', () => {
    for (const subpath of expectedSubpaths) {
      expect(packageJson.exports).toHaveProperty(subpath);
      expect(packageJson.exports[subpath]).toEqual({
        types: expect.stringMatching(/^\.\/dist\/.+\.d\.ts$/),
        import: expect.stringMatching(/^\.\/dist\/.+\.js$/),
        require: expect.stringMatching(/^\.\/dist\/.+\.cjs$/),
      });
    }
  });

  it('builds each public subpath as its own declaration-bearing entry', () => {
    const buildScript = packageJson.scripts.build;

    for (const entry of ['src/index.ts', 'src/dither/ordered.ts', 'src/ascii/convert.ts', 'src/animation/frames.ts']) {
      expect(buildScript).toContain(entry);
    }
  });
});
