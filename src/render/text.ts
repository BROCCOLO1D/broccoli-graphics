import { normalizeColor } from '../palette.js';
import { assertPositiveInteger, type ColorInput, type RgbColor } from '../types.js';
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

export interface AsciiCellContext {
  readonly cell: string;
  readonly x: number;
  readonly y: number;
  readonly index: number;
}

export type AnsiColorResolver = ColorInput | ((context: AsciiCellContext) => ColorInput | undefined);

export interface RenderAsciiAnsiOptions extends RenderAsciiTextOptions {
  readonly foreground?: AnsiColorResolver;
  readonly background?: AnsiColorResolver;
}

const resolveColor = (resolver: AnsiColorResolver | undefined, context: AsciiCellContext): RgbColor | undefined => {
  if (!resolver) {
    return undefined;
  }
  const color = typeof resolver === 'function' ? resolver(context) : resolver;
  return color ? normalizeColor(color) : undefined;
};

const ansiTrueColor = (mode: 38 | 48, color: RgbColor): string =>
  `\u001b[${mode};2;${color.r};${color.g};${color.b}m`;

export const renderAsciiAnsi = (canvas: AsciiCanvas, options: RenderAsciiAnsiOptions = {}): string => {
  validateCanvas(canvas);
  const repeatX = options.repeatX ?? 1;
  assertPositiveInteger('repeatX', repeatX);

  const rows = new Array<string>(canvas.height);
  for (let y = 0; y < canvas.height; y++) {
    let row = '';
    const rowOffset = y * canvas.width;
    for (let x = 0; x < canvas.width; x++) {
      const index = rowOffset + x;
      const cell = canvas.cells[index] ?? '';
      const context = { cell, x, y, index };
      const foreground = resolveColor(options.foreground, context);
      const background = resolveColor(options.background, context);
      const prefix = `${foreground ? ansiTrueColor(38, foreground) : ''}${background ? ansiTrueColor(48, background) : ''}`;
      row += `${prefix}${cell.repeat(repeatX)}${prefix ? '\u001b[0m' : ''}`;
    }
    rows[y] = row;
  }

  return rows.join('\n');
};
