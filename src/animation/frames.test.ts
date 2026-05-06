import { describe, expect, it } from 'vitest';
import { frameDurations, loopFrames, mapFrames, takeFrames, withFrameDuration } from './frames.js';
import type { ImageFrame } from '../types.js';

const frame = (value: number, durationMs?: number): ImageFrame<Uint8Array> => ({
  width: 1,
  height: 1,
  channels: 1,
  data: new Uint8Array([value]),
  ...(durationMs === undefined ? {} : { durationMs }),
});

describe('animation frame helpers', () => {
  it('maps frames lazily with frame indexes', () => {
    let pulled = 0;
    function* source(): Iterable<ImageFrame<Uint8Array>> {
      pulled++;
      yield frame(1, 10);
      pulled++;
      yield frame(2, 20);
    }

    const mapped = mapFrames(source(), (input, index) => frame(input.data[0]! + index + 10, input.durationMs));

    expect(pulled).toBe(0);
    const iterator = mapped[Symbol.iterator]();
    expect(iterator.next().value).toMatchObject({ data: new Uint8Array([11]), durationMs: 10 });
    expect(pulled).toBe(1);
    expect(iterator.next().value).toMatchObject({ data: new Uint8Array([13]), durationMs: 20 });
    expect(iterator.next().done).toBe(true);
  });

  it('applies a default duration without overwriting existing durations by default', () => {
    expect([...withFrameDuration([frame(1), frame(2, 50)], 33)].map((item) => item.durationMs)).toEqual([33, 50]);
  });

  it('can overwrite all frame durations when requested', () => {
    expect([...withFrameDuration([frame(1), frame(2, 50)], 40, { overwrite: true })].map((item) => item.durationMs)).toEqual([
      40,
      40,
    ]);
  });

  it('returns durations with a fallback for missing frame timing', () => {
    expect(frameDurations([frame(1, 10), frame(2)], 24)).toEqual([10, 24]);
  });

  it('loops finite frame arrays a fixed number of times', () => {
    expect([...loopFrames([frame(1), frame(2)], 2)].map((item) => item.data[0])).toEqual([1, 2, 1, 2]);
  });

  it('rejects negative loop counts', () => {
    expect(() => [...loopFrames([frame(1)], -1)]).toThrow(/times/i);
  });

  it('takes a finite prefix from any iterable', () => {
    expect([...takeFrames(loopFrames([frame(9)], Infinity), 3)].map((item) => item.data[0])).toEqual([9, 9, 9]);
  });
});
