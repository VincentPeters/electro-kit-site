# Open issues

State of the site as of 2026-09-20, after the initial build. Everything here is
known and deliberate — nothing in this list is blocking the site, which is live
at <https://vincentpeters.github.io/electro-kit-site/> with all 60 experiments.

Ordered roughly by what would bite first.

---

## 1. Correctness

### 1.1 No circuit has been built with the actual kit

**The biggest open risk.** Every board is verified by the invariants in
`test/content.test.ts` and about ten of them were checked by eye. None has been
built with real parts.

The invariants prove a board is *plausible*: parts span the right number of
holes, nothing runs backwards or diagonally, no board uses more of a part than
the box contains, every board closes a loop between the battery terminals, and
none shorts those terminals through bare strips. They cannot prove the circuit
does what the text claims it does.

Build these four first — they are the ones where a wiring mistake would be least
obvious:

| Experiment | Why it is the risky one |
|---|---|
| 60 — An Electric Code Lock | The most complex board in the book, and the one I had least confidence in when laying out. Two changeovers, two buttons, a switch, lamp, buzzer and relay. |
| 34 — Directing Traffic by Hand | The traffic-light table asserts five specific switch combinations. Any of them could be wrong. |
| 59 — I Do Not Forget the Alarm | Latching behaviour through the reed switch and the work contact. Subtle. |
| 58 — A Relay Remembers Something | Self-holding path. Easy to get almost-right. |

### 1.2 CI builds but never runs the tests

Fixed: the deploy workflow now runs `npm test` before building, so an incoherent progression cannot deploy.

### 1.3 Roughly fifty boards have never been looked at

The invariants are structural. They say nothing about whether a kit-number badge
has landed on top of a bulb, or a contact letter is sitting under a blue strip.

Known example: on experiment 27 the on/off switch's `OFF`/`ON` labels overlap a
kit badge. Contact lettering has a white halo (`Part.astro`) so it stays
readable, but it can still sit over a part.

There is no longer a page that renders every board at once — `src/pages/sandbox.astro`
was deleted in the final pass. Worth reinstating as a dev-only review page.

---

## 2. Fidelity to the manual

All 60 experiments — titles, steps, what-happens, sidebars, tables — were
transcribed from the rendered manual pages. **Some chapter front matter was
not.** Where a page was not read, I wrote the section from subject knowledge in
the site's own voice. It is accurate as physics and consistent in tone, but it
is not a rendering of what the manual actually says.

| Content | Source PDF page | Status |
|---|---|---|
| Ch 1 intro + deep dive | 10, 19 | Transcribed |
| Ch 2 intro | 20 | Transcribed |
| Ch 2 deep dive | 35 | **Low-resolution read only** — verify |
| Ch 3 intro | 36 | **Not read** — written from knowledge |
| Ch 3 deep dive | 46, 47 | Page 46 transcribed; **page 47 not read** |
| Ch 4 intro | 48 | **Not read** — written from knowledge |
| Ch 4 deep dive | 57 | Transcribed |
| Ch 5 intro | 58 | **Not read** — written from knowledge |
| Ch 5 deep dive | 66 | **Not read** — written from knowledge |

To close these, render the page and compare:

```bash
python -c "
import pymupdf
d = pymupdf.open('docs/620547_EasyElektro_Start_Manual_270521_web_kom.pdf')
for n in (35, 36, 47, 48, 58, 66):
    d[n-1].get_pixmap(dpi=200).save('/tmp/page-%02d.png' % n)
"
```

Remember the offset: **PDF page = printed manual page + 2**.

---

## 3. Code and design debt

### 3.1 The content generators are gone, and were broken when last seen

The 60 YAML files were written by Python generator scripts in the session
scratch directory (`gen_ch1.py` … `gen_ch5.py` plus `yamlgen.py`). Three of them
were corrupted by a bad bulk edit near the end, and the scratch directory is
temporary.

This is not a loss — the generated YAML is committed and is now the source of
truth — but be aware there is no script to regenerate it. **Edit the YAML
directly.** Do not go looking for the generators.

### 3.2 `relay` is in the registry but never placed on a board

`src/parts/registry.ts` defines three relay entries:

- `relay` — the physical part, shown on the parts page, **never used on a board**
- `relayCoil`, `relaySwitch` — the two halves that boards actually use, flagged
  `boardOnly: true` so the parts page lists the relay once

It works, and the split is deliberate: the coil and the contacts belong to two
circuits that must not be joined. But `relay` sits in `BOARD_PARTS` while being
unusable on a board, which will confuse the next person. Consider a clearer
split between "parts in the box" and "symbols a board may use".

### 3.3 The meter's kit number is hardcoded

`src/parts/symbols.ts:258` prints `56` as a string literal inside
`meterMarkup`, because the meter has no room for the badge that every other part
gets from `kitBadge()`. If the registry's `kitNumber` for the meter ever
changes, the drawing will silently disagree with the parts page.

### 3.4 `openGap` is used exactly once

`src/content/schema.ts` carries `openGap` for boards that deliberately leave a
gap, and only experiment 8 (the paper-clip conductivity test) uses it.
`noBattery` is better earned, with four uses. Not a problem, just thin.

### 3.5 The `resistance` concept's placement is a judgement call

`src/content/concepts/resistance.yaml` is introduced at experiment 11
(`introduces: ["resistance"]` in `11-swapping-partners-bulb-and-coil.yaml`).
Chapter 1's deep dive already discusses resistance, but no experiment before
11 really introduces it as an idea the reader does something with. This is
the least confident placement in the concept spine; `test/progression.test.ts`
checks that the spine is internally coherent, not that any one placement is
the best teaching moment.

---

## 4. Not done, on purpose

These were scoped out. Listed so nobody wonders whether they were forgotten.

- **No search.** Sixty entries and a flat index were judged enough.
- **No interactive circuit simulation.** Considered during design and cut.
- **No accounts, so "I built this" progress is per-device and per-browser.**
  `src/scripts/progress.ts` keeps the tick list in `localStorage` only. A
  phone and a tablet will not agree with each other, and clearing browser
  data loses it. There is no backend to sync against. This is the correct
  trade for a static site with no sign-in, but it is worth stating rather
  than leaving a reader to discover it by losing their progress.
- **Diagrams are topologically faithful, not pixel-faithful.** Right parts, right
  series/parallel structure, right switch positions and levels — laid out for
  clarity rather than copying the manual's exact hole coordinates. This is a
  rebuild, not a reproduction. Do not "fix" a board to match the book hole for
  hole without a reason.
- **No dark mode.**

---

## 5. Smaller things

- **Print was never previewed.** The rules in `src/styles/global.css` (avoid
  breaking inside a board, hide the pager) are written but unverified.
- **No skip-to-content link.** Heading order and colour contrast were checked by
  hand — all five chapter colours clear 4.5:1 on white — but the site has had no
  automated accessibility audit.
- **Board `aria-label`s are long.** `describeBoard()` emits a factual part list
  ("Bulb from D4 to D5, on level 2; …"). Accurate, and better than bare SVG, but
  a long board makes for a long sentence.
- **The Astro 7 upgrade was eyeballed on two pages.** Tests, typecheck and build
  all pass and the output is byte-comparable in structure, but only two pages
  were viewed after the upgrade.
- **The experiment tile's tick is CSS generated content.** `ExperimentCard.astro`
  paints it with `.tile[data-built='true'] .title::after { content: ' ✓' }`,
  which most screen readers do not announce, so a built tile is inconsistently
  exposed on the index. The experiment page's own "I built this" button is
  the reliable version: it carries `aria-pressed` and its label changes
  between "I built this" and "Built it".

---

## Running the checks

```bash
npm test          # 68 tests: 6 board invariants + unit tests
npm run build     # must emit 69 pages, 60 under dist/experiments
npx tsc --noEmit  # use ./node_modules/.bin/tsc if npx grabs the wrong one
npm audit         # currently zero vulnerabilities
```
