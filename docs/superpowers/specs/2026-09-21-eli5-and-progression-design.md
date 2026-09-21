# ELI5 explanations and a guided progression

Design agreed 2026-09-21. Status: approved, not yet implemented.

## The problem

The site explains every experiment, but only at one reading level and only one
experiment at a time.

**One reading level.** `whatHappens` is transcribed from the manual and pitched
at an adult reading aloud. "One connection of each bulb goes to the plus
terminal of the battery" is accurate and is not what an eight-year-old on their
own can use. There is no simpler register anywhere on the site, and no
explanation at all of what a component *is* beyond the one-line description on
the parts page.

**One experiment at a time.** The 60 experiments are a flat list in manual
order. Nothing tells a child that experiment 22 is the same circuit as 21 with
a meter in it, or that the idea of a parallel path first appeared in 21 and
will matter again in 28. The book's own progression is real but invisible.

## What we are building

Three things, from one small piece of new structure.

1. A **concept spine**: a dozen or so big ideas, each explained once in plain
   language, with every experiment tagged as introducing or practising them.
2. An **ELI5 register** available on demand at three levels — the idea, the
   component, the experiment.
3. **Progress tracking** so a child can mark what they have built and pick up
   where they left off.

The thread that links the experiments is *derived from the tags*, never
hand-written per experiment. That is the central decision: it turns "the
progression is coherent" from an opinion into something the build checks.

## Content model

### New collection: concepts

`src/content/concepts/*.yaml`, loaded by `src/content.config.ts` alongside
chapters and experiments. The filename is the id.

```yaml
name: "Parallel circuits"
order: 9
oneLiner: "Two paths side by side, each getting the full push."
eli5:
  - "Think of a corridor that splits into two doorways..."
```

| Field | Type | Notes |
|---|---|---|
| `name` | string | Display name |
| `order` | int | Teaching order, 1-n, unique |
| `oneLiner` | string | One sentence, used in thread chips and on the ideas index |
| `eli5` | string[] | The plain-language explanation. Min 1 paragraph |

### Experiments gain three fields

```yaml
introduces: ["parallel"]
practises: ["current", "voltage"]
eli5:
  - "Both bulbs get the full push, because each one has its own way home."
```

`introduces` and `practises` default to `[]`. `eli5` is optional: the expander
renders only where the text exists, so the 60 pieces of writing can land a
chapter at a time rather than in one drop.

### Parts gain one field

`eli5: string` on each entry in `src/parts/registry.ts`. The registry is
already the single source of truth for the 20 components, read by the board
renderer, the schema validator and the parts page. A part's plain-language
explanation belongs with its label and its count, not in a parallel file that
can drift out of sync.

### Provisional concept list

Thirteen, with the experiment that introduces each. Grounded in where the
relevant part or idea first actually appears on a board. Settled in phase 1;
the tests below enforce whatever it settles to.

| Concept | Introduced by |
|---|---|
| `circuit` | 1 Going Round in Circles |
| `switching` | 2 A Torch |
| `voltage` | 5 Showing the Invisible |
| `current` | 7 Hidden Current |
| `conductor` | 8 Can a Paper Clip Carry Electricity? |
| `series` | 9 Two in a Row |
| `resistance` | 11 Swapping Partners: Bulb and Coil |
| `shortCircuit` | 18 A Bridge over the Bulb |
| `parallel` | 21 Independent in Parallel |
| `magnetism` | 42 Simply Attractive: the Magnet |
| `electromagnet` | 46 Current Attracts Too |
| `induction` | 48 Current Out of the Coil |
| `relay` | 53 A Switch Switches an Electrical Switch |

The reed switch (50-52) is deliberately not its own concept. It is
`practises: [magnetism, switching]` — which is exactly the point the chapter is
making.

## Pages

### Experiment pages

Two additions.

**A thread line**, directly under the chapter band, above the build sheet:

> **New idea** · Parallel circuits    **Builds on** · Switching (2) · Current (7)

One line of chips, not a panel. Design principle 2 in `PRODUCT.md` puts the
diagram and the steps first for a child at the table; a "what you will learn"
block above the build sheet would push the circuit below the fold on a phone.
Each chip links to its `/ideas/` page. Experiments that introduce nothing show
only the "builds on" half.

**An ELI5 expander**, under "What happens?":

```html
<details>
  <summary>Say that in simpler words</summary>
  ...
</details>
```

Native `<details>`, no JavaScript, prints, and leaves the manual-derived text
as the page's default explanation.

### New section: /ideas/

The home of the ELI5 layer and the only place the thread is visible as a whole.

- `/ideas/` — the concepts in teaching order, each with its `oneLiner`.
- `/ideas/<id>/` — the full `eli5`, then **where you meet it**: the experiment
  that introduces it, then every experiment that practises it, in order.

Both pages are entirely derived from the tags. They cost no authoring beyond
the concept files themselves. `/ideas/` becomes the fifth main nav item.

### Parts page

A `<details>` per component — "What it really does" — carrying the part `eli5`.

### Chapter and index pages

Tiles whose experiment introduces a concept get a marker, so scanning the list
shows where the step changes are.

## Progress tracking

One ES module, no framework, loaded on the pages that need it.

- `localStorage` key holds the list of experiment numbers built.
- The "I built this" control is **injected by the script**, not shipped in the
  HTML. With JavaScript off there is no control rather than a dead one.
- Index and chapter tiles get a `data-done` attribute from the script; CSS
  draws the tick. Tiles are correct and complete without it.
- The home page gains "carry on from experiment 31" when there is progress.

Nothing leaves the device. This is the site's first client-side JavaScript, and
it stays the only piece.

Known and accepted: progress is per-device and per-browser. A phone and a
tablet will not agree, and clearing browser data loses it. That is the correct
trade for a site with no accounts and no backend.

## Testing

The concept spine exists to be checkable. New tests in
`test/progression.test.ts`, run over all 60 experiment files the way
`test/annotate.test.ts` already runs the label solver over every board:

1. Every id in `introduces`/`practises` exists in the concepts collection.
2. Every concept is introduced exactly once across the 60.
3. **No concept is practised in an experiment numbered below the one that
   introduces it.** This is the real check: it makes an incoherent progression
   a build failure.
4. Concept `order` agrees with the experiment numbers that introduce them.
5. Every concept `order` is unique and contiguous from 1.
6. ELI5 coverage is reported; the assertion is raised to 60/60 as phase 4 lands.

**Deliberately not tested: readability.** Word-length and sentence-length
heuristics pass confidently-wrong text and fail good text. The failure mode
here is "simple and wrong" — a child who learns "voltage is how fast
electricity goes" has been taught something they must later unlearn — and no
linter catches that. Concept ELI5s get human review; the other 80 pieces lean
on them.

## Phases

Each ships standalone and leaves the site correct.

1. **Spine.** Schema, concepts collection, 13 concept files, `/ideas/` pages,
   tests 1-5. Nothing on the experiment pages changes yet.
2. **Thread.** Tag all 60 experiments, render the thread line, markers on
   tiles. Test 3 becomes meaningful here.
3. **Parts.** 20 part ELI5s and the parts-page expanders.
4. **Experiments.** 60 experiment ELI5s, a chapter at a time. Coverage
   assertion raised as each chapter lands.
5. **Progress.** The script, the injected control, the ticks.

## Out of scope

Named so nobody wonders whether they were forgotten. All were discussed and
cut.

- **Chapter checkpoints** (end-of-chapter recap and questions).
- **A curated "start here" shortcut route** through ~12 key experiments.
- **Auto-traced circuit explanations** generated from board data.
- **Per-experiment hand-written thread sentences.** The derived thread is the
  design; overrides would let it contradict itself.
- **Syncing progress across devices.** Needs accounts and a backend.

## Incidental fix

`src/board/annotate.ts` carries a duplicated comment block above `RING_STEPS`:
a stale copy left behind when the penalty weights were retuned, which shipped
in a28adfe. Delete the first of the two.
