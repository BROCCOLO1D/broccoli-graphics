import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import {
  atkinsonKernel,
  createBayerMatrix,
  errorDiffuse,
  floydSteinbergKernel,
  imageToAscii,
  orderedDither,
  renderAsciiSvg,
  renderAsciiText,
  type PixelBuffer,
} from '../src/index.js';

const outputDir = join(process.cwd(), 'examples', 'output');
const inputPath = join(process.cwd(), 'examples', 'input', 'doll-face.jpg');
const previewWidth = 360;
const asciiSourceWidth = 180;
const asciiCellWidth = 2;
const asciiCellHeight = 3;
const asciiCrop = { left: 0, top: 140, width: 853, height: 980 } as const;

interface RawRgbImage extends PixelBuffer<Uint8Array> {
  readonly channels: 3;
}

interface RawGrayImage extends PixelBuffer<Uint8Array> {
  readonly channels: 1;
}

const loadRgbPreview = async (width: number): Promise<RawRgbImage> => {
  const { data, info } = await sharp(inputPath)
    .rotate()
    .resize({ width, withoutEnlargement: true })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (info.channels !== 3) {
    throw new Error(`expected RGB input after JPEG decode, received ${info.channels} channels`);
  }

  return {
    width: info.width,
    height: info.height,
    channels: 3,
    data: new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
  };
};

const loadAsciiSource = async (): Promise<RawGrayImage> => {
  const { data, info } = await sharp(inputPath)
    .rotate()
    .extract(asciiCrop)
    .resize({ width: asciiSourceWidth, withoutEnlargement: true })
    .grayscale()
    .normalize()
    .linear(1.25, -18)
    .sharpen({ sigma: 0.8, m1: 0.8, m2: 1.2 })
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (info.channels !== 1) {
    throw new Error(`expected grayscale ASCII source, received ${info.channels} channels`);
  }

  return {
    width: info.width,
    height: info.height,
    channels: 1,
    data: new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
  };
};

const loadAsciiColorSource = async (): Promise<RawRgbImage> => {
  const { data, info } = await sharp(inputPath)
    .rotate()
    .extract(asciiCrop)
    .resize({ width: asciiSourceWidth, withoutEnlargement: true })
    .removeAlpha()
    .modulate({ saturation: 1.18, brightness: 1.05 })
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (info.channels !== 3) {
    throw new Error(`expected RGB ASCII color source, received ${info.channels} channels`);
  }

  return {
    width: info.width,
    height: info.height,
    channels: 3,
    data: new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
  };
};

const writeGrayscalePng = async (name: string, image: PixelBuffer<Uint8Array>): Promise<void> => {
  await sharp(image.data, {
    raw: { width: image.width, height: image.height, channels: 1 },
  })
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toFile(join(outputDir, name));
};

const generateDitherAssets = async (preview: RawRgbImage): Promise<void> => {
  await sharp(inputPath)
    .rotate()
    .resize({ width: previewWidth, withoutEnlargement: true })
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toFile(join(outputDir, 'doll-face-original.png'));

  await writeGrayscalePng(
    'doll-face-ordered-bayer.png',
    orderedDither({ image: preview, matrix: createBayerMatrix(8), levels: 2 }),
  );
  await writeGrayscalePng(
    'doll-face-floyd-steinberg.png',
    errorDiffuse({ image: preview, kernel: floydSteinbergKernel, levels: 2 }),
  );
  await writeGrayscalePng(
    'doll-face-atkinson.png',
    errorDiffuse({ image: preview, kernel: atkinsonKernel, levels: 2 }),
  );
};

const hexByte = (value: number): string => value.toString(16).padStart(2, '0');

const averageCellColor = (image: RawRgbImage, cellX: number, cellY: number): string => {
  const xStart = cellX * asciiCellWidth;
  const yStart = cellY * asciiCellHeight;
  const xEnd = Math.min(image.width, xStart + asciiCellWidth);
  const yEnd = Math.min(image.height, yStart + asciiCellHeight);
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;

  for (let y = yStart; y < yEnd; y++) {
    let offset = (y * image.width + xStart) * image.channels;
    for (let x = xStart; x < xEnd; x++, offset += image.channels) {
      r += image.data[offset] ?? 0;
      g += image.data[offset + 1] ?? 0;
      b += image.data[offset + 2] ?? 0;
      count++;
    }
  }

  return `#${hexByte(Math.round(r / count))}${hexByte(Math.round(g / count))}${hexByte(Math.round(b / count))}`;
};

const generateAsciiAssets = async (): Promise<void> => {
  const asciiSource = await loadAsciiSource();
  const asciiColors = await loadAsciiColorSource();
  const ascii = imageToAscii({
    image: errorDiffuse({ image: asciiSource, kernel: floydSteinbergKernel, levels: 2 }),
    ramp: ' @',
    cellWidth: asciiCellWidth,
    cellHeight: asciiCellHeight,
  });

  const svg = renderAsciiSvg(ascii, {
    title: 'broccoli-graphics ASCII rendering of the doll face example image',
    cellWidth: 7,
    cellHeight: 10,
    fontSize: 9,
    padding: 16,
    foreground: ({ cell, x, y }) => (cell === ' ' ? undefined : averageCellColor(asciiColors, x, y)),
    background: '#fffaf7',
  });

  writeFileSync(join(outputDir, 'doll-face-ascii.txt'), `${renderAsciiText(ascii)}\n`);
  writeFileSync(join(outputDir, 'doll-face-ascii.svg'), svg);
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9, adaptiveFiltering: false }).toFile(join(outputDir, 'doll-face-ascii.png'));
};

mkdirSync(outputDir, { recursive: true });
const preview = await loadRgbPreview(previewWidth);
await generateDitherAssets(preview);
await generateAsciiAssets();

console.log(`Generated doll-face README assets in ${outputDir}`);
