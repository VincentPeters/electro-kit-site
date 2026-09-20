import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { PLATE, boxOverlap, layoutLabels, type PlacedLabel } from '../src/board/annotate';
import type { PlacedPart } from '../src/board/describe';
import { cellCenter } from '../src/board/geometry';

/** How far two labels interpenetrate; zero means they are clear of each other. */
function clearance(a: PlacedLabel, b: PlacedLabel): number {
  return boxOverlap(a, b);
}

function pairs(labels: PlacedLabel[]): [PlacedLabel, PlacedLabel][] {
  const out: [PlacedLabel, PlacedLabel][] = [];
  for (let i = 0; i < labels.length; i++) {
    for (let j = i + 1; j < labels.length; j++) out.push([labels[i], labels[j]]);
  }
  return out;
}

/** Experiment 30, the plan that made fixed offsets untenable. */
const changeoverPlan: PlacedPart[] = [
  { type: 'link2', from: 'D2', to: 'D3', level: 1 },
  { type: 'changeover', from: 'C3', to: 'E3', level: 2 },
  { type: 'lamp', from: 'C3', to: 'C4', level: 3 },
  { type: 'lamp', from: 'E3', to: 'E4', level: 3 },
  { type: 'link3', from: 'C4', to: 'E4', level: 1 },
  { type: 'link2', from: 'E4', to: 'F4', level: 2 },
  { type: 'link3', from: 'F2', to: 'F4', level: 1 },
];

const EXPERIMENT_DIR = 'src/content/experiments';

/** Every build plan in the book, as the site actually draws them. */
function everyBoard(): { name: string; parts: PlacedPart[] }[] {
  return readdirSync(EXPERIMENT_DIR)
    .filter((f) => f.endsWith('.yaml'))
    .flatMap((file) => {
      const data = parse(readFileSync(join(EXPERIMENT_DIR, file), 'utf8'));
      return (data.boards ?? []).map((board: { caption?: string; parts: PlacedPart[] }, i: number) => ({
        name: `${file} board ${i + 1}`,
        parts: board.parts,
      }));
    });
}

describe('layoutLabels', () => {
  it('gives an uncrowded part its label on the preferred side', () => {
    const [badge] = layoutLabels([{ type: 'link2', from: 'D5', to: 'D6', level: 1 }]);
    const anchor = { x: (cellCenter('D5').x + cellCenter('D6').x) / 2, y: cellCenter('D5').y };

    expect(badge.kind).toBe('kit');
    expect(badge.text).toBe('2');
    // Beside a horizontal part means above it, and close to it.
    expect(badge.y).toBeLessThan(anchor.y);
    expect(Math.abs(badge.x - anchor.x)).toBeLessThan(1);
    expect(badge.leader).toBe(false);
  });

  it('separates the level chips of two parts that start at the same hole', () => {
    const levels = layoutLabels(changeoverPlan).filter((l) => l.kind === 'level');
    const atC3 = levels.filter(
      (l) => Math.hypot(l.anchor.x - cellCenter('C3').x, l.anchor.y - cellCenter('C3').y) < 1,
    );

    expect(atC3.map((l) => l.text).sort()).toEqual(['L2', 'L3']);
    expect(clearance(atC3[0], atC3[1])).toBe(0);
  });

  it('leaves no two labels overlapping on a crowded plan', () => {
    const labels = layoutLabels(changeoverPlan);
    const collisions = pairs(labels).filter(([a, b]) => clearance(a, b) > 0);

    expect(collisions.map(([a, b]) => `${a.text}/${b.text}`)).toEqual([]);
  });

  it('keeps every label on the baseplate, clear of the row and column gutters', () => {
    const labels = layoutLabels(changeoverPlan);

    for (const label of labels) {
      expect(label.x - label.rx).toBeGreaterThanOrEqual(PLATE.left);
      expect(label.x + label.rx).toBeLessThanOrEqual(PLATE.right);
      expect(label.y - label.ry).toBeGreaterThanOrEqual(PLATE.top);
      expect(label.y + label.ry).toBeLessThanOrEqual(PLATE.bottom);
    }
  });

  it('labels a level as L2, so it cannot be read as a part number', () => {
    const labels = layoutLabels([{ type: 'lamp', from: 'D4', to: 'D5', level: 2 }]);

    expect(labels.find((l) => l.kind === 'level')?.text).toBe('L2');
    expect(labels.find((l) => l.kind === 'kit')?.text).toBe('18');
  });

  it('omits a level chip for a part sitting on the baseplate', () => {
    const labels = layoutLabels([{ type: 'lamp', from: 'D4', to: 'D5', level: 1 }]);

    expect(labels.some((l) => l.kind === 'level')).toBe(false);
  });

  it('draws the three contact letters of a changeover switch', () => {
    const contacts = layoutLabels([{ type: 'changeover', from: 'C6', to: 'E6', level: 1 }])
      .filter((l) => l.kind === 'contact')
      .map((l) => l.text);

    expect(contacts.sort()).toEqual(['A', 'B', 'C']);
  });

  it('leaves no label overlapping another on any of the 60 experiments', () => {
    const offenders = everyBoard().flatMap(({ name, parts }) =>
      pairs(layoutLabels(parts))
        .filter(([a, b]) => clearance(a, b) > 0)
        .map(([a, b]) => `${name}: ${a.text} over ${b.text}`),
    );

    expect(offenders).toEqual([]);
  });

  it('keeps every label on the baseplate on any of the 60 experiments', () => {
    const offenders = everyBoard().flatMap(({ name, parts }) =>
      layoutLabels(parts)
        .filter(
          (l) =>
            l.x - l.rx < PLATE.left ||
            l.x + l.rx > PLATE.right ||
            l.y - l.ry < PLATE.top ||
            l.y + l.ry > PLATE.bottom,
        )
        .map((l) => `${name}: ${l.text} at ${Math.round(l.x)},${Math.round(l.y)}`),
    );

    expect(offenders).toEqual([]);
  });

  it('is deterministic, so the same plan always renders the same plate', () => {
    expect(layoutLabels(changeoverPlan)).toEqual(layoutLabels(changeoverPlan));
  });
});
