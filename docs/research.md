# Research notes

This document records public references and implementation patterns reviewed while designing `broccoli-graphics`. It is intentionally a summary of ideas and tradeoffs, not copied source code. All implementation in this repository should be original and small enough to audit.

## Sources reviewed

| Area | Source | License noted | Useful ideas |
| --- | --- | --- | --- |
| Ordered dithering and typed-array pixel operations | [`thi-ng/umbrella` `packages/pixel-dither`](https://github.com/thi-ng/umbrella/tree/main/packages/pixel-dither) | Apache-2.0 | Bayer matrices can be generated recursively for power-of-two sizes; ordered dithering can use `x & (size - 1)` / `y & (size - 1)` masks and normalized matrix thresholds. |
| Error diffusion engine | [`thi-ng/umbrella` `packages/pixel-dither/src/dither.ts`](https://github.com/thi-ng/umbrella/blob/main/packages/pixel-dither/src/dither.ts) | Apache-2.0 | Separate the generic scanline loop from the kernel definition; keep kernels as offsets + weights so algorithms are data-driven. |
| Error diffusion row buffering | [`wistrand/melker` `src/video/dither/error-diffusion.ts`](https://github.com/wistrand/melker/blob/main/src/video/dither/error-diffusion.ts) | not relied on for code | Reusable row error buffers avoid allocating a full error image and are useful for animation pipelines; temporal-stability options can reduce flicker. |
| Palette quantization and color distance | [`image-q`](https://github.com/ibezkrovnyi/image-quantization) | MIT | Palette work benefits from pluggable distance metrics, alpha-aware handling, and separate palette quantizers vs image quantizers. `broccoli-graphics` should start with nearest-color utilities and leave advanced quantizers as extension points. |
| Dithering + palette utilities in TypeScript | [`retraigo/monke`](https://github.com/retraigo/monke) | MIT | A lightweight API can expose recoloring, dithering, quantization, and filters as composable primitives rather than one monolithic converter. |
| ASCII conversion API shape | [`asciify-image`](https://github.com/ajay-gandhi/asciify-image) | ISC | Character ramps ordered by visual density, terminal aspect-ratio compensation, optional ANSI color, and string-vs-grid output are practical public API concepts. |
| Algorithm background | [Wikipedia: Ordered dithering](https://en.wikipedia.org/wiki/Ordered_dithering), [Wikipedia: Floyd-Steinberg dithering](https://en.wikipedia.org/wiki/Floyd%E2%80%93Steinberg_dithering), [Tanner Helland: Dithering algorithms](https://tannerhelland.com/2012/12/28/dithering-eleven-algorithms-source-code.html) | reference material | Common kernels, luminance formulas, and implementation tradeoffs for ordered and error-diffusion dithering. |

## Algorithm notes

### Luminance and grayscale

- Use BT.709/sRGB luma coefficients as the default perceptual grayscale approximation: `0.2126 R + 0.7152 G + 0.0722 B`.
- Provide an integer-friendly alternative (`54 R + 183 G + 19 B >> 8`) only if benchmarks show it matters; exact floating output is easier to test and document first.
- Treat alpha explicitly. Good defaults for future implementation:
  - `ignore`: compute luminance from RGB only.
  - `premultiply` or `composite`: blend against a configurable background before luminance.
- Prefer functions that accept raw `ArrayLike<number>` / typed arrays plus stride metadata so callers can use `ImageData.data`, Node buffers, or generated pixels.

### Ordered dithering / Bayer matrices

- Bayer matrix sizes should be powers of two (`2, 4, 8, 16`) so wrapping can use modulo or bit masking.
- A recursive construction yields threshold ranks in `[0, n*n - 1]`; normalize with `(rank + 0.5) / (n*n)` to avoid bias at endpoints.
- Ordered dithering is naturally local and parallelizable: each output pixel depends only on its input value and `(x, y)` threshold. This is useful for animation because frames do not accumulate state.
- Public API should support both binary thresholding and multi-level quantization, e.g. `levels: 2 | 4 | 8 | number`.

### Error diffusion

- Keep kernels data-only: `[{ dx, dy, weightNumerator, weightDenominator }]` or normalized `weight` values.
- Standard kernels to support over time:
  - Floyd-Steinberg: `(1,0) 7/16`, `(-1,1) 3/16`, `(0,1) 5/16`, `(1,1) 1/16`.
  - Atkinson: six neighbors at `1/8`, intentionally diffuses only `6/8` of the error for higher contrast.
  - Jarvis-Judice-Ninke, Stucki, Sierra variants: wider kernels with smoother output but more work per pixel.
- For initial implementation, a simple full `Float32Array` working copy is easiest and still acceptable for small images. A later optimization can use rolling row buffers sized by `kernel.maxDy` to reduce memory.
- Serpentine scanning can reduce directional artifacts but complicates kernels; design options so it can be added without breaking API.
- Clamp accumulated working values before quantization and clamp propagated values when writing final output to prevent typed-array wraparound.

### Palette matching and quantization

- Start with a `Palette` as `ReadonlyArray<Color>` or a packed `Uint8Array` RGB/RGBA palette.
- Nearest-color matching should be a pure function with pluggable distance:
  - Squared Euclidean RGB as the fast default.
  - Weighted luma-aware RGB distance as an optional utility.
  - Advanced CIE metrics are out of scope for a lightweight first version.
- Cache palette length and avoid object allocation inside per-pixel loops. Return indexes when useful so callers can build indexed buffers.

### ASCII conversion

- Character ramps should be ordered from light to dark by visual density. Useful defaults:
  - Minimal: `" .:-=+*#%@"`.
  - Dense: `" .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$"`.
- Mapping is `charIndex = round((1 - normalizedBrightness) * (ramp.length - 1))` for dark characters on bright backgrounds, with an invert option.
- Terminal text often needs aspect-ratio compensation because characters are taller than they are wide. Provide `sampleWidth`, `sampleHeight`, or `cellAspectRatio` rather than forcing image resizing dependencies.
- Rendering should be separate from conversion: produce grids/frames of character cells first, then stringify or colorize with ANSI in `render/text`.

### Animation and frame pipelines

- Model frames as `{ width, height, data, durationMs? }` and keep transformations as pure functions over iterables/arrays of frames.
- Avoid holding all frames when not required: APIs should accept `Iterable<Frame>` and later `AsyncIterable<Frame>`.
- Ordered dithering is stateless per frame; error diffusion should avoid cross-frame mutable state by default. Optional temporal smoothing can be a later extension.

## Performance and packaging implications

- Runtime should have no image decoding dependency in core. Consumers can feed browser `ImageData`, canvas buffers, PNG-decoded typed arrays, or generated data.
- Use typed arrays (`Uint8ClampedArray`, `Uint8Array`, `Float32Array`) and index arithmetic (`base = (y * width + x) * channels`) in hot paths.
- Keep allocation policy explicit: functions should either return a new buffer or document in-place behavior.
- Exports should be subpath-friendly and tree-shakable: `dither/ordered`, `dither/error-diffusion`, `ascii/convert`, etc.
- Tests should pin small matrices, kernel outputs on tiny images, edge handling, alpha/luminance behavior, and ASCII ramp mapping.

## License-safety notes

- Do not port source files or exact implementations from reviewed repositories.
- Public-domain algorithm formulas and kernel weights can be used, but source-specific structure, names, and comments should remain original.
- Keep this research document as attribution/inspiration evidence; implementation files should contain only algorithm references where useful.
