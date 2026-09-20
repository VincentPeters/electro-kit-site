import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { chapterSchema, experimentSchema } from '../src/content/schema';
import { parseCell } from '../src/board/geometry';
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
});
