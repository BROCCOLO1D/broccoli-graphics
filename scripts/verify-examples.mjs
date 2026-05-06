import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const outputDir = join(process.cwd(), 'examples', 'output');

const pngAssets = [
  ['doll-face-original.png', 360, 540],
  ['doll-face-ordered-bayer.png', 360, 540],
  ['doll-face-floyd-steinberg.png', 360, 540],
  ['doll-face-atkinson.png', 360, 540],
  ['doll-face-ascii.png', 662, 722],
  ['sun-runner-original.png', 360, 304],
  ['sun-runner-ordered-bayer.png', 360, 304],
  ['sun-runner-floyd-steinberg.png', 360, 304],
  ['sun-runner-atkinson.png', 360, 304],
];

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const assertFile = (fileName) => {
  const path = join(outputDir, fileName);
  const stats = statSync(path);
  assert(stats.isFile(), `${fileName} is not a file`);
  assert(stats.size > 0, `${fileName} is empty`);
  return path;
};

for (const [fileName, width, height] of pngAssets) {
  const path = assertFile(fileName);
  const metadata = await sharp(path).metadata();
  assert(metadata.format === 'png', `${fileName} should be a PNG, received ${metadata.format}`);
  assert(metadata.width === width, `${fileName} width should be ${width}, received ${metadata.width}`);
  assert(metadata.height === height, `${fileName} height should be ${height}, received ${metadata.height}`);
}

const asciiSvg = readFileSync(assertFile('doll-face-ascii.svg'), 'utf8');
assert(asciiSvg.includes('<svg'), 'doll-face-ascii.svg should contain an SVG root');
assert(asciiSvg.includes('broccoli-graphics ASCII rendering'), 'doll-face-ascii.svg should include an accessible title');
assert(asciiSvg.includes('fill="#fffaf7"'), 'doll-face-ascii.svg should preserve the README background color');

const asciiText = readFileSync(assertFile('doll-face-ascii.txt'), 'utf8').trimEnd().split('\n');
assert(asciiText.length === 69, `doll-face-ascii.txt should have 69 rows, received ${asciiText.length}`);
assert(asciiText.every((line) => line.length === 90), 'doll-face-ascii.txt should have deterministic 90-column rows');
assert(asciiText.some((line) => line.includes('@')), 'doll-face-ascii.txt should contain visible glyphs');

const statementGifPath = assertFile('sun-runner-statement.gif');
const statementGifMetadata = await sharp(statementGifPath, { animated: true }).metadata();
assert(statementGifMetadata.format === 'gif', `sun-runner-statement.gif should be a GIF, received ${statementGifMetadata.format}`);
assert(statementGifMetadata.width === 497, `sun-runner-statement.gif width should be 497, received ${statementGifMetadata.width}`);
assert(statementGifMetadata.pageHeight === 420, `sun-runner-statement.gif frame height should be 420, received ${statementGifMetadata.pageHeight}`);
assert(statementGifMetadata.pages === 4, `sun-runner-statement.gif should contain 4 frames, received ${statementGifMetadata.pages}`);
assert(
  JSON.stringify(statementGifMetadata.delay) === JSON.stringify([900, 700, 700, 900]),
  `sun-runner-statement.gif frame delays changed: ${JSON.stringify(statementGifMetadata.delay)}`,
);
assert(statementGifMetadata.loop === 0, `sun-runner-statement.gif should loop forever, received loop=${statementGifMetadata.loop}`);

const gifPath = assertFile('doll-face-conversion-stages.gif');
const gifMetadata = await sharp(gifPath, { animated: true }).metadata();
assert(gifMetadata.format === 'gif', `doll-face-conversion-stages.gif should be a GIF, received ${gifMetadata.format}`);
assert(gifMetadata.width === 360, `doll-face-conversion-stages.gif width should be 360, received ${gifMetadata.width}`);
assert(gifMetadata.pageHeight === 540, `doll-face-conversion-stages.gif frame height should be 540, received ${gifMetadata.pageHeight}`);
assert(gifMetadata.pages === 4, `doll-face-conversion-stages.gif should contain 4 frames, received ${gifMetadata.pages}`);
assert(
  JSON.stringify(gifMetadata.delay) === JSON.stringify([900, 900, 900, 1200]),
  `doll-face-conversion-stages.gif frame delays changed: ${JSON.stringify(gifMetadata.delay)}`,
);
assert(gifMetadata.loop === 0, `doll-face-conversion-stages.gif should loop forever, received loop=${gifMetadata.loop}`);

console.log(`Verified ${pngAssets.length + 4} generated README assets, including sun-runner-statement.gif and doll-face-conversion-stages.gif.`);
