# Architecture

`broccoli-graphics` is intended to be a lightweight TypeScript graphics toolkit for image-like pixel buffers, dithering, ASCII rendering, and simple frame pipelines. The core design goal is composability: each module should do one transformation well and avoid framework-specific assumptions.

## Design principles

1. **Pure core, adapters outside core**: core functions operate on dimensions plus typed arrays. Browser canvas, PNG loading, terminal IO, and GIF/video tooling should live in examples or optional adapters.
2. **Typed arrays in hot paths**: per-pixel algorithms should prefer `Uint8Array`, `Uint8ClampedArray`, and `Float32Array` with index arithmetic and minimal object allocation.
3. **Explicit allocation behavior**: APIs should clearly distinguish `toX()` functions that allocate from `XInPlace()` functions that mutate a buffer.
4. **Data-driven algorithms**: dithering kernels, palettes, ramps, and frame transforms should be values that users can define and compose.
5. **Tree-shakable public API**: modules should be independently importable and re-exported from `src/index.ts` for convenience.

## Target module layout

```text
src/
  types.ts                  Shared Color, PixelBuffer, ImageFrame, and option types
  luminance.ts              Luma/grayscale helpers and alpha compositing policies
  palette.ts                Palette normalization, nearest-color matching, distances
  dither/
    ordered.ts              Bayer matrix generation and ordered dithering
    error-diffusion.ts      Generic error diffusion engine and named kernels
  ascii/
    charset.ts              Character ramps and density mapping helpers
    convert.ts              Pixel/luminance buffers to ASCII cell grids
  animation/
    frames.ts               Frame sequence transforms and timing helpers
  render/
    text.ts                 Plain text and ANSI rendering from ASCII cells
  index.ts                  Public exports
```

This structure is a starting point; modules can split further if implementation complexity grows.

## Core types

Expected foundational types:

```ts
export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface PixelBuffer<T extends ArrayLike<number> = Uint8ClampedArray> extends Size {
  readonly data: T;
  readonly channels: 1 | 3 | 4;
  readonly stride?: number;
}

export interface ImageFrame<T extends ArrayLike<number> = Uint8ClampedArray> extends PixelBuffer<T> {
  readonly durationMs?: number;
}

export interface RgbaColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a?: number;
}
```

Implementation can add stricter variants as needed. The important constraint is that callers should be able to pass browser `ImageData.data` without conversion.

## Public API sketch

```ts
import {
  createBayerMatrix,
  orderedDither,
  floydSteinbergKernel,
  errorDiffuse,
  imageToAscii,
  renderAsciiText,
} from 'broccoli-graphics';

const matrix = createBayerMatrix(4);
const dithered = orderedDither({ image, matrix, levels: 2 });
const diffused = errorDiffuse({ image, kernel: floydSteinbergKernel, palette });
const ascii = imageToAscii({ image: dithered, ramp: ' .:-=+*#%@' });
console.log(renderAsciiText(ascii));
```

Subpath exports should eventually allow:

```ts
import { orderedDither } from 'broccoli-graphics/dither/ordered';
import { imageToAscii } from 'broccoli-graphics/ascii/convert';
```

## Module responsibilities

### `luminance`

- Convert RGB/RGBA pixels to scalar brightness.
- Offer BT.709 defaults and optional coefficients.
- Support alpha policies without requiring a canvas.
- Return grayscale buffers or per-pixel numeric values for other algorithms.

### `palette`

- Normalize palette input into compact arrays.
- Find nearest palette color and/or index.
- Provide fast RGB squared-distance default and optional weighted distances.
- Avoid advanced palette generation in the first pass unless needed by tests/examples.

### `dither/ordered`

- Generate Bayer threshold matrices for power-of-two sizes.
- Apply thresholding to grayscale or per-channel buffers.
- Support binary and multi-level output.
- Avoid mutable global state; generated matrices are reusable values.

### `dither/error-diffusion`

- Define named kernels and a generic diffusion engine.
- Start with Floyd-Steinberg as the first required algorithm.
- Support grayscale thresholding first, then palette diffusion.
- Keep edge behavior deterministic and tested.

### `ascii`

- Store default ramps and ramp validation in `charset`.
- Convert luminance/image buffers to a `AsciiCanvas` / cell grid.
- Keep rendering separate so future HTML, SVG, ANSI, and plain text renderers can share conversion output.

### `animation/frames`

- Provide small helpers such as `mapFrames`, `frameDurations`, `loopFrames`, and `sampleFrames`.
- Accept `Iterable<ImageFrame>` initially, with room for `AsyncIterable` later.
- Avoid heavy GIF/video dependencies in the package core.

### `render/text`

- Render ASCII cell grids to newline-delimited text.
- Optionally emit ANSI truecolor/256-color escape sequences without dependencies.
- Keep colorization opt-in because many consumers need plain strings.

## Testing strategy

- Unit tests for Bayer matrix ranks and threshold normalization.
- Tiny-image snapshot tests for ordered dithering and Floyd-Steinberg edge behavior.
- Palette nearest-color tests with deterministic ties.
- ASCII ramp tests for min, max, midpoint, invert, and invalid ramp handling.
- Frame helper tests proving lazy iteration and preservation of durations.

## Extension points

- Custom luminance coefficients and alpha policies.
- Custom palettes and distance metrics.
- Custom dithering kernels.
- Custom ASCII ramps and renderer functions.
- Optional adapters for decoding images or writing animated outputs, kept outside core dependencies.

## Initial implementation sequence

1. Add shared types, luminance helpers, palette utilities, and ordered dithering.
2. Add the generic error diffusion engine with Floyd-Steinberg.
3. Add ASCII ramp mapping, conversion, and text rendering.
4. Add frame helpers and examples that generate text/SVG/ANSI output from synthetic data.
5. Polish package exports, README examples, and performance notes.
