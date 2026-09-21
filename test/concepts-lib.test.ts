import { describe, expect, it } from 'vitest';
import { sortByOrder, whereYouMeetIt } from '../src/lib/concepts';

const exp = (number: number, introduces: string[], practises: string[]) => ({
  id: `${number}-x`,
  data: { number, introduces, practises },
});

describe('sortByOrder', () => {
  it('sorts by teaching order without mutating the input', () => {
    const input = [{ data: { order: 3 } }, { data: { order: 1 } }, { data: { order: 2 } }];
    expect(sortByOrder(input).map((c) => c.data.order)).toEqual([1, 2, 3]);
    expect(input.map((c) => c.data.order)).toEqual([3, 1, 2]);
  });
});

describe('whereYouMeetIt', () => {
  const experiments = [
    exp(21, ['parallel'], []),
    exp(28, [], ['parallel']),
    exp(22, [], ['parallel', 'current']),
    exp(9, [], ['series']),
  ];

  it('finds the experiment that introduces the concept', () => {
    expect(whereYouMeetIt('parallel', experiments).introducedBy?.data.number).toBe(21);
  });

  it('lists the experiments that practise it, in number order', () => {
    expect(whereYouMeetIt('parallel', experiments).practisedBy.map((e) => e.data.number)).toEqual([
      22, 28,
    ]);
  });

  it('returns null when nothing introduces the concept', () => {
    expect(whereYouMeetIt('induction', experiments).introducedBy).toBe(null);
  });

  it('does not list the introducing experiment as practising it', () => {
    expect(whereYouMeetIt('parallel', experiments).practisedBy.map((e) => e.data.number)).not.toContain(21);
  });
});
