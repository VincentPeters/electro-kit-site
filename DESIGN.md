# Design

## Theme

**Workshop instrument panel.** Light, hard-edged, high contrast. Graphite
chrome on a cool near-white, with the kit's own four-colour part code kept in
quarantine for diagrams only. Reference points are the printed technical manual
and German instrument signage, not blueprints and not children's publishing.

The scene that decides it: a nine-year-old at a kitchen table under an overhead
light at five in the afternoon, phone propped against a cereal box, glancing
between screen and baseplate. Bright ambient light, glanced-at reading, one
thumb. That forces a light theme and large, heavy type.

## Color

OKLCH throughout. Strategy: **committed** — graphite carries the chrome,
chapter colour drenches the chapter and experiment headers, and the body is a
quiet near-white so the circuit diagrams are the loudest thing on the page.

### Neutrals

Cool-tinted toward the kit's conductor blue (hue 250), never toward warm.

| Token | Value | Use |
|---|---|---|
| `--ink` | `oklch(0.22 0.018 250)` | Body text, graphite chrome surfaces |
| `--ink-strong` | `oklch(0.15 0.02 250)` | Headings, masthead |
| `--muted` | `oklch(0.49 0.022 250)` | Captions, metadata |
| `--paper` | `oklch(0.985 0.003 250)` | Page background |
| `--surface` | `oklch(0.955 0.006 250)` | Panels, table zebra |
| `--line` | `oklch(0.885 0.01 250)` | Rules, borders |

### The kit part code (never used for UI chrome)

Printed on the physical parts; the diagrams and the parts page are the only
places these appear.

| Token | Value | Meaning |
|---|---|---|
| `--part-conductor` | `#1f6fd0` | Carries current |
| `--part-load` | `#d92b2b` | Uses current |
| `--part-switch` | `#199a55` | Switches current |
| `--part-instrument` | `#1d1d1f` | Measures current |

### Chapter colours

Five deep hues, dark enough to hold white type at display sizes. They appear
only in chapter identity contexts (header bands, chapter index, pagers), always
paired with a chapter number and name so hue is never the only signal.

`red oklch(0.45 0.18 27)` · `orange oklch(0.50 0.14 62)` ·
`green oklch(0.43 0.12 155)` · `blue oklch(0.44 0.16 250)` ·
`purple oklch(0.42 0.17 300)`

## Typography

**Archivo variable, one family, width as the contrast axis.** A grotesque with
signage roots: engineered without costume. Display type uses the expanded width
at heavy weights; body uses normal width. No serif, no monospace — coordinate
chips use Archivo's tabular figures with tracking instead, so nothing is
dressed up to look technical.

- Display: `Archivo`, `font-stretch: 112%`, weight 800, `letter-spacing: -0.02em`
- Body: `Archivo`, `font-stretch: 100%`, weight 400, `line-height: 1.6`
- Chips / coordinates: weight 700, `font-variant-numeric: tabular-nums`,
  `letter-spacing: 0.06em`

Scale ratio ≈ 1.33, fluid via `clamp()`. Body starts at 17px and runs to 19px:
larger than a normal reading site because the screen is at arm's length.
Display ceiling is 4.4rem.

## Layout

- Container `min(76rem, 100% - 2.5rem)`.
- Experiment pages are build sheets: diagram and step ladder side by side above
  1000px, diagram first and sticky on narrow screens so it stays visible while
  the steps scroll under a thumb.
- Chapter and experiment pages open with a full-bleed drenched chapter band.
- Panels are flat-bordered, never nested, never side-striped.
- Radii are small (4 / 8 / 14px) to read as snap-fit plastic, not as bubbles.

## Components

- **Masthead** — graphite bar, expanded wordmark, hex-grid motif lifted from
  the baseplate's hole pattern.
- **Chapter band** — drenched chapter colour, chapter number as a large hex
  glyph, white display title.
- **Step ladder** — numbered rows with hex number markers, generous tap-sized
  line height, a rule between steps rather than cards.
- **Board figure** — framed by a thin rule with a caption bar, so the diagram
  reads as a plate in a manual.
- **Board labels** — kit numbers (coloured ring, part's own colour), level
  chips (grey outline, `L2` / `L3`, so a level can never be misread as a part
  number) and contact letters. Positions are solved for the whole board at
  once by `src/board/annotate.ts`: every part is an obstacle, every label
  proposes candidate spots around its anchor, and a repair pass re-seats
  whatever is still colliding. A label pushed beyond arm's length of its
  anchor keeps a thin leader line back to it. Labels stay on the grey plate
  so they are never confused with the row letters and column numbers.
- **Experiment tile** — hex number marker plus title, flat bordered, colour
  only on the marker.
- **Pager** — full-width split bar with previous / next titles.

## Motion

Restrained and mechanical. `cubic-bezier(0.22, 1, 0.36, 1)` at 160–240ms on
hover and focus states only, plus one staggered entrance on the home page
chapter list. No scroll-reveal scaffolding. Every animation has a
`prefers-reduced-motion` fallback, and nothing is hidden by default.
