# ELI5 Explanations and Guided Progression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the site a plain-language explanation layer at three levels (idea, component, experiment) and make the book's learning progression explicit and machine-checked.

**Architecture:** A new `concepts` content collection becomes the spine. Every experiment declares which concepts it `introduces` and which it `practises`; the "builds on" thread shown to the reader is derived from those tags, never hand-written. Vitest runs over all 60 raw YAML files and fails the build if a concept is practised before it is introduced. ELI5 prose is surfaced through native `<details>`, so the site stays JavaScript-free apart from one optional progress module.

**Tech Stack:** Astro 7 (static output, content collections with the `glob` loader), Zod via `astro/zod`, Vitest 5, `yaml` for test-side parsing. No UI framework, no CSS framework.

**Spec:** `docs/superpowers/specs/2026-09-21-eli5-and-progression-design.md`

## Global Constraints

- **British English throughout.** The existing content says "colour", "practises", "metres". Match it.
- **No em dashes in any prose.** Use commas, colons, semicolons, periods or parentheses. This applies to YAML content, component copy and code comments.
- **Site chrome stays achromatic.** The kit part colours (`--part-conductor` `#1f6fd0`, `--part-load` `#d92b2b`, `--part-switch` `#199a55`, `--part-instrument` `#1d1d1f`) are reserved for diagrams and the parts page. New UI uses `--colour-ink-strong`, `--colour-muted`, `--colour-line`, `--colour-surface` and the chapter `--theme`. See `PRODUCT.md` design principle 1.
- **Spacing and type come from tokens only.** `--space-*`, `--step-*`, `--radius-*` in `src/styles/tokens.css`. No arbitrary px values.
- **Every internal link goes through `url()`** from `src/lib/url.ts`. The site is served from the `/electro-kit-site` sub-path; a bare absolute path is a broken link.
- **No banned design patterns.** No side-stripe borders (`border-left`/`border-right` > 1px as a coloured accent), no gradient text, no tiny uppercase tracked eyebrow above every section.
- **Progressive enhancement is mandatory.** Every page must be complete and correct with JavaScript disabled. Interactive controls are injected by script, never shipped inert in the HTML.
- **Commands:** `npm test` (Vitest), `npm run build` (must emit pages without error), `npx tsc --noEmit` (use `./node_modules/.bin/tsc` if npx picks the wrong one).
- **Voice for all ELI5 prose:** second person, present tense, concrete physical nouns. Short sentences. One analogy per idea, carried consistently. Never say "electricity flows like water through pipes" and then contradict it later. No jargon that has not been introduced. A child of eight is the reader; they are a real experimenter, not a baby.

---

### Task 1: Remove the duplicated comment block in annotate.ts

Incidental fix carried in the spec. Do this first so it is not tangled with feature work.

**Files:**
- Modify: `src/board/annotate.ts` (the two adjacent block comments immediately above `const RING_STEPS`)

**Interfaces:**
- Consumes: nothing
- Produces: nothing

- [ ] **Step 1: Read the current state**

Run: `sed -n '138,162p' src/board/annotate.ts`

You will see two block comments in a row. The first (starting "Overlap is weighted far above drift") is a stale copy left behind when the penalty weights were retuned. The second (starting "Overlap costs far more than distance") is the current one and mentions the repair pass.

- [ ] **Step 2: Delete the stale first comment**

Delete exactly this block, leaving the second comment and `const RING_STEPS` untouched:

```
/*
  Overlap is weighted far above drift: a label that has moved a centimetre
  is still readable, and one sitting on another is not. These numbers were
  tuned against every plan in the book, which the tests re-check.
*/
```

- [ ] **Step 3: Verify nothing else changed**

Run: `npm test`
Expected: PASS, 78 tests. This is a comment-only change.

- [ ] **Step 4: Commit**

```bash
git add src/board/annotate.ts
git commit -m "Remove a stale comment left behind when label weights were retuned"
```

---

### Task 2: Concept schema and collection

Adds the `concepts` collection with two real concept files, so the schema is exercised by content rather than by a fixture.

**Files:**
- Modify: `src/content/schema.ts`
- Modify: `src/content.config.ts`
- Create: `src/content/concepts/circuit.yaml`
- Create: `src/content/concepts/switching.yaml`
- Create: `test/concepts.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `conceptSchema` (Zod) and `type Concept` exported from `src/content/schema.ts`; a `concepts` entry in `collections`. Concept ids are the YAML filename without extension. Fields: `name: string`, `order: number`, `oneLiner: string`, `eli5: string[]`.

- [ ] **Step 1: Write the failing test**

Create `test/concepts.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/concepts.test.ts`
Expected: FAIL — `conceptSchema` is not exported, and `src/content/concepts` does not exist.

- [ ] **Step 3: Add the schema**

In `src/content/schema.ts`, add after `chapterSchema`:

```ts
/**
 * One big idea, explained once in plain language. Experiments tag themselves
 * against these, and the "builds on" thread between experiments is derived
 * from those tags rather than written out by hand.
 */
export const conceptSchema = z.object({
  name: z.string().min(1),
  /** Teaching order: unique, contiguous from 1, matching the order the experiments introduce them. */
  order: z.number().int().min(1),
  /** One sentence, used on thread chips and the ideas index. */
  oneLiner: z.string().min(1),
  /** The plain-language explanation, one string per paragraph. */
  eli5: z.array(z.string().min(1)).min(1),
});
```

And at the bottom of the file, beside the existing type exports:

```ts
export type Concept = z.infer<typeof conceptSchema>;
```

- [ ] **Step 4: Register the collection**

In `src/content.config.ts`, import `conceptSchema` alongside the others and add:

```ts
const concepts = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/concepts' }),
  schema: conceptSchema,
});
```

Then extend the export:

```ts
export const collections = { chapters, experiments, concepts };
```

- [ ] **Step 5: Write the first two concept files**

Create `src/content/concepts/circuit.yaml`:

```yaml
name: "A circuit"
order: 1
oneLiner: "Electricity only moves if it can go all the way round and back again."
eli5:
  - "Electricity is fussy. It will not go anywhere unless it can get all the way back to where it started."
  - "Think of a running track. A runner can go round and round for as long as you like. Now put a gap in the track. The runner stops at the gap, and no amount of shouting will get them across it."
  - "That is why every circuit you build is a loop that starts at one battery terminal and finishes at the other. Take out any one piece and the loop has a gap in it, so everything stops at once, not just the part you took out."
```

Create `src/content/concepts/switching.yaml`:

```yaml
name: "Switching"
order: 2
oneLiner: "A switch is a gap in the loop that you can open and close on purpose."
eli5:
  - "Once you know that a gap stops everything, a switch is easy: it is a gap you are allowed to make whenever you want."
  - "Push the switch one way and the two pieces of metal inside touch, so the loop is joined up and the current goes round. Push it the other way and they come apart, leaving a gap the current cannot cross."
  - "Every light switch in your house is doing exactly this. Nothing clever is happening inside the wall. Someone is just opening and closing a gap."
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run test/concepts.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 7: Verify the build still works**

Run: `npm run build`
Expected: builds without error. Page count is unchanged at 69 — the collection exists but nothing renders it yet.

- [ ] **Step 8: Commit**

```bash
git add src/content/schema.ts src/content.config.ts src/content/concepts test/concepts.test.ts
git commit -m "Add a concepts collection to carry the big ideas"
```

---

### Task 3: The remaining eleven concept files

Pure content authoring against the schema Task 2 established. This is the highest-value prose in the project: the other 80 ELI5 pieces lean on these, so a wrong mental model here propagates.

**Files:**
- Create: `src/content/concepts/voltage.yaml`, `current.yaml`, `conductor.yaml`, `series.yaml`, `resistance.yaml`, `short-circuit.yaml`, `parallel.yaml`, `magnetism.yaml`, `electromagnet.yaml`, `induction.yaml`, `relay.yaml`

**Interfaces:**
- Consumes: `conceptSchema` from Task 2
- Produces: thirteen concept ids in total, which Task 5 tags experiments against: `circuit`, `switching`, `voltage`, `current`, `conductor`, `series`, `resistance`, `short-circuit`, `parallel`, `magnetism`, `electromagnet`, `induction`, `relay`

- [ ] **Step 1: Write the eleven files**

Follow the exact shape of `circuit.yaml` from Task 2. Assign `order` values 3 to 13 in this sequence, which is the order the experiments introduce them:

| File | `order` | `name` | Brief |
|---|---|---|---|
| `voltage.yaml` | 3 | Voltage | The push. How hard the battery shoves. Measured in volts; this kit gives 3. Do not call it speed or amount. |
| `current.yaml` | 4 | Current | How much is actually moving past a point. The battery pushes (voltage); the current is what moves as a result. |
| `conductor.yaml` | 5 | Conductors and insulators | Some stuff lets current through (metal), most does not (plastic, wood, air). The gap in a switch is an air insulator. |
| `series.yaml` | 6 | One after another | Everything on one single loop. The same current goes through every part in turn, so the push gets shared out between them. |
| `resistance.yaml` | 7 | Resistance | How hard a part makes it to get through. More resistance, less current. The bulb glows *because* it resists. |
| `short-circuit.yaml` | 8 | Short circuits | Give the current an easy way round and it takes it, abandoning the hard way. Why a bridged bulb goes dark, and why joining the terminals is dangerous. |
| `parallel.yaml` | 9 | Side by side | Two separate loops sharing one battery. Each gets the full push, and one can break without stopping the other. |
| `magnetism.yaml` | 10 | Magnetism | A push and pull that works through air and through things, with no circuit involved at all. |
| `electromagnet.yaml` | 11 | Electromagnets | Current through a coil makes a magnet. Switch the current off and the magnetism goes away, which is the whole trick. |
| `induction.yaml` | 12 | Induction | Run it backwards: move a magnet near a coil and you make current. This is where all mains electricity comes from. |
| `relay.yaml` | 13 | The relay | A switch pressed by an electromagnet instead of a finger, so one circuit can operate another without touching it. |

Rules, on top of the Global Constraints voice rules:

- `oneLiner` is exactly one sentence, ending in a single full stop. The test asserts this.
- `eli5` is 2 to 4 short paragraphs.
- Each analogy must survive the whole site. The runner-on-a-track image from `circuit.yaml` is the established one; extend it rather than introducing a competing water-pipe image.
- Do not use a concept's own name to define it. "Resistance is how much a part resists" teaches nothing.
- `short-circuit.yaml` must connect to the safety rules already on the home page, which say never to join the battery terminals.

- [ ] **Step 2: Run the concept tests**

Run: `npx vitest run test/concepts.test.ts`
Expected: PASS. The contiguity test now requires exactly orders 1 to 13 with no gaps or repeats.

- [ ] **Step 3: Verify the build**

Run: `npm run build`
Expected: builds without error, still 69 pages.

- [ ] **Step 4: Commit**

```bash
git add src/content/concepts
git commit -m "Write the remaining eleven big ideas in plain language"
```

---

### Task 4: Experiment schema fields and the progression tests

Writes the coherence tests before any experiment is tagged, so they start red and go green as Task 5 lands.

**Files:**
- Modify: `src/content/schema.ts` (`experimentSchema`)
- Create: `test/progression.test.ts`

**Interfaces:**
- Consumes: `conceptSchema` from Task 2
- Produces: `experimentSchema` gains `introduces: string[]` (default `[]`), `practises: string[]` (default `[]`), `eli5?: string[]`. Test helper `loadProgression()` returning `{ number, id, introduces, practises, eli5 }[]` sorted by number.

- [ ] **Step 1: Add the schema fields**

In `src/content/schema.ts`, inside `experimentSchema`, add after `whatHappens`:

```ts
  /** Concept ids this experiment is the first to teach. Usually none or one. */
  introduces: z.array(z.string().min(1)).default([]),
  /** Concept ids this experiment leans on, all introduced by a lower-numbered experiment. */
  practises: z.array(z.string().min(1)).default([]),
  /** The plain-language retelling of `whatHappens`. Optional while the 60 are written. */
  eli5: z.array(z.string().min(1)).min(1).optional(),
```

Concept ids stay plain strings rather than becoming Astro `reference('concepts')` entries. The cross-collection checks below run on the raw YAML in Vitest, which keeps the page code a single lookup map instead of a `getEntry` per tag, and gives better failure messages than a reference error. Task 12 makes CI run these tests so the check is not advisory.

- [ ] **Step 2: Write the failing tests**

Create `test/progression.test.ts`:

```ts
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
    const byTeachingOrder = loadConcepts()
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((c) => c.id);
    const byIntroduction = loadConcepts()
      .slice()
      .sort((a, b) => (points.get(a.id) ?? Infinity) - (points.get(b.id) ?? Infinity))
      .map((c) => c.id);

    expect(byTeachingOrder).toEqual(byIntroduction);
  });

  it('reports how many experiments have a plain-language version', () => {
    const all = loadProgression();
    const covered = all.filter((exp) => exp.eli5 !== undefined);
    console.log(`ELI5 coverage: ${covered.length}/${all.length} experiments`);

    // Raised as each chapter lands in tasks 9 to 11. Final value is all.length.
    expect(covered.length).toBeGreaterThanOrEqual(0);
  });
});
```

- [ ] **Step 3: Run the tests to see them fail**

Run: `npx vitest run test/progression.test.ts`
Expected: FAIL. "only references concepts that exist" passes vacuously (nothing is tagged), but "introduces every concept exactly once" fails with all thirteen concepts introduced 0 times.

- [ ] **Step 4: Verify the schema change did not break existing content**

Run: `npm test`
Expected: `test/content.test.ts` and the rest still PASS — the new fields have defaults, so untagged experiment files remain valid.

- [ ] **Step 5: Commit**

```bash
git add src/content/schema.ts test/progression.test.ts
git commit -m "Add concept tags to the experiment schema, with coherence tests"
```

---

### Task 5: Tag all sixty experiments

Turns the red tests from Task 4 green. No page changes.

**Files:**
- Modify: all 60 files in `src/content/experiments/`

**Interfaces:**
- Consumes: concept ids from Task 3, schema fields from Task 4
- Produces: every experiment carries `introduces` and `practises`. Task 6 and Task 7 render from these.

- [ ] **Step 1: Add the introduces tag to the thirteen introducing experiments**

Exactly one experiment introduces each concept. Add `introduces: ["<id>"]` to each of these files, placed directly after the `chapter:` line:

| Experiment file | `introduces` |
|---|---|
| `01-going-round-in-circles.yaml` | `circuit` |
| `02-a-torch.yaml` | `switching` |
| `05-showing-the-invisible.yaml` | `voltage` |
| `07-hidden-current.yaml` | `current` |
| `08-can-a-paper-clip-carry-electricity.yaml` | `conductor` |
| `09-two-in-a-row.yaml` | `series` |
| `11-swapping-partners-bulb-and-coil.yaml` | `resistance` |
| `18-a-bridge-over-the-bulb.yaml` | `short-circuit` |
| `21-independent-in-parallel.yaml` | `parallel` |
| `42-simply-attractive-the-magnet.yaml` | `magnetism` |
| `46-current-attracts-too-the-electromagnet.yaml` | `electromagnet` |
| `48-current-out-of-the-coil.yaml` | `induction` |
| `53-a-switch-switches-an-electrical-switch.yaml` | `relay` |

Confirm the exact filenames first:

```bash
ls src/content/experiments/ | grep -E "^(01|02|05|07|08|09|11|18|21|42|46|48|53)-"
```

- [ ] **Step 2: Add the practises tags to all sixty**

For each experiment, list the concepts its circuit and explanation actually rely on, excluding any it introduces. Rules:

- Every concept listed must have been introduced by a **lower-numbered** experiment. Test 3 enforces this.
- Two to four tags is the useful range. Tagging every experiment with `circuit` is true and tells the reader nothing; use it only where the loop itself is the point.
- Read the file's `whatHappens` and `sidebar` before tagging. The tags should match what the text actually argues.

Worked examples:

```yaml
# 22-parallel-currents.yaml — same circuit as 21, now measured
practises: ["parallel", "current"]

# 29-short-circuits-at-the-push-of-a-button.yaml
practises: ["short-circuit", "switching", "parallel"]

# 50-untouched-and-still-it-switches.yaml — the reed switch
practises: ["magnetism", "switching"]

# 60-an-electric-code-lock.yaml
practises: ["relay", "switching", "series", "parallel"]
```

The reed switch experiments (50 to 52) are deliberately **not** given their own concept. `practises: ["magnetism", "switching"]` is exactly the point those experiments make.

- [ ] **Step 3: Run the progression tests**

Run: `npx vitest run test/progression.test.ts`
Expected: PASS, 6 tests. If "never practises a concept before it has been introduced" fails, the failure message names the experiment, the concept and where it was introduced. Fix the tagging, not the test.

- [ ] **Step 4: Run everything**

Run: `npm test && npm run build`
Expected: all tests PASS, build emits 69 pages.

- [ ] **Step 5: Commit**

```bash
git add src/content/experiments
git commit -m "Tag every experiment with the ideas it introduces and practises"
```

---

### Task 6: The ideas section

Two new page routes, entirely derived from the tags. No new prose.

**Files:**
- Create: `src/lib/concepts.ts`
- Create: `src/pages/ideas/index.astro`
- Create: `src/pages/ideas/[slug].astro`
- Modify: `src/layouts/BaseLayout.astro` (the `links` array)
- Create: `test/concepts-lib.test.ts`

**Interfaces:**
- Consumes: the `concepts` collection (Task 2/3), experiment tags (Task 5)
- Produces: from `src/lib/concepts.ts` —
  - `sortByOrder<T extends { data: { order: number } }>(entries: T[]): T[]`
  - `whereYouMeetIt(conceptId, experiments)` returning `{ introducedBy: Exp | null; practisedBy: Exp[] }`, both sorted by experiment number

- [ ] **Step 1: Write the failing test**

Create `test/concepts-lib.test.ts`:

```ts
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run test/concepts-lib.test.ts`
Expected: FAIL — cannot resolve `../src/lib/concepts`.

- [ ] **Step 3: Write the library**

Create `src/lib/concepts.ts`:

```ts
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run test/concepts-lib.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Build the ideas index page**

Create `src/pages/ideas/index.astro`. Follow the structure of `src/pages/experiments/index.astro` for the layout and scoped-style conventions.

```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import { url } from '../../lib/url';
import { sortByOrder, whereYouMeetIt } from '../../lib/concepts';

const concepts = sortByOrder(await getCollection('concepts'));
const experiments = await getCollection('experiments');
---

<BaseLayout
  title="The big ideas"
  description="The handful of ideas the whole kit is built on, each explained in plain language."
>
  <h1>The big ideas</h1>
  <p class="lede">
    Sixty experiments, but only thirteen ideas underneath them. Each one turns
    up for the first time in a particular experiment, then keeps coming back.
  </p>

  <ol class="ideas">
    {
      concepts.map((concept) => {
        const { introducedBy } = whereYouMeetIt(concept.id, experiments);
        return (
          <li>
            <a href={url(`/ideas/${concept.id}/`)}>
              <span class="hex">{concept.data.order}</span>
              <span class="body">
                <span class="name">{concept.data.name}</span>
                <span class="one-liner">{concept.data.oneLiner}</span>
                {introducedBy && (
                  <span class="first">First met in experiment {introducedBy.data.number}</span>
                )}
              </span>
            </a>
          </li>
        );
      })
    }
  </ol>
</BaseLayout>
```

Add a scoped `<style>` block modelled on `ChapterCard.astro`: flat-bordered rows, `--radius-l`, hex marker in `--colour-ink-strong`, `.one-liner` in `--colour-ink`, `.first` in `--colour-muted` at `--step--1`. List-style none, no side stripes.

- [ ] **Step 6: Build the concept detail page**

Create `src/pages/ideas/[slug].astro`:

```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import { url } from '../../lib/url';
import { experimentSlug } from '../../lib/experiments';
import { whereYouMeetIt } from '../../lib/concepts';

export async function getStaticPaths() {
  const concepts = await getCollection('concepts');
  return concepts.map((concept) => ({
    params: { slug: concept.id },
    props: { concept },
  }));
}

const { concept } = Astro.props;
const experiments = await getCollection('experiments');
const { introducedBy, practisedBy } = whereYouMeetIt(concept.id, experiments);
---

<BaseLayout title={concept.data.name} description={concept.data.oneLiner}>
  <p class="chip">Idea {concept.data.order} of 13</p>
  <h1>{concept.data.name}</h1>
  <p class="lede">{concept.data.oneLiner}</p>

  <div class="explain">
    {concept.data.eli5.map((para) => <p>{para}</p>)}
  </div>

  <h2>Where you meet it</h2>
  {
    introducedBy && (
      <p class="first">
        First in{' '}
        <a href={url(`/experiments/${experimentSlug(introducedBy.id)}/`)}>
          {introducedBy.data.number}. {introducedBy.data.title}
        </a>
      </p>
    )
  }
  {
    practisedBy.length > 0 && (
      <ul class="again">
        {practisedBy.map((exp) => (
          <li>
            <a href={url(`/experiments/${experimentSlug(exp.id)}/`)}>
              {exp.data.number}. {exp.data.title}
            </a>
          </li>
        ))}
      </ul>
    )
  }
</BaseLayout>
```

Style the `.explain` block like the existing `.explain` panel on the experiment page: `--colour-surface`, `--radius-l`, `--space-m`/`--space-l` padding. The `.again` list uses `repeat(auto-fill, minmax(min(100%, 19rem), 1fr))` like the other experiment lists.

- [ ] **Step 7: Add Ideas to the nav**

In `src/layouts/BaseLayout.astro`, add to the `links` array between Experiments and Parts:

```ts
  { href: url('/ideas/'), label: 'Ideas' },
```

The existing `isCurrent` helper already matches by section prefix, so `/ideas/parallel/` will highlight the Ideas item with no further change.

- [ ] **Step 8: Verify the build and the new pages**

Run: `npm run build`
Expected: **83 pages** (69 + 1 ideas index + 13 concept pages). Confirm:

```bash
ls dist/ideas/ | wc -l
```
Expected: 14 entries (index.html plus 13 concept directories).

- [ ] **Step 9: Check it in a browser**

```bash
npm run build && npm run preview -- --port 4399
```
Visit `http://localhost:4399/electro-kit-site/ideas/` and one detail page. Confirm the nav highlights Ideas, the "where you meet it" links resolve, and there is no horizontal scroll at 390px wide.

- [ ] **Step 10: Commit**

```bash
git add src/lib/concepts.ts src/pages/ideas src/layouts/BaseLayout.astro test/concepts-lib.test.ts
git commit -m "Add an ideas section built from the concept tags"
```

---

### Task 7: The thread line on experiment pages

**Files:**
- Create: `src/components/ThreadLine.astro`
- Modify: `src/pages/experiments/[slug].astro`

**Interfaces:**
- Consumes: `whereYouMeetIt` is not needed here; the component takes resolved concept data
- Produces: `ThreadLine.astro` with props `{ introduces: ConceptRef[]; practises: ConceptRef[] }` where `ConceptRef = { id: string; name: string; introducedIn: number | null }`

- [ ] **Step 1: Write the component**

Create `src/components/ThreadLine.astro`:

```astro
---
import { url } from '../lib/url';

export interface ConceptRef {
  id: string;
  name: string;
  /** The experiment that first taught it, for the "you met this in N" hint. */
  introducedIn: number | null;
}

interface Props {
  introduces: ConceptRef[];
  practises: ConceptRef[];
}

const { introduces, practises } = Astro.props;
const hasAnything = introduces.length > 0 || practises.length > 0;
---

{
  hasAnything && (
    <nav class="thread" aria-label="How this fits together">
      {introduces.length > 0 && (
        <span class="group">
          <span class="label">New idea</span>
          {introduces.map((c) => (
            <a class="chip new" href={url(`/ideas/${c.id}/`)}>
              {c.name}
            </a>
          ))}
        </span>
      )}
      {practises.length > 0 && (
        <span class="group">
          <span class="label">Builds on</span>
          {practises.map((c) => (
            <a class="chip" href={url(`/ideas/${c.id}/`)}>
              {c.name}
              {c.introducedIn !== null && <span class="from"> {c.introducedIn}</span>}
            </a>
          ))}
        </span>
      )}
    </nav>
  )
}
```

Scoped styles: one flex row with `flex-wrap`, `gap: var(--space-xs) var(--space)`, `margin-block: var(--space) var(--space-l)`. `.label` is `--step--1`, weight 700, `--colour-muted`, uppercase with `letter-spacing: 0.06em`. `.chip` is a flat bordered pill: `border: 1px solid var(--colour-line)`, `border-radius: 999px`, `padding: 0.2rem 0.7rem`, `--step--1`, no underline. `.chip.new` gets `border-color: var(--theme)` and `font-weight: 700` — the chapter theme is legitimate here because the thread line sits above the build sheet, not beside a diagram. `.from` is `--colour-muted` and tabular-nums.

Keep it to one line on desktop. It must wrap gracefully rather than scroll on a phone.

- [ ] **Step 2: Wire it into the experiment page**

In `src/pages/experiments/[slug].astro`, extend the frontmatter:

```ts
import ThreadLine, { type ConceptRef } from '../../components/ThreadLine.astro';
import { whereYouMeetIt } from '../../lib/concepts';

const concepts = await getCollection('concepts');
const allExperiments = await getCollection('experiments');
const byId = new Map(concepts.map((c) => [c.id, c]));

const toRef = (id: string): ConceptRef | null => {
  const concept = byId.get(id);
  if (!concept) return null;
  const { introducedBy } = whereYouMeetIt(id, allExperiments);
  return {
    id,
    name: concept.data.name,
    introducedIn: introducedBy?.data.number ?? null,
  };
};

const introducesRefs = experiment.data.introduces.map(toRef).filter((c) => c !== null);
const practisesRefs = experiment.data.practises.map(toRef).filter((c) => c !== null);
```

Render it as the first thing inside the layout, before `<div class="sheet">`:

```astro
  <ThreadLine introduces={introducesRefs} practises={practisesRefs} />
```

- [ ] **Step 3: Verify the build**

Run: `npm run build`
Expected: 83 pages, no errors.

- [ ] **Step 4: Check the three interesting cases in a browser**

```bash
npm run preview -- --port 4399
```

| URL | Expect |
|---|---|
| `/experiments/going-round-in-circles/` | "New idea · A circuit" only, no "builds on" half |
| `/experiments/parallel-currents/` | "Builds on" chips only |
| `/experiments/an-electric-code-lock/` | Several "builds on" chips, wrapping cleanly at 390px |

Confirm at 390px that the thread line does not push the build plan below the fold more than one short line's worth.

- [ ] **Step 5: Commit**

```bash
git add src/components/ThreadLine.astro src/pages/experiments/\[slug\].astro
git commit -m "Show each experiment's place in the thread of ideas"
```

---

### Task 8: Part explanations on the parts page

**Files:**
- Modify: `src/parts/registry.ts` (add `eli5` to `PartDef` and to every entry)
- Modify: `src/pages/parts.astro`
- Modify: `test/registry.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks
- Produces: `PartDef.eli5: string` — one or two sentences, required on every part

- [ ] **Step 1: Write the failing test**

Add to `test/registry.test.ts`:

```ts
it('explains every part in plain language', () => {
  for (const [type, def] of Object.entries(PARTS)) {
    expect(def.eli5, `${type} has no eli5`).toBeTruthy();
    expect(def.eli5.length, `${type}'s eli5 is too short to say anything`).toBeGreaterThan(20);
  }
});

it('does not simply repeat the description', () => {
  for (const [type, def] of Object.entries(PARTS)) {
    expect(def.eli5, `${type} repeats its description verbatim`).not.toBe(def.description);
  }
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run test/registry.test.ts`
Expected: FAIL — `eli5` is undefined on every part.

- [ ] **Step 3: Add the field to the interface**

In `src/parts/registry.ts`, add to `PartDef`, after `description`:

```ts
  /**
   * What the part really is, for a child who wants to know why it behaves
   * the way it does. One or two sentences, plainer than `description`.
   */
  eli5: string;
```

- [ ] **Step 4: Write an eli5 for every part**

`description` says what the part is for. `eli5` says what is going on inside it. Examples:

```ts
lamp: {
  // description: 'A very thin wire inside a glass bulb...'
  eli5: 'The wire inside is so thin that the current has to squeeze to get through, and squeezing makes it hot. Hot enough, and it glows.',
},
button: {
  eli5: 'Two pieces of springy metal held just apart. Your finger pushes them together, and the spring pulls them back open the moment you let go.',
},
coil: {
  eli5: 'A long wire wound round and round. The current has much further to travel than it looks, which is why it struggles more than it does through a straight strip.',
},
```

Cover all entries in `PARTS`, including the loose pieces and the `boardOnly` relay halves.

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run test/registry.test.ts`
Expected: PASS.

- [ ] **Step 6: Render it on the parts page**

In `src/pages/parts.astro`, inside `.detail`, after the existing `<p>{part.description}</p>`:

```astro
<details class="more">
  <summary>What it really does</summary>
  <p>{part.eli5}</p>
</details>
```

Scoped styles for `.more`: `summary` at `--step--1`, weight 700, `color: var(--colour-muted)`, `cursor: pointer`, `margin-top: var(--space-xs)`, and `list-style` left alone so the native triangle shows. On open, the paragraph gets `margin-top: var(--space-2xs)` and `color: var(--colour-ink)`. Add `summary::-webkit-details-marker { }` only if the default marker misaligns.

- [ ] **Step 7: Verify in a browser**

Run: `npm run build && npm run preview -- --port 4399`
Visit `/electro-kit-site/parts/`. Confirm each part has a working expander, keyboard focus reaches the summary, and the page still has no horizontal scroll at 390px.

- [ ] **Step 8: Commit**

```bash
git add src/parts/registry.ts src/pages/parts.astro test/registry.test.ts
git commit -m "Explain what each part is really doing inside"
```

---

### Task 9: The experiment ELI5 expander, plus chapter 1

Builds the rendering once, then fills the first chapter. Tasks 10 and 11 are content only.

**Files:**
- Modify: `src/pages/experiments/[slug].astro`
- Modify: `src/content/experiments/01-*.yaml` through `08-*.yaml` (chapter 1, eight files)
- Modify: `test/progression.test.ts` (raise the coverage floor)

**Interfaces:**
- Consumes: the optional `eli5` field from Task 4
- Produces: nothing new for later tasks

- [ ] **Step 1: Render the expander**

In `src/pages/experiments/[slug].astro`, destructure `eli5` from `experiment.data` alongside the existing fields, then add inside `<section class="explain">`, after the `whatHappens` paragraphs:

```astro
{
  eli5 && (
    <details class="simpler">
      <summary>Say that in simpler words</summary>
      {eli5.map((para) => <p>{para}</p>)}
    </details>
  )
}
```

Scoped styles: `.simpler` gets `margin-top: var(--space-m)`, `padding-top: var(--space)`, `border-top: 1px solid var(--colour-line)`. The `summary` is weight 700, `--colour-ink-strong`, `cursor: pointer`. Paragraphs inside get `margin-bottom: var(--space-xs)` and the last one `0`.

- [ ] **Step 2: Write the eight chapter 1 ELI5s**

One `eli5` block per experiment file, placed directly after `whatHappens`. Rules:

- 1 to 3 short paragraphs. Shorter than the `whatHappens` it retells.
- Retell the *same* physics. This is a translation, not a different explanation.
- Use the analogies established in the concept files. Do not invent a new one per experiment.
- Never introduce a term the reader has not met. At experiment 1 they do not yet know "voltage".

Example for `01-going-round-in-circles.yaml`:

```yaml
eli5:
  - "The bulb lights because you have made a complete ring, all the way from one end of the battery, through the bulb, and back to the other end."
  - "Take any piece out and there is a gap in the ring. Nothing gets round, so the bulb goes dark. It is not the bulb that stopped working. It is the ring that stopped being a ring."
```

- [ ] **Step 3: Raise the coverage floor**

In `test/progression.test.ts`, change the coverage assertion:

```ts
    expect(covered.length).toBeGreaterThanOrEqual(8);
```

- [ ] **Step 4: Run the tests**

Run: `npm test`
Expected: PASS. The console prints `ELI5 coverage: 8/60 experiments`.

- [ ] **Step 5: Check the rendering**

Run: `npm run build && npm run preview -- --port 4399`
Visit `/electro-kit-site/experiments/going-round-in-circles/`. Confirm the expander is closed by default, opens on click and on Enter when focused, and that an experiment without an `eli5` (any from chapter 2) shows no expander at all rather than an empty one.

- [ ] **Step 6: Commit**

```bash
git add src/pages/experiments/\[slug\].astro src/content/experiments test/progression.test.ts
git commit -m "Add plain-language versions for chapter 1"
```

---

### Task 10: Plain-language versions for chapters 2 and 3

Content only. Same rules as Task 9 step 2.

**Files:**
- Modify: `src/content/experiments/09-*.yaml` through `41-*.yaml` (33 files)
- Modify: `test/progression.test.ts`

**Interfaces:**
- Consumes: the rendering from Task 9
- Produces: nothing

- [ ] **Step 1: Write the 33 ELI5 blocks**

Chapter 2 is experiments 9 to 29, chapter 3 is 30 to 41. Follow the rules in Task 9 step 2 exactly.

Watch for the repetitive stretch: experiments 12 to 20 are variations on one idea, and their `whatHappens` texts are deliberately similar. Do not let the ELI5s become boilerplate. Each should say what is different about *this* one.

- [ ] **Step 2: Raise the coverage floor**

```ts
    expect(covered.length).toBeGreaterThanOrEqual(41);
```

- [ ] **Step 3: Run the tests**

Run: `npm test`
Expected: PASS, `ELI5 coverage: 41/60 experiments`.

- [ ] **Step 4: Commit**

```bash
git add src/content/experiments test/progression.test.ts
git commit -m "Add plain-language versions for chapters 2 and 3"
```

---

### Task 11: Plain-language versions for chapters 4 and 5

**Files:**
- Modify: `src/content/experiments/42-*.yaml` through `60-*.yaml` (19 files)
- Modify: `test/progression.test.ts`

**Interfaces:**
- Consumes: the rendering from Task 9
- Produces: full ELI5 coverage, which Task 12's CI step then protects

- [ ] **Step 1: Write the 19 ELI5 blocks**

Chapter 4 is 42 to 49, chapter 5 is 50 to 60. Same rules.

These are the hardest. Induction (48, 49) and the self-holding relay (58, 59) are where a plausible-sounding wrong explanation is easiest to write. For induction, the honest simple version is that *movement* is what makes the current, not the magnet sitting there. For the self-holding relay, the point is that the relay's own contacts keep its coil fed once it has pulled in.

- [ ] **Step 2: Require full coverage from now on**

```ts
    expect(covered.length).toBe(all.length);
```

Also update the comment above it, which currently says the value is raised as chapters land.

- [ ] **Step 3: Run the tests**

Run: `npm test`
Expected: PASS, `ELI5 coverage: 60/60 experiments`.

- [ ] **Step 4: Commit**

```bash
git add src/content/experiments test/progression.test.ts
git commit -m "Add plain-language versions for chapters 4 and 5"
```

---

### Task 12: Make CI run the tests

The progression checks are only worth having if a push cannot bypass them. `.github/workflows/deploy.yml` currently builds and deploys without running Vitest, which `docs/todo.md` section 1.2 already flags.

**Files:**
- Modify: `.github/workflows/deploy.yml`
- Modify: `docs/todo.md` (strike the now-fixed item)

**Interfaces:**
- Consumes: every test written so far
- Produces: a deploy that fails when the progression is incoherent

- [ ] **Step 1: Add a test step before the build**

In the `build` job, insert before the `withastro/action` step:

```yaml
      - name: Set up Node
        uses: actions/setup-node@v6
        with:
          node-version: 22
          cache: npm
      - name: Install
        run: npm ci
      - name: Test
        run: npm test
```

Keep the existing `withastro/action@v6` step after it.

- [ ] **Step 2: Verify the workflow parses**

Run: `npx --yes yaml-lint .github/workflows/deploy.yml` or, if that is unavailable:

```bash
node -e "require('yaml').parse(require('fs').readFileSync('.github/workflows/deploy.yml','utf8')); console.log('valid')"
```
Expected: `valid`

- [ ] **Step 3: Update the todo**

In `docs/todo.md`, replace the body of section 1.2 with a one-line note that the deploy workflow now runs `npm test` before building, as of this change.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/deploy.yml docs/todo.md
git commit -m "Run the tests in CI so an incoherent progression cannot deploy"
```

- [ ] **Step 5: Confirm on the next push**

After pushing, run `gh run list --limit 1` and confirm the run includes a passing Test step.

---

### Task 13: Progress tracking

The site's first client-side JavaScript. Everything here is additive: with the script blocked, every page must remain exactly as correct as it was before Task 13.

**Files:**
- Create: `src/scripts/progress.ts`
- Modify: `src/pages/experiments/[slug].astro`
- Modify: `src/components/ExperimentCard.astro`
- Modify: `src/pages/index.astro`
- Create: `test/progress.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: from `src/scripts/progress.ts` —
  - `STORAGE_KEY = 'eks:built'`
  - `readBuilt(storage: Pick<Storage, 'getItem'>): number[]` — always returns a sorted array, `[]` on absent, malformed or non-array data
  - `toggleBuilt(built: number[], n: number): number[]` — pure, returns a new sorted array
  - `nextUp(built: number[], total: number): number | null` — the lowest number from 1..total not yet built, or `null` when all are done

- [ ] **Step 1: Write the failing test**

Create `test/progress.test.ts`:

```ts
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run test/progress.test.ts`
Expected: FAIL — cannot resolve `../src/scripts/progress`.

- [ ] **Step 3: Write the pure core**

Create `src/scripts/progress.ts`:

```ts
/**
 * Which experiments have actually been built, kept in this browser only.
 *
 * The site has no accounts and no backend, so this is per-device by
 * construction: a phone and a tablet will not agree, and clearing browser
 * data loses it. Everything here is additive to pages that are already
 * complete without it.
 */

export const STORAGE_KEY = 'eks:built';

export function readBuilt(storage: Pick<Storage, 'getItem'>): number[] {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((n): n is number => typeof n === 'number' && Number.isInteger(n))
      .sort((a, b) => a - b);
  } catch {
    // Private mode, blocked storage, or somebody else's key. Start empty.
    return [];
  }
}

export function toggleBuilt(built: number[], n: number): number[] {
  const next = built.includes(n) ? built.filter((x) => x !== n) : [...built, n];
  return next.sort((a, b) => a - b);
}

export function nextUp(built: number[], total: number): number | null {
  for (let n = 1; n <= total; n++) {
    if (!built.includes(n)) return n;
  }
  return null;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run test/progress.test.ts`
Expected: PASS, 12 tests.

- [ ] **Step 5: Add the browser half**

Append to `src/scripts/progress.ts`:

```ts
function write(built: number[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(built));
  } catch {
    // Nothing to do: the tick simply will not persist.
  }
}

/** Decorate the current page. Safe to call on any page; does nothing where there is nothing to do. */
export function hydrate(): void {
  const built = readBuilt(localStorage);

  // Experiment tiles: a tick on the ones already built.
  for (const tile of document.querySelectorAll<HTMLElement>('[data-experiment]')) {
    const n = Number(tile.dataset.experiment);
    if (built.includes(n)) tile.dataset.built = 'true';
  }

  // The experiment page's own control, injected rather than shipped inert.
  const slot = document.querySelector<HTMLElement>('[data-built-slot]');
  if (slot) {
    const n = Number(slot.dataset.builtSlot);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'built-toggle';

    const paint = (list: number[]) => {
      const done = list.includes(n);
      button.textContent = done ? 'Built it' : 'I built this';
      button.setAttribute('aria-pressed', String(done));
    };

    let current = built;
    paint(current);
    button.addEventListener('click', () => {
      current = toggleBuilt(current, n);
      write(current);
      paint(current);
    });
    slot.append(button);
  }

  // The home page's "carry on from" line. Experiment URLs are slugs, not
  // numbers, so the page hands the script the full list of hrefs in order.
  const carry = document.querySelector<HTMLElement>('[data-carry-on]');
  const link = carry?.querySelector('a');
  if (carry && link && built.length > 0) {
    let targets: string[] = [];
    try {
      const parsed: unknown = JSON.parse(carry.dataset.carryOn ?? '[]');
      if (Array.isArray(parsed)) targets = parsed.filter((t): t is string => typeof t === 'string');
    } catch {
      targets = [];
    }

    const next = nextUp(built, targets.length);
    if (next !== null && targets[next - 1]) {
      link.setAttribute('href', targets[next - 1]);
      link.textContent = `Carry on from experiment ${next}`;
      carry.hidden = false;
    }
  }
}
```

- [ ] **Step 6: Add the markup hooks**

In `src/components/ExperimentCard.astro`, add `data-experiment={number}` to the `<a class="tile">`. Add a scoped style so a built tile shows a tick:

```css
  .tile[data-built='true'] .title::after {
    content: ' ✓';
    color: var(--theme);
    font-weight: 800;
  }
```

In `src/pages/experiments/[slug].astro`, add an empty slot just before `<nav class="pager">`:

```astro
<p data-built-slot={number} class="built"></p>
```

Style `.built` with `margin-top: var(--space-l)` and give `.built-toggle` the shared `.button` look at a smaller size, plus a distinct pressed state via `[aria-pressed='true']`.

In `src/pages/index.astro`, add a hidden carry-on line above the "How this works" section. Experiment URLs are slugs rather than numbers, so the page emits the ordered list of hrefs and the script indexes into it.

Add to the frontmatter:

```ts
import { experimentSlug, sortByNumber } from '../lib/experiments';

const carryTargets = sortByNumber(experiments).map((e) =>
  url(`/experiments/${experimentSlug(e.id)}/`),
);
```

And in the markup:

```astro
<p class="carry" data-carry-on={JSON.stringify(carryTargets)} hidden>
  <a href={url('/experiments/')}>Carry on</a>
</p>
```

The `hidden` attribute is the default state, so with JavaScript off the line never appears. The fallback `href` means that even if the script runs but the data is unusable, the link still goes somewhere sensible.

- [ ] **Step 7: Load the script**

In `src/layouts/BaseLayout.astro`, before `</body>`:

```astro
<script>
  import { hydrate } from '../scripts/progress';
  hydrate();
</script>
```

Astro bundles and hashes this automatically. It is a module script, so it is deferred by default.

- [ ] **Step 8: Verify progressive enhancement**

Run: `npm run build && npm run preview -- --port 4399`

| Check | Expect |
|---|---|
| Load an experiment page with JS enabled | "I built this" button appears; clicking toggles it to "Built it" |
| Reload | State persists |
| Visit `/experiments/` | The built one shows a tick |
| Home page | "Carry on from experiment N" appears and links correctly |
| **Disable JavaScript, reload every page type** | No button, no tick, no carry-on line, and **no empty boxes or dangling labels** |
| `curl -s <experiment url> \| grep built-toggle` | No match: the control is not in the HTML |

- [ ] **Step 9: Run everything**

Run: `npm test && npm run build && ./node_modules/.bin/tsc --noEmit`
Expected: all PASS.

- [ ] **Step 10: Commit**

```bash
git add src/scripts src/components/ExperimentCard.astro src/pages src/layouts/BaseLayout.astro test/progress.test.ts
git commit -m "Let a child tick off the experiments they have built"
```

---

### Task 14: Documentation and final check

**Files:**
- Modify: `DESIGN.md`
- Modify: `README.md`
- Modify: `docs/todo.md`

**Interfaces:**
- Consumes: everything
- Produces: nothing

- [ ] **Step 1: Document the concept spine in DESIGN.md**

Add to the Components section, after the board-labels entry: the thread line, the ELI5 expanders, and the ideas section, each in one or two sentences, in the voice of the surrounding entries.

- [ ] **Step 2: Document the content model in README.md**

The README explains how the diagrams work. Add a short section after it explaining the concept spine: concept files, `introduces`/`practises`, and that the thread is derived and test-enforced. Show a small YAML example.

- [ ] **Step 3: Update docs/todo.md**

Add any new known gaps, for example the concept placements that are judgement calls (`resistance` at experiment 11) and the fact that progress is per-device.

- [ ] **Step 4: Full verification**

```bash
npm test
npm run build
./node_modules/.bin/tsc --noEmit
```

Expected: all green, and the build emits **83 pages**.

- [ ] **Step 5: Check the whole site in a browser at two widths**

At 1440px and 390px, visit: home, `/ideas/`, one concept page, `/experiments/`, one chapter, an experiment with a new idea, an experiment without one, `/parts/`, `/build-tips/`. Confirm no horizontal scroll at 390px on any of them.

- [ ] **Step 6: Commit**

```bash
git add DESIGN.md README.md docs/todo.md
git commit -m "Document the concept spine and the explanation layers"
```

---

## Self-review notes

**Spec coverage.** Every spec section maps to a task: content model → 2, 4, 8; concept list → 3, 5; experiment pages → 7, 9; `/ideas/` → 6; parts page → 8; tiles → 13; progress → 13; testing → 4; phases → task order; incidental fix → 1. Task 12 (CI runs tests) is **not** in the spec. It is included because the spec's central claim is that progression coherence becomes a build failure, and that is false while CI skips Vitest. Flagged rather than assumed.

**Content volume.** Tasks 3, 5, 8, 9, 10 and 11 are prose, not code: 13 concepts, 60 tag sets, 20 part explanations and 60 experiment explanations. The tests check structure and coverage. They cannot check whether an analogy is true, which is why the concept files in Task 3 want human review before the 80 pieces that lean on them are written.
