import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { chapterSchema, experimentSchema } from '../src/content/schema';
import { ROWS, parseCell } from '../src/board/geometry';
import { PARTS, type PartType } from '../src/parts/registry';

const CHAPTER_DIR = 'src/content/chapters';
const EXPERIMENT_DIR = 'src/content/experiments';

function yamlFiles(dir: string): string[] {
  return readdirSync(dir).filter((f) => f.endsWith('.yaml'));
}

function loadYaml(dir: string) {
  return yamlFiles(dir).map((file) => ({
    file,
    data: parse(readFileSync(join(dir, file), 'utf8')),
  }));
}

describe('chapter content', () => {
  it('validates every chapter file against the schema', () => {
    for (const { file, data } of loadYaml(CHAPTER_DIR)) {
      const result = chapterSchema.safeParse(data);
      expect(result.success, `${file}: ${JSON.stringify(result.error?.issues)}`).toBe(true);
    }
  });

  it('never gives two chapters the same position', () => {
    const orders = loadYaml(CHAPTER_DIR).map((c) => c.data.order);
    expect(new Set(orders).size).toBe(orders.length);
  });

  it('never gives two chapters the same colour', () => {
    const colours = loadYaml(CHAPTER_DIR).map((c) => c.data.colour);
    expect(new Set(colours).size).toBe(colours.length);
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
    const slugs = new Set(yamlFiles(CHAPTER_DIR).map((f) => f.replace(/\.yaml$/, '')));
    for (const { file, data } of loadYaml(EXPERIMENT_DIR)) {
      expect(slugs.has(data.chapter), `${file} references chapter ${data.chapter}`).toBe(true);
    }
  });

  it('numbers files to match the experiment number inside them', () => {
    for (const { file, data } of loadYaml(EXPERIMENT_DIR)) {
      expect(Number(file.slice(0, 2)), `${file} filename prefix`).toBe(data.number);
    }
  });

  it('uses each experiment number exactly once', () => {
    const numbers = loadYaml(EXPERIMENT_DIR).map((e) => e.data.number);
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  it('gives every experiment a distinct URL slug', () => {
    const slugs = yamlFiles(EXPERIMENT_DIR).map((f) =>
      f.replace(/\.yaml$/, '').replace(/^\d+-/, ''),
    );
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('writes every part span left-to-right or top-to-bottom', () => {
    // A part drawn from right to left is rotated 180 degrees, which stands
    // its labels and kit number on their head. Spans are written in reading
    // order so that can never happen.
    for (const { file, data } of loadYaml(EXPERIMENT_DIR)) {
      for (const board of data.boards ?? []) {
        for (const part of board.parts ?? []) {
          if (!part.from || !part.to) continue;
          const from = parseCell(part.from);
          const to = parseCell(part.to);
          const inOrder =
            from.row < to.row || (from.row === to.row && from.col < to.col);
          expect(
            inOrder,
            `${file}: ${part.type} runs backwards from ${part.from} to ${part.to}`,
          ).toBe(true);
        }
      }
    }
  });

  it('keeps every part inside a single row or a single column', () => {
    for (const { file, data } of loadYaml(EXPERIMENT_DIR)) {
      for (const board of data.boards ?? []) {
        for (const part of board.parts ?? []) {
          if (!part.from || !part.to) continue;
          const from = parseCell(part.from);
          const to = parseCell(part.to);
          expect(
            from.row === to.row || from.col === to.col,
            `${file}: ${part.type} runs diagonally from ${part.from} to ${part.to}`,
          ).toBe(true);
        }
      }
    }
  });

  it('spans a part across exactly the number of holes it has contacts for', () => {
    for (const { file, data } of loadYaml(EXPERIMENT_DIR)) {
      for (const board of data.boards ?? []) {
        for (const part of board.parts ?? []) {
          if (!part.from || !part.to) continue;
          const from = parseCell(part.from);
          const to = parseCell(part.to);
          const holes = Math.abs(to.row - from.row) + Math.abs(to.col - from.col) + 1;
          expect(
            holes,
            `${file}: ${part.type} from ${part.from} to ${part.to} covers ${holes} holes`,
          ).toBe(PARTS[part.type as PartType].cells);
        }
      }
    }
  });

  it('never uses more of a part than the kit contains', () => {
    for (const { file, data } of loadYaml(EXPERIMENT_DIR)) {
      for (const [i, board] of (data.boards ?? []).entries()) {
        const used = new Map<string, number>();
        for (const part of board.parts ?? []) {
          used.set(part.type, (used.get(part.type) ?? 0) + 1);
        }
        for (const [type, count] of used) {
          expect(
            count,
            `${file} board ${i + 1} uses ${count} x ${type}, kit has ${PARTS[type as PartType].count}`,
          ).toBeLessThanOrEqual(PARTS[type as PartType].count);
        }
      }
    }
  });

  it('closes the loop between the two battery terminals on every board', () => {
    // The commonest way to draw a broken circuit is to leave a terminal
    // stranded. Union the cells each part joins, then check that the minus
    // terminal at D2 and the plus terminal at F2 end up in one component.
    const parent = new Map<string, string>();
    const find = (a: string): string => {
      if (!parent.has(a)) parent.set(a, a);
      const up = parent.get(a)!;
      if (up === a) return a;
      const root = find(up);
      parent.set(a, root);
      return root;
    };
    const union = (a: string, b: string) => {
      parent.set(find(a), find(b));
    };

    const broken: string[] = [];
    for (const { file, data } of loadYaml(EXPERIMENT_DIR)) {
      for (const [i, board] of (data.boards ?? []).entries()) {
        parent.clear();
        for (const part of board.parts ?? []) {
          if (!part.from || !part.to) continue;
          const from = parseCell(part.from);
          const to = parseCell(part.to);
          const steps =
            Math.abs(to.row - from.row) + Math.abs(to.col - from.col);
          const dRow = Math.sign(to.row - from.row);
          const dCol = Math.sign(to.col - from.col);
          // A connector strip has a contact at every hole it covers; a
          // component only at its two ends. Either way the ends are joined.
          for (let s = 0; s < steps; s += 1) {
            const a = `${ROWS[from.row + dRow * s]}${from.col + dCol * s + 1}`;
            const b = `${ROWS[from.row + dRow * (s + 1)]}${from.col + dCol * (s + 1) + 1}`;
            union(a, b);
          }
        }
        if (board.openGap || board.noBattery) continue;
        if (find('D2') !== find('F2')) {
          broken.push(`${file} board ${i + 1}`);
        }
      }
    }

    expect(
      broken,
      `these boards have no complete path from the battery minus terminal at D2 to the plus terminal at F2`,
    ).toEqual([]);
  });
});
