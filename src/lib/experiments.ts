/**
 * Experiment files are named `NN-slug.yaml` so they sort in manual order
 * on disk, but the number does not belong in the public URL.
 */
export function experimentSlug(id: string): string {
  return id.replace(/^\d+-/, '');
}

export function sortByNumber<T extends { data: { number: number } }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => a.data.number - b.data.number);
}
