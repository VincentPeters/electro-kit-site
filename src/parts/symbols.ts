import { partDef, type PartFamily, type PartType } from './registry';

/**
 * The manual's colour logic, which the child is matching against a
 * physical kit: blue conducts, red consumes, green switches, black
 * measures. A part may override which of these it is drawn in — see
 * `colour` in the registry.
 */
export const PART_COLOURS: Record<PartFamily, string> = {
  conductor: '#1f6fd0',
  load: '#d92b2b',
  switch: '#199a55',
  instrument: '#1d1d1f',
  loose: '#5a6472',
};

const STUD_R = 9;
const STUD_HOLE_R = 4;

/** A snap stud: the press-fit connector at the end of every part. */
export function studMarkup(x: number, colour = PART_COLOURS.conductor): string {
  return (
    `<circle cx="${x}" cy="0" r="${STUD_R}" fill="${colour}" />` +
    `<circle cx="${x}" cy="0" r="${STUD_HOLE_R}" fill="#ffffff" />`
  );
}

/**
 * The kit number to print beside a part, so you can find it in the box,
 * or null if the part carries none. The caller draws it outside the
 * rotated group — otherwise a part running down the board would show its
 * number lying on its side.
 */
export function kitBadge(type: PartType): { number: number; colour: string } | null {
  const def = partDef(type);
  // The meter prints its own number inside its body; it has no room beside.
  if (def.kitNumber === undefined || type === 'meter') return null;
  return { number: def.kitNumber, colour: PART_COLOURS[def.colour] };
}

/** The orientation mark on parts that only work one way round. */
function plusMark(colour: string): string {
  return `<text x="14" y="26" text-anchor="middle" font-size="18" font-weight="700" fill="${colour}">+</text>`;
}

function wire(from: number, to: number, colour: string): string {
  return `<line x1="${from}" y1="0" x2="${to}" y2="0" stroke="${colour}" stroke-width="5" />`;
}

/* ------------------------------------------------------------------ *
 * Conductors                                                          *
 * ------------------------------------------------------------------ */

function linkMarkup(length: number, holes: number, colour: string): string {
  const step = holes > 1 ? length / (holes - 1) : 0;
  const studs = Array.from({ length: holes }, (_, i) => studMarkup(i * step, colour)).join('');
  const bar =
    length > 0
      ? `<rect x="0" y="-7" width="${length}" height="14" rx="7" fill="${colour}" />`
      : '';
  return bar + studs;
}

/* ------------------------------------------------------------------ *
 * Loads                                                               *
 * ------------------------------------------------------------------ */

function lampMarkup(length: number, colour: string): string {
  const mid = length / 2;
  const r = 17;
  const d = r * Math.SQRT1_2;
  return (
    wire(0, Math.max(0, mid - r), colour) +
    wire(Math.min(length, mid + r), length, colour) +
    `<circle cx="${mid}" cy="0" r="${r}" fill="#ffffff" stroke="${colour}" stroke-width="5" />` +
    `<line x1="${mid - d}" y1="${-d}" x2="${mid + d}" y2="${d}" stroke="${colour}" stroke-width="4" />` +
    `<line x1="${mid - d}" y1="${d}" x2="${mid + d}" y2="${-d}" stroke="${colour}" stroke-width="4" />` +
    studMarkup(0, colour) +
    studMarkup(length, colour)
  );
}

function motorMarkup(length: number, colour: string): string {
  const mid = length / 2;
  return (
    wire(0, length, colour) +
    `<circle cx="${mid}" cy="0" r="20" fill="#ffffff" stroke="${colour}" stroke-width="5" />` +
    `<text x="${mid}" y="7" text-anchor="middle" font-size="20" font-weight="700" fill="${colour}">M</text>` +
    plusMark(colour) +
    studMarkup(0, colour) +
    studMarkup(length, colour)
  );
}

function coilMarkup(length: number, colour: string): string {
  const turns = 5;
  const span = length * 0.62;
  const start = (length - span) / 2;
  const step = turns > 0 && span > 0 ? span / turns : 0;
  const arcs =
    span > 0
      ? Array.from(
          { length: turns },
          (_, i) =>
            `<path d="M ${start + i * step} 0 a ${step / 2} 15 0 0 1 ${step} 0" fill="none" stroke="${colour}" stroke-width="5" />`,
        ).join('')
      : '';
  return (
    wire(0, start, colour) +
    wire(start + span, length, colour) +
    arcs +
    studMarkup(0, colour) +
    studMarkup(length, colour)
  );
}

function buzzerMarkup(length: number, colour: string): string {
  const mid = length / 2;
  return (
    wire(0, length, colour) +
    `<circle cx="${mid}" cy="0" r="20" fill="#ffffff" stroke="${colour}" stroke-width="5" />` +
    `<path d="M ${mid - 7} -9 a 11 11 0 0 1 0 18" fill="none" stroke="${colour}" stroke-width="4" />` +
    `<path d="M ${mid - 1} -14 a 17 17 0 0 1 0 28" fill="none" stroke="${colour}" stroke-width="4" />` +
    plusMark(colour) +
    studMarkup(0, colour) +
    studMarkup(length, colour)
  );
}

/** The relay is a solid block, not a bar: a coil beside a changeover contact. */
function relayMarkup(length: number, colour: string): string {
  const boxWidth = Math.max(length, 60);
  return (
    `<rect x="0" y="-30" width="${boxWidth}" height="60" rx="10" fill="${colour}" />` +
    `<rect x="${boxWidth * 0.12}" y="-16" width="${boxWidth * 0.26}" height="32" rx="4" fill="none" stroke="#ffffff" stroke-width="4" />` +
    `<line x1="${boxWidth * 0.12}" y1="16" x2="${boxWidth * 0.38}" y2="-16" stroke="#ffffff" stroke-width="3" />` +
    `<line x1="${boxWidth * 0.55}" y1="14" x2="${boxWidth * 0.84}" y2="-12" stroke="#ffffff" stroke-width="4" />` +
    `<circle cx="${boxWidth * 0.55}" cy="14" r="5" fill="#ffffff" />` +
    `<circle cx="${boxWidth * 0.84}" cy="-12" r="5" fill="#ffffff" />` +
    `<circle cx="${boxWidth * 0.84}" cy="14" r="5" fill="#ffffff" />` +
    studMarkup(0, colour) +
    studMarkup(boxWidth, colour)
  );
}

/* ------------------------------------------------------------------ *
 * Switches                                                            *
 * ------------------------------------------------------------------ */

/** The rounded shell every switch shares. */
function switchBody(length: number, colour: string): string {
  const pad = 22;
  return `<rect x="${-pad}" y="-22" width="${length + pad * 2}" height="44" rx="22" fill="#ffffff" stroke="${colour}" stroke-width="5" />`;
}

function buttonMarkup(length: number, colour: string): string {
  const mid = length / 2;
  return (
    switchBody(length, colour) +
    wire(0, Math.max(0, mid - 15), colour) +
    wire(Math.min(length, mid + 15), length, colour) +
    `<circle cx="${mid}" cy="0" r="13" fill="${colour}" />` +
    `<circle cx="${mid}" cy="0" r="6" fill="#ffffff" />` +
    studMarkup(0, colour) +
    studMarkup(length, colour)
  );
}

function switchMarkup(length: number, colour: string): string {
  const left = length * 0.3;
  const right = length * 0.7;
  return (
    switchBody(length, colour) +
    wire(0, left, colour) +
    wire(right, length, colour) +
    `<line x1="${left}" y1="0" x2="${right}" y2="-13" stroke="${colour}" stroke-width="6" stroke-linecap="round" />` +
    `<circle cx="${left}" cy="0" r="6" fill="${colour}" />` +
    `<circle cx="${right}" cy="0" r="6" fill="#ffffff" stroke="${colour}" stroke-width="4" />` +
    `<text x="${left}" y="18" text-anchor="middle" font-size="10" font-weight="700" fill="${colour}">OFF</text>` +
    `<text x="${right}" y="18" text-anchor="middle" font-size="10" font-weight="700" fill="${colour}">ON</text>` +
    studMarkup(0, colour) +
    studMarkup(length, colour)
  );
}

/**
 * Three contacts: the middle one (A) joins either B or C. Both onward
 * paths are drawn so the reader can see the choice the switch makes.
 */
function changeoverMarkup(length: number, colour: string): string {
  const pivot = length * 0.35;
  const out = length * 0.8;
  return (
    switchBody(length, colour) +
    wire(0, pivot, colour) +
    `<circle cx="${pivot}" cy="0" r="6" fill="${colour}" />` +
    `<line x1="${pivot}" y1="0" x2="${out}" y2="-12" stroke="${colour}" stroke-width="6" stroke-linecap="round" />` +
    `<circle cx="${out}" cy="-12" r="5" fill="#ffffff" stroke="${colour}" stroke-width="4" />` +
    `<circle cx="${out}" cy="12" r="5" fill="#ffffff" stroke="${colour}" stroke-width="4" />` +
    // Contact names sit outside the body: the experiments refer to
    // "position B" and "position C", so the reader needs to see which is which.
    `<text x="${pivot}" y="-28" text-anchor="middle" font-size="12" font-weight="700" fill="${colour}">A</text>` +
    `<text x="${out + 2}" y="-28" text-anchor="middle" font-size="12" font-weight="700" fill="${colour}">C</text>` +
    `<text x="${out + 2}" y="36" text-anchor="middle" font-size="12" font-weight="700" fill="${colour}">B</text>` +
    studMarkup(0, colour) +
    studMarkup(length, colour)
  );
}

function reedSwitchMarkup(length: number, colour: string): string {
  const mid = length / 2;
  return (
    switchBody(length, colour) +
    wire(0, Math.max(0, mid - 24), colour) +
    wire(Math.min(length, mid + 24), length, colour) +
    `<rect x="${mid - 24}" y="-11" width="48" height="22" rx="11" fill="#ffffff" stroke="${colour}" stroke-width="4" />` +
    `<line x1="${mid - 20}" y1="-3" x2="${mid + 5}" y2="-3" stroke="${colour}" stroke-width="4" />` +
    `<line x1="${mid + 20}" y1="4" x2="${mid - 5}" y2="4" stroke="${colour}" stroke-width="4" />` +
    studMarkup(0, colour) +
    studMarkup(length, colour)
  );
}

/* ------------------------------------------------------------------ *
 * Instrument                                                          *
 * ------------------------------------------------------------------ */

/** The meter stands proud of the board, so it is drawn taller than a part. */
function meterMarkup(length: number, colour: string): string {
  const width = Math.max(length, 120);
  const mid = width / 2;
  return (
    `<rect x="${-(width - length) / 2}" y="-104" width="${width}" height="104" rx="12" fill="${colour}" />` +
    `<rect x="${-(width - length) / 2 + 10}" y="-94" width="${width - 20}" height="52" rx="6" fill="#ffffff" />` +
    `<path d="M ${mid - 42} -56 a 46 46 0 0 1 84 0" fill="none" stroke="${colour}" stroke-width="3" transform="translate(${-(width - length) / 2} 0)" />` +
    `<line x1="${mid - (width - length) / 2}" y1="-54" x2="${mid - (width - length) / 2 - 24}" y2="-80" stroke="#d92b2b" stroke-width="3" />` +
    `<text x="${mid - (width - length) / 2}" y="-16" text-anchor="middle" font-size="16" font-weight="700" fill="#ffffff">3V | 1A</text>` +
    `<text x="${length - 10}" y="-16" text-anchor="end" font-size="16" font-weight="700" fill="#ffffff">+</text>` +
    `<text x="${-(width - length) / 2 + 16}" y="-16" font-size="13" font-weight="700" fill="#ffffff">56</text>` +
    studMarkup(0, colour) +
    studMarkup(length, colour)
  );
}

/* ------------------------------------------------------------------ *
 * Loose pieces                                                        *
 * ------------------------------------------------------------------ */

function propellerMarkup(colour: string): string {
  const blade = (rotation: number) =>
    `<ellipse cx="0" cy="-20" rx="8" ry="20" fill="${colour}" transform="rotate(${rotation})" />`;
  return (
    `${blade(0)}${blade(120)}${blade(240)}` +
    `<circle cx="0" cy="0" r="8" fill="#ffffff" stroke="${colour}" stroke-width="4" />`
  );
}

function ironCoreMarkup(colour: string): string {
  return `<rect x="-38" y="-9" width="76" height="18" rx="9" fill="#c9d0da" stroke="${colour}" stroke-width="3" />`;
}

function magnetMarkup(colour: string): string {
  return (
    `<rect x="-44" y="-14" width="44" height="28" fill="#9aa4b2" />` +
    `<rect x="0" y="-14" width="44" height="28" fill="#d92b2b" />` +
    `<rect x="-44" y="-14" width="88" height="28" fill="none" stroke="${colour}" stroke-width="2" />` +
    `<text x="-22" y="6" text-anchor="middle" font-size="16" font-weight="700" fill="#ffffff">S</text>` +
    `<text x="22" y="6" text-anchor="middle" font-size="16" font-weight="700" fill="#ffffff">N</text>`
  );
}

function compassMarkup(colour: string): string {
  return (
    `<circle cx="0" cy="0" r="28" fill="#ffffff" stroke="${colour}" stroke-width="4" />` +
    `<polygon points="0,-20 7,0 0,20 -7,0" fill="#d92b2b" />` +
    `<polygon points="0,20 7,0 0,-20 -7,0" fill="none" stroke="${colour}" stroke-width="2" />` +
    `<circle cx="0" cy="0" r="4" fill="${colour}" />` +
    `<text x="0" y="-31" text-anchor="middle" font-size="11" font-weight="700" fill="${colour}">N</text>`
  );
}

function batteryHolderMarkup(colour: string): string {
  return (
    `<rect x="-46" y="-26" width="92" height="52" rx="8" fill="#eef1f5" stroke="${colour}" stroke-width="4" />` +
    `<line x1="-20" y1="-16" x2="-20" y2="16" stroke="#d92b2b" stroke-width="6" />` +
    `<line x1="-6" y1="-9" x2="-6" y2="9" stroke="#d92b2b" stroke-width="6" />` +
    `<line x1="8" y1="-16" x2="8" y2="16" stroke="#d92b2b" stroke-width="6" />` +
    `<line x1="22" y1="-9" x2="22" y2="9" stroke="#d92b2b" stroke-width="6" />` +
    `<text x="34" y="6" text-anchor="middle" font-size="18" font-weight="700" fill="#d92b2b">+</text>`
  );
}

/* ------------------------------------------------------------------ */

type SymbolFn = (length: number, colour: string) => string;

/**
 * Total over PartType on purpose: adding a part to the registry without
 * drawing it becomes a type error rather than a blank space on the page.
 */
const SYMBOLS: Record<PartType, SymbolFn> = {
  link1: (l, c) => linkMarkup(l, 1, c),
  link2: (l, c) => linkMarkup(l, 2, c),
  link3: (l, c) => linkMarkup(l, 3, c),
  link4: (l, c) => linkMarkup(l, 4, c),
  link5: (l, c) => linkMarkup(l, 5, c),
  link6: (l, c) => linkMarkup(l, 6, c),
  link7: (l, c) => linkMarkup(l, 7, c),
  lamp: lampMarkup,
  motor: motorMarkup,
  coil: coilMarkup,
  buzzer: buzzerMarkup,
  relay: relayMarkup,
  button: buttonMarkup,
  switch: switchMarkup,
  changeover: changeoverMarkup,
  reedSwitch: reedSwitchMarkup,
  meter: meterMarkup,
  propeller: (_l, c) => propellerMarkup(c),
  ironCore: (_l, c) => ironCoreMarkup(c),
  magnet: (_l, c) => magnetMarkup(c),
  compass: (_l, c) => compassMarkup(c),
  batteryHolder: (_l, c) => batteryHolderMarkup(c),
};

/**
 * SVG markup for one part, drawn along the x axis from (0,0) to
 * (length,0) and centred on the wire. The caller positions and rotates it.
 */
export function symbolMarkup(type: PartType, length: number): string {
  const def = partDef(type);
  const draw = SYMBOLS[type];
  if (!draw) throw new Error(`Unknown part type: ${type}`);
  const colour = PART_COLOURS[def.colour];
  return draw(length, colour);
}
