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
