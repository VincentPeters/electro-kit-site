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

## How the diagrams work

Board diagrams are not images. Each experiment declares the parts it uses and
where they sit on the baseplate grid:

```yaml
boards:
  - caption: Build plan 1
    parts:
      - { type: lamp, from: D4, to: D5, level: 2 }
      - { type: switch, from: F2, to: F4, level: 1 }
```

`src/components/Board.astro` renders that against a shared SVG symbol registry
in `src/parts/`. The same registry draws the parts page, so the site has one
visual vocabulary defined in one place.

## How the concept spine works

The site tracks thirteen big ideas (current, resistance, series, relay, and
so on) as a `concepts` content collection, one YAML file per idea in
`src/content/concepts/`:

```yaml
name: "Resistance"
order: 7
oneLiner: "Some parts are hard work to get through, and the harder the work, the less current goes round."
eli5:
  - "A connector strip is easy to travel along. Other things are not..."
```

Each experiment then tags itself against these ideas rather than describing
its own place in the story:

```yaml
introduces: ["resistance"]
practises: ["current"]
```

`introduces` names a concept the experiment is the first to teach;
`practises` names one it leans on that an earlier experiment already
introduced. The "New idea" and "Builds on" thread a reader sees under the
chapter band (`src/components/ThreadLine.astro`) is derived entirely from
these tags — nobody writes "you already know about resistance from
experiment 11" by hand. `test/progression.test.ts` enforces that the result
stays coherent: every concept is introduced exactly once, nothing is
practised before it is introduced, and concept order matches teaching order.
A future edit that breaks the story fails the test, not just the reading
experience.

## The source manual

`docs/*.pdf` is the publisher's copyrighted manual. It is gitignored on
purpose — it is a local working reference and must not be committed or
published.
