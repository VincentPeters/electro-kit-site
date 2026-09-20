import { describe, expect, it } from 'vitest';
import { PART_COLOURS, studMarkup, symbolMarkup } from '../src/parts/symbols';
import { PARTS, partDef, type PartType } from '../src/parts/registry';

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
      expect(markup, `${type} markup`).toMatch(/<(circle|rect|path|line|g|text|polygon|ellipse)/);
    }
  });

  it('scales a symbol to the span it is given', () => {
    expect(symbolMarkup('link5', 256)).toContain('cx="256"');
    expect(symbolMarkup('link5', 64)).toContain('cx="64"');
  });

  it('honours a part colour override rather than its family colour', () => {
    expect(symbolMarkup('coil', 128)).toContain(PART_COLOURS.conductor);
    expect(symbolMarkup('reedSwitch', 128)).toContain(PART_COLOURS.load);
  });

  it('uses each part own colour consistently with the registry', () => {
    for (const type of Object.keys(PARTS) as PartType[]) {
      const expected = PART_COLOURS[partDef(type).colour];
      expect(symbolMarkup(type, 128), `${type} colour`).toContain(expected);
    }
  });

  it('never emits NaN coordinates for a zero-length part', () => {
    for (const type of Object.keys(PARTS) as PartType[]) {
      expect(symbolMarkup(type, 0), `${type} at zero length`).not.toContain('NaN');
    }
  });

  it('throws on an unknown part', () => {
    expect(() => symbolMarkup('nonsense' as PartType, 64)).toThrow(/Unknown part type/);
  });
});
