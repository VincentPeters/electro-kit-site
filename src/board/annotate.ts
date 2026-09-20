/**
 * Where to print the little labels that hang off a build plan: the kit
 * number beside each part, the contact letters on a changeover switch, and
 * the stacking level at a part's first hole.
 *
 * Printing each of those at a fixed offset is what a single part needs and
 * what a crowded board cannot have. A plan like experiment 30 packs seven
 * parts into three columns; at a fixed offset the two level badges that
 * start at the same hole land exactly on top of each other, the contact
 * letters drift a half-pitch sideways onto whatever part is in the next
 * column, and a kit number can sit squarely on a bulb.
 *
 * So placement is solved for the board as a whole instead. Every part
 * contributes obstacles, every label proposes candidate positions in order
 * of preference, and labels are placed one at a time into the best free
 * spot. A label that cannot stay next to its anchor gets pushed out and
 * keeps a leader line back to the thing it names.
 */
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  GUTTER_X,
  GUTTER_Y,
  cellCenter,
  spanOf,
  type Point,
} from './geometry';
import type { PlacedPart } from './describe';
import { partDef, type PartType } from '../parts/registry';
import { CONTACT_LABELS, PART_COLOURS, kitBadge } from '../parts/symbols';

/** A circle the labels have to stay out of. */
export interface Obstacle extends Point {
  r: number;
}

/** The grey baseplate rectangle, which is where labels are allowed to sit. */
export interface Plate {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export const PLATE: Plate = {
  left: GUTTER_X - 12,
  top: GUTTER_Y - 12,
  right: BOARD_WIDTH - 8,
  bottom: BOARD_HEIGHT - 8,
};

export type LabelKind = 'kit' | 'contact' | 'level';

export interface PlacedLabel extends Point {
  kind: LabelKind;
  text: string;
  colour: string;
  /** Half-width and half-height of the mark, for hit testing and drawing. */
  rx: number;
  ry: number;
  /** The point the label names, and whether it ended up far enough to need a leader. */
  anchor: Point;
  leader: boolean;
}

/**
 * How wide a part's body is, measured from its centre line. Links are a
 * rounded bar; the bulb, motor, buzzer and meter carry a circle or a box in
 * the middle that reaches much further out.
 */
const BODY_HALF_WIDTH: Partial<Record<PartType, number>> = {
  lamp: 20,
  motor: 23,
  buzzer: 23,
  meter: 26,
  coil: 18,
  relayCoil: 18,
};
const DEFAULT_HALF_WIDTH = 11;

function halfWidthOf(type: PartType): number {
  return BODY_HALF_WIDTH[type] ?? DEFAULT_HALF_WIDTH;
}

/** Sample a part's centre line into circles, so overlap is a distance test. */
function bodyObstacles(part: PlacedPart): Obstacle[] {
  const placement = part.at
    ? { ...cellCenter(part.at), length: 0, angle: 0 }
    : spanOf(part.from!, part.to!);
  const r = halfWidthOf(part.type);
  const radians = (placement.angle * Math.PI) / 180;
  const steps = Math.max(1, Math.round(placement.length / 12));

  return Array.from({ length: steps + 1 }, (_, i) => {
    const d = (placement.length / steps) * i;
    return {
      x: placement.x + d * Math.cos(radians),
      y: placement.y + d * Math.sin(radians),
      r,
    };
  });
}

/** Sixteen compass directions, clockwise from straight up. */
const DIRECTIONS: Point[] = Array.from({ length: 16 }, (_, i) => {
  const angle = (Math.PI / 8) * i - Math.PI / 2;
  return { x: Math.cos(angle), y: Math.sin(angle) };
});

/** Rotate the compass so it starts at `from` and alternates either side of it. */
function directionsFrom(from: Point): Point[] {
  const start = DIRECTIONS.reduce(
    (best, dir, i) =>
      dir.x * from.x + dir.y * from.y > DIRECTIONS[best].x * from.x + DIRECTIONS[best].y * from.y
        ? i
        : best,
    0,
  );
  // 0, +1, -1, +2, -2 ... so a blocked first choice falls to the next spot
  // round rather than jumping to the far side of the part.
  const order = [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6, 7, -7, 8];
  return order.map(
    (step) => DIRECTIONS[(start + step + DIRECTIONS.length * 2) % DIRECTIONS.length],
  );
}

interface Request {
  kind: LabelKind;
  text: string;
  colour: string;
  rx: number;
  ry: number;
  anchor: Point;
  /** The direction the label would take if the board were empty. */
  prefer: Point;
  /** How far from the anchor it sits at first attempt. */
  base: number;
}

/*
  Overlap is weighted far above drift: a label that has moved a centimetre
  is still readable, and one sitting on another is not. These numbers were
  tuned against every plan in the book, which the tests re-check.
*/
/*
  Overlap costs far more than distance: a label that has shifted a few
  millimetres is still beside its part, and one sitting on another is
  unreadable. Placing greedily is not enough on a plan like experiment 60,
  where pushing the first labels clear fills the pockets the later ones
  needed, so a repair pass re-solves whatever is still colliding until the
  board settles. The numbers below were tuned against every plan in the
  book, and the tests re-check all sixty.
*/
const RING_STEPS = [0, 7, 14, 22, 30, 40, 52, 66];
const BODY_PENALTY = 2.5;
const LABEL_PENALTY = 7;
const OFF_PLATE_PENALTY = 70;
const DRIFT_PENALTY = 0.55;
const TURN_PENALTY = 0.8;
const REPAIR_ROUNDS = 6;

/** A label's footprint: the box it actually paints into, plus breathing room. */
export interface Box extends Point {
  rx: number;
  ry: number;
}

/** Clear air the solver tries to keep around every label, beyond touching. */
const PADDING = 2;

/**
 * How deeply two label boxes interpenetrate, in user units. Zero when they
 * are apart. Labels are rectangles, so measure them as rectangles: treating
 * a wide chip as a circle of its half-width overstates the crowding and
 * pushes labels around a board that had room for them.
 */
export function boxOverlap(a: Box, b: Box, padding = 0): number {
  const dx = a.rx + b.rx + padding - Math.abs(a.x - b.x);
  const dy = a.ry + b.ry + padding - Math.abs(a.y - b.y);
  return dx > 0 && dy > 0 ? Math.min(dx, dy) : 0;
}

/** The same, for a label box against one of a part's body circles. */
function bodyOverlap(box: Box, o: Obstacle): number {
  const nearest = {
    x: Math.max(box.x - box.rx, Math.min(o.x, box.x + box.rx)),
    y: Math.max(box.y - box.ry, Math.min(o.y, box.y + box.ry)),
  };
  const gap = Math.hypot(o.x - nearest.x, o.y - nearest.y) - o.r;
  return gap >= 0 ? 0 : -gap;
}

interface Spot {
  x: number;
  y: number;
  cost: number;
}

/** The least bad position for one label, given everything else on the board. */
function bestSpot(
  request: Request,
  bodies: Obstacle[],
  others: PlacedLabel[],
  plate: Plate,
): Spot {
  const candidates = directionsFrom(request.prefer);
  const mx = request.rx + 2;
  const my = request.ry + 2;
  let best: Spot | null = null;

  for (const ring of RING_STEPS) {
    for (const [index, dir] of candidates.entries()) {
      const distance = request.base + ring;
      const x = request.anchor.x + dir.x * distance;
      const y = request.anchor.y + dir.y * distance;
      const box = { x, y, rx: request.rx, ry: request.ry };

      const settled = index * TURN_PENALTY + ring * DRIFT_PENALTY;
      let cost = settled;
      for (const body of bodies) cost += bodyOverlap(box, body) * BODY_PENALTY;
      for (const other of others) cost += boxOverlap(box, other, PADDING) * LABEL_PENALTY;
      // The gutters carry the row letters and column numbers, and a label
      // out there reads as one of them.
      if (x < plate.left + mx || x > plate.right - mx) cost += OFF_PLATE_PENALTY;
      if (y < plate.top + my || y > plate.bottom - my) cost += OFF_PLATE_PENALTY;

      if (best === null || cost < best.cost) best = { x, y, cost };
      // Nothing in the way and on the plate: this is as good as it gets.
      if (cost <= settled) return best;
    }
  }

  return best!;
}

function toLabel(request: Request, spot: Spot): PlacedLabel {
  return {
    kind: request.kind,
    text: request.text,
    colour: request.colour,
    rx: request.rx,
    ry: request.ry,
    x: spot.x,
    y: spot.y,
    anchor: request.anchor,
    leader: Math.hypot(spot.x - request.anchor.x, spot.y - request.anchor.y) > request.base + 10,
  };
}

/** How much a label is sitting on top of something it should not be. */
function collisionOf(
  label: PlacedLabel,
  index: number,
  all: PlacedLabel[],
  bodies: Obstacle[],
): number {
  let total = 0;
  for (const body of bodies) total += bodyOverlap(label, body) * BODY_PENALTY;
  for (const [i, other] of all.entries()) {
    if (i !== index) total += boxOverlap(label, other, PADDING) * LABEL_PENALTY;
  }
  return total;
}

/**
 * Place every label on one board: one greedy pass in priority order, then
 * repair rounds that lift whatever is still colliding and set it down in
 * the best spot left, now that it can see the labels placed after it.
 */
function solve(requests: Request[], bodies: Obstacle[], plate: Plate): PlacedLabel[] {
  const placed: PlacedLabel[] = [];
  for (const request of requests) {
    placed.push(toLabel(request, bestSpot(request, bodies, placed, plate)));
  }

  for (let round = 0; round < REPAIR_ROUNDS; round++) {
    let moved = false;

    for (const [i, label] of placed.entries()) {
      const before = collisionOf(label, i, placed, bodies);
      if (before === 0) continue;

      const others = placed.filter((_, j) => j !== i);
      const spot = bestSpot(requests[i], bodies, others, plate);
      const candidate = toLabel(requests[i], spot);
      const after = collisionOf(candidate, i, [...others, candidate], bodies);

      if (after < before - 0.01) {
        placed[i] = candidate;
        moved = true;
      }
    }

    if (!moved) break;
  }

  return placed;
}

/** Build the label requests one part contributes. */
function requestsFor(part: PlacedPart): Request[] {
  const placement = part.at
    ? { ...cellCenter(part.at), length: 0, angle: 0 }
    : spanOf(part.from!, part.to!);
  const radians = (placement.angle * Math.PI) / 180;
  const along = { x: Math.cos(radians), y: Math.sin(radians) };
  // The part's own "up", so a label reads beside the part rather than at
  // its end, whichever way round the part is laid.
  const across = { x: Math.sin(radians), y: -Math.cos(radians) };
  const at = (t: number): Point => ({
    x: placement.x + t * placement.length * along.x,
    y: placement.y + t * placement.length * along.y,
  });

  const out: Request[] = [];
  const clearance = halfWidthOf(part.type) + 12;

  const badge = kitBadge(part.type);
  if (badge) {
    out.push({
      kind: 'kit',
      text: String(badge.number),
      colour: badge.colour,
      rx: 10,
      ry: 10,
      anchor: at(0.5),
      prefer: across,
      base: clearance,
    });
  }

  const level = part.level ?? 1;
  if (level > 1) {
    out.push({
      kind: 'level',
      text: `L${level}`,
      colour: '#16202e',
      rx: 12,
      ry: 9,
      anchor: cellCenter(part.at ?? part.from!),
      // Below-left of the first hole by default, which is where a stacked
      // part's own corner is least likely to be carrying anything else.
      prefer: { x: -Math.SQRT1_2, y: Math.SQRT1_2 },
      base: 24,
    });
  }

  for (const contact of CONTACT_LABELS[part.type] ?? []) {
    out.push({
      kind: 'contact',
      text: contact.label,
      colour: PART_COLOURS[partDef(part.type).colour],
      rx: contact.label.length > 1 ? 13 : 8,
      ry: 8,
      anchor: at(contact.t),
      prefer: { x: -across.x, y: -across.y },
      base: clearance - 2,
    });
  }

  return out;
}

/**
 * Lay out every label on a board. Kit numbers go first because they are
 * what a child reads to find the part in the box, then levels, then the
 * contact letters that only a handful of parts carry.
 */
export function layoutLabels(parts: PlacedPart[], plate: Plate = PLATE): PlacedLabel[] {
  const bodies = parts.flatMap(bodyObstacles);
  const requests = parts.flatMap(requestsFor);
  const rank: Record<LabelKind, number> = { kit: 0, level: 1, contact: 2 };
  const ordered = [...requests].sort((a, b) => rank[a.kind] - rank[b.kind]);

  return solve(ordered, bodies, plate);
}
