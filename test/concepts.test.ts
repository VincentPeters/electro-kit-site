import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { conceptSchema } from '../src/content/schema';

const CONCEPT_DIR = 'src/content/concepts';

function loadConcepts() {
  return readdirSync(CONCEPT_DIR)
    .filter((f) => f.endsWith('.yaml'))
    .map((file) => ({
      id: file.replace(/\.yaml$/, ''),
      data: parse(readFileSync(join(CONCEPT_DIR, file), 'utf8')),
    }));
}

describe('concept content', () => {
  it('validates every concept file against the schema', () => {
    const concepts = loadConcepts();
    expect(concepts.length).toBeGreaterThan(0);

    for (const { id, data } of concepts) {
      const result = conceptSchema.safeParse(data);
      expect(result.success, `${id}: ${JSON.stringify(result.error?.issues)}`).toBe(true);
    }
  });

  it('gives every concept a unique teaching order, contiguous from 1', () => {
    const orders = loadConcepts()
      .map((c) => conceptSchema.parse(c.data).order)
      .sort((a, b) => a - b);

    expect(orders).toEqual(Array.from({ length: orders.length }, (_, i) => i + 1));
  });

  it('keeps the one-liner to a single sentence', () => {
    for (const { id, data } of loadConcepts()) {
      const { oneLiner } = conceptSchema.parse(data);
      expect(oneLiner.match(/[.!?]/g)?.length ?? 0, `${id} has more than one sentence`).toBe(1);
    }
  });
});
