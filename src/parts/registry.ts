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
  /**
   * What the part really is, for a child who wants to know why it behaves
   * the way it does. One or two sentences, plainer than `description`.
   */
  eli5: string;
  /**
   * True for the two halves of the relay, which are drawn separately on a
   * build plan but are one physical part, so the parts page lists them once.
   */
  boardOnly?: boolean;
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
  link1: { label: 'Connector strip, 1 contact', cells: 1, family: 'conductor', kitNumber: 1, count: 4, description: 'The shortest strip. It fills a single hole and joins parts that sit on different levels.', eli5: 'The metal inside is barely longer than the hole it fills, yet it is exactly as easy for current to cross as the seven-hole strip along the bottom row. Length changes reach, not difficulty.' },
  link2: { label: 'Connector strip, 2 contacts', cells: 2, family: 'conductor', kitNumber: 2, count: 7, description: 'Carries current between two neighbouring holes. You will use these more than anything else.', eli5: 'Peel back the plastic and there is nothing underneath but a flat strip of metal. That bare metal is what makes it a conductor: current passes straight through without any of the struggle it meets inside a bulb or a buzzer.' },
  link3: { label: 'Connector strip, 3 contacts', cells: 3, family: 'conductor', kitNumber: 3, count: 4, description: 'A three-hole strip for slightly longer hops.', eli5: 'Three holes of reach, cut from the same easy metal as every other strip in the box. None of these seven strips is any harder to cross than another, only longer or shorter.' },
  link4: { label: 'Connector strip, 4 contacts', cells: 4, family: 'conductor', kitNumber: 4, count: 2, description: 'A four-hole strip.', eli5: 'A four-hole strip is not a stronger conductor than a two-hole one, only a longer one. The current does not notice the difference between a short hop and a long one.' },
  link5: { label: 'Connector strip, 5 contacts', cells: 5, family: 'conductor', kitNumber: 5, count: 1, description: 'A five-hole strip. There is only one, so use it where nothing shorter will reach.', eli5: 'Five holes of the same plain, easy metal as the rest. Picking a strip is about the gap you need to bridge, never about which one tries hardest.' },
  link6: { label: 'Connector strip, 6 contacts', cells: 6, family: 'conductor', kitNumber: 6, count: 1, description: 'A six-hole strip for crossing most of the board.', eli5: 'Six holes of bare metal, exactly as easy to cross as a strip half its length. A connector strip only ever changes how far you reach, never how hard the going is.' },
  link7: { label: 'Connector strip, 7 contacts', cells: 7, family: 'conductor', kitNumber: 7, count: 1, description: 'The longest strip. It reaches right across the baseplate.', eli5: 'The longest strip reaches right across the baseplate, yet the current crosses it exactly as easily as it crosses the shortest one-hole strip. Distance is the only thing that changes from strip to strip.' },

  button: { label: 'Push button', cells: 3, family: 'switch', kitNumber: 15, count: 2, description: 'Two contacts that close only while you hold the button down. Let go and they spring apart again.', eli5: 'Two strips of springy metal sit just apart until your thumb pushes them together and closes the gap. The moment you let go, the spring shoves them back open, so the circuit only lives as long as you keep pressing.' },
  switch: { label: 'On/off switch', cells: 3, family: 'switch', kitNumber: 14, count: 1, description: 'Stays where you put it. At ON the contacts are closed; at OFF they are open.', eli5: 'Flick it and a small lever drags the two contacts together and holds them there with no spring fighting back, so the gap stays shut until you flick it again. Unlike the button, it never needs your finger to stay that way.' },
  changeover: { label: 'Changeover switch', cells: 3, family: 'switch', kitNumber: 64, count: 2, description: 'Three contacts. The middle one joins either the left or the right, never both — so it sends the current down one path or the other.', eli5: 'Think of the middle contact as a single door that can only open onto one of two rooms at a time. Flick it and it swings away from one contact and lands on the other, so whichever loop it just left goes dark while the other one lights up.' },
  reedSwitch: { label: 'Magnetic switch', cells: 3, family: 'switch', colour: 'load', kitNumber: 12, count: 1, description: 'Two contacts sealed in a glass tube. Hold a magnet close and they snap together without being touched.', eli5: 'Inside the glass are two thin strips of magnetic metal, close but not quite touching. Bring the bar magnet near and its pull bends them together across the gap, closing the switch with nothing crossing but a magnetic field.' },

  lamp: { label: 'Bulb, 3.2 V / 0.2 A', cells: 2, family: 'load', kitNumber: 18, count: 3, description: 'A very thin wire inside a glass bulb. It glows when current flows, and the more current, the brighter it gets.', eli5: 'The wire inside is so thin that the current has to squeeze to get through, and squeezing makes it hot. Hot enough, and it glows: nothing is used up, the wire is just working hard the whole time it lights.' },
  motor: { label: 'Electric motor', cells: 3, family: 'load', kitNumber: 24, count: 1, description: 'Magnets and a coil inside. It spins when current flows, and swapping its two connections makes it spin the other way.', eli5: 'Send current through the coil inside and it becomes a magnet for as long as the current flows, pushing and pulling against the fixed magnets around it until the whole thing spins. Swap the wires and you flip which way that magnet points, so it spins the other way.' },
  coil: { label: 'Coil / electromagnet', cells: 3, family: 'load', colour: 'conductor', kitNumber: 63, count: 1, description: 'Wire wound into a spiral. Current through it makes a magnetic field — and moving a magnet inside it makes a voltage.', eli5: 'A long wire wound round and round. The current has much further to travel than it looks, which is why it struggles more than it does through a straight strip.' },
  buzzer: { label: 'Buzzer', cells: 3, family: 'load', kitNumber: 10, count: 1, description: 'A crystal that bends when you put a voltage across it. Bending fast enough makes a tone. Watch the plus sign when you fit it.', eli5: 'That crystal is barely thicker than a fingernail, but a voltage across it makes it flex by a tiny amount. Do that thousands of times a second and the air around it wobbles fast enough for your ear to hear it as a tone.' },
  relay: { label: 'Relay', cells: 4, family: 'load', kitNumber: 61, count: 1, description: 'A changeover switch worked by an electromagnet, so one circuit can switch another one. Build plans draw its two halves separately, because they belong to two circuits that must stay apart.', eli5: 'It is really one small object doing two jobs: a coil that becomes a magnet when your circuit feeds it, and a strip of metal that the magnet drags across to close a second circuit. The two circuits meet here without their wires ever touching, only a pull crossing the gap between them.' },
  relayCoil: { label: 'Relay: the electromagnet', cells: 2, family: 'load', count: 1, boardOnly: true, description: 'The coil half of relay 61. Put current through it and it pulls the contacts over.', eli5: 'This half never sits in the box on its own. It is the electromagnet end of the single relay part, and its only job is to turn into a magnet and pull the contacts on the other half across.' },
  relaySwitch: { label: 'Relay: the contacts', cells: 3, family: 'load', count: 1, boardOnly: true, description: 'The changeover half of relay 61. Contact A rests against B, and snaps across to C when the coil is energised.', eli5: 'The other half of that same physical relay: a changeover switch that never moves by itself. It waits until the coil half pulls it, then swings from B over to C, carrying a second circuit that the first one never touches.' },

  meter: { label: 'Meter, 3 V / 1 A', cells: 3, family: 'instrument', kitNumber: 56, count: 1, description: 'Measures voltage or current. Set its switch to 3V for volts or 1A for amps before you fit it, and watch the plus sign.', eli5: 'Set to 3V it tells you how hard the battery is shoving; set to 1A it tells you how many amps are going past each second. Either way it only watches and reports a number, it does not slow the current down or speed it up.' },

  propeller: { label: 'Propeller', cells: 1, family: 'loose', count: 1, description: 'Pushes onto the motor shaft. It can fly five metres up, so never aim it at people or animals.', eli5: 'No current ever reaches the propeller. It just sits on the shaft and gets flung round by the motor spinning underneath it, hard enough to send it flying if it is not pushed on firmly.' },
  ironCore: { label: 'Iron core', cells: 1, family: 'loose', count: 1, description: 'Slides inside the coil and pulls its magnetic field together, making it much stronger.', eli5: 'No current ever goes through the iron core; it just sits inside the coil and gathers the coil\'s magnetic field together, so the pull is far stronger with the core pushed in than with the hole left empty.' },
  magnet: { label: 'Bar magnet', cells: 1, family: 'loose', count: 1, description: 'Has a north pole and a south pole. Use it to work the magnetic switch, or to make a voltage in the coil.', eli5: 'It works with no battery, no wires and no circuit at all. Hold it near iron or steel and you can feel the pull reaching across the gap, straight through your fingers if you let it.' },
  compass: { label: 'Compass', cells: 1, family: 'loose', count: 1, description: 'A tiny magnet on a pivot. It finds north — and it shows you where any magnetic field points.', eli5: 'The needle is a magnet small enough to spin freely, and it is always pulled round by whatever magnetic field is nearest and strongest. Usually that is the whole Earth, which is why it settles pointing north, but hold it near your coil with the current on and it swings to point at that instead.' },
  batteryHolder: { label: 'Battery compartment', cells: 1, family: 'loose', kitNumber: 19, count: 1, description: 'Holds two 1.5 V AA batteries. It is built into the baseplate, so it never appears as a part in a build plan.', eli5: 'The two AA batteries sit one after another inside, so their shoves add together: 1.5 volts plus 1.5 volts gives every circuit on the board a 3 volt push to start with.' },
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
/** What the parts page lists: one row per physical part in the box. */
export const LISTED_PARTS = BOARD_PARTS.filter((p) => !p.boardOnly);
export const LOOSE_PARTS = allParts.filter((p) => p.family === 'loose');
