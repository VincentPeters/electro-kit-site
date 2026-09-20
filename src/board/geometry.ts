/**
 * The kit's baseplate is a grid of hexagonal holes: ten columns numbered
 * 1-10 and seven rows lettered A-G. Everything in a board diagram is
 * positioned by cell reference, never by raw coordinates.
 */
export const ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;
export type Row = (typeof ROWS)[number];
export const COLS = 10;

/** SVG user units between hole centres. */
export const PITCH_X = 64;
export const PITCH_Y = 56;

/** Room reserved for the row letters and column numbers. */
export const GUTTER_X = 44;
export const GUTTER_Y = 40;

/** Breathing room on the right and bottom edges. */
const PAD = 20;

export const BOARD_WIDTH = GUTTER_X + COLS * PITCH_X + PAD;
export const BOARD_HEIGHT = GUTTER_Y + ROWS.length * PITCH_Y + PAD;

/**
 * The battery holder is moulded into the baseplate at the lower left,
 * covering rows D-F in columns 1-2. It is drawn by the board itself and
 * is never listed among an experiment's parts.
 */
export const BATTERY_PANEL = { fromCell: 'D1', toCell: 'F2' } as const;

export interface Cell {
  row: number;
  col: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Span extends Point {
  length: number;
  angle: number;
}

const CELL_PATTERN = /^([A-G])(10|[1-9])$/;

export function isCell(ref: string): boolean {
  return CELL_PATTERN.test(ref);
}

export function parseCell(ref: string): Cell {
  const match = CELL_PATTERN.exec(ref);
  if (!match) throw new Error(`Invalid cell reference: ${ref}`);
  return {
    row: ROWS.indexOf(match[1] as Row),
    col: Number(match[2]) - 1,
  };
}

export function cellCenter(ref: string): Point {
  const { row, col } = parseCell(ref);
  return {
    x: GUTTER_X + col * PITCH_X + PITCH_X / 2,
    y: GUTTER_Y + row * PITCH_Y + PITCH_Y / 2,
  };
}

/**
 * Describe the run between two cells as an origin, a length and a
 * rotation, so a symbol can be drawn along the x axis and placed with a
 * single transform.
 */
export function spanOf(from: string, to: string): Span {
  const start = cellCenter(from);
  const end = cellCenter(to);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  return {
    x: start.x,
    y: start.y,
    length: Math.hypot(dx, dy),
    angle: dx === 0 && dy === 0 ? 0 : (Math.atan2(dy, dx) * 180) / Math.PI,
  };
}
