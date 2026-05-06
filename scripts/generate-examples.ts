import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import gifenc from 'gifenc';
import sharp from 'sharp';
import {
  atkinsonKernel,
  createBayerMatrix,
  errorDiffuse,
  floydSteinbergKernel,
  imageToAscii,
  orderedDither,
  quantizeToPalette,
  renderAsciiSvg,
  renderAsciiText,
  type PixelBuffer,
} from '../src/index.js';

const { GIFEncoder, applyPalette, quantize } = gifenc;

const outputDir = join(process.cwd(), 'examples', 'output');
const dollFaceInputPath = join(process.cwd(), 'examples', 'input', 'doll-face.jpg');
const sunRunnerInputPath = join(process.cwd(), 'examples', 'input', 'sun-runner.jpg');
const statementGifInputPath = join(process.cwd(), 'examples', 'input', 'statement-source.gif');
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

interface AnimatedRgbSource {
  readonly width: number;
  readonly height: number;
  readonly frames: ReadonlyArray<RawRgbImage>;
  readonly delays: ReadonlyArray<number>;
}

const loadRgbPreview = async (inputPath: string, width: number): Promise<RawRgbImage> => {
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
  const { data, info } = await sharp(dollFaceInputPath)
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
  const { data, info } = await sharp(dollFaceInputPath)
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

const loadAnimatedRgbSource = async (inputPath: string): Promise<AnimatedRgbSource> => {
  const metadata = await sharp(inputPath, { animated: true }).metadata();
  const { data, info } = await sharp(inputPath, { animated: true })
    .removeAlpha()
    .modulate({ saturation: 1.08, brightness: 1.04 })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.pageHeight ?? info.height;
  const pages = info.pages ?? metadata.pages ?? 1;
  if (info.channels !== 3 || !width || !height || pages < 1) {
    throw new Error(`unexpected animated GIF input geometry for ${inputPath}`);
  }

  const frameSize = width * height * info.channels;
  const frames: RawRgbImage[] = [];
  for (let frameIndex = 0; frameIndex < pages; frameIndex++) {
    const start = frameIndex * frameSize;
    frames.push({
      width,
      height,
      channels: 3,
      data: new Uint8Array(data.buffer, data.byteOffset + start, frameSize),
    });
  }

  const delays = metadata.delay?.length === pages ? metadata.delay : Array.from({ length: pages }, () => 160);
  return { width, height, frames, delays };
};

const writeGrayscalePng = async (name: string, image: PixelBuffer<Uint8Array>): Promise<void> => {
  await sharp(image.data, {
    raw: { width: image.width, height: image.height, channels: 1 },
  })
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toFile(join(outputDir, name));
};

const generateDitherAssets = async (inputPath: string, prefix: string, preview: RawRgbImage): Promise<void> => {
  await sharp(inputPath)
    .rotate()
    .resize({ width: previewWidth, withoutEnlargement: true })
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toFile(join(outputDir, `${prefix}-original.png`));

  await writeGrayscalePng(
    `${prefix}-ordered-bayer.png`,
    orderedDither({ image: preview, matrix: createBayerMatrix(8), levels: 2 }),
  );
  await writeGrayscalePng(
    `${prefix}-floyd-steinberg.png`,
    errorDiffuse({ image: preview, kernel: floydSteinbergKernel, levels: 2, serpentine: true }),
  );
  await writeGrayscalePng(
    `${prefix}-atkinson.png`,
    errorDiffuse({ image: preview, kernel: atkinsonKernel, levels: 2, serpentine: true }),
  );
};


const colorizedDitherFrame = (source: RawRgbImage, dithered: PixelBuffer<Uint8Array>): Uint8Array => {
  const pixelCount = source.width * source.height;
  const rgba = new Uint8Array(pixelCount * 4);
  for (let index = 0; index < pixelCount; index++) {
    const sourceOffset = index * source.channels;
    const targetOffset = index * 4;
    const ink = dithered.data[index] ?? 0;
    const r = source.data[sourceOffset] ?? 0;
    const g = source.data[sourceOffset + 1] ?? 0;
    const b = source.data[sourceOffset + 2] ?? 0;
    if (ink > 127) {
      rgba[targetOffset] = r;
      rgba[targetOffset + 1] = g;
      rgba[targetOffset + 2] = b;
    } else {
      rgba[targetOffset] = Math.round(r * 0.22 + 9);
      rgba[targetOffset + 1] = Math.round(g * 0.22 + 15);
      rgba[targetOffset + 2] = Math.round(b * 0.22 + 22);
    }
    rgba[targetOffset + 3] = 255;
  }
  return rgba;
};

const writeGif = (name: string, width: number, height: number, frames: ReadonlyArray<{ readonly rgba: Uint8Array; readonly delayMs: number }>): void => {
  const gif = GIFEncoder({ initialCapacity: width * height * frames.length });
  for (const [index, frame] of frames.entries()) {
    const palette = quantize(frame.rgba, 128, { format: 'rgb565' });
    gif.writeFrame(applyPalette(frame.rgba, palette, 'rgb565'), width, height, {
      palette,
      delay: frame.delayMs,
      repeat: index === 0 ? 0 : undefined,
      dispose: 2,
    });
  }
  gif.finish();
  writeFileSync(join(outputDir, name), gif.bytes());
};

const sampledPalette = (image: RawRgbImage, columns = 8, rows = 8): ReadonlyArray<readonly [number, number, number]> => {
  const colors: Array<readonly [number, number, number]> = [
    [14, 220, 220],
    [255, 215, 22],
    [255, 255, 255],
    [24, 24, 24],
    [48, 154, 74],
    [120, 120, 120],
    [230, 230, 230],
    [12, 92, 112],
  ];

  for (let y = 0; y < rows; y++) {
    const sourceY = Math.min(image.height - 1, Math.round((y / Math.max(1, rows - 1)) * (image.height - 1)));
    for (let x = 0; x < columns; x++) {
      const sourceX = Math.min(image.width - 1, Math.round((x / Math.max(1, columns - 1)) * (image.width - 1)));
      const offset = (sourceY * image.width + sourceX) * image.channels;
      colors.push([image.data[offset] ?? 0, image.data[offset + 1] ?? 0, image.data[offset + 2] ?? 0]);
    }
  }

  return colors;
};

const generateStatementGif = async (): Promise<void> => {
  const animation = await loadAnimatedRgbSource(statementGifInputPath);
  const frames = animation.frames.map((source, index) => {
    const quantized = quantizeToPalette({
      image: source,
      outputChannels: 3,
      palette: sampledPalette(source, 6, 4),
    });
    const paletteFrame: RawRgbImage = { ...quantized, channels: 3 };
    const dithered = errorDiffuse({ image: paletteFrame, kernel: floydSteinbergKernel, levels: 2, serpentine: true });
    return {
      rgba: colorizedDitherFrame(paletteFrame, dithered),
      delayMs: animation.delays[index] ?? 160,
    };
  });

  writeGif('sun-runner-statement.gif', animation.width, animation.height, frames);
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
    image: errorDiffuse({ image: asciiSource, kernel: floydSteinbergKernel, levels: 2, serpentine: true }),
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

interface GifStage {
  readonly fileName: string;
  readonly label: string;
  readonly delayMs: number;
}

const gifStages: readonly GifStage[] = [
  { fileName: 'doll-face-original.png', label: 'original resized preview', delayMs: 900 },
  { fileName: 'doll-face-ordered-bayer.png', label: 'ordered Bayer dither', delayMs: 900 },
  { fileName: 'doll-face-floyd-steinberg.png', label: 'Floyd–Steinberg diffusion', delayMs: 900 },
  { fileName: 'doll-face-atkinson.png', label: 'Atkinson diffusion', delayMs: 1200 },
];

const stageLabelSvg = (stage: GifStage): Buffer =>
  Buffer.from(`
    <svg width="${previewWidth}" height="48" viewBox="0 0 ${previewWidth} 48" xmlns="http://www.w3.org/2000/svg">
      <rect width="${previewWidth}" height="48" fill="#111827" fill-opacity="0.86" />
      <text x="18" y="31" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="18" font-weight="700" fill="#fffaf7">${stage.label}</text>
    </svg>
  `);

const loadGifStageRgba = async (stage: GifStage): Promise<Uint8Array> => {
  const { data, info } = await sharp(join(outputDir, stage.fileName))
    .resize({ width: previewWidth, height: previewWidth * 1.5, fit: 'cover' })
    .composite([{ input: stageLabelSvg(stage), gravity: 'south' }])
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (info.width !== previewWidth || info.height !== previewWidth * 1.5 || info.channels !== 4) {
    throw new Error(`unexpected GIF frame geometry for ${stage.fileName}`);
  }

  return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
};

const generateAnimatedGifAsset = async (): Promise<void> => {
  const height = previewWidth * 1.5;
  const frames = [];
  for (const stage of gifStages) {
    frames.push({ rgba: await loadGifStageRgba(stage), delayMs: stage.delayMs });
  }
  writeGif('doll-face-conversion-stages.gif', previewWidth, height, frames);
};

mkdirSync(outputDir, { recursive: true });
const dollFacePreview = await loadRgbPreview(dollFaceInputPath, previewWidth);
const sunRunnerPreview = await loadRgbPreview(sunRunnerInputPath, previewWidth);
await generateDitherAssets(dollFaceInputPath, 'doll-face', dollFacePreview);
await generateDitherAssets(sunRunnerInputPath, 'sun-runner', sunRunnerPreview);
await generateStatementGif();
await generateAsciiAssets();
await generateAnimatedGifAsset();

console.log(`Generated README assets in ${outputDir}`);
