/**
 * Helpers for the concept spine. The thread a reader sees between
 * experiments is derived from their tags, so these are the only place that
 * derivation lives.
 */

interface TaggedExperiment {
  data: { number: number; introduces: string[]; practises: string[] };
}

export function sortByOrder<T extends { data: { order: number } }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => a.data.order - b.data.order);
}

/** Where a concept shows up across the book: introduced once, then practised. */
export function whereYouMeetIt<T extends TaggedExperiment>(
  conceptId: string,
  experiments: T[],
): { introducedBy: T | null; practisedBy: T[] } {
  const byNumber = [...experiments].sort((a, b) => a.data.number - b.data.number);

  return {
    introducedBy: byNumber.find((e) => e.data.introduces.includes(conceptId)) ?? null,
    practisedBy: byNumber.filter((e) => e.data.practises.includes(conceptId)),
  };
}
