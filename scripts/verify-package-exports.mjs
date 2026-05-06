import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const esmChecks = [
  ['broccoli-graphics', 'orderedDither'],
  ['broccoli-graphics/luminance', 'toGrayscale'],
  ['broccoli-graphics/palette', 'quantizeToPaletteIndices'],
  ['broccoli-graphics/dither/ordered', 'createBayerMatrix'],
  ['broccoli-graphics/dither/error-diffusion', 'sierraKernel'],
  ['broccoli-graphics/ascii/charset', 'SIMPLE_RAMP'],
  ['broccoli-graphics/ascii/convert', 'imageToAscii'],
  ['broccoli-graphics/render/text', 'renderAsciiAnsi'],
  ['broccoli-graphics/render/svg', 'renderAsciiSvg'],
  ['broccoli-graphics/animation/frames', 'mapFrames'],
];

for (const [specifier, exportName] of esmChecks) {
  const mod = await import(specifier);
  if (!(exportName in mod)) {
    throw new Error(`Missing ESM export ${exportName} from ${specifier}`);
  }
}

for (const [specifier, exportName] of esmChecks) {
  const mod = require(specifier);
  if (!(exportName in mod)) {
    throw new Error(`Missing CJS export ${exportName} from ${specifier}`);
  }
}

console.log(`Verified ${esmChecks.length} ESM and CJS package exports.`);
