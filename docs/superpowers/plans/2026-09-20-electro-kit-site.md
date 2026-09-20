# Easy Elektro Start Companion Site — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A static English companion site for the KOSMOS *Easy Elektro Start* electronics kit, covering all 60 experiments, deployed to GitHub Pages, with every illustration rebuilt as our own data-driven SVG.

**Architecture:** Astro 5 static site, zero client-side JavaScript. Experiment content lives in YAML content collections validated by Zod. Board diagrams are not images — each experiment declares a list of placed parts (`{ type, from, to, level }`) against a 10×7 grid, and one `Board.astro` component renders them through a shared SVG symbol registry. That same registry draws the parts-list page, so the site has one visual vocabulary defined in one place.

**Tech Stack:** Astro 5, TypeScript, Zod (via `astro/zod`), Vitest, plain CSS with custom properties, GitHub Actions + GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-20-electro-kit-site-design.md`

## Global Constraints

- **Astro 5**, static output. No SSR adapter.
- **Zero client-side JavaScript.** No UI framework, no hydration directives. If a task seems to need client JS, stop and ask.
- **Base path is set**: `base: '/electro-kit-site'`. Every internal link MUST go through the `url()` helper from `src/lib/url.ts`. A bare `href="/parts/"` is a bug — it works in dev and 404s in production.
- **Nothing is copied out of the PDF.** No extracted images, no traced screenshots. All artwork is SVG we author.
- **Source PDF is gitignored** (`docs/*.pdf`). It is the publisher's copyrighted manual. Never commit it, never publish it, never copy it into `public/`.
- **Board grid is columns 1–10, rows A–G.** Cell references match `/^[A-G](10|[1-9])$/`.
- **Levels are 1–3.** Level 1 sits on the baseplate; 2 and 3 stack on top.
- **Voice:** English, second person, short sentences, aimed at an 8–12 year old. "Switch on. All three lamps light up." Never "the user" or "one should".
- **Part colour logic:** blue conducts, red consumes, green switches, black measures. Do not invent new colour meanings.
- **Node 24**, npm.
- **Attribution footer** on every page: "Unofficial companion site for the KOSMOS Easy Elektro Start kit. Not affiliated with or endorsed by Franckh-Kosmos Verlags-GmbH & Co. KG."

## Reading the source manual

Several tasks transcribe experiments from the PDF. The PDF has no text layer — it is 68 pages of artwork, so you must **render pages to PNG and read them visually**.

**Page offset: PDF page = printed manual page + 2.**

Render a page range with:

```bash
python -c "
import pymupdf
d = pymupdf.open('docs/620547_EasyElektro_Start_Manual_270521_web_kom.pdf')
for n in range(11, 19):            # PDF page numbers, 1-based, inclusive start
    d[n-1].get_pixmap(dpi=190).save('/tmp/page-%02d.png' % n)
"
```

`pymupdf` and `pillow` are already installed. Render at dpi=190 — lower and the German body text is unreadable.

Page map:

| PDF pages | Content |
|---|---|
| 4–7 | Parts list (Ausstattung) |
| 8–9 | Build tips (grid, levels, `+` orientation) |
| 10 | Chapter 1 opener |
| 11–18 | Experiments 1–8 |
| 19 | Chapter 1 deep dive (Nachgehakt) |
| 20 | Chapter 2 opener |
| 21–34 | Experiments 9–29 |
| 35 | Chapter 2 deep dive |
| 36 | Chapter 3 opener |
| 37–45 | Experiments 30–41 |
| 46–47 | Chapter 3 deep dive |
| 48 | Chapter 4 opener |
| 49–56 | Experiments 42–52 |
| 57 | Chapter 4 deep dive |
| 58 | Chapter 5 opener |
| 59–65 | Experiments 53–60 |
| 66 | Chapter 5 deep dive |

On each experiment page: red badge `VERSUCH N` = experiment number, the heading = title, **SO GEHT'S** = `steps`, **WAS PASSIERT?** = `whatHappens`, and one to three board diagrams numbered with black circled digits = `boards`.

## File structure

```
astro.config.mjs                      site + base + build config
package.json / tsconfig.json
vitest.config.ts
.github/workflows/deploy.yml          build + deploy to Pages
README.md                             setup, the manual Pages settings step

src/lib/url.ts                        base-path-safe link helper        [Task 2]
src/board/geometry.ts                 cell refs -> SVG coordinates      [Task 3]
src/board/describe.ts                 board -> screen-reader text       [Task 6]
src/parts/registry.ts                 part type -> metadata             [Task 4]
src/parts/symbols.ts                  part type -> SVG markup           [Tasks 5a/5b]

src/content/schema.ts                 plain Zod schemas (test-importable)  [Task 7]
src/content.config.ts                 Astro collection definitions      [Task 7]
src/content/chapters/*.yaml           5 chapter files                   [Tasks 11-15]
src/content/experiments/NN-slug.yaml  60 experiment files               [Tasks 11-15]

src/components/Board.astro            grid + battery panel + parts      [Task 6]
src/components/Part.astro             one placed part + level badge     [Task 6]
src/components/ChapterCard.astro                                        [Task 16]
src/components/ExperimentCard.astro                                     [Task 11]
src/layouts/BaseLayout.astro          shell, header, footer, theming    [Task 8]
src/styles/tokens.css                 colours, type scale, spacing      [Task 8]
src/styles/global.css                                                   [Task 8]

src/pages/index.astro                                                   [Task 16]
src/pages/parts.astro                                                   [Task 9]
src/pages/build-tips.astro                                              [Task 10]
src/pages/chapters/[slug].astro                                         [Task 11]
src/pages/experiments/index.astro                                       [Task 16]
src/pages/experiments/[slug].astro                                      [Task 11]

test/url.test.ts          test/geometry.test.ts     test/registry.test.ts
test/symbols.test.ts      test/describe.test.ts     test/content.test.ts
```

Each module has one job and is independently testable. The `.astro` components are not unit-tested — the logic they would need tests for lives in the pure modules they import, which is why `describe.ts` and `symbols.ts` are separate files rather than inline template code.

---

### Task 1: Project scaffold, config, and deploy pipeline

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`
- Create: `.github/workflows/deploy.yml`, `README.md`
- Create: `src/pages/index.astro` (temporary placeholder, replaced in Task 16)

**Interfaces:**
- Consumes: nothing.
- Produces: a buildable Astro project. `npm run build` emits `dist/`. `npm test` runs Vitest.

- [ ] **Step 1: Create the Astro project**

Run in the repository root (the directory already contains `docs/` and `.git` — do not use a subdirectory):

```bash
npm create astro@latest -- --template minimal --no-install --no-git --typescript strict --yes .
```

If the CLI refuses because the directory is not empty, create the files by hand from the steps below instead.

- [ ] **Step 2: Install dependencies**

```bash
npm install
npm install -D vitest yaml
```

- [ ] **Step 3: Write `astro.config.mjs`**

```js
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://vincentpeters.github.io',
  base: '/electro-kit-site',
  trailingSlash: 'always',
  build: { format: 'directory' },
});
```

- [ ] **Step 4: Write `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 5: Add the test script to `package.json`**

In the `scripts` block, alongside the existing `dev` / `build` / `preview` entries:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 6: Write the placeholder home page**

`src/pages/index.astro`:

```astro
---
---
<html lang="en">
  <head><meta charset="utf-8" /><title>Easy Elektro Start</title></head>
  <body><h1>Easy Elektro Start</h1></body>
</html>
```

- [ ] **Step 7: Write `.github/workflows/deploy.yml`**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v7
      - name: Build
        uses: withastro/action@v6

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v5
```

- [ ] **Step 8: Write `README.md`**

```markdown
# Easy Elektro Start — companion site

An unofficial English companion site for the KOSMOS *Easy Elektro Start*
electronics kit (item 620547). All 60 experiments, with every diagram rebuilt
as our own SVG.

Not affiliated with or endorsed by Franckh-Kosmos Verlags-GmbH & Co. KG.

## Develop

```bash
npm install
npm run dev      # http://localhost:4321/electro-kit-site/
npm test         # content and rendering unit tests
npm run build    # static output in dist/
```

## Deploy

Pushing to `main` builds and deploys via GitHub Actions.

**One-time manual step:** in the repository's **Settings → Pages**, set
**Source** to **GitHub Actions**. Deployment fails until this is done.

## The source manual

`docs/*.pdf` is the publisher's copyrighted manual. It is gitignored on
purpose — it is a local working reference and must not be committed or
published.
```

- [ ] **Step 9: Verify the build works**

Run: `npm run build`
Expected: succeeds, and `dist/index.html` exists.

Run: `npm test`
Expected: Vitest reports "No test files found" and exits 0. (If it exits non-zero, add `passWithNoTests: true` to `vitest.config.ts` under `test`.)

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "Scaffold Astro project with GitHub Pages deploy workflow"
```

---

### Task 2: Base-path-safe link helper

Every internal link on this site must survive the `/electro-kit-site` base path. This helper is tiny and unglamorous, and it is the single most likely source of a "works locally, 404s in production" bug — which is exactly why it gets its own tested module.

**Files:**
- Create: `src/lib/url.ts`
- Test: `test/url.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `joinPath(base: string, path: string): string` and `url(path: string): string`. Every later task uses `url()` for `href` and `src` attributes.

- [ ] **Step 1: Write the failing test**

`test/url.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { joinPath } from '../src/lib/url';

describe('joinPath', () => {
  it('joins a base path and a route with a trailing slash', () => {
    expect(joinPath('/electro-kit-site/', '/parts')).toBe('/electro-kit-site/parts/');
  });

  it('accepts a base without a trailing slash', () => {
    expect(joinPath('/electro-kit-site', 'parts')).toBe('/electro-kit-site/parts/');
  });

  it('returns the base itself for the site root', () => {
    expect(joinPath('/electro-kit-site/', '/')).toBe('/electro-kit-site/');
    expect(joinPath('/electro-kit-site/', '')).toBe('/electro-kit-site/');
  });

  it('handles a root base path', () => {
    expect(joinPath('/', '/parts/')).toBe('/parts/');
    expect(joinPath('/', '/')).toBe('/');
  });

  it('does not duplicate a trailing slash already on the path', () => {
    expect(joinPath('/electro-kit-site/', '/experiments/morse/')).toBe(
      '/electro-kit-site/experiments/morse/',
    );
  });

  it('keeps nested routes intact', () => {
    expect(joinPath('/electro-kit-site/', 'chapters/magnetism')).toBe(
      '/electro-kit-site/chapters/magnetism/',
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run test/url.test.ts`
Expected: FAIL — cannot resolve `../src/lib/url`.

- [ ] **Step 3: Write the implementation**

`src/lib/url.ts`:

```ts
/**
 * Join a site base path and an internal route, always producing a
 * trailing slash. The site is served from a sub-path on GitHub Pages,
 * so no internal link may be written as a bare absolute path.
 */
export function joinPath(base: string, path: string): string {
  const trimmedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const trimmedPath = path.replace(/^\/+/, '').replace(/\/+$/, '');
  if (trimmedPath === '') return `${trimmedBase}/`;
  return `${trimmedBase}/${trimmedPath}/`;
}

/** Resolve an internal route against the configured base path. */
export function url(path: string): string {
  return joinPath(import.meta.env.BASE_URL, path);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run test/url.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/url.ts test/url.test.ts
git commit -m "Add base-path-safe internal link helper"
```

---

### Task 3: Board geometry

**Files:**
- Create: `src/board/geometry.ts`
- Test: `test/geometry.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - constants `COLS = 10`, `ROWS = ['A'..'G']`, `PITCH_X`, `PITCH_Y`, `GUTTER_X`, `GUTTER_Y`, `BOARD_WIDTH`, `BOARD_HEIGHT`, `BATTERY_PANEL`
  - `isCell(ref: string): boolean`
  - `parseCell(ref: string): { row: number; col: number }` (0-based, throws on invalid)
  - `cellCenter(ref: string): { x: number; y: number }`
  - `spanOf(from: string, to: string): { x: number; y: number; length: number; angle: number }`

`spanOf` returns the start point, the pixel length, and the rotation in degrees, so a symbol can be drawn horizontally from the origin and then placed with one `transform`.

- [ ] **Step 1: Write the failing test**

`test/geometry.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  GUTTER_X,
  GUTTER_Y,
  PITCH_X,
  PITCH_Y,
  cellCenter,
  isCell,
  parseCell,
  spanOf,
} from '../src/board/geometry';

describe('isCell', () => {
  it('accepts every valid reference shape', () => {
    expect(isCell('A1')).toBe(true);
    expect(isCell('G10')).toBe(true);
    expect(isCell('D5')).toBe(true);
  });

  it('rejects rows and columns outside the board', () => {
    expect(isCell('H1')).toBe(false);
    expect(isCell('A0')).toBe(false);
    expect(isCell('A11')).toBe(false);
    expect(isCell('a1')).toBe(false);
    expect(isCell('')).toBe(false);
    expect(isCell('A')).toBe(false);
  });
});

describe('parseCell', () => {
  it('converts a reference to zero-based row and column', () => {
    expect(parseCell('A1')).toEqual({ row: 0, col: 0 });
    expect(parseCell('C4')).toEqual({ row: 2, col: 3 });
    expect(parseCell('G10')).toEqual({ row: 6, col: 9 });
  });

  it('throws on an invalid reference', () => {
    expect(() => parseCell('H1')).toThrow(/Invalid cell reference: H1/);
  });
});

describe('cellCenter', () => {
  it('places A1 half a pitch inside the gutters', () => {
    expect(cellCenter('A1')).toEqual({
      x: GUTTER_X + PITCH_X / 2,
      y: GUTTER_Y + PITCH_Y / 2,
    });
  });

  it('advances by one pitch per column and row', () => {
    const a = cellCenter('A1');
    const b = cellCenter('B2');
    expect(b.x - a.x).toBe(PITCH_X);
    expect(b.y - a.y).toBe(PITCH_Y);
  });

  it('keeps the last cell inside the board', () => {
    const last = cellCenter('G10');
    expect(last.x).toBeLessThan(BOARD_WIDTH);
    expect(last.y).toBeLessThan(BOARD_HEIGHT);
  });
});

describe('spanOf', () => {
  it('measures a horizontal run in whole pitches', () => {
    const span = spanOf('B2', 'B5');
    expect(span.length).toBe(3 * PITCH_X);
    expect(span.angle).toBe(0);
    expect(span).toMatchObject(cellCenter('B2'));
  });

  it('measures a vertical run and reports a right angle', () => {
    const span = spanOf('B2', 'D2');
    expect(span.length).toBe(2 * PITCH_Y);
    expect(span.angle).toBe(90);
  });

  it('reports a negative angle running up the board', () => {
    expect(spanOf('D2', 'B2').angle).toBe(-90);
  });

  it('gives a single cell zero length', () => {
    expect(spanOf('C4', 'C4').length).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run test/geometry.test.ts`
Expected: FAIL — cannot resolve `../src/board/geometry`.

- [ ] **Step 3: Write the implementation**

`src/board/geometry.ts`:

```ts
/**
 * The kit's baseplate is a grid of hexagonal holes: ten columns numbered
 * 1-10 and seven rows lettered A-G. Everything in a board diagram is
 * positioned by cell reference, never by raw coordinates.
 */
export const ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;
export type Row = (typeof ROWS)[number];
export const COLS = 10;

/** SVG user units between hole centres. */
export const PITCH_X = 64;
export const PITCH_Y = 56;

/** Room reserved for the row letters and column numbers. */
export const GUTTER_X = 44;
export const GUTTER_Y = 40;

/** Breathing room on the right and bottom edges. */
const PAD = 20;

export const BOARD_WIDTH = GUTTER_X + COLS * PITCH_X + PAD;
export const BOARD_HEIGHT = GUTTER_Y + ROWS.length * PITCH_Y + PAD;

/**
 * The battery holder is moulded into the baseplate at the lower left,
 * covering rows D-F in columns 1-2. It is drawn by the board itself and
 * is never listed among an experiment's parts.
 */
export const BATTERY_PANEL = { fromCell: 'D1', toCell: 'F2' } as const;

export interface Cell {
  row: number;
  col: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Span extends Point {
  length: number;
  angle: number;
}

const CELL_PATTERN = /^([A-G])(10|[1-9])$/;

export function isCell(ref: string): boolean {
  return CELL_PATTERN.test(ref);
}

export function parseCell(ref: string): Cell {
  const match = CELL_PATTERN.exec(ref);
  if (!match) throw new Error(`Invalid cell reference: ${ref}`);
  return {
    row: ROWS.indexOf(match[1] as Row),
    col: Number(match[2]) - 1,
  };
}

export function cellCenter(ref: string): Point {
  const { row, col } = parseCell(ref);
  return {
    x: GUTTER_X + col * PITCH_X + PITCH_X / 2,
    y: GUTTER_Y + row * PITCH_Y + PITCH_Y / 2,
  };
}

/**
 * Describe the run between two cells as an origin, a length and a
 * rotation, so a symbol can be drawn along the x axis and placed with a
 * single transform.
 */
export function spanOf(from: string, to: string): Span {
  const start = cellCenter(from);
  const end = cellCenter(to);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  return {
    x: start.x,
    y: start.y,
    length: Math.hypot(dx, dy),
    angle: dx === 0 && dy === 0 ? 0 : (Math.atan2(dy, dx) * 180) / Math.PI,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run test/geometry.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add src/board/geometry.ts test/geometry.test.ts
git commit -m "Add board grid geometry"
```

---

### Task 4: Part registry

**Files:**
- Create: `src/parts/registry.ts`
- Test: `test/registry.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `PARTS` — the record of every kit part keyed by type
  - `type PartType = keyof typeof PARTS`
  - `isPartType(value: string): value is PartType`
  - `partDef(type: PartType): PartDef`
  - `BOARD_PARTS` / `LOOSE_PARTS` — filtered lists for the parts page
  - `type PartFamily = 'conductor' | 'load' | 'switch' | 'instrument' | 'loose'`

`cells` is how many holes the part spans (1 means it sits in a single hole). Task 7's schema uses `isPartType` to reject typos in content files; Task 9's parts page renders straight from `PARTS`, so the list can never drift from the symbols.

- [ ] **Step 1: Write the failing test**

`test/registry.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  BOARD_PARTS,
  LOOSE_PARTS,
  PARTS,
  isPartType,
  partDef,
} from '../src/parts/registry';

describe('isPartType', () => {
  it('accepts a known part', () => {
    expect(isPartType('lamp')).toBe(true);
    expect(isPartType('link5')).toBe(true);
  });

  it('rejects an unknown part', () => {
    expect(isPartType('lightbulb')).toBe(false);
    expect(isPartType('link8')).toBe(false);
    expect(isPartType('')).toBe(false);
  });
});

describe('PARTS', () => {
  it('defines the seven conductor links with matching spans', () => {
    for (let n = 1; n <= 7; n += 1) {
      const def = partDef(`link${n}` as never);
      expect(def.family).toBe('conductor');
      expect(def.cells).toBe(n);
    }
  });

  it('gives every part a label and a description', () => {
    for (const [type, def] of Object.entries(PARTS)) {
      expect(def.label, `${type} label`).toMatch(/\S/);
      expect(def.description, `${type} description`).toMatch(/\S/);
      expect(def.cells, `${type} cells`).toBeGreaterThanOrEqual(1);
    }
  });

  it('separates parts that go on the board from loose pieces', () => {
    expect(BOARD_PARTS.map((p) => p.type)).toContain('lamp');
    expect(BOARD_PARTS.map((p) => p.type)).not.toContain('compass');
    expect(LOOSE_PARTS.map((p) => p.type)).toContain('compass');
    expect(BOARD_PARTS.length + LOOSE_PARTS.length).toBe(Object.keys(PARTS).length);
  });

  it('marks only loose pieces with the loose family', () => {
    for (const entry of LOOSE_PARTS) {
      expect(entry.family).toBe('loose');
    }
  });
});

describe('partDef', () => {
  it('throws on an unknown part rather than returning undefined', () => {
    expect(() => partDef('nonsense' as never)).toThrow(/Unknown part type: nonsense/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run test/registry.test.ts`
Expected: FAIL — cannot resolve `../src/parts/registry`.

- [ ] **Step 3: Write the implementation**

`src/parts/registry.ts`:

```ts
/**
 * Every part in the kit, in one place. The board renderer, the schema
 * validator and the parts page all read from here, so a part can never
 * be drawable but unlisted, or listed but undrawable.
 */
export type PartFamily = 'conductor' | 'load' | 'switch' | 'instrument' | 'loose';

export interface PartDef {
  /** Name as it appears on the parts page. */
  label: string;
  /** How many holes the part spans. */
  cells: number;
  family: PartFamily;
  /** How many come in the box. */
  count: number;
  /** One sentence, written for a child. */
  description: string;
}

const define = <T extends Record<string, PartDef>>(parts: T) => parts;

export const PARTS = define({
  link1: { label: 'Connector strip 1', cells: 1, family: 'conductor', count: 6, description: 'The shortest strip. It fills a single hole and joins parts that sit on different levels.' },
  link2: { label: 'Connector strip 2', cells: 2, family: 'conductor', count: 7, description: 'Carries current between two neighbouring holes.' },
  link3: { label: 'Connector strip 3', cells: 3, family: 'conductor', count: 4, description: 'A three-hole strip for slightly longer hops.' },
  link4: { label: 'Connector strip 4', cells: 4, family: 'conductor', count: 2, description: 'A four-hole strip.' },
  link5: { label: 'Connector strip 5', cells: 5, family: 'conductor', count: 2, description: 'A five-hole strip.' },
  link6: { label: 'Connector strip 6', cells: 6, family: 'conductor', count: 2, description: 'A six-hole strip for crossing most of the board.' },
  link7: { label: 'Connector strip 7', cells: 7, family: 'conductor', count: 1, description: 'The longest strip. It reaches right across the baseplate.' },

  button: { label: 'Push button', cells: 3, family: 'switch', count: 1, description: 'Closes the circuit only while you hold it down, like a doorbell.' },
  switch: { label: 'On/off switch', cells: 3, family: 'switch', count: 1, description: 'Stays where you put it. Push it to ON and the circuit stays closed.' },
  changeover: { label: 'Changeover switch', cells: 3, family: 'switch', count: 2, description: 'Has three contacts. It sends the current down one path or the other, never both.' },
  reedSwitch: { label: 'Magnetic switch', cells: 3, family: 'switch', count: 1, description: 'Two contacts sealed in glass. Hold a magnet close and they snap together without being touched.' },

  lamp: { label: 'Bulb 3.2 V / 0.2 A', cells: 2, family: 'load', count: 3, description: 'Lights up when current flows through it. The brighter it glows, the more current is flowing.' },
  motor: { label: 'Electric motor', cells: 3, family: 'load', count: 1, description: 'Spins when current flows. Swap its two connections and it spins the other way.' },
  coil: { label: 'Coil / electromagnet', cells: 3, family: 'load', count: 1, description: 'A long wire wound into a spiral. Current through it makes a magnetic field.' },
  buzzer: { label: 'Buzzer', cells: 3, family: 'load', count: 1, description: 'Makes a tone when current flows. Watch the plus sign when you fit it.' },
  relay: { label: 'Relay', cells: 4, family: 'load', count: 1, description: 'A switch worked by an electromagnet, so one circuit can switch another.' },

  meter: { label: 'Meter 3 V / 1 A', cells: 3, family: 'instrument', count: 1, description: 'Measures voltage or current. Set the switch to V for volts or A for amps before you switch on.' },

  propeller: { label: 'Propeller', cells: 1, family: 'loose', count: 1, description: 'Pushes onto the motor shaft to make a fan. Never let it near faces or animals.' },
  ironCore: { label: 'Iron core', cells: 1, family: 'loose', count: 1, description: 'Slides inside the coil and makes its magnetic field much stronger.' },
  magnet: { label: 'Bar magnet', cells: 1, family: 'loose', count: 1, description: 'Has a north and a south pole. Used for the magnet experiments.' },
  compass: { label: 'Compass', cells: 1, family: 'loose', count: 1, description: 'A tiny magnet on a pivot. It shows you where a magnetic field points.' },
  batteryHolder: { label: 'Battery compartment', cells: 1, family: 'loose', count: 1, description: 'Holds two AA batteries. It is built into the baseplate, so it never appears in a build plan.' },
});

export type PartType = keyof typeof PARTS;

export interface PartEntry extends PartDef {
  type: PartType;
}

export function isPartType(value: string): value is PartType {
  return Object.prototype.hasOwnProperty.call(PARTS, value);
}

export function partDef(type: PartType): PartDef {
  const def = PARTS[type];
  if (!def) throw new Error(`Unknown part type: ${type}`);
  return def;
}

const allParts: PartEntry[] = (Object.keys(PARTS) as PartType[]).map((type) => ({
  type,
  ...PARTS[type],
}));

export const BOARD_PARTS = allParts.filter((p) => p.family !== 'loose');
export const LOOSE_PARTS = allParts.filter((p) => p.family === 'loose');
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run test/registry.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Check the part counts against the manual**

Render the parts-list pages and compare the `count` and `label` of every entry against the table in the manual:

```bash
python -c "
import pymupdf
d = pymupdf.open('docs/620547_EasyElektro_Start_Manual_270521_web_kom.pdf')
for n in range(4, 8):
    d[n-1].get_pixmap(dpi=190).save('/tmp/parts-%02d.png' % n)
"
```

Read `/tmp/parts-04.png` through `/tmp/parts-07.png`. The `count` values in Step 3 are a first pass taken from a low-resolution read — correct any that disagree with the manual, and correct `cells` for any component whose footprint differs. Keep the English labels and descriptions; only the counts and spans are being checked.

- [ ] **Step 6: Re-run the tests and commit**

Run: `npx vitest run test/registry.test.ts`
Expected: PASS.

```bash
git add src/parts/registry.ts test/registry.test.ts
git commit -m "Add kit part registry"
```

---

### Task 5a: SVG symbols — conductors and loads

**Files:**
- Create: `src/parts/symbols.ts`
- Test: `test/symbols.test.ts`

**Interfaces:**
- Consumes: `PartType` from `src/parts/registry.ts`.
- Produces: `symbolMarkup(type: PartType, length: number): string` — returns SVG markup drawn along the x axis from `(0, 0)` to `(length, 0)`, centred vertically on the wire. `Part.astro` (Task 6) wraps the result in a `<g transform="translate(...) rotate(...)">`. Also produces `PART_COLOURS: Record<PartFamily, string>` and `studMarkup(x: number): string`.

Symbols return markup strings rather than being `.astro` components so they are unit-testable and so a single dispatch table covers all 22 parts.

- [ ] **Step 1: Write the failing test**

`test/symbols.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { PART_COLOURS, studMarkup, symbolMarkup } from '../src/parts/symbols';
import { PARTS } from '../src/parts/registry';
import type { PartType } from '../src/parts/registry';

describe('studMarkup', () => {
  it('draws a snap stud at the given position', () => {
    const markup = studMarkup(0);
    expect(markup).toContain('<circle');
    expect(markup).toContain('cx="0"');
  });
});

describe('symbolMarkup', () => {
  it('draws a conductor link in the conductor colour', () => {
    const markup = symbolMarkup('link3', 128);
    expect(markup).toContain(PART_COLOURS.conductor);
    expect(markup).toContain('<circle');
  });

  it('draws studs at both ends of a link', () => {
    const markup = symbolMarkup('link3', 128);
    expect(markup).toContain('cx="0"');
    expect(markup).toContain('cx="128"');
  });

  it('draws a bulb as a crossed circle in the load colour', () => {
    const markup = symbolMarkup('lamp', 64);
    expect(markup).toContain(PART_COLOURS.load);
    expect(markup).toContain('<circle');
    expect(markup).toContain('<line');
  });

  it('returns markup for every part in the registry', () => {
    for (const type of Object.keys(PARTS) as PartType[]) {
      const markup = symbolMarkup(type, 128);
      expect(markup, `${type} markup`).toMatch(/<(circle|rect|path|line|g|text)/);
    }
  });

  it('scales a symbol to the span it is given', () => {
    expect(symbolMarkup('link5', 256)).toContain('cx="256"');
    expect(symbolMarkup('link5', 64)).toContain('cx="64"');
  });

  it('throws on an unknown part', () => {
    expect(() => symbolMarkup('nonsense' as PartType, 64)).toThrow(/Unknown part type/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run test/symbols.test.ts`
Expected: FAIL — cannot resolve `../src/parts/symbols`.

- [ ] **Step 3: Write conductors, loads, and the dispatch skeleton**

`src/parts/symbols.ts`:

```ts
import { partDef, type PartFamily, type PartType } from './registry';

/**
 * The manual's colour logic, which the child is matching against a
 * physical kit: blue conducts, red consumes, green switches, black
 * measures.
 */
export const PART_COLOURS: Record<PartFamily, string> = {
  conductor: '#1f6fd0',
  load: '#d92b2b',
  switch: '#199a55',
  instrument: '#1d1d1f',
  loose: '#5a6472',
};

const STUD_R = 9;
const STUD_HOLE_R = 4;

/** A snap stud: the press-fit connector at the end of every part. */
export function studMarkup(x: number, colour = PART_COLOURS.conductor): string {
  return (
    `<circle cx="${x}" cy="0" r="${STUD_R}" fill="${colour}" />` +
    `<circle cx="${x}" cy="0" r="${STUD_HOLE_R}" fill="#ffffff" />`
  );
}

function linkMarkup(length: number, holes: number): string {
  const colour = PART_COLOURS.conductor;
  const step = holes > 1 ? length / (holes - 1) : 0;
  const studs = Array.from({ length: holes }, (_, i) => studMarkup(i * step, colour)).join('');
  const bar =
    length > 0
      ? `<rect x="0" y="-7" width="${length}" height="14" rx="7" fill="${colour}" />`
      : '';
  return bar + studs;
}

function lampMarkup(length: number): string {
  const colour = PART_COLOURS.load;
  const mid = length / 2;
  const r = 17;
  const d = r * Math.SQRT1_2;
  return (
    `<line x1="0" y1="0" x2="${mid - r}" y2="0" stroke="${colour}" stroke-width="5" />` +
    `<line x1="${mid + r}" y1="0" x2="${length}" y2="0" stroke="${colour}" stroke-width="5" />` +
    `<circle cx="${mid}" cy="0" r="${r}" fill="#ffffff" stroke="${colour}" stroke-width="5" />` +
    `<line x1="${mid - d}" y1="${-d}" x2="${mid + d}" y2="${d}" stroke="${colour}" stroke-width="4" />` +
    `<line x1="${mid - d}" y1="${d}" x2="${mid + d}" y2="${-d}" stroke="${colour}" stroke-width="4" />` +
    studMarkup(0, colour) +
    studMarkup(length, colour)
  );
}

function motorMarkup(length: number): string {
  const colour = PART_COLOURS.load;
  const mid = length / 2;
  const r = 20;
  return (
    `<line x1="0" y1="0" x2="${length}" y2="0" stroke="${colour}" stroke-width="5" />` +
    `<circle cx="${mid}" cy="0" r="${r}" fill="#ffffff" stroke="${colour}" stroke-width="5" />` +
    `<text x="${mid}" y="6" text-anchor="middle" font-size="20" font-weight="700" fill="${colour}">M</text>` +
    `<text x="${length - 6}" y="-14" text-anchor="end" font-size="18" font-weight="700" fill="${colour}">+</text>` +
    studMarkup(0, colour) +
    studMarkup(length, colour)
  );
}

function coilMarkup(length: number): string {
  const colour = PART_COLOURS.load;
  const turns = 6;
  const span = length * 0.6;
  const start = (length - span) / 2;
  const step = span / turns;
  const arcs = Array.from(
    { length: turns },
    (_, i) =>
      `<path d="M ${start + i * step} 0 a ${step / 2} 14 0 0 1 ${step} 0" fill="none" stroke="${colour}" stroke-width="5" />`,
  ).join('');
  return (
    `<line x1="0" y1="0" x2="${start}" y2="0" stroke="${colour}" stroke-width="5" />` +
    `<line x1="${start + span}" y1="0" x2="${length}" y2="0" stroke="${colour}" stroke-width="5" />` +
    arcs +
    studMarkup(0, colour) +
    studMarkup(length, colour)
  );
}

function buzzerMarkup(length: number): string {
  const colour = PART_COLOURS.load;
  const mid = length / 2;
  return (
    `<line x1="0" y1="0" x2="${length}" y2="0" stroke="${colour}" stroke-width="5" />` +
    `<circle cx="${mid}" cy="0" r="20" fill="#ffffff" stroke="${colour}" stroke-width="5" />` +
    `<path d="M ${mid - 7} -9 a 11 11 0 0 1 0 18" fill="none" stroke="${colour}" stroke-width="4" />` +
    `<path d="M ${mid - 1} -14 a 17 17 0 0 1 0 28" fill="none" stroke="${colour}" stroke-width="4" />` +
    `<text x="${length - 6}" y="-14" text-anchor="end" font-size="18" font-weight="700" fill="${colour}">+</text>` +
    studMarkup(0, colour) +
    studMarkup(length, colour)
  );
}

function relayMarkup(length: number): string {
  const colour = PART_COLOURS.load;
  return (
    `<rect x="0" y="-26" width="${length}" height="52" rx="10" fill="#ffffff" stroke="${colour}" stroke-width="5" />` +
    `<rect x="14" y="-14" width="${length * 0.3}" height="28" rx="4" fill="${colour}" />` +
    `<line x1="${length * 0.55}" y1="10" x2="${length * 0.85}" y2="-10" stroke="${colour}" stroke-width="5" />` +
    `<circle cx="${length * 0.55}" cy="10" r="5" fill="${colour}" />` +
    `<circle cx="${length * 0.85}" cy="-10" r="5" fill="${colour}" />` +
    studMarkup(0, colour) +
    studMarkup(length, colour)
  );
}

type SymbolFn = (length: number) => string;

const SYMBOLS: Partial<Record<PartType, SymbolFn>> = {
  link1: (l) => linkMarkup(l, 1),
  link2: (l) => linkMarkup(l, 2),
  link3: (l) => linkMarkup(l, 3),
  link4: (l) => linkMarkup(l, 4),
  link5: (l) => linkMarkup(l, 5),
  link6: (l) => linkMarkup(l, 6),
  link7: (l) => linkMarkup(l, 7),
  lamp: lampMarkup,
  motor: motorMarkup,
  coil: coilMarkup,
  buzzer: buzzerMarkup,
  relay: relayMarkup,
};

export function symbolMarkup(type: PartType, length: number): string {
  partDef(type); // throws on an unknown type
  const draw = SYMBOLS[type];
  if (!draw) throw new Error(`Unknown part type: ${type}`);
  return draw(length);
}
```

- [ ] **Step 4: Run the test to confirm partial progress**

Run: `npx vitest run test/symbols.test.ts`
Expected: the conductor and bulb tests PASS; "returns markup for every part in the registry" FAILS on `button` (no symbol yet). That failing test is the handover to Task 5b — leave it failing.

- [ ] **Step 5: Commit**

```bash
git add src/parts/symbols.ts test/symbols.test.ts
git commit -m "Add SVG symbols for conductor links and loads"
```

---

### Task 5b: SVG symbols — switches, instrument, loose pieces

**Files:**
- Modify: `src/parts/symbols.ts`

**Interfaces:**
- Consumes: `PART_COLOURS`, `studMarkup`, the `SYMBOLS` table from Task 5a.
- Produces: the same `symbolMarkup` signature, now total over every `PartType`.

- [ ] **Step 1: Confirm the failing test**

Run: `npx vitest run test/symbols.test.ts`
Expected: FAIL on "returns markup for every part in the registry", naming `button`.

- [ ] **Step 2: Add the switch symbols**

Insert these functions into `src/parts/symbols.ts`, above the `SYMBOLS` table:

```ts
/** Green switch body: the rounded shell all switches share. */
function switchBody(length: number): string {
  return `<rect x="0" y="-22" width="${length}" height="44" rx="22" fill="#e8f7ee" stroke="${PART_COLOURS.switch}" stroke-width="5" />`;
}

function buttonMarkup(length: number): string {
  const colour = PART_COLOURS.switch;
  const mid = length / 2;
  return (
    switchBody(length) +
    `<circle cx="${mid}" cy="0" r="14" fill="${colour}" />` +
    `<circle cx="${mid}" cy="0" r="7" fill="#ffffff" />` +
    studMarkup(0, colour) +
    studMarkup(length, colour)
  );
}

function switchMarkup(length: number): string {
  const colour = PART_COLOURS.switch;
  const left = length * 0.28;
  const right = length * 0.72;
  return (
    switchBody(length) +
    `<line x1="${left}" y1="0" x2="${right}" y2="-13" stroke="${colour}" stroke-width="6" stroke-linecap="round" />` +
    `<circle cx="${left}" cy="0" r="6" fill="${colour}" />` +
    `<circle cx="${right}" cy="0" r="6" fill="#ffffff" stroke="${colour}" stroke-width="4" />` +
    `<text x="${left - 4}" y="17" text-anchor="middle" font-size="11" font-weight="700" fill="${colour}">OFF</text>` +
    `<text x="${right + 4}" y="17" text-anchor="middle" font-size="11" font-weight="700" fill="${colour}">ON</text>` +
    studMarkup(0, colour) +
    studMarkup(length, colour)
  );
}

function changeoverMarkup(length: number): string {
  const colour = PART_COLOURS.switch;
  const pivot = length * 0.5;
  return (
    switchBody(length) +
    `<circle cx="${pivot}" cy="0" r="6" fill="${colour}" />` +
    `<line x1="${pivot}" y1="0" x2="${length * 0.82}" y2="-12" stroke="${colour}" stroke-width="6" stroke-linecap="round" />` +
    `<circle cx="${length * 0.82}" cy="-12" r="5" fill="#ffffff" stroke="${colour}" stroke-width="4" />` +
    `<circle cx="${length * 0.82}" cy="12" r="5" fill="#ffffff" stroke="${colour}" stroke-width="4" />` +
    `<text x="${length * 0.16}" y="5" text-anchor="middle" font-size="13" font-weight="700" fill="${colour}">C</text>` +
    studMarkup(0, colour) +
    studMarkup(length, colour)
  );
}

function reedSwitchMarkup(length: number): string {
  const colour = PART_COLOURS.switch;
  const mid = length / 2;
  return (
    switchBody(length) +
    `<rect x="${mid - 24}" y="-11" width="48" height="22" rx="11" fill="#ffffff" stroke="${colour}" stroke-width="4" />` +
    `<line x1="${mid - 20}" y1="-3" x2="${mid + 4}" y2="-3" stroke="${colour}" stroke-width="4" />` +
    `<line x1="${mid + 20}" y1="4" x2="${mid - 4}" y2="4" stroke="${colour}" stroke-width="4" />` +
    studMarkup(0, colour) +
    studMarkup(length, colour)
  );
}
```

- [ ] **Step 3: Add the meter and loose-piece symbols**

Also above the `SYMBOLS` table:

```ts
/** The meter stands proud of the board, so it is drawn taller than a part. */
function meterMarkup(length: number): string {
  const colour = PART_COLOURS.instrument;
  const mid = length / 2;
  return (
    `<rect x="0" y="-96" width="${length}" height="96" rx="12" fill="${colour}" />` +
    `<rect x="10" y="-86" width="${length - 20}" height="46" rx="6" fill="#ffffff" />` +
    `<path d="M ${mid - 40} -50 a 44 44 0 0 1 80 0" fill="none" stroke="${colour}" stroke-width="3" />` +
    `<line x1="${mid}" y1="-48" x2="${mid - 22}" y2="-74" stroke="#d92b2b" stroke-width="3" />` +
    `<text x="${mid}" y="-16" text-anchor="middle" font-size="16" font-weight="700" fill="#ffffff">3V | 1A</text>` +
    `<text x="${length - 8}" y="-16" text-anchor="end" font-size="16" font-weight="700" fill="#ffffff">+</text>` +
    studMarkup(0, colour) +
    studMarkup(length, colour)
  );
}

function propellerMarkup(): string {
  const colour = PART_COLOURS.load;
  const blade = (rotation: number) =>
    `<ellipse cx="0" cy="-20" rx="9" ry="20" fill="${colour}" transform="rotate(${rotation})" />`;
  return (
    `<g>${blade(0)}${blade(120)}${blade(240)}` +
    `<circle cx="0" cy="0" r="8" fill="#ffffff" stroke="${colour}" stroke-width="4" /></g>`
  );
}

function ironCoreMarkup(): string {
  const colour = PART_COLOURS.loose;
  return `<rect x="-38" y="-9" width="76" height="18" rx="9" fill="${colour}" />`;
}

function magnetMarkup(): string {
  return (
    `<rect x="-44" y="-14" width="44" height="28" fill="#d92b2b" />` +
    `<rect x="0" y="-14" width="44" height="28" fill="#5a6472" />` +
    `<text x="-22" y="6" text-anchor="middle" font-size="16" font-weight="700" fill="#ffffff">N</text>` +
    `<text x="22" y="6" text-anchor="middle" font-size="16" font-weight="700" fill="#ffffff">S</text>`
  );
}

function compassMarkup(): string {
  const colour = PART_COLOURS.loose;
  return (
    `<circle cx="0" cy="0" r="28" fill="#ffffff" stroke="${colour}" stroke-width="4" />` +
    `<polygon points="0,-20 7,0 0,20 -7,0" fill="#d92b2b" />` +
    `<circle cx="0" cy="0" r="4" fill="${colour}" />`
  );
}

function batteryHolderMarkup(): string {
  const colour = PART_COLOURS.loose;
  return (
    `<rect x="-46" y="-26" width="92" height="52" rx="8" fill="#eef1f5" stroke="${colour}" stroke-width="4" />` +
    `<line x1="-18" y1="-16" x2="-18" y2="16" stroke="#d92b2b" stroke-width="6" />` +
    `<line x1="-4" y1="-9" x2="-4" y2="9" stroke="#d92b2b" stroke-width="6" />` +
    `<line x1="10" y1="-16" x2="10" y2="16" stroke="#d92b2b" stroke-width="6" />` +
    `<text x="30" y="6" text-anchor="middle" font-size="18" font-weight="700" fill="#d92b2b">+</text>`
  );
}
```

- [ ] **Step 4: Register the new symbols**

Extend the `SYMBOLS` table so it covers every part, and change its type from `Partial<Record<...>>` to a total record:

```ts
const SYMBOLS: Record<PartType, SymbolFn> = {
  link1: (l) => linkMarkup(l, 1),
  link2: (l) => linkMarkup(l, 2),
  link3: (l) => linkMarkup(l, 3),
  link4: (l) => linkMarkup(l, 4),
  link5: (l) => linkMarkup(l, 5),
  link6: (l) => linkMarkup(l, 6),
  link7: (l) => linkMarkup(l, 7),
  lamp: lampMarkup,
  motor: motorMarkup,
  coil: coilMarkup,
  buzzer: buzzerMarkup,
  relay: relayMarkup,
  button: buttonMarkup,
  switch: switchMarkup,
  changeover: changeoverMarkup,
  reedSwitch: reedSwitchMarkup,
  meter: meterMarkup,
  propeller: () => propellerMarkup(),
  ironCore: () => ironCoreMarkup(),
  magnet: () => magnetMarkup(),
  compass: () => compassMarkup(),
  batteryHolder: () => batteryHolderMarkup(),
};
```

Making the record total means TypeScript now fails the build if a part is added to the registry without a symbol.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run test/symbols.test.ts`
Expected: PASS, 6 tests.

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/parts/symbols.ts
git commit -m "Add SVG symbols for switches, meter and loose pieces"
```

---

### Task 6: Board renderer

**Files:**
- Create: `src/board/describe.ts`, `src/components/Part.astro`, `src/components/Board.astro`
- Create: `src/pages/sandbox.astro` (development-only preview page)
- Test: `test/describe.test.ts`

**Interfaces:**
- Consumes: `geometry.ts`, `registry.ts`, `symbols.ts`.
- Produces:
  - `type PlacedPart = { type: PartType; from?: string; to?: string; at?: string; level?: number }`
  - `describeBoard(parts: PlacedPart[]): string`
  - `<Board parts={...} caption?={...} />` and `<Part part={...} />`

`PlacedPart` is defined in `src/board/describe.ts` and imported by the schema in Task 7, so the shape is declared once.

- [ ] **Step 1: Write the failing test**

`test/describe.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { describeBoard } from '../src/board/describe';

describe('describeBoard', () => {
  it('names every part and where it sits', () => {
    const text = describeBoard([
      { type: 'lamp', from: 'D4', to: 'D5' },
      { type: 'switch', from: 'F2', to: 'F4' },
    ]);
    expect(text).toContain('Bulb 3.2 V / 0.2 A from D4 to D5');
    expect(text).toContain('On/off switch from F2 to F4');
  });

  it('describes a single-cell part by its cell', () => {
    expect(describeBoard([{ type: 'link1', at: 'C3' }])).toContain(
      'Connector strip 1 at C3',
    );
  });

  it('mentions a stacking level above the baseplate', () => {
    const text = describeBoard([{ type: 'lamp', from: 'D4', to: 'D5', level: 2 }]);
    expect(text).toContain('level 2');
  });

  it('does not mention level 1, which is the baseplate', () => {
    const text = describeBoard([{ type: 'lamp', from: 'D4', to: 'D5', level: 1 }]);
    expect(text).not.toContain('level');
  });

  it('opens by naming the diagram and the battery', () => {
    const text = describeBoard([{ type: 'lamp', from: 'D4', to: 'D5' }]);
    expect(text).toMatch(/^Circuit on the baseplate, with the battery/);
  });

  it('handles an empty board without crashing', () => {
    expect(describeBoard([])).toMatch(/^Circuit on the baseplate/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run test/describe.test.ts`
Expected: FAIL — cannot resolve `../src/board/describe`.

- [ ] **Step 3: Write the implementation**

`src/board/describe.ts`:

```ts
import { partDef, type PartType } from '../parts/registry';

export interface PlacedPart {
  type: PartType;
  /** Start cell of a span. Paired with `to`. */
  from?: string;
  /** End cell of a span. Paired with `from`. */
  to?: string;
  /** Single cell, for parts that fill one hole. */
  at?: string;
  /** Stacking level, 1 on the baseplate. */
  level?: number;
}

/**
 * A board diagram is meaningless to a screen reader as bare SVG, so every
 * board carries a plain-language description of what is on it and where.
 */
export function describeBoard(parts: PlacedPart[]): string {
  const opening =
    'Circuit on the baseplate, with the battery compartment at the lower left.';
  if (parts.length === 0) return opening;

  const items = parts.map((part) => {
    const label = partDef(part.type).label;
    const place = part.at ? `at ${part.at}` : `from ${part.from} to ${part.to}`;
    const level = part.level && part.level > 1 ? `, on level ${part.level}` : '';
    return `${label} ${place}${level}`;
  });

  return `${opening} It holds: ${items.join('; ')}.`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run test/describe.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Write `src/components/Part.astro`**

```astro
---
import { cellCenter, spanOf } from '../board/geometry';
import type { PlacedPart } from '../board/describe';
import { symbolMarkup } from '../parts/symbols';

interface Props {
  part: PlacedPart;
}

const { part } = Astro.props;

const placement = part.at
  ? { ...cellCenter(part.at), length: 0, angle: 0 }
  : spanOf(part.from!, part.to!);

const markup = symbolMarkup(part.type, placement.length);
const level = part.level ?? 1;

// The level badge stays upright, so it is placed outside the rotated group.
const badgeAt = part.at
  ? cellCenter(part.at)
  : cellCenter(part.from!);
---
<g transform={`translate(${placement.x} ${placement.y}) rotate(${placement.angle})`} set:html={markup} />
{level > 1 && (
  <g class="level-badge" transform={`translate(${badgeAt.x - 22} ${badgeAt.y - 22})`}>
    <rect x="-9" y="-9" width="18" height="18" rx="4" fill="#ffffff" stroke="#1d1d1f" stroke-width="2" />
    <text x="0" y="5" text-anchor="middle" font-size="13" font-weight="700" fill="#1d1d1f">{level}</text>
  </g>
)}
```

- [ ] **Step 6: Write `src/components/Board.astro`**

```astro
---
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  COLS,
  GUTTER_X,
  GUTTER_Y,
  PITCH_X,
  PITCH_Y,
  ROWS,
  cellCenter,
} from '../board/geometry';
import { describeBoard, type PlacedPart } from '../board/describe';
import Part from './Part.astro';

interface Props {
  parts: PlacedPart[];
  caption?: string;
}

const { parts, caption } = Astro.props;

// Lower levels paint first so stacked parts sit on top, as they do in the kit.
const ordered = [...parts].sort((a, b) => (a.level ?? 1) - (b.level ?? 1));

const holes = ROWS.flatMap((row) =>
  Array.from({ length: COLS }, (_, i) => cellCenter(`${row}${i + 1}`)),
);

const hexPath = (cx: number, cy: number, r: number) =>
  Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    return `${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`;
  }).join(' ');

const battery = {
  x: cellCenter('D1').x - PITCH_X / 2,
  y: cellCenter('D1').y - PITCH_Y / 2,
  width: PITCH_X * 2,
  height: PITCH_Y * 3,
};

const description = describeBoard(parts);
---
<figure class="board">
  <svg
    viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}
    role="img"
    aria-label={description}
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      x={GUTTER_X - 10}
      y={GUTTER_Y - 10}
      width={BOARD_WIDTH - GUTTER_X - 10}
      height={BOARD_HEIGHT - GUTTER_Y - 10}
      rx="16"
      fill="#f3f5f8"
      stroke="#d7dde6"
      stroke-width="2"
    />

    {holes.map((hole) => (
      <polygon points={hexPath(hole.x, hole.y, 20)} fill="#ffffff" stroke="#e2e7ee" stroke-width="2" />
    ))}

    <rect
      x={battery.x}
      y={battery.y}
      width={battery.width}
      height={battery.height}
      rx="12"
      fill="#e6eaf0"
      stroke="#cfd6e0"
      stroke-width="2"
    />
    <text
      x={battery.x + battery.width / 2}
      y={battery.y + battery.height / 2 + 5}
      text-anchor="middle"
      font-size="15"
      font-weight="700"
      fill="#7b8797"
    >BATTERY</text>

    {Array.from({ length: COLS }, (_, i) => (
      <text
        x={GUTTER_X + i * PITCH_X + PITCH_X / 2}
        y={GUTTER_Y - 18}
        text-anchor="middle"
        font-size="18"
        font-weight="700"
        fill="#7b8797"
      >{i + 1}</text>
    ))}

    {ROWS.map((row, i) => (
      <text
        x={GUTTER_X - 22}
        y={GUTTER_Y + i * PITCH_Y + PITCH_Y / 2 + 6}
        text-anchor="middle"
        font-size="18"
        font-weight="700"
        fill="#7b8797"
      >{row}</text>
    ))}

    {ordered.map((part) => <Part part={part} />)}
  </svg>
  {caption && <figcaption>{caption}</figcaption>}
</figure>

<style>
  .board svg {
    width: 100%;
    height: auto;
    display: block;
  }
  .board figcaption {
    margin-top: 0.5rem;
    font-weight: 600;
    color: var(--colour-muted);
  }
</style>
```

- [ ] **Step 7: Write a sandbox page to see it**

`src/pages/sandbox.astro` — a scratch page for eyeballing every symbol. Delete it in Task 17.

```astro
---
import Board from '../components/Board.astro';
import { BOARD_PARTS } from '../parts/registry';

const demo = [
  { type: 'meter' as const, from: 'B4', to: 'B6', level: 1 },
  { type: 'link4' as const, from: 'B6', to: 'B9', level: 2 },
  { type: 'lamp' as const, from: 'D4', to: 'D5', level: 2 },
  { type: 'lamp' as const, from: 'D6', to: 'D7', level: 2 },
  { type: 'link3' as const, from: 'D2', to: 'D4', level: 1 },
  { type: 'switch' as const, from: 'F2', to: 'F4', level: 1 },
  { type: 'link6' as const, from: 'F4', to: 'F9', level: 1 },
  { type: 'link1' as const, at: 'C3', level: 3 },
];
---
<html lang="en">
  <head><meta charset="utf-8" /><title>Sandbox</title></head>
  <body style="max-width:60rem;margin:2rem auto;font-family:system-ui">
    <h1>Board sandbox</h1>
    <Board parts={demo} caption="Build plan 1" />
    <h2>Every part</h2>
    {BOARD_PARTS.map((part) => (
      <>
        <h3>{part.label}</h3>
        <Board parts={[{ type: part.type, from: 'C2', to: `C${1 + part.cells}` }]} />
      </>
    ))}
  </body>
</html>
```

- [ ] **Step 8: Look at it**

Run: `npm run dev`
Open `http://localhost:4321/electro-kit-site/sandbox/`.

Check, and fix anything that fails:
- studs land exactly on hole centres;
- a part's span covers the number of holes its `cells` value claims;
- the meter sits above its row without colliding with the row above;
- the level badge is legible and does not sit under another part;
- nothing overflows the board rectangle.

- [ ] **Step 9: Commit**

```bash
git add src/board/describe.ts src/components/Part.astro src/components/Board.astro src/pages/sandbox.astro test/describe.test.ts
git commit -m "Add data-driven SVG board renderer"
```

---

### Task 7: Content schemas and the integrity test harness

**Files:**
- Create: `src/content/schema.ts`, `src/content.config.ts`
- Create: `src/content/chapters/.gitkeep`, `src/content/experiments/.gitkeep`
- Test: `test/content.test.ts`

**Interfaces:**
- Consumes: `isCell` from geometry, `isPartType` from the registry, `PlacedPart` from describe.
- Produces: `chapterSchema`, `experimentSchema`, `placedPartSchema`, `boardSchema` from `src/content/schema.ts`; the `chapters` and `experiments` collections from `src/content.config.ts`; and `loadYaml()` / `readExperiments()` / `readChapters()` test helpers in `test/content.test.ts`.

Schemas live in a plain module rather than inside `content.config.ts` because `astro:content` is a virtual module that Vitest cannot import. Keeping them separate is what lets the 60 data files be validated by a fast unit test as well as by the build.

- [ ] **Step 1: Write the failing test**

`test/content.test.ts`:

```ts
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { chapterSchema, experimentSchema } from '../src/content/schema';

const CHAPTER_DIR = 'src/content/chapters';
const EXPERIMENT_DIR = 'src/content/experiments';

function loadYaml(dir: string) {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.yaml'))
    .map((file) => ({ file, data: parse(readFileSync(join(dir, file), 'utf8')) }));
}

describe('chapter content', () => {
  it('has five chapters, all valid', () => {
    const chapters = loadYaml(CHAPTER_DIR);
    expect(chapters).toHaveLength(5);
    for (const { file, data } of chapters) {
      const result = chapterSchema.safeParse(data);
      expect(result.success, `${file}: ${JSON.stringify(result.error?.issues)}`).toBe(true);
    }
  });

  it('numbers the chapters 1 to 5 without gaps', () => {
    const orders = loadYaml(CHAPTER_DIR).map((c) => c.data.order).sort((a, b) => a - b);
    expect(orders).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('experiment content', () => {
  it('validates every experiment file against the schema', () => {
    for (const { file, data } of loadYaml(EXPERIMENT_DIR)) {
      const result = experimentSchema.safeParse(data);
      expect(result.success, `${file}: ${JSON.stringify(result.error?.issues)}`).toBe(true);
    }
  });

  it('gives every experiment a chapter that exists', () => {
    const slugs = new Set(
      readdirSync(CHAPTER_DIR)
        .filter((f) => f.endsWith('.yaml'))
        .map((f) => f.replace(/\.yaml$/, '')),
    );
    for (const { file, data } of loadYaml(EXPERIMENT_DIR)) {
      expect(slugs.has(data.chapter), `${file} references chapter ${data.chapter}`).toBe(true);
    }
  });

  it('numbers files to match the experiment number inside them', () => {
    for (const { file, data } of loadYaml(EXPERIMENT_DIR)) {
      const prefix = Number(file.slice(0, 2));
      expect(prefix, `${file} filename prefix`).toBe(data.number);
    }
  });

  it('uses each experiment number exactly once', () => {
    const numbers = loadYaml(EXPERIMENT_DIR).map((e) => e.data.number);
    expect(new Set(numbers).size).toBe(numbers.length);
  });
});
```

Note: this test passes on an empty `src/content/experiments/` directory, which is correct — Tasks 11–15 fill it in, and a sixth test asserting all 60 are present is added in Task 15 when that becomes true.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run test/content.test.ts`
Expected: FAIL — cannot resolve `../src/content/schema`.

- [ ] **Step 3: Write the schemas**

`src/content/schema.ts`:

```ts
import { z } from 'astro/zod';
import { isCell } from '../board/geometry';
import { isPartType } from '../parts/registry';

const cell = z
  .string()
  .refine(isCell, { message: 'must be a board cell such as C4 (rows A-G, columns 1-10)' });

export const placedPartSchema = z
  .object({
    type: z.string().refine(isPartType, { message: 'not a part in the kit' }),
    from: cell.optional(),
    to: cell.optional(),
    at: cell.optional(),
    level: z.number().int().min(1).max(3).default(1),
  })
  .refine(
    (part) =>
      (part.at !== undefined && part.from === undefined && part.to === undefined) ||
      (part.at === undefined && part.from !== undefined && part.to !== undefined),
    { message: 'a part needs either `at`, or both `from` and `to` — never both forms' },
  );

export const boardSchema = z.object({
  caption: z.string().optional(),
  parts: z.array(placedPartSchema).min(1),
});

export const experimentSchema = z.object({
  number: z.number().int().min(1).max(60),
  title: z.string().min(1),
  chapter: z.string().min(1),
  steps: z.array(z.string().min(1)).min(1),
  whatHappens: z.array(z.string().min(1)).min(1),
  note: z.string().min(1).optional(),
  boards: z.array(boardSchema).min(1).max(3),
});

export const chapterSchema = z.object({
  order: z.number().int().min(1).max(5),
  title: z.string().min(1),
  colour: z.enum(['red', 'green', 'orange', 'blue', 'purple']),
  intro: z.array(z.string().min(1)).min(1),
  deepDive: z
    .array(
      z.object({
        heading: z.string().min(1),
        body: z.array(z.string().min(1)).min(1),
      }),
    )
    .default([]),
});

export type Experiment = z.infer<typeof experimentSchema>;
export type Chapter = z.infer<typeof chapterSchema>;
```

- [ ] **Step 4: Write the collection config**

`src/content.config.ts`:

```ts
import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { chapterSchema, experimentSchema } from './content/schema';

const chapters = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/chapters' }),
  schema: chapterSchema,
});

const experiments = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/experiments' }),
  // The plain schema keeps `chapter` as a string so Vitest can validate the
  // same files; Astro upgrades it to a real cross-collection reference.
  schema: experimentSchema.extend({ chapter: reference('chapters') }),
});

export const collections = { chapters, experiments };
```

- [ ] **Step 5: Create the content directories**

```bash
mkdir -p src/content/chapters src/content/experiments
touch src/content/chapters/.gitkeep src/content/experiments/.gitkeep
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run test/content.test.ts`
Expected: FAIL on "has five chapters" (there are zero). That is the expected handover to Task 11; the other four tests PASS.

Run: `npm run build`
Expected: succeeds. Empty collections are legal.

- [ ] **Step 7: Commit**

```bash
git add src/content/schema.ts src/content.config.ts src/content/chapters/.gitkeep src/content/experiments/.gitkeep test/content.test.ts
git commit -m "Add content collection schemas and integrity tests"
```

---

### Task 8: Layout, design tokens, and chapter theming

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/global.css`, `src/layouts/BaseLayout.astro`
- Modify: `src/pages/index.astro` (use the layout)

**Interfaces:**
- Consumes: `url()` from `src/lib/url.ts`.
- Produces: `<BaseLayout title={string} description?={string} theme?={'red'|'green'|'orange'|'blue'|'purple'}>` — sets `--theme` from `theme`, renders the header, the footer with the attribution line, and a `<slot />`.

- [ ] **Step 1: Write `src/styles/tokens.css`**

```css
:root {
  --colour-ink: #16202e;
  --colour-muted: #5c6b7f;
  --colour-page: #ffffff;
  --colour-surface: #f3f5f8;
  --colour-line: #dde3ec;

  --chapter-red: #d92b2b;
  --chapter-green: #199a55;
  --chapter-orange: #e07a17;
  --chapter-blue: #1f6fd0;
  --chapter-purple: #7b3fb5;

  /* Overridden per page by BaseLayout's theme prop. */
  --theme: var(--chapter-blue);
  --theme-wash: color-mix(in srgb, var(--theme) 10%, white);

  --step--1: clamp(0.85rem, 0.82rem + 0.15vw, 0.95rem);
  --step-0: clamp(1rem, 0.95rem + 0.25vw, 1.15rem);
  --step-1: clamp(1.3rem, 1.2rem + 0.5vw, 1.6rem);
  --step-2: clamp(1.7rem, 1.5rem + 1vw, 2.3rem);
  --step-3: clamp(2.2rem, 1.8rem + 2vw, 3.2rem);

  --space: 1rem;
  --measure: 34rem;
  --radius: 14px;
}

[data-theme='red'] { --theme: var(--chapter-red); }
[data-theme='green'] { --theme: var(--chapter-green); }
[data-theme='orange'] { --theme: var(--chapter-orange); }
[data-theme='blue'] { --theme: var(--chapter-blue); }
[data-theme='purple'] { --theme: var(--chapter-purple); }
```

- [ ] **Step 2: Write `src/styles/global.css`**

```css
*, *::before, *::after { box-sizing: border-box; }

body {
  margin: 0;
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
  font-size: var(--step-0);
  line-height: 1.6;
  color: var(--colour-ink);
  background: var(--colour-page);
}

h1, h2, h3 { line-height: 1.15; text-wrap: balance; }
h1 { font-size: var(--step-3); }
h2 { font-size: var(--step-2); }
h3 { font-size: var(--step-1); }

p, li { max-width: var(--measure); }

a { color: var(--theme); }
a:focus-visible, button:focus-visible {
  outline: 3px solid var(--theme);
  outline-offset: 3px;
}

.wrap {
  width: min(72rem, 100% - 2rem);
  margin-inline: auto;
}

.site-header {
  border-bottom: 4px solid var(--theme);
  padding-block: var(--space);
}
.site-header nav { display: flex; flex-wrap: wrap; gap: 1.25rem; }
.site-header a { font-weight: 600; text-decoration: none; }
.site-header a:hover { text-decoration: underline; }

.site-footer {
  margin-top: calc(var(--space) * 4);
  padding-block: calc(var(--space) * 2);
  border-top: 1px solid var(--colour-line);
  color: var(--colour-muted);
  font-size: var(--step--1);
}

@media print {
  .site-header nav, .site-footer { display: none; }
  body { font-size: 11pt; }
}
```

- [ ] **Step 3: Write `src/layouts/BaseLayout.astro`**

```astro
---
import '../styles/tokens.css';
import '../styles/global.css';
import { url } from '../lib/url';

interface Props {
  title: string;
  description?: string;
  theme?: 'red' | 'green' | 'orange' | 'blue' | 'purple';
}

const { title, description, theme = 'blue' } = Astro.props;
---
<!doctype html>
<html lang="en" data-theme={theme}>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title} — Easy Elektro Start</title>
    {description && <meta name="description" content={description} />}
  </head>
  <body>
    <header class="site-header">
      <div class="wrap">
        <nav aria-label="Main">
          <a href={url('/')}>Home</a>
          <a href={url('/experiments/')}>Experiments</a>
          <a href={url('/parts/')}>Parts</a>
          <a href={url('/build-tips/')}>Build tips</a>
        </nav>
      </div>
    </header>

    <main class="wrap">
      <slot />
    </main>

    <footer class="site-footer">
      <div class="wrap">
        <p>
          Unofficial companion site for the KOSMOS Easy Elektro Start kit. Not
          affiliated with or endorsed by Franckh-Kosmos Verlags-GmbH &amp; Co. KG.
        </p>
      </div>
    </footer>
  </body>
</html>
```

- [ ] **Step 4: Put the layout to work on the placeholder home page**

`src/pages/index.astro`:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout title="Home" description="An English companion to the KOSMOS Easy Elektro Start electronics kit.">
  <h1>Easy Elektro Start</h1>
  <p>Sixty experiments with the KOSMOS Easy Elektro Start kit, in English.</p>
</BaseLayout>
```

- [ ] **Step 5: Verify**

Run: `npm run build`
Expected: succeeds.

Run: `npm run dev` and open `http://localhost:4321/electro-kit-site/`.
Expected: the header links all resolve under `/electro-kit-site/` — hover each and read the status bar. `/experiments/` and `/parts/` 404 for now, which is expected; what matters is that the path is prefixed and not bare.

- [ ] **Step 6: Commit**

```bash
git add src/styles src/layouts/BaseLayout.astro src/pages/index.astro
git commit -m "Add base layout, design tokens and chapter theming"
```

---

### Task 9: Parts page

**Files:**
- Create: `src/pages/parts.astro`
- Create: `src/components/PartSwatch.astro`

**Interfaces:**
- Consumes: `BOARD_PARTS`, `LOOSE_PARTS` from the registry; `symbolMarkup`; `BaseLayout`.
- Produces: `<PartSwatch type={PartType} />` — a standalone SVG of one part, sized to its own footprint, reused by Task 10.

- [ ] **Step 1: Write `src/components/PartSwatch.astro`**

```astro
---
import { PITCH_X } from '../board/geometry';
import { partDef, type PartType } from '../parts/registry';
import { symbolMarkup } from '../parts/symbols';

interface Props {
  type: PartType;
}

const { type } = Astro.props;
const def = partDef(type);

const length = def.cells > 1 ? (def.cells - 1) * PITCH_X : 0;
const padX = 40;
const padY = 70;
const width = length + padX * 2;
const height = padY * 2;
const markup = symbolMarkup(type, length);
---
<svg
  viewBox={`0 0 ${width} ${height}`}
  width={width}
  height={height}
  role="img"
  aria-label={def.label}
  xmlns="http://www.w3.org/2000/svg"
  class="swatch"
>
  <g transform={`translate(${padX} ${padY})`} set:html={markup} />
</svg>

<style>
  .swatch { max-width: 100%; height: auto; }
</style>
```

- [ ] **Step 2: Write `src/pages/parts.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import PartSwatch from '../components/PartSwatch.astro';
import { BOARD_PARTS, LOOSE_PARTS } from '../parts/registry';

const groups = [
  {
    heading: 'Connector strips',
    blurb: 'Blue parts carry the current. The number tells you how many holes the strip covers.',
    parts: BOARD_PARTS.filter((p) => p.family === 'conductor'),
  },
  {
    heading: 'Switches',
    blurb: 'Green parts open and close the circuit.',
    parts: BOARD_PARTS.filter((p) => p.family === 'switch'),
  },
  {
    heading: 'Things that use the current',
    blurb: 'Red parts turn electricity into light, sound or movement.',
    parts: BOARD_PARTS.filter((p) => p.family === 'load'),
  },
  {
    heading: 'The meter',
    blurb: 'The black part measures what the others are doing.',
    parts: BOARD_PARTS.filter((p) => p.family === 'instrument'),
  },
  {
    heading: 'Loose pieces',
    blurb: 'These do not clip onto the board. You hold them, or push them onto something.',
    parts: LOOSE_PARTS,
  },
];
---
<BaseLayout title="Parts" description="Every part in the Easy Elektro Start kit and what it does.">
  <h1>What is in the box</h1>
  <p>
    Every part has a colour that tells you what it is for. Blue carries the
    current, red uses it up, green switches it on and off, and black measures it.
  </p>

  {groups.map((group) => (
    <section>
      <h2>{group.heading}</h2>
      <p>{group.blurb}</p>
      <ul class="part-list">
        {group.parts.map((part) => (
          <li>
            <PartSwatch type={part.type} />
            <div>
              <h3>{part.label}</h3>
              <p class="count">{part.count} in the box</p>
              <p>{part.description}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  ))}
</BaseLayout>

<style>
  .part-list { list-style: none; padding: 0; display: grid; gap: 1.5rem; }
  .part-list li {
    display: grid;
    grid-template-columns: minmax(0, 14rem) minmax(0, 1fr);
    gap: 1.5rem;
    align-items: center;
    padding: 1rem;
    background: var(--colour-surface);
    border-radius: var(--radius);
  }
  .part-list h3 { margin: 0 0 0.25rem; font-size: var(--step-0); }
  .part-list p { margin: 0; }
  .count { color: var(--colour-muted); font-size: var(--step--1); }
  @media (max-width: 40rem) {
    .part-list li { grid-template-columns: 1fr; }
  }
</style>
```

- [ ] **Step 3: Verify**

Run: `npm run build`
Expected: succeeds, `dist/parts/index.html` exists.

Run: `npm run dev`, open `/electro-kit-site/parts/`.
Expected: all 22 parts render with a visible symbol, correct count and description. No part shows an empty box.

- [ ] **Step 4: Commit**

```bash
git add src/pages/parts.astro src/components/PartSwatch.astro
git commit -m "Add parts page driven by the part registry"
```

---

### Task 10: Build-tips page

**Files:**
- Create: `src/pages/build-tips.astro`

**Interfaces:**
- Consumes: `Board`, `PartSwatch`, `BaseLayout`.
- Produces: nothing other tasks depend on.

This page teaches the three conventions a reader needs before their first experiment: the grid, the stacking levels, and the `+` orientation. Content is taken from PDF pages 8–9.

- [ ] **Step 1: Read the source pages**

```bash
python -c "
import pymupdf
d = pymupdf.open('docs/620547_EasyElektro_Start_Manual_270521_web_kom.pdf')
for n in (8, 9):
    d[n-1].get_pixmap(dpi=190).save('/tmp/tips-%02d.png' % n)
"
```

Read `/tmp/tips-08.png` and `/tmp/tips-09.png`. Rewrite the three ideas in English, in our own words.

- [ ] **Step 2: Write `src/pages/build-tips.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import Board from '../components/Board.astro';
import PartSwatch from '../components/PartSwatch.astro';

const gridDemo = [
  { type: 'link3' as const, from: 'C3', to: 'C5', level: 1 },
  { type: 'lamp' as const, from: 'C6', to: 'C7', level: 1 },
];

const levelDemo = [
  { type: 'link4' as const, from: 'D2', to: 'D5', level: 1 },
  { type: 'lamp' as const, from: 'D4', to: 'D5', level: 2 },
  { type: 'link1' as const, at: 'D5', level: 3 },
];
---
<BaseLayout title="Build tips" description="How to read a build plan: the grid, the levels, and which way round a part goes.">
  <h1>How to read a build plan</h1>

  <section>
    <h2>The grid</h2>
    <p>
      The baseplate is a grid of holes. The columns are numbered <strong>1 to 10</strong>
      across the top, and the rows are lettered <strong>A to G</strong> down the side.
      Every part in a build plan sits between two holes, and we name those holes —
      so <strong>C3 to C5</strong> means the strip starts in row C column 3 and
      finishes in row C column 5.
    </p>
    <p>The battery compartment is built into the board at the bottom left. It is always there, so it is never listed as a part.</p>
    <Board parts={gridDemo} caption="A strip from C3 to C5, and a bulb from C6 to C7" />
  </section>

  <section>
    <h2>Levels: what goes on top of what</h2>
    <p>
      Parts stack. A part with no number sits straight on the baseplate —
      that is <strong>level 1</strong>. A small square with a
      <strong>2</strong> or a <strong>3</strong> means the part clips on top of
      something you have already fitted.
    </p>
    <p>
      Always build from the bottom up: fit everything on level 1 first, then
      level 2, then level 3. If a part will not sit flat, something underneath
      it is probably missing.
    </p>
    <Board parts={levelDemo} caption="A strip on level 1, a bulb stacked on level 2, and a single-hole strip on level 3" />
  </section>

  <section>
    <h2>Which way round?</h2>
    <p>
      The motor, the buzzer and the meter each have a <strong>+</strong> printed
      on them. Fit the part so its plus sign points the same way as the plus
      sign in the build plan. Turn one of them around and the motor spins
      backwards, or the buzzer stays silent.
    </p>
    <div class="swatches">
      <figure><PartSwatch type="motor" /><figcaption>Motor</figcaption></figure>
      <figure><PartSwatch type="buzzer" /><figcaption>Buzzer</figcaption></figure>
    </div>
  </section>

  <section>
    <h2>Before you switch on</h2>
    <p>
      Set the meter's switch to <strong>V</strong> or <strong>A</strong> as the
      experiment tells you, and build the circuit exactly as the plan shows.
      Wiring the meter the wrong way, or leaving out a bulb the plan includes,
      can damage it.
    </p>
  </section>
</BaseLayout>

<style>
  section { margin-block: 2.5rem; }
  .swatches { display: flex; flex-wrap: wrap; gap: 2rem; }
  .swatches figure { margin: 0; text-align: center; }
  .swatches figcaption { font-weight: 600; color: var(--colour-muted); }
</style>
```

- [ ] **Step 3: Verify**

Run: `npm run build`
Expected: succeeds.

Open `/electro-kit-site/build-tips/` in dev and confirm all three boards render and the level badges are visible on the level demo.

- [ ] **Step 4: Commit**

```bash
git add src/pages/build-tips.astro
git commit -m "Add build tips page explaining grid, levels and orientation"
```

---

### Task 11: Chapter 1 content and the chapter/experiment page templates

This is the template task. Chapters 2–5 repeat its transcription procedure exactly, so anything wrong here gets repeated 52 more times — review it carefully before moving on.

**Files:**
- Create: `src/content/chapters/voltage-current-resistance.yaml`
- Create: `src/content/experiments/01-*.yaml` … `08-*.yaml`
- Create: `src/pages/chapters/[slug].astro`, `src/pages/experiments/[slug].astro`
- Create: `src/components/ExperimentCard.astro`
- Create: `src/lib/experiments.ts`
- Test: `test/experiments-lib.test.ts`

**Interfaces:**
- Consumes: content schemas, `Board`, `BaseLayout`, `url()`.
- Produces: from `src/lib/experiments.ts` — `experimentSlug(id: string): string` and `sortByNumber<T extends { data: { number: number } }>(entries: T[]): T[]`.

- [ ] **Step 1: Write the failing test for the slug helper**

`test/experiments-lib.test.ts`:

```ts
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
});

describe('sortByNumber', () => {
  it('orders entries by experiment number, not by id', () => {
    const entries = [
      { data: { number: 10 } },
      { data: { number: 2 } },
      { data: { number: 1 } },
    ];
    expect(sortByNumber(entries).map((e) => e.data.number)).toEqual([1, 2, 10]);
  });

  it('does not mutate its input', () => {
    const entries = [{ data: { number: 2 } }, { data: { number: 1 } }];
    sortByNumber(entries);
    expect(entries[0].data.number).toBe(2);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run test/experiments-lib.test.ts`
Expected: FAIL — cannot resolve `../src/lib/experiments`.

- [ ] **Step 3: Write `src/lib/experiments.ts`**

```ts
/**
 * Experiment files are named `NN-slug.yaml` so they sort in manual order on
 * disk, but the number does not belong in the public URL.
 */
export function experimentSlug(id: string): string {
  return id.replace(/^\d+-/, '');
}

export function sortByNumber<T extends { data: { number: number } }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => a.data.number - b.data.number);
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run test/experiments-lib.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Read the chapter 1 source pages**

```bash
python -c "
import pymupdf
d = pymupdf.open('docs/620547_EasyElektro_Start_Manual_270521_web_kom.pdf')
for n in range(10, 20):
    d[n-1].get_pixmap(dpi=190).save('/tmp/ch1-%02d.png' % n)
"
```

Read `/tmp/ch1-10.png` (chapter opener) through `/tmp/ch1-19.png` (deep dive). PDF page 10 is the opener, 11–18 are experiments 1–8, 19 is the deep dive.

- [ ] **Step 6: Write the chapter file**

`src/content/chapters/voltage-current-resistance.yaml` — fill `intro` from the opener on PDF page 10 and `deepDive` from PDF page 19, rewritten in English in our own words:

```yaml
order: 1
title: Voltage, Current and Resistance
colour: red
intro:
  - Voltage and current are what all of electronics is built on. Without voltage there is no current, and without current nothing happens at all — no bulb lights, no motor turns.
  - In this chapter you build your first circuits and measure what is going on inside them.
deepDive:
  - heading: A fixed relationship
    body:
      - Voltage, current and resistance always pull on each other. Push more voltage through the same circuit and more current flows. Add more resistance and less current flows.
```

- [ ] **Step 7: Write the eight experiment files**

One file per experiment, named `NN-slug.yaml` where `NN` is the zero-padded number and `slug` is a short kebab-case version of the English title. Experiment 1 is on PDF page 11, experiment 2 on page 12, and so on through experiment 8 on page 18.

For each one:

1. Read the rendered page.
2. `title` — translate the German heading into natural English. Do not transliterate: *Kreisverkehr* becomes "Going Round in Circles", not "Roundabout Traffic".
3. `steps` — one array entry per paragraph under **SO GEHT'S**, rewritten as direct instructions.
4. `whatHappens` — one array entry per paragraph under **WAS PASSIERT?**, rewritten as explanation.
5. `note` — only if the page carries a **TIPP!**, **ACHTUNG!** or **WICHTIG!** callout.
6. `boards` — one entry per numbered build diagram on the page. Read which parts are on the diagram and where they run. Transcribe the **topology** — which parts are in series, which are in parallel, which switch feeds which branch, and the level badges — and lay them out clearly on the grid. Do not attempt to match the manual's exact hole coordinates.

The shape, using experiment 1 as the worked example:

```yaml
number: 1
title: Going Round in Circles
chapter: voltage-current-resistance
steps:
  - Connect the bulb to both ends of the battery compartment, so the current has a complete loop to travel round.
  - Look carefully at what you have built. Can you follow the path the current takes?
whatHappens:
  - The battery pushes electrons around the loop. They travel out of one end, through the bulb, and back into the other end.
  - A circuit only works if the loop is complete. Break it anywhere and the bulb goes out.
boards:
  - caption: Build plan 1
    parts:
      - { type: link2, from: D2, to: D3, level: 1 }
      - { type: lamp, from: D4, to: D5, level: 1 }
      - { type: link4, from: D5, to: D8, level: 1 }
      - { type: link6, from: F2, to: F7, level: 1 }
      - { type: link3, from: D8, to: F8, level: 1 }
```

Every part must form part of a complete loop from one battery terminal to the other. Before you write a board out, trace the loop with your finger — if it does not close, the diagram is wrong and the reader will not be able to build it.

- [ ] **Step 8: Run the content tests**

Run: `npx vitest run test/content.test.ts`
Expected: PASS — five chapters is still failing at one, so expect that single failure and nothing else. Every other assertion must pass.

Adjust `test/content.test.ts`'s `expect(chapters).toHaveLength(5)` to `toHaveLength(1)` for now; Task 15 restores it to 5.

- [ ] **Step 9: Write `src/components/ExperimentCard.astro`**

```astro
---
import { url } from '../lib/url';
import { experimentSlug } from '../lib/experiments';

interface Props {
  id: string;
  number: number;
  title: string;
}

const { id, number, title } = Astro.props;
---
<a class="card" href={url(`/experiments/${experimentSlug(id)}/`)}>
  <span class="number">{number}</span>
  <span class="title">{title}</span>
</a>

<style>
  .card {
    display: flex;
    align-items: center;
    gap: 0.9rem;
    padding: 0.9rem 1.1rem;
    border: 2px solid var(--colour-line);
    border-left: 6px solid var(--theme);
    border-radius: var(--radius);
    text-decoration: none;
    color: inherit;
    font-weight: 600;
  }
  .card:hover { background: var(--theme-wash); }
  .number {
    flex: 0 0 auto;
    min-width: 2.2rem;
    height: 2.2rem;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--theme);
    color: #fff;
    font-size: var(--step--1);
  }
</style>
```

- [ ] **Step 10: Write `src/pages/chapters/[slug].astro`**

```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import ExperimentCard from '../../components/ExperimentCard.astro';
import { sortByNumber } from '../../lib/experiments';

export async function getStaticPaths() {
  const chapters = await getCollection('chapters');
  const experiments = await getCollection('experiments');

  return chapters.map((chapter) => ({
    params: { slug: chapter.id },
    props: {
      chapter,
      experiments: sortByNumber(
        experiments.filter((e) => e.data.chapter.id === chapter.id),
      ),
    },
  }));
}

const { chapter, experiments } = Astro.props;
---
<BaseLayout title={chapter.data.title} description={chapter.data.intro[0]} theme={chapter.data.colour}>
  <p class="eyebrow">Chapter {chapter.data.order}</p>
  <h1>{chapter.data.title}</h1>
  {chapter.data.intro.map((para) => <p>{para}</p>)}

  <h2>Experiments</h2>
  <div class="cards">
    {experiments.map((exp) => (
      <ExperimentCard id={exp.id} number={exp.data.number} title={exp.data.title} />
    ))}
  </div>

  {chapter.data.deepDive.length > 0 && (
    <section class="deep-dive">
      <h2>A closer look</h2>
      {chapter.data.deepDive.map((entry) => (
        <>
          <h3>{entry.heading}</h3>
          {entry.body.map((para) => <p>{para}</p>)}
        </>
      ))}
    </section>
  )}
</BaseLayout>

<style>
  .eyebrow { color: var(--theme); font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; font-size: var(--step--1); margin-bottom: 0; }
  .cards { display: grid; gap: 0.75rem; grid-template-columns: repeat(auto-fill, minmax(min(100%, 20rem), 1fr)); }
  .deep-dive { margin-top: 3rem; padding: 1.5rem; background: var(--theme-wash); border-radius: var(--radius); }
</style>
```

- [ ] **Step 11: Write `src/pages/experiments/[slug].astro`**

```astro
---
import { getCollection, getEntry } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import Board from '../../components/Board.astro';
import { url } from '../../lib/url';
import { experimentSlug, sortByNumber } from '../../lib/experiments';

export async function getStaticPaths() {
  const all = sortByNumber(await getCollection('experiments'));

  return all.map((experiment, index) => ({
    params: { slug: experimentSlug(experiment.id) },
    props: {
      experiment,
      previous: all[index - 1] ?? null,
      next: all[index + 1] ?? null,
    },
  }));
}

const { experiment, previous, next } = Astro.props;
const chapter = await getEntry(experiment.data.chapter);
const { number, title, steps, whatHappens, note, boards } = experiment.data;
---
<BaseLayout title={title} description={whatHappens[0]} theme={chapter.data.colour}>
  <p class="eyebrow">
    <a href={url(`/chapters/${chapter.id}/`)}>{chapter.data.title}</a>
    <span> · Experiment {number}</span>
  </p>
  <h1>{title}</h1>

  <div class="columns">
    <div>
      <h2>How to build it</h2>
      <ol>{steps.map((step) => <li>{step}</li>)}</ol>
      {note && <p class="note">{note}</p>}
    </div>

    <div class="boards">
      {boards.map((board) => <Board parts={board.parts} caption={board.caption} />)}
    </div>
  </div>

  <section class="explain">
    <h2>What happens?</h2>
    {whatHappens.map((para) => <p>{para}</p>)}
  </section>

  <nav class="pager" aria-label="Experiments">
    {previous ? (
      <a href={url(`/experiments/${experimentSlug(previous.id)}/`)}>
        <span>Previous</span>
        {previous.data.number}. {previous.data.title}
      </a>
    ) : <span />}
    {next && (
      <a class="next" href={url(`/experiments/${experimentSlug(next.id)}/`)}>
        <span>Next</span>
        {next.data.number}. {next.data.title}
      </a>
    )}
  </nav>
</BaseLayout>

<style>
  .eyebrow { font-weight: 700; font-size: var(--step--1); text-transform: uppercase; letter-spacing: 0.08em; color: var(--colour-muted); }
  .eyebrow a { color: var(--theme); }
  .columns { display: grid; gap: 2rem; grid-template-columns: minmax(0, 1fr); }
  @media (min-width: 58rem) { .columns { grid-template-columns: minmax(0, 22rem) minmax(0, 1fr); } }
  .boards { display: grid; gap: 1.5rem; }
  .note { padding: 0.9rem 1.1rem; background: var(--theme-wash); border-left: 6px solid var(--theme); border-radius: var(--radius); font-weight: 600; }
  .explain { margin-top: 2.5rem; padding: 1.5rem; background: var(--colour-surface); border-radius: var(--radius); }
  .pager { display: flex; justify-content: space-between; gap: 1rem; margin-top: 3rem; }
  .pager a { font-weight: 600; text-decoration: none; max-width: 16rem; }
  .pager a:hover { text-decoration: underline; }
  .pager .next { text-align: right; }
  .pager span { display: block; font-size: var(--step--1); color: var(--colour-muted); text-transform: uppercase; letter-spacing: 0.08em; }
</style>
```

- [ ] **Step 12: Verify the whole chapter**

Run: `npm run build`
Expected: succeeds; `dist/chapters/voltage-current-resistance/index.html` and eight directories under `dist/experiments/` exist.

Run: `npm run dev` and walk experiments 1 to 8 using the Next link. Check:
- every board renders a complete, traceable loop;
- prev/next chain 1→8 with no dead link, and experiment 1 has no Previous;
- the page is themed red;
- the chapter link in the eyebrow works.

- [ ] **Step 13: Commit**

```bash
git add src/content/chapters src/content/experiments src/lib/experiments.ts src/components/ExperimentCard.astro src/pages/chapters src/pages/experiments test/experiments-lib.test.ts test/content.test.ts
git commit -m "Add chapter 1 content with chapter and experiment page templates"
```

- [ ] **Step 14: Stop for review**

This task defines the pattern for 52 more experiments. Show the rendered chapter to the user and get agreement on the board layouts, the English voice and the page design before starting Task 12.

---

### Task 12: Chapter 2 — Series, Parallel and Mixed Circuits (experiments 9–29)

**Files:**
- Create: `src/content/chapters/series-parallel-mixed.yaml`
- Create: `src/content/experiments/09-*.yaml` … `29-*.yaml` (21 files)

**Interfaces:**
- Consumes: the schemas and page templates from Tasks 7 and 11. No new code.
- Produces: 21 experiment entries and one chapter entry.

- [ ] **Step 1: Render the source pages**

```bash
python -c "
import pymupdf
d = pymupdf.open('docs/620547_EasyElektro_Start_Manual_270521_web_kom.pdf')
for n in range(20, 36):
    d[n-1].get_pixmap(dpi=190).save('/tmp/ch2-%02d.png' % n)
"
```

PDF page 20 is the chapter opener, 21–34 hold experiments 9–29, and 35 is the deep dive. Several pages carry two or three experiments side by side — read the `VERSUCH N` badges, not the page count.

- [ ] **Step 2: Write the chapter file**

`src/content/chapters/series-parallel-mixed.yaml`:

```yaml
order: 2
title: Series, Parallel and Mixed Circuits
colour: green
intro:
  - Have you ever wondered why one dead bulb can kill a whole string of fairy lights, while switching off a lamp at home leaves every other light burning?
  - That is the difference between wiring things one after another and wiring them side by side. In this chapter you build both, and measure what each one does.
deepDive:
  - heading: Series circuits
    body:
      - When loads sit one after another, the same current flows through every one of them, and the battery's voltage is shared out between them.
  - heading: Parallel circuits
    body:
      - When loads sit side by side, each one gets the full battery voltage, but the current splits between the branches.
```

Replace the `intro` and `deepDive` text with your own English rendering of PDF pages 20 and 35 once you have read them.

- [ ] **Step 3: Write the 21 experiment files**

One file per experiment, `NN-slug.yaml`, numbers 9 through 29, `chapter: series-parallel-mixed`.

Follow exactly the procedure from Task 11 Step 7:

1. Read the rendered page for that `VERSUCH` badge.
2. `title` — natural English, not a transliteration.
3. `steps` — one entry per **SO GEHT'S** paragraph, as direct instructions.
4. `whatHappens` — one entry per **WAS PASSIERT?** paragraph.
5. `note` — only for a **TIPP!**, **ACHTUNG!** or **WICHTIG!** callout.
6. `boards` — one entry per numbered build diagram, transcribing topology and levels rather than exact hole coordinates.

Trace every loop before moving on. This chapter is where series and parallel structure carries the whole teaching point, so a board whose branches are wrong is worse than no board at all.

Several experiments here quote measured values ("about 0.19 amperes", "about 1.5 volts"). Keep those numbers — they are the point of the experiment — and convert decimal commas to decimal points.

- [ ] **Step 4: Verify**

Run: `npx vitest run test/content.test.ts`
Expected: PASS apart from the chapter-count assertion, which you should now set to `toHaveLength(2)`.

Run: `npm run build`
Expected: succeeds; 29 directories under `dist/experiments/`.

Run: `npm run dev` and page through experiments 9 to 29 with the Next link, checking each board traces a complete loop and each series/parallel structure matches what the text claims.

- [ ] **Step 5: Commit**

```bash
git add src/content test/content.test.ts
git commit -m "Add chapter 2: series, parallel and mixed circuits"
```

---

### Task 13: Chapter 3 — Switching (experiments 30–41)

**Files:**
- Create: `src/content/chapters/switching.yaml`
- Create: `src/content/experiments/30-*.yaml` … `41-*.yaml` (12 files)

**Interfaces:**
- Consumes: schemas and templates from Tasks 7 and 11. No new code.
- Produces: 12 experiment entries and one chapter entry.

- [ ] **Step 1: Render the source pages**

```bash
python -c "
import pymupdf
d = pymupdf.open('docs/620547_EasyElektro_Start_Manual_270521_web_kom.pdf')
for n in range(36, 48):
    d[n-1].get_pixmap(dpi=190).save('/tmp/ch3-%02d.png' % n)
"
```

PDF page 36 is the opener, 37–45 hold experiments 30–41, and 46–47 are the deep dive.

- [ ] **Step 2: Write the chapter file**

`src/content/chapters/switching.yaml`:

```yaml
order: 3
title: Switching
colour: orange
intro:
  - Every time you turn on a light you are using a switch. A switch does one simple job: it breaks the circuit or closes it again.
  - In this chapter you build switches that do cleverer things — two switches controlling one lamp, switches that only work together, and a traffic light you drive by hand.
deepDive:
  - heading: Hidden switches
    body:
      - Once you start looking, switches are everywhere. The light in the fridge, the one in the car door, the button on a doorbell.
```

Replace with your own English rendering of PDF pages 36 and 46–47.

- [ ] **Step 3: Write the 12 experiment files**

Numbers 30 through 41, `chapter: switching`. Same six-point procedure as Task 11 Step 7: read the page, translate the title naturally, one array entry per source paragraph for `steps` and `whatHappens`, `note` only for a callout, and one `boards` entry per numbered diagram transcribing topology and levels.

This chapter uses the `changeover` part heavily — the three-contact switch. When a changeover feeds two branches, make sure both branches are present on the board and that only one is closed at a time in the text. Experiment 34 (the traffic light) and experiment 35 (three lamps counting to seven) include a results table in the manual; render those rows as additional `whatHappens` entries in prose, since the schema has no table field.

- [ ] **Step 4: Verify**

Run: `npx vitest run test/content.test.ts` (set the chapter count to `toHaveLength(3)`)
Run: `npm run build` — expected: 41 experiment directories.
Page through 30 to 41 in dev and trace every loop.

- [ ] **Step 5: Commit**

```bash
git add src/content test/content.test.ts
git commit -m "Add chapter 3: switching"
```

---

### Task 14: Chapter 4 — Magnetism (experiments 42–52)

**Files:**
- Create: `src/content/chapters/magnetism.yaml`
- Create: `src/content/experiments/42-*.yaml` … `52-*.yaml` (11 files)

**Interfaces:**
- Consumes: schemas and templates from Tasks 7 and 11. No new code.
- Produces: 11 experiment entries and one chapter entry.

- [ ] **Step 1: Render the source pages**

```bash
python -c "
import pymupdf
d = pymupdf.open('docs/620547_EasyElektro_Start_Manual_270521_web_kom.pdf')
for n in range(48, 58):
    d[n-1].get_pixmap(dpi=190).save('/tmp/ch4-%02d.png' % n)
"
```

PDF page 48 is the opener, 49–56 hold experiments 42–52, and 57 is the deep dive.

- [ ] **Step 2: Write the chapter file**

`src/content/chapters/magnetism.yaml`:

```yaml
order: 4
title: Magnetism
colour: blue
intro:
  - You cannot see, hear or smell a magnetic field, and you certainly cannot taste it. But pull two magnets apart and you can feel it pushing back.
  - In this chapter you find out how electricity and magnetism are really the same story told two ways.
deepDive:
  - heading: Magnetism and electricity belong together
    body:
      - Every electromagnet works because a current makes a magnetic field. And every dynamo works because a moving magnet makes a current.
```

Replace with your own English rendering of PDF pages 48 and 57.

- [ ] **Step 3: Write the 11 experiment files**

Numbers 42 through 52, `chapter: magnetism`. Same six-point procedure as Task 11 Step 7.

Two things are specific to this chapter:

- Experiments 42 and 43 use no circuit at all — they are done with the bar magnet, paper clips and the compass in your hand. Give these an empty-circuit page by omitting `boards`… except the schema requires at least one board. For these, use a single board containing only the loose pieces involved, for example `- { type: magnet, at: 'D5' }` and `- { type: compass, at: 'D7' }`, with the caption "No circuit needed — just the magnet and the compass."
- Several experiments position the compass or the magnet *next to* the coil rather than wiring it in. Place those loose parts with `at` on a cell beside the coil so the reader can see the spatial relationship.

- [ ] **Step 4: Verify**

Run: `npx vitest run test/content.test.ts` (set the chapter count to `toHaveLength(4)`)
Run: `npm run build` — expected: 52 experiment directories.
Page through 42 to 52 in dev.

- [ ] **Step 5: Commit**

```bash
git add src/content test/content.test.ts
git commit -m "Add chapter 4: magnetism"
```

---

### Task 15: Chapter 5 — The Relay (experiments 53–60), and the full-set assertion

**Files:**
- Create: `src/content/chapters/relay.yaml`
- Create: `src/content/experiments/53-*.yaml` … `60-*.yaml` (8 files)
- Modify: `test/content.test.ts`

**Interfaces:**
- Consumes: schemas and templates from Tasks 7 and 11.
- Produces: the complete 60-experiment set, and the test that locks it.

- [ ] **Step 1: Render the source pages**

```bash
python -c "
import pymupdf
d = pymupdf.open('docs/620547_EasyElektro_Start_Manual_270521_web_kom.pdf')
for n in range(58, 67):
    d[n-1].get_pixmap(dpi=190).save('/tmp/ch5-%02d.png' % n)
"
```

PDF page 58 is the opener, 59–65 hold experiments 53–60, and 66 is the deep dive.

- [ ] **Step 2: Write the chapter file**

`src/content/chapters/relay.yaml`:

```yaml
order: 5
title: The Relay
colour: purple
intro:
  - A relay is a switch that another circuit can press for you. An electromagnet pulls the contacts together, so a small current can switch a much bigger one.
  - In this chapter you build an alarm that remembers it went off, a motor brake, and a code lock.
deepDive:
  - heading: Relays could remember
    body:
      - A relay can hold itself switched on. That is a way of storing one piece of information, and the first computers were built from rooms full of them.
```

Replace with your own English rendering of PDF pages 58 and 66.

- [ ] **Step 3: Write the eight experiment files**

Numbers 53 through 60, `chapter: relay`. Same six-point procedure as Task 11 Step 7.

The relay has four contacts and appears in every board in this chapter. Its coil side and its switched side belong to *different* loops — experiment 58 ("a relay remembers something") only makes sense if the self-holding path is drawn as a real, traceable loop back to the relay's own contact. Trace both loops on every board here, not just one.

- [ ] **Step 4: Restore the full-set assertions**

In `test/content.test.ts`, set the chapter count back to `toHaveLength(5)` and add:

```ts
it('covers all sixty experiments', () => {
  const numbers = loadYaml(EXPERIMENT_DIR)
    .map((e) => e.data.number)
    .sort((a, b) => a - b);
  expect(numbers).toEqual(Array.from({ length: 60 }, (_, i) => i + 1));
});

it('gives every experiment a distinct URL slug', () => {
  const slugs = readdirSync(EXPERIMENT_DIR)
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => f.replace(/\.yaml$/, '').replace(/^\d+-/, ''));
  expect(new Set(slugs).size).toBe(slugs.length);
});
```

- [ ] **Step 5: Verify**

Run: `npm test`
Expected: PASS, every suite, including the new all-sixty assertion.

Run: `npm run build`
Expected: succeeds; exactly 60 directories under `dist/experiments/`. Check with:

```bash
ls dist/experiments | wc -l
```

Expected: `61` (60 experiments plus the index directory added in Task 16 — until then, `60`).

- [ ] **Step 6: Commit**

```bash
git add src/content test/content.test.ts
git commit -m "Add chapter 5: the relay, completing all 60 experiments"
```

---

### Task 16: Home page and experiments index

**Files:**
- Create: `src/components/ChapterCard.astro`, `src/pages/experiments/index.astro`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: `getCollection`, `ExperimentCard`, `BaseLayout`, `url()`, `sortByNumber`.
- Produces: the site's entry points.

- [ ] **Step 1: Write `src/components/ChapterCard.astro`**

```astro
---
import { url } from '../lib/url';

interface Props {
  slug: string;
  order: number;
  title: string;
  blurb: string;
  colour: 'red' | 'green' | 'orange' | 'blue' | 'purple';
  count: number;
}

const { slug, order, title, blurb, colour, count } = Astro.props;
---
<a class="chapter-card" href={url(`/chapters/${slug}/`)} data-theme={colour}>
  <span class="eyebrow">Chapter {order} · {count} experiments</span>
  <h2>{title}</h2>
  <p>{blurb}</p>
</a>

<style>
  .chapter-card {
    display: block;
    padding: 1.5rem;
    border: 2px solid var(--colour-line);
    border-top: 8px solid var(--theme);
    border-radius: var(--radius);
    text-decoration: none;
    color: inherit;
  }
  .chapter-card:hover { background: var(--theme-wash); }
  .chapter-card h2 { margin: 0.35rem 0 0.5rem; font-size: var(--step-1); color: var(--theme); }
  .chapter-card p { margin: 0; }
  .eyebrow { font-size: var(--step--1); font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--colour-muted); }
</style>
```

`data-theme` on the card itself re-scopes `--theme`, so five differently coloured cards can sit on one page.

- [ ] **Step 2: Write the home page**

`src/pages/index.astro`:

```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '../layouts/BaseLayout.astro';
import ChapterCard from '../components/ChapterCard.astro';
import { url } from '../lib/url';

const chapters = (await getCollection('chapters')).sort(
  (a, b) => a.data.order - b.data.order,
);
const experiments = await getCollection('experiments');
const countFor = (slug: string) =>
  experiments.filter((e) => e.data.chapter.id === slug).length;
---
<BaseLayout title="Home" description="All 60 experiments from the KOSMOS Easy Elektro Start kit, in English.">
  <h1>Easy Elektro Start</h1>
  <p class="lede">
    Sixty experiments with the KOSMOS Easy Elektro Start kit, written in English.
    Build a circuit, switch it on, and find out what is really going on inside it.
  </p>

  <p>
    New to the kit? Start with <a href={url('/parts/')}>what is in the box</a>,
    then learn <a href={url('/build-tips/')}>how to read a build plan</a>.
  </p>

  <h2>The five chapters</h2>
  <div class="chapters">
    {chapters.map((chapter) => (
      <ChapterCard
        slug={chapter.id}
        order={chapter.data.order}
        title={chapter.data.title}
        blurb={chapter.data.intro[0]}
        colour={chapter.data.colour}
        count={countFor(chapter.id)}
      />
    ))}
  </div>

  <section class="safety">
    <h2>Before you start</h2>
    <ul>
      <li>This kit is not for children under 8. Younger children can choke on the small parts.</li>
      <li>Use two fresh AA batteries. Never use rechargeable batteries, and never mix old and new ones.</li>
      <li>Never connect the kit to a mains socket, and never join the battery's two ends directly — that is a short circuit, and the parts get hot.</li>
      <li>Build each circuit exactly as the plan shows before you switch on. Leaving out a bulb can damage the meter.</li>
      <li>Keep the spinning propeller away from faces, hair and animals.</li>
      <li>Take the batteries out when you have finished for the day.</li>
    </ul>
  </section>
</BaseLayout>

<style>
  .lede { font-size: var(--step-1); max-width: 40rem; }
  .chapters { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(min(100%, 22rem), 1fr)); }
  .safety { margin-top: 3rem; padding: 1.5rem; background: var(--colour-surface); border-radius: var(--radius); }
  .safety li { margin-bottom: 0.5rem; }
</style>
```

Check the safety list against PDF page 2 and correct anything that disagrees with the manual.

- [ ] **Step 3: Write `src/pages/experiments/index.astro`**

```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import ExperimentCard from '../../components/ExperimentCard.astro';
import { sortByNumber } from '../../lib/experiments';

const chapters = (await getCollection('chapters')).sort(
  (a, b) => a.data.order - b.data.order,
);
const experiments = await getCollection('experiments');
---
<BaseLayout title="All experiments" description="Every one of the 60 experiments, grouped by chapter.">
  <h1>All 60 experiments</h1>
  <p>Every experiment in the kit, in the order the manual runs them.</p>

  {chapters.map((chapter) => (
    <section data-theme={chapter.data.colour}>
      <h2>{chapter.data.title}</h2>
      <div class="cards">
        {sortByNumber(experiments.filter((e) => e.data.chapter.id === chapter.id)).map((exp) => (
          <ExperimentCard id={exp.id} number={exp.data.number} title={exp.data.title} />
        ))}
      </div>
    </section>
  ))}
</BaseLayout>

<style>
  section { margin-block: 2.5rem; }
  section h2 { color: var(--theme); }
  .cards { display: grid; gap: 0.75rem; grid-template-columns: repeat(auto-fill, minmax(min(100%, 20rem), 1fr)); }
</style>
```

- [ ] **Step 4: Verify**

Run: `npm run build`
Expected: succeeds.

Open the home page and `/experiments/` in dev. Confirm each chapter card shows the right experiment count (8, 21, 12, 11, 8 — totalling 60) and its own colour.

- [ ] **Step 5: Commit**

```bash
git add src/pages/index.astro src/pages/experiments/index.astro src/components/ChapterCard.astro
git commit -m "Add home page and full experiments index"
```

---

### Task 17: Accessibility and print pass, then deploy

**Files:**
- Delete: `src/pages/sandbox.astro`
- Modify: `src/styles/global.css`, `src/components/Board.astro` (as findings require)
- Create: `public/favicon.svg`

**Interfaces:**
- Consumes: everything.
- Produces: a deployed site.

- [ ] **Step 1: Remove the sandbox page**

```bash
git rm src/pages/sandbox.astro
```

- [ ] **Step 2: Add a favicon**

`public/favicon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="#1f6fd0" />
  <circle cx="32" cy="32" r="14" fill="none" stroke="#fff" stroke-width="5" />
  <line x1="22" y1="22" x2="42" y2="42" stroke="#fff" stroke-width="5" />
  <line x1="22" y1="42" x2="42" y2="22" stroke="#fff" stroke-width="5" />
</svg>
```

Reference it in `BaseLayout.astro`'s `<head>`:

```astro
<link rel="icon" type="image/svg+xml" href={url('/favicon.svg')} />
```

- [ ] **Step 3: Accessibility pass**

Check and fix:

- Every `<Board>` renders `role="img"` with a non-empty `aria-label` — confirm by viewing source on an experiment page.
- Headings descend without skipping a level on every page type.
- Colour is never the only signal: a chapter is identified by its name as well as its colour, and a part by its label as well as its colour. Fix any place that fails this.
- Text contrast is at least 4.5:1 against its background. `--colour-muted` (`#5c6b7f`) on `--colour-surface` (`#f3f5f8`) is the tightest pair — verify it and darken `--colour-muted` if it falls short.
- Every interactive element reaches a visible focus ring by keyboard. Tab through an experiment page start to finish.
- `prefers-reduced-motion` — there is no motion on this site, so there is nothing to do, but confirm no CSS transition crept in.

- [ ] **Step 4: Print pass**

Print-preview an experiment page. Board diagrams must not be cut across a page break. Add to `global.css`:

```css
@media print {
  .board, .explain { break-inside: avoid; }
  .pager { display: none; }
  a { color: inherit; text-decoration: none; }
}
```

- [ ] **Step 5: Full verification**

```bash
npm test
npm run build
ls dist/experiments | wc -l
```

Expected: all tests pass; build succeeds; 61 entries (60 experiments plus `index`).

Check for any bare internal link that skipped the helper:

```bash
grep -rn 'href="/' src/ || echo "no bare absolute links"
```

Expected: `no bare absolute links`.

- [ ] **Step 6: Commit and push**

```bash
git add -A
git commit -m "Accessibility and print pass, add favicon, remove sandbox"
git push -u origin main
```

- [ ] **Step 7: Create the repository and enable Pages**

```bash
gh repo create electro-kit-site --public --source=. --push
```

Then, either in the GitHub UI under **Settings → Pages → Source**, or with:

```bash
gh api -X POST repos/:owner/electro-kit-site/pages -f build_type=workflow
```

set the Pages source to **GitHub Actions**. The deploy job fails until this is done.

- [ ] **Step 8: Verify the deployment**

```bash
gh run watch
```

Expected: both jobs succeed. Then open `https://vincentpeters.github.io/electro-kit-site/` and click through: home → a chapter → an experiment → Next. Every link must resolve, and every board must render.

---

## Self-review

**Spec coverage:**

| Spec section | Task |
|---|---|
| Content model — chapters | 7, 11–15 |
| Content model — experiments | 7, 11–15 |
| Board renderer and symbol library | 3, 4, 5a, 5b, 6 |
| Site structure — `/` | 16 |
| Site structure — `/parts/` | 9 |
| Site structure — `/build-tips/` | 10 |
| Site structure — `/chapters/[slug]/` | 11 |
| Site structure — `/experiments/` | 16 |
| Site structure — `/experiments/[slug]/` | 11 |
| Visual design — tokens, theming, mobile | 8 |
| Build, test, deploy | 1, 17 |
| Verification steps 1–4 | 7, 15, 17 |
| Attribution footer | 8 |
| Base-path safety | 2, 17 |

No spec section is unassigned.

**Type consistency checked:** `PlacedPart` is defined once in `src/board/describe.ts` and imported by `Part.astro` and the schema. `PartType` comes from the registry and is used unchanged in `symbols.ts`, `describe.ts` and `PartSwatch.astro`. `experimentSlug` and `sortByNumber` keep the same signatures in Tasks 11 and 16. `symbolMarkup(type, length)` has one signature across Tasks 5a, 5b, 6 and 9.

**Known handovers** (tests deliberately left red at a task boundary, each with the task that closes them): Task 5a leaves the "every part" symbol test failing → closed by Task 5b. Task 7 leaves the chapter-count assertion failing → stepped up through Tasks 11–14 and closed by Task 15.
