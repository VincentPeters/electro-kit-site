# Easy Elektro Start — companion site

**Date:** 2026-09-20
**Status:** Approved design

## Goal

A static English companion site for the KOSMOS *Easy Elektro Start* kit (item 620547),
covering all 60 experiments from the German printed manual. Deployed to GitHub Pages.

Every illustration is rebuilt from scratch as SVG. Nothing is copied out of the PDF.

## Non-goals

- No interactive circuit simulation.
- No search. 60 entries do not need one; the index page is enough.
- No CMS, no server, no client-side framework.
- Not a scan or a translation of the printed manual — a rebuild.

## Source material and attribution

Source: `docs/620547_EasyElektro_Start_Manual_270521_web_kom.pdf`, 68 pages, German,
© Franckh-Kosmos Verlags-GmbH & Co. KG.

The site is an unofficial companion. Experiment text is rewritten in English in our own
words; all diagrams are redrawn. The footer carries:

> Unofficial companion site for the KOSMOS Easy Elektro Start kit.
> Not affiliated with or endorsed by Franckh-Kosmos Verlags-GmbH & Co. KG.

The PDF stays in `docs/` as the working source and is **not** published to the site.

## Content model

Astro 5 content collections, `src/content.config.ts`, `glob()` loader over YAML,
Zod schemas. A malformed data file fails the build.

### `chapters` collection — `src/content/chapters/*.yaml`

```yaml
order: 1
title: "Voltage, Current and Resistance"
colour: red            # red | green | orange | blue | purple
intro: ["…", "…"]      # chapter opener prose
deepDive:              # the manual's "Nachgehakt" spread
  - heading: "Series and parallel"
    body: ["…"]
```

Five chapters, in manual order:

| slug | title | colour | experiments |
|---|---|---|---|
| `voltage-current-resistance` | Voltage, Current and Resistance | red | 1–8 |
| `series-parallel-mixed` | Series, Parallel and Mixed Circuits | green | 9–29 |
| `switching` | Switching | orange | 30–41 |
| `magnetism` | Magnetism | blue | 42–52 |
| `relay` | The Relay | purple | 53–60 |

### `experiments` collection — `src/content/experiments/NN-slug.yaml`

```yaml
number: 17
title: "Voltage Across a Lamp"
chapter: series-parallel-mixed
steps:                       # the manual's "So geht's"
  - "Before you switch on, set the meter switch to V."
whatHappens:                 # the manual's "Was passiert?"
  - "First you measure the voltage across one lamp — about 1 volt."
note: "…"                    # optional: tip / warning callout
boards:                      # 1-3 build plans, numbered as in the manual
  - caption: "Build plan 1"
    parts:
      - { type: meter,   from: C4, to: C6, level: 1 }
      - { type: lamp,    from: D4, to: D5, level: 2 }
      - { type: link5,   from: C6, to: C10, level: 2 }
      - { type: switch,  from: F2, to: F4, level: 1 }
```

Schema rules enforced by Zod:

- `number` — integer 1–60, unique across the collection.
- `chapter` — `reference('chapters')`.
- Placement — every part carries either `from` **and** `to` (a span), or `at` (a single
  cell, for parts that occupy one hole). Never both. Cell references match
  `/^[A-G](10|[1-9])$/`; the board is columns 1–10, rows A–G.
- `level` — integer 1–3, defaulting to 1.
- `type` — a key in the symbol registry (below).
- `boards` — at least one, at most three.

The battery holder is part of the board itself (a fixed panel at the lower left,
rows D–F, columns 1–2), so it is drawn by the `Board` component, not listed in `parts`.

## Board renderer and symbol library

The keystone of the design. One component plus one symbol registry serves both the
parts-list page and all 60+ board diagrams, so restyling happens in one place.

```
src/components/Board.astro       grid, hex holes, row/column labels, battery panel
src/components/Part.astro        dispatches on type, draws level badge
src/parts/registry.ts            type -> { label, kitNumber, span, colour }
src/parts/symbols/*.ts           one SVG-fragment function per part type
```

`Board.astro` maps a cell reference (`C4`) to SVG coordinates and renders each part into
that coordinate space, sorted by `level` so higher levels paint on top. Output is a
single inline `<svg>` with a `viewBox` — it scales to any width, prints, and needs no JS.

### Symbol registry (kit parts)

Conductor links, drawn blue, spanning their own length:
`link1` `link2` `link3` `link4` `link5` `link6` `link7`

Switches, drawn green: `button` (momentary), `switch` (on/off), `changeover`,
`reedSwitch` (magnetic).

Electrical components, drawn red: `lamp` (3.2 V / 0.2 A), `motor`, `coil`
(electromagnet), `buzzer`, `relay`.

Instrument, drawn black: `meter` (3 V / 1 A, V/A selector).

Loose pieces, shown on the parts page only: `propeller`, `ironCore`, `magnet`, `compass`,
`batteryHolder`.

Colour and shape follow the manual's own visual logic — blue conducts, red consumes,
green switches, black measures — because that logic is what makes the diagrams readable,
and the child is matching them against a physical kit.

## Site structure

| Route | Content |
|---|---|
| `/` | What the kit is, the five chapters as cards, safety notes, how to use the site |
| `/parts/` | Every kit part: symbol, name, count, what it does |
| `/build-tips/` | The grid, the three stacking levels, level badges, bridging, `+` orientation |
| `/chapters/[slug]/` | Chapter intro, its experiments as cards, the deep-dive section |
| `/experiments/` | Flat index of all 60, grouped by chapter |
| `/experiments/[slug]/` | One experiment: steps, board diagram(s), what happens, prev/next |

`prev`/`next` chain all 60 in manual order and cross chapter boundaries, so the site can
be read straight through like the book.

## Visual design

- Astro 5, **zero client-side JavaScript**. No UI framework.
- Plain CSS with custom properties. Chapter colour is set per page as a CSS variable, so
  one rule set themes all five chapters.
- Bright and high-contrast, aimed at an 8–12 year old reader, without imitating the
  manual's scrapbook collage (torn paper, pushpins, photos) — that is the publisher's
  look, and we are building our own.
- Mobile first. The board diagram is the widest element; it scales with its viewBox and
  is never horizontally scrolled.
- Voice: second person, direct, short sentences. "Switch on. All three lamps light up."

## Build, test, deploy

```
astro.config.mjs   site: 'https://vincentpeters.github.io', base: '/electro-kit-site'
.github/workflows/deploy.yml   withastro/action@v6 + actions/deploy-pages@v5 on push to main
```

GitHub Pages source must be set to **GitHub Actions** in repository settings — a manual
step, noted in the README.

Because `base` is set, every internal link goes through a helper rather than a bare
string, so the base path cannot be forgotten in one place and break only in production.

Verification, in order of cost:

1. Zod schemas — malformed content fails `astro build`.
2. `npm test` (Vitest) over the content data:
   - all 60 experiment numbers present, unique, 1–60;
   - every `chapter` reference resolves;
   - every `parts[].type` exists in the registry;
   - every cell reference is within A–G × 1–10;
   - every experiment has at least one board and non-empty `steps` and `whatHappens`.
3. `astro build` succeeds and emits 60 experiment pages.
4. Visual check of rendered pages in a browser.

## Sequencing

**Phase 1 — shell.** Astro scaffold, config, layout, CSS tokens, symbol registry,
`Board` component, `/parts/`, `/build-tips/`, deploy workflow. Output: a deployable site
with correct diagrams and no experiments.

**Phase 2 — first chapter.** Chapter 1 (experiments 1–8) transcribed end to end, plus the
chapter and experiment page templates and the prev/next chain. Output: the full pattern,
reviewable and correctable before it is repeated 52 more times.

**Phase 3 — remaining chapters.** Chapters 2–5, experiments 9–60, one chapter per unit of
work. This is the long tail: transcription and translation from the German pages.

**Phase 4 — finish.** Home page, experiments index, README, accessibility and print pass,
first deploy.

Phase 2 exists specifically so the expensive, repetitive work in phase 3 starts from an
approved template rather than an assumed one.

## Fidelity

Diagrams are **topologically faithful, not pixel-faithful**: the correct parts, the
correct series/parallel structure, the correct switch positions and levels, laid out on
the grid for clarity rather than copying the manual's exact hole coordinates. This is a
rebuild, not a reproduction, and a reader holding the physical kit can still follow it.
