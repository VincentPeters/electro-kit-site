import { describe, expect, it } from 'vitest';
import { STORAGE_KEY, nextUp, readBuilt, toggleBuilt } from '../src/scripts/progress';

const stored = (value: string | null) => ({ getItem: () => value });

describe('readBuilt', () => {
  it('reads a stored list', () => {
    expect(readBuilt(stored(JSON.stringify([3, 1, 2])))).toEqual([1, 2, 3]);
  });

  it('returns an empty list when nothing is stored', () => {
    expect(readBuilt(stored(null))).toEqual([]);
  });

  it('survives malformed data rather than throwing', () => {
    expect(readBuilt(stored('not json'))).toEqual([]);
    expect(readBuilt(stored('{"a":1}'))).toEqual([]);
    expect(readBuilt(stored('[1,"two",3]'))).toEqual([1, 3]);
  });

  it('survives storage that throws on access', () => {
    const hostile = {
      getItem() {
        throw new Error('blocked');
      },
    };
    expect(readBuilt(hostile)).toEqual([]);
  });

  it('uses a namespaced key', () => {
    expect(STORAGE_KEY).toBe('eks:built');
  });
});

describe('toggleBuilt', () => {
  it('adds a number that is not there, keeping the list sorted', () => {
    expect(toggleBuilt([1, 3], 2)).toEqual([1, 2, 3]);
  });

  it('removes a number that is there', () => {
    expect(toggleBuilt([1, 2, 3], 2)).toEqual([1, 3]);
  });

  it('does not mutate the input', () => {
    const before = [1, 2];
    toggleBuilt(before, 3);
    expect(before).toEqual([1, 2]);
  });
});

describe('nextUp', () => {
  it('finds the first gap', () => {
    expect(nextUp([1, 2, 4], 60)).toBe(3);
  });

  it('starts at 1 when nothing is built', () => {
    expect(nextUp([], 60)).toBe(1);
  });

  it('returns null when everything is built', () => {
    expect(nextUp([1, 2, 3], 3)).toBe(null);
  });
});
