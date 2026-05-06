import { assertPositiveInteger } from '../types.js';
import type { AsciiCanvas } from '../ascii/convert.js';

export interface RenderAsciiTextOptions {
  /** Repeat each cell horizontally, useful for compensating terminal character aspect ratio. */
  readonly repeatX?: number;
}

const validateCanvas = (canvas: AsciiCanvas): void => {
  assertPositiveInteger('width', canvas.width);
  assertPositiveInteger('height', canvas.height);
  if (canvas.cells.length !== canvas.width * canvas.height) {
    throw new RangeError('ASCII canvas cells length must equal width * height');
  }
};

export const renderAsciiText = (canvas: AsciiCanvas, options: RenderAsciiTextOptions = {}): string => {
  validateCanvas(canvas);
  const repeatX = options.repeatX ?? 1;
  assertPositiveInteger('repeatX', repeatX);

  const rows = new Array<string>(canvas.height);
  for (let y = 0; y < canvas.height; y++) {
    let row = '';
    const rowOffset = y * canvas.width;
    for (let x = 0; x < canvas.width; x++) {
      row += (canvas.cells[rowOffset + x] ?? '').repeat(repeatX);
    }
    rows[y] = row;
  }

  return rows.join('\n');
};
