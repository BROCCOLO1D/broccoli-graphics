import { assertPositiveInteger, type ImageFrame } from '../types.js';

export type FrameMapper<T extends ImageFrame = ImageFrame, U = ImageFrame> = (frame: T, index: number) => U;

export interface WithFrameDurationOptions {
  /** Replace existing durations instead of only filling missing durations. */
  readonly overwrite?: boolean;
}

export function* mapFrames<T extends ImageFrame, U>(
  frames: Iterable<T>,
  mapper: FrameMapper<T, U>,
): Iterable<U> {
  let index = 0;
  for (const frame of frames) {
    yield mapper(frame, index);
    index++;
  }
}

export function* withFrameDuration<T extends ImageFrame>(
  frames: Iterable<T>,
  durationMs: number,
  options: WithFrameDurationOptions = {},
): Iterable<T & { readonly durationMs: number }> {
  assertPositiveInteger('durationMs', durationMs);
  for (const frame of frames) {
    yield {
      ...frame,
      durationMs: options.overwrite ? durationMs : (frame.durationMs ?? durationMs),
    };
  }
}

export const frameDurations = (frames: Iterable<ImageFrame>, fallbackDurationMs: number): number[] => {
  assertPositiveInteger('fallbackDurationMs', fallbackDurationMs);
  const durations: number[] = [];
  for (const frame of frames) {
    durations.push(frame.durationMs ?? fallbackDurationMs);
  }
  return durations;
};

const assertLoopCount = (times: number): void => {
  if (times === Infinity) {
    return;
  }
  if (!Number.isInteger(times) || times < 0) {
    throw new RangeError('times must be a non-negative integer or Infinity');
  }
};

export function* loopFrames<T extends ImageFrame>(frames: readonly T[], times = Infinity): Iterable<T> {
  assertLoopCount(times);
  if (frames.length === 0 || times === 0) {
    return;
  }

  if (times === Infinity) {
    while (true) {
      yield* frames;
    }
  }

  for (let loop = 0; loop < times; loop++) {
    yield* frames;
  }
}

export function* takeFrames<T>(frames: Iterable<T>, count: number): Iterable<T> {
  assertPositiveInteger('count', count);
  let taken = 0;
  for (const frame of frames) {
    if (taken >= count) {
      return;
    }
    yield frame;
    taken++;
  }
}
