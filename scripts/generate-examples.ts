import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  createBayerMatrix,
  imageToAscii,
  loopFrames,
  mapFrames,
  orderedDither,
  renderAsciiText,
  takeFrames,
  withFrameDuration,
  type ImageFrame,
} from '../src/index.js';

const width = 32;
const height = 16;
const outputDir = join(process.cwd(), 'examples', 'output');

const makeWaveFrame = (phase: number): ImageFrame<Uint8Array> => {
  const data = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const gradient = x / (width - 1);
      const wave = (Math.sin((x + phase) * 0.45) + Math.cos((y - phase) * 0.7) + 2) / 4;
      data[y * width + x] = Math.round((gradient * 0.55 + wave * 0.45) * 255);
    }
  }
  return { width, height, channels: 1, data, durationMs: 80 };
};

const matrix = createBayerMatrix(4);
const frames = Array.from({ length: 6 }, (_, index) => makeWaveFrame(index * 2));

const asciiFrames = mapFrames(withFrameDuration(loopFrames(frames, 1), 80), (frame) => {
  const dithered = orderedDither({ image: frame, matrix, levels: 2 });
  return renderAsciiText(imageToAscii({ image: dithered, ramp: ' @', cellWidth: 1, cellHeight: 1 }));
});

const renderedFrames = [...takeFrames(asciiFrames, 6)];
mkdirSync(outputDir, { recursive: true });
writeFileSync(join(outputDir, 'synthetic-ascii.txt'), `${renderedFrames[0]}\n`);
writeFileSync(join(outputDir, 'synthetic-animation.txt'), `${renderedFrames.map((frame, index) => `--- frame ${index} ---\n${frame}`).join('\n\n')}\n`);

console.log(`Generated ${renderedFrames.length} ASCII frames in ${outputDir}`);
