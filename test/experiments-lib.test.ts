import { describe, expect, it } from 'vitest';
import { experimentSlug, sortByNumber } from '../src/lib/experiments';

describe('experimentSlug', () => {
  it('strips the ordering prefix from a file id', () => {
    expect(experimentSlug('01-roundabout')).toBe('roundabout');
    expect(experimentSlug('17-voltage-across-a-lamp')).toBe('voltage-across-a-lamp');
  });

  it('leaves an id without a prefix alone', () => {
    expect(experimentSlug('roundabout')).toBe('roundabout');
  });

  it('does not strip digits from the middle of a slug', () => {
    expect(experimentSlug('34-traffic-lights-2')).toBe('traffic-lights-2');
  });
});

describe('sortByNumber', () => {
  it('orders entries by experiment number, not by id', () => {
    const entries = [{ data: { number: 10 } }, { data: { number: 2 } }, { data: { number: 1 } }];
    expect(sortByNumber(entries).map((e) => e.data.number)).toEqual([1, 2, 10]);
  });

  it('does not mutate its input', () => {
    const entries = [{ data: { number: 2 } }, { data: { number: 1 } }];
    sortByNumber(entries);
    expect(entries[0].data.number).toBe(2);
  });
});
