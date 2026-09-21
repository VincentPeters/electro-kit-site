/**
 * Which experiments have actually been built, kept in this browser only.
 *
 * The site has no accounts and no backend, so this is per-device by
 * construction: a phone and a tablet will not agree, and clearing browser
 * data loses it. Everything here is additive to pages that are already
 * complete without it.
 */

export const STORAGE_KEY = 'eks:built';

export function readBuilt(storage: Pick<Storage, 'getItem'>): number[] {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((n): n is number => typeof n === 'number' && Number.isInteger(n))
      .sort((a, b) => a - b);
  } catch {
    // Private mode, blocked storage, or somebody else's key. Start empty.
    return [];
  }
}

export function toggleBuilt(built: number[], n: number): number[] {
  const next = built.includes(n) ? built.filter((x) => x !== n) : [...built, n];
  return next.sort((a, b) => a - b);
}

export function nextUp(built: number[], total: number): number | null {
  for (let n = 1; n <= total; n++) {
    if (!built.includes(n)) return n;
  }
  return null;
}

function write(built: number[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(built));
  } catch {
    // Nothing to do: the tick simply will not persist.
  }
}

/** Decorate the current page. Safe to call on any page; does nothing where there is nothing to do. */
export function hydrate(): void {
  const built = readBuilt(localStorage);

  // Experiment tiles: a tick on the ones already built.
  for (const tile of document.querySelectorAll<HTMLElement>('[data-experiment]')) {
    const n = Number(tile.dataset.experiment);
    if (built.includes(n)) tile.dataset.built = 'true';
  }

  // The experiment page's own control, injected rather than shipped inert.
  const slot = document.querySelector<HTMLElement>('[data-built-slot]');
  if (slot) {
    const n = Number(slot.dataset.builtSlot);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'built-toggle';

    const paint = (list: number[]) => {
      const done = list.includes(n);
      button.textContent = done ? 'Built it' : 'I built this';
      button.setAttribute('aria-pressed', String(done));
    };

    let current = built;
    paint(current);
    button.addEventListener('click', () => {
      current = toggleBuilt(current, n);
      write(current);
      paint(current);
    });
    slot.append(button);
  }

  // The home page's "carry on from" line. Experiment URLs are slugs, not
  // numbers, so the page hands the script the full list of hrefs in order.
  const carry = document.querySelector<HTMLElement>('[data-carry-on]');
  const link = carry?.querySelector('a');
  if (carry && link && built.length > 0) {
    let targets: string[] = [];
    try {
      const parsed: unknown = JSON.parse(carry.dataset.carryOn ?? '[]');
      if (Array.isArray(parsed)) targets = parsed.filter((t): t is string => typeof t === 'string');
    } catch {
      targets = [];
    }

    const next = nextUp(built, targets.length);
    if (next !== null && targets[next - 1]) {
      link.setAttribute('href', targets[next - 1]);
      link.textContent = `Carry on from experiment ${next}`;
      carry.hidden = false;
    }
  }
}
