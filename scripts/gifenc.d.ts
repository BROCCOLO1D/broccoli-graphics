declare module 'gifenc' {
  export type GifPalette = ReadonlyArray<readonly number[]>;

  export interface GifEncoder {
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      options?: {
        readonly palette?: GifPalette;
        readonly delay?: number;
        readonly repeat?: number;
        readonly dispose?: number;
      },
    ): void;
    finish(): void;
    bytes(): Uint8Array;
  }

  export function GIFEncoder(options?: { readonly auto?: boolean; readonly initialCapacity?: number }): GifEncoder;
  export function quantize(
    rgba: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    options?: { readonly format?: 'rgb565' | 'rgb444' | 'rgba4444' },
  ): GifPalette;
  export function applyPalette(
    rgba: Uint8Array | Uint8ClampedArray,
    palette: GifPalette,
    format?: 'rgb565' | 'rgb444' | 'rgba4444',
  ): Uint8Array;
  const gifenc: {
    readonly GIFEncoder: typeof GIFEncoder;
    readonly quantize: typeof quantize;
    readonly applyPalette: typeof applyPalette;
  };
  export default gifenc;
}