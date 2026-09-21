import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { conceptSchema, experimentSchema } from '../src/content/schema';

const CONCEPT_DIR = 'src/content/concepts';
const EXPERIMENT_DIR = 'src/content/experiments';

function loadConcepts() {
  return readdirSync(CONCEPT_DIR)
    .filter((f) => f.endsWith('.yaml'))
    .map((file) => ({
      id: file.replace(/\.yaml$/, ''),
      ...conceptSchema.parse(parse(readFileSync(join(CONCEPT_DIR, file), 'utf8'))),
    }));
}

function loadProgression() {
  return readdirSync(EXPERIMENT_DIR)
    .filter((f) => f.endsWith('.yaml'))
    .map((file) => {
      const data = experimentSchema.parse(parse(readFileSync(join(EXPERIMENT_DIR, file), 'utf8')));
      return {
        id: file.replace(/\.yaml$/, ''),
        number: data.number,
        introduces: data.introduces,
        practises: data.practises,
        eli5: data.eli5,
      };
    })
    .sort((a, b) => a.number - b.number);
}

/** Concept id -> the experiment number that introduces it. */
function introductionPoints(): Map<string, number> {
  const points = new Map<string, number>();
  for (const exp of loadProgression()) {
    for (const id of exp.introduces) {
      if (!points.has(id)) points.set(id, exp.number);
    }
  }
  return points;
}

describe('the learning progression', () => {
  it('only references concepts that exist', () => {
    const known = new Set(loadConcepts().map((c) => c.id));
    const unknown = loadProgression().flatMap((exp) =>
      [...exp.introduces, ...exp.practises]
        .filter((id) => !known.has(id))
        .map((id) => `${exp.id} references unknown concept "${id}"`),
    );

    expect(unknown).toEqual([]);
  });

  it('introduces every concept exactly once', () => {
    const counts = new Map<string, number>();
    for (const exp of loadProgression()) {
      for (const id of exp.introduces) counts.set(id, (counts.get(id) ?? 0) + 1);
    }

    const problems = loadConcepts()
      .map((c) => ({ id: c.id, times: counts.get(c.id) ?? 0 }))
      .filter((c) => c.times !== 1)
      .map((c) => `${c.id} is introduced ${c.times} times, expected exactly 1`);

    expect(problems).toEqual([]);
  });

  it('never practises a concept before it has been introduced', () => {
    const points = introductionPoints();
    const early = loadProgression().flatMap((exp) =>
      exp.practises
        .filter((id) => {
          const introduced = points.get(id);
          return introduced === undefined || introduced > exp.number;
        })
        .map((id) => `${exp.number} practises "${id}", introduced at ${points.get(id) ?? 'never'}`),
    );

    expect(early).toEqual([]);
  });

  it('never practises a concept it also introduces', () => {
    const both = loadProgression().flatMap((exp) =>
      exp.introduces
        .filter((id) => exp.practises.includes(id))
        .map((id) => `${exp.number} both introduces and practises "${id}"`),
    );

    expect(both).toEqual([]);
  });

  it('orders the concepts the way the experiments introduce them', () => {
    const points = introductionPoints();
    const inTeachingOrder = loadConcepts()
      .slice()
      .sort((a, b) => a.order - b.order);

    // Walk the concepts in teaching order: the experiment introducing each
    // one must never come before the previous concept's. Comparing adjacent
    // pairs rather than two sorted id lists keeps this correct when a single
    // experiment introduces two concepts at once, where any tie-break
    // between them would be arbitrary.
    const outOfOrder: string[] = [];
    for (let i = 1; i < inTeachingOrder.length; i++) {
      const previous = inTeachingOrder[i - 1];
      const current = inTeachingOrder[i];
      const previousAt = points.get(previous.id) ?? Infinity;
      const currentAt = points.get(current.id) ?? Infinity;

      if (currentAt < previousAt) {
        outOfOrder.push(
          `${current.id} (order ${current.order}) is introduced at ${currentAt}, before ${previous.id} (order ${previous.order}) at ${previousAt}`,
        );
      }
    }

    expect(outOfOrder).toEqual([]);
  });

  it('reports how many experiments have a plain-language version', () => {
    const all = loadProgression();
    const covered = all.filter((exp) => exp.eli5 !== undefined);
    console.log(`ELI5 coverage: ${covered.length}/${all.length} experiments`);

    // Every experiment now has one, and every new experiment must arrive with one.
    expect(covered.length).toBe(all.length);
  });
});
