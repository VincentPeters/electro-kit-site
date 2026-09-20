import { describe, expect, it } from 'vitest';
import { describeBoard } from '../src/board/describe';

describe('describeBoard', () => {
  it('names every part and where it sits', () => {
    const text = describeBoard([
      { type: 'lamp', from: 'D4', to: 'D5' },
      { type: 'switch', from: 'F2', to: 'F4' },
    ]);
    expect(text).toContain('Bulb, 3.2 V / 0.2 A from D4 to D5');
    expect(text).toContain('On/off switch from F2 to F4');
  });

  it('describes a single-cell part by its cell', () => {
    expect(describeBoard([{ type: 'link1', at: 'C3' }])).toContain(
      'Connector strip, 1 contact at C3',
    );
  });

  it('mentions a stacking level above the baseplate', () => {
    const text = describeBoard([{ type: 'lamp', from: 'D4', to: 'D5', level: 2 }]);
    expect(text).toContain('level 2');
  });

  it('does not mention level 1, which is the baseplate', () => {
    const text = describeBoard([{ type: 'lamp', from: 'D4', to: 'D5', level: 1 }]);
    expect(text).not.toContain('level');
  });

  it('opens by naming the diagram and the battery', () => {
    const text = describeBoard([{ type: 'lamp', from: 'D4', to: 'D5' }]);
    expect(text).toMatch(/^Circuit on the baseplate, with the battery/);
  });

  it('handles an empty board without crashing', () => {
    expect(describeBoard([])).toMatch(/^Circuit on the baseplate/);
  });

  it('ends in a full stop so screen readers pause', () => {
    expect(describeBoard([{ type: 'lamp', from: 'D4', to: 'D5' }])).toMatch(/\.$/);
  });
});
