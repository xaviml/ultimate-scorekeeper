import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { haptic } from '../audio/haptics';

describe('haptic', () => {
  const vibrate = vi.fn();
  beforeEach(() => {
    localStorage.clear();
    vibrate.mockClear();
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
  });
  afterEach(() => {
    delete (navigator as { vibrate?: unknown }).vibrate;
  });

  // The language is a count of pulses, so it reads the same on an iPhone, which
  // can only tick.
  it.each([
    ['tap', [35]],
    ['undo', [35, 90, 35]],
    ['refused', [35, 90, 35, 90, 35]],
  ] as const)('%s is %j', (kind, pattern) => {
    haptic(kind);
    expect(vibrate).toHaveBeenCalledWith(pattern);
  });

  it('stays still when vibration is switched off', () => {
    localStorage.setItem('ultimate-scorekeeper:vibration-enabled', 'false');
    haptic('tap');
    expect(vibrate).not.toHaveBeenCalled();
  });
});
