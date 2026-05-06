import { assertPositiveInteger } from '../types.js';
import type { AsciiCanvas } from '../ascii/convert.js';

export interface AsciiSvgCellContext {
  readonly cell: string;
  readonly x: number;
  readonly y: number;
  readonly index: number;
}

export type SvgPaintResolver = string | ((context: AsciiSvgCellContext) => string | undefined);

export interface RenderAsciiSvgOptions {
  /** Pixel width reserved for each ASCII cell. Defaults to 8. */
  readonly cellWidth?: number;
  /** Pixel height reserved for each ASCII row. Defaults to 12. */
  readonly cellHeight?: number;
  /** CSS font size in pixels. Defaults to 10. */
  readonly fontSize?: number;
  /** Padding around the rendered text grid in pixels. Defaults to 0. */
  readonly padding?: number;
  /** SVG/CSS paint for text, or a per-cell resolver for colorized ASCII previews. Defaults to currentColor. */
  readonly foreground?: SvgPaintResolver;
  /** Optional SVG/CSS paint for a full-canvas background rect. */
  readonly background?: string;
  /** Accessible title emitted as the first SVG child when provided. */
  readonly title?: string;
  /** Monospace font stack for the SVG text. */
  readonly fontFamily?: string;
}

const validateCanvas = (canvas: AsciiCanvas): void => {
  assertPositiveInteger('width', canvas.width);
  assertPositiveInteger('height', canvas.height);
  if (canvas.cells.length !== canvas.width * canvas.height) {
    throw new RangeError('ASCII canvas cells length must equal width * height');
  }
};

const escapeXml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const assertNonNegativeInteger = (name: string, value: number): void => {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative integer`);
  }
};

/**
 * Render an ASCII canvas as deterministic, standalone SVG text.
 *
 * The renderer intentionally returns a string and has no DOM/canvas dependency, keeping it useful in
 * Node, browsers, build scripts, and documentation asset pipelines.
 */
export const renderAsciiSvg = (canvas: AsciiCanvas, options: RenderAsciiSvgOptions = {}): string => {
  validateCanvas(canvas);

  const cellWidth = options.cellWidth ?? 8;
  const cellHeight = options.cellHeight ?? 12;
  const fontSize = options.fontSize ?? 10;
  const padding = options.padding ?? 0;
  assertPositiveInteger('cellWidth', cellWidth);
  assertPositiveInteger('cellHeight', cellHeight);
  assertPositiveInteger('fontSize', fontSize);
  assertNonNegativeInteger('padding', padding);

  const width = canvas.width * cellWidth + padding * 2;
  const height = canvas.height * cellHeight + padding * 2;
  const staticForeground = typeof options.foreground === 'function' ? undefined : escapeXml(options.foreground ?? 'currentColor');
  const foregroundResolver = typeof options.foreground === 'function' ? options.foreground : undefined;
  const fontFamily = escapeXml(options.fontFamily ?? 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace');
  const baselineOffset = Math.round((cellHeight + fontSize) / 2) - 1;
  const lines: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">`,
  ];

  if (options.title) {
    lines.push(`  <title>${escapeXml(options.title)}</title>`);
  }
  if (options.background) {
    lines.push(`  <rect width="${width}" height="${height}" fill="${escapeXml(options.background)}"/>`);
  }

  lines.push(
    `  <g font-family="${fontFamily}" font-size="${fontSize}"${staticForeground ? ` fill="${staticForeground}"` : ''} xml:space="preserve">`,
  );

  if (foregroundResolver) {
    for (let y = 0; y < canvas.height; y++) {
      const rowOffset = y * canvas.width;
      const baseline = padding + y * cellHeight + baselineOffset;
      for (let x = 0; x < canvas.width; x++) {
        const index = rowOffset + x;
        const cell = canvas.cells[index] ?? ' ';
        const fill = foregroundResolver({ cell, x, y, index });
        if (!fill) {
          continue;
        }
        lines.push(
          `    <text x="${padding + x * cellWidth}" y="${baseline}" fill="${escapeXml(fill)}">${escapeXml(cell)}</text>`,
        );
      }
    }
  } else {
    for (let y = 0; y < canvas.height; y++) {
      let row = '';
      const rowOffset = y * canvas.width;
      for (let x = 0; x < canvas.width; x++) {
        row += canvas.cells[rowOffset + x] ?? ' ';
      }
      lines.push(`    <text x="${padding}" y="${padding + y * cellHeight + baselineOffset}">${escapeXml(row)}</text>`);
    }
  }

  lines.push('  </g>', '</svg>');
  return `${lines.join('\n')}\n`;
};
