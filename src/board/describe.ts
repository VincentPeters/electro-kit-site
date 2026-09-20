import { partDef, type PartType } from '../parts/registry';

export interface PlacedPart {
  type: PartType;
  /** Start cell of a span. Paired with `to`. */
  from?: string;
  /** End cell of a span. Paired with `from`. */
  to?: string;
  /** Single cell, for parts that fill one hole. */
  at?: string;
  /** Mirror the part, so its plus mark faces the other way. */
  flip?: boolean;
  /** Stacking level, 1 on the baseplate. */
  level?: number;
}

/**
 * A board diagram is meaningless to a screen reader as bare SVG, so every
 * board carries a plain-language description of what is on it and where.
 */
export function describeBoard(parts: PlacedPart[]): string {
  const opening =
    'Circuit on the baseplate, with the battery compartment at the lower left.';
  if (parts.length === 0) return opening;

  const items = parts.map((part) => {
    const label = partDef(part.type).label;
    const place = part.at ? `at ${part.at}` : `from ${part.from} to ${part.to}`;
    const level = part.level && part.level > 1 ? `, on level ${part.level}` : '';
    return `${label} ${place}${level}`;
  });

  return `${opening} It holds: ${items.join('; ')}.`;
}
