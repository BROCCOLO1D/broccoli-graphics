import {
  createBayerMatrix,
  imageToAscii,
  orderedDither,
  renderAsciiText,
  type PixelBuffer,
} from '../src/index.js';

const width = 24;
const height = 12;
const data = new Uint8Array(width * height);

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const radial = Math.hypot(x - width / 2, y - height / 2) / Math.hypot(width / 2, height / 2);
    data[y * width + x] = Math.round((1 - radial) * 255);
  }
}

const image: PixelBuffer<Uint8Array> = { width, height, channels: 1, data };
const dithered = orderedDither({ image, matrix: createBayerMatrix(4), levels: 2 });
const ascii = imageToAscii({ image: dithered, ramp: ' @' });

console.log(renderAsciiText(ascii));
