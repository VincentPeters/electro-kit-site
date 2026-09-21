import { describe, expect, it } from 'vitest';
import {
  BOARD_PARTS,
  LOOSE_PARTS,
  PARTS,
  isPartType,
  partDef,
  type PartType,
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
      const def = partDef(`link${n}` as PartType);
      expect(def.family).toBe('conductor');
      expect(def.cells).toBe(n);
      expect(def.kitNumber).toBe(n);
    }
  });

  it('gives every part a label and a description', () => {
    for (const [type, def] of Object.entries(PARTS)) {
      expect(def.label, `${type} label`).toMatch(/\S/);
      expect(def.description, `${type} description`).toMatch(/\S/);
      expect(def.cells, `${type} cells`).toBeGreaterThanOrEqual(1);
      expect(def.count, `${type} count`).toBeGreaterThanOrEqual(1);
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

  it('never reuses a kit part number', () => {
    const numbers = Object.values(PARTS)
      .map((p) => p.kitNumber)
      .filter((n): n is number => n !== undefined);
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  it('records the counts printed in the manual', () => {
    expect(partDef('link1').count).toBe(4);
    expect(partDef('link2').count).toBe(7);
    expect(partDef('lamp').count).toBe(3);
    expect(partDef('button').count).toBe(2);
    expect(partDef('changeover').count).toBe(2);
    expect(partDef('relay').count).toBe(1);
  });

  it('draws the coil blue and the reed switch red, as the kit does', () => {
    expect(partDef('coil').colour).toBe('conductor');
    expect(partDef('reedSwitch').colour).toBe('load');
  });

  it('explains every part in plain language', () => {
    for (const [type, def] of Object.entries(PARTS)) {
      expect(def.eli5, `${type} has no eli5`).toBeTruthy();
      expect(def.eli5.length, `${type}'s eli5 is too short to say anything`).toBeGreaterThan(20);
    }
  });

  it('does not simply repeat the description', () => {
    for (const [type, def] of Object.entries(PARTS)) {
      expect(def.eli5, `${type} repeats its description verbatim`).not.toBe(def.description);
    }
  });
});

describe('partDef', () => {
  it('throws on an unknown part rather than returning undefined', () => {
    expect(() => partDef('nonsense' as PartType)).toThrow(/Unknown part type: nonsense/);
  });
});
