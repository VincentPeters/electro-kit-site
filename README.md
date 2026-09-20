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

## The source manual

`docs/*.pdf` is the publisher's copyrighted manual. It is gitignored on
purpose — it is a local working reference and must not be committed or
published.
