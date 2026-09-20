/**
 * Every part in the kit, in one place. The board renderer, the schema
 * validator and the parts page all read from here, so a part can never
 * be drawable but unlisted, or listed but undrawable.
 *
 * Counts and kit numbers are taken from the parts tables in the manual.
 */
export type PartFamily = 'conductor' | 'load' | 'switch' | 'instrument' | 'loose';

export interface PartDef {
  /** Name as it appears on the parts page. */
  label: string;
  /** How many holes the part spans. */
  cells: number;
  /** What the part does, which decides how the parts page groups it. */
  family: PartFamily;
  /**
   * Which colour to draw it in. Usually the family colour, but the kit
   * moulds the coil in blue and the reed switch in red, and a child
   * matching a diagram against a real part should see what they hold.
   */
  colour: PartFamily;
  /** The number printed on the part, so you can find it in the box. */
  kitNumber?: number;
  /** How many come in the box. */
  count: number;
  /** One sentence, written for a child. */
  description: string;
}

type PartInput = Omit<PartDef, 'colour'> & { colour?: PartFamily };

const define = <T extends Record<string, PartInput>>(parts: T) =>
  Object.fromEntries(
    Object.entries(parts).map(([type, def]) => [
      type,
      { ...def, colour: def.colour ?? def.family },
    ]),
  ) as { [K in keyof T]: PartDef };

export const PARTS = define({
  link1: { label: 'Connector strip, 1 contact', cells: 1, family: 'conductor', kitNumber: 1, count: 4, description: 'The shortest strip. It fills a single hole and joins parts that sit on different levels.' },
  link2: { label: 'Connector strip, 2 contacts', cells: 2, family: 'conductor', kitNumber: 2, count: 7, description: 'Carries current between two neighbouring holes. You will use these more than anything else.' },
  link3: { label: 'Connector strip, 3 contacts', cells: 3, family: 'conductor', kitNumber: 3, count: 4, description: 'A three-hole strip for slightly longer hops.' },
  link4: { label: 'Connector strip, 4 contacts', cells: 4, family: 'conductor', kitNumber: 4, count: 2, description: 'A four-hole strip.' },
  link5: { label: 'Connector strip, 5 contacts', cells: 5, family: 'conductor', kitNumber: 5, count: 1, description: 'A five-hole strip. There is only one, so use it where nothing shorter will reach.' },
  link6: { label: 'Connector strip, 6 contacts', cells: 6, family: 'conductor', kitNumber: 6, count: 1, description: 'A six-hole strip for crossing most of the board.' },
  link7: { label: 'Connector strip, 7 contacts', cells: 7, family: 'conductor', kitNumber: 7, count: 1, description: 'The longest strip. It reaches right across the baseplate.' },

  button: { label: 'Push button', cells: 3, family: 'switch', kitNumber: 15, count: 2, description: 'Two contacts that close only while you hold the button down. Let go and they spring apart again.' },
  switch: { label: 'On/off switch', cells: 3, family: 'switch', kitNumber: 14, count: 1, description: 'Stays where you put it. At ON the contacts are closed; at OFF they are open.' },
  changeover: { label: 'Changeover switch', cells: 3, family: 'switch', kitNumber: 64, count: 2, description: 'Three contacts. The middle one joins either the left or the right, never both — so it sends the current down one path or the other.' },
  reedSwitch: { label: 'Magnetic switch', cells: 3, family: 'switch', colour: 'load', kitNumber: 12, count: 1, description: 'Two contacts sealed in a glass tube. Hold a magnet close and they snap together without being touched.' },

  lamp: { label: 'Bulb, 3.2 V / 0.2 A', cells: 2, family: 'load', kitNumber: 18, count: 3, description: 'A very thin wire inside a glass bulb. It glows when current flows, and the more current, the brighter it gets.' },
  motor: { label: 'Electric motor', cells: 3, family: 'load', kitNumber: 24, count: 1, description: 'Magnets and a coil inside. It spins when current flows, and swapping its two connections makes it spin the other way.' },
  coil: { label: 'Coil / electromagnet', cells: 3, family: 'load', colour: 'conductor', kitNumber: 63, count: 1, description: 'Wire wound into a spiral. Current through it makes a magnetic field — and moving a magnet inside it makes a voltage.' },
  buzzer: { label: 'Buzzer', cells: 3, family: 'load', kitNumber: 10, count: 1, description: 'A crystal that bends when you put a voltage across it. Bending fast enough makes a tone. Watch the plus sign when you fit it.' },
  relay: { label: 'Relay', cells: 4, family: 'load', kitNumber: 61, count: 1, description: 'A changeover switch worked by an electromagnet, so one circuit can switch another one.' },

  meter: { label: 'Meter, 3 V / 1 A', cells: 3, family: 'instrument', kitNumber: 56, count: 1, description: 'Measures voltage or current. Set its switch to 3V for volts or 1A for amps before you fit it, and watch the plus sign.' },

  propeller: { label: 'Propeller', cells: 1, family: 'loose', count: 1, description: 'Pushes onto the motor shaft. It can fly five metres up, so never aim it at people or animals.' },
  ironCore: { label: 'Iron core', cells: 1, family: 'loose', count: 1, description: 'Slides inside the coil and pulls its magnetic field together, making it much stronger.' },
  magnet: { label: 'Bar magnet', cells: 1, family: 'loose', count: 1, description: 'Has a north pole and a south pole. Use it to work the magnetic switch, or to make a voltage in the coil.' },
  compass: { label: 'Compass', cells: 1, family: 'loose', count: 1, description: 'A tiny magnet on a pivot. It finds north — and it shows you where any magnetic field points.' },
  batteryHolder: { label: 'Battery compartment', cells: 1, family: 'loose', kitNumber: 19, count: 1, description: 'Holds two 1.5 V AA batteries. It is built into the baseplate, so it never appears as a part in a build plan.' },
});

export type PartType = keyof typeof PARTS;

export interface PartEntry extends PartDef {
  type: PartType;
}

export function isPartType(value: string): value is PartType {
  return Object.prototype.hasOwnProperty.call(PARTS, value);
}

export function partDef(type: PartType): PartDef {
  const def = PARTS[type];
  if (!def) throw new Error(`Unknown part type: ${type}`);
  return def;
}

const allParts: PartEntry[] = (Object.keys(PARTS) as PartType[]).map((type) => ({
  type,
  ...PARTS[type],
}));

export const BOARD_PARTS = allParts.filter((p) => p.family !== 'loose');
export const LOOSE_PARTS = allParts.filter((p) => p.family === 'loose');
