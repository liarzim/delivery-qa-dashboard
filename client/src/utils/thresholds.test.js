import { describe, it, expect } from 'vitest';
import { getTrafficLight } from './thresholds.js';

describe('getTrafficLight — lower is better (default)', () => {
  // green when value ≤ yellowThreshold
  // yellow when yellowThreshold < value ≤ redThreshold
  // red when value > redThreshold
  const low = (v) => getTrafficLight(v, 10, 20, false);

  it('returns green when value is well below yellow threshold', () => {
    expect(low(5)).toBe('green');
  });

  it('returns green at exactly the yellow threshold (boundary)', () => {
    expect(low(10)).toBe('green');
  });

  it('returns yellow above yellow threshold but at or below red threshold', () => {
    expect(low(15)).toBe('yellow');
    expect(low(20)).toBe('yellow');
  });

  it('returns red above the red threshold', () => {
    expect(low(21)).toBe('red');
    expect(low(100)).toBe('red');
  });

  it('returns green at zero', () => {
    expect(low(0)).toBe('green');
  });
});

describe('getTrafficLight — higher is better', () => {
  // green when value ≥ yellowThreshold
  // yellow when redThreshold ≤ value < yellowThreshold
  // red when value < redThreshold
  const high = (v) => getTrafficLight(v, 70, 50, true);

  it('returns green when value is well above yellow threshold', () => {
    expect(high(90)).toBe('green');
  });

  it('returns green at exactly the yellow threshold (boundary)', () => {
    expect(high(70)).toBe('green');
  });

  it('returns yellow between red and yellow thresholds', () => {
    expect(high(60)).toBe('yellow');
    expect(high(50)).toBe('yellow');
  });

  it('returns red below the red threshold', () => {
    expect(high(49)).toBe('red');
    expect(high(0)).toBe('red');
  });
});

describe('getTrafficLight — higherIsBetter defaults to false', () => {
  it('behaves as lower-is-better when 4th arg is omitted', () => {
    expect(getTrafficLight(5, 10, 20)).toBe('green');
    expect(getTrafficLight(15, 10, 20)).toBe('yellow');
    expect(getTrafficLight(25, 10, 20)).toBe('red');
  });
});

describe('getTrafficLight — edge cases', () => {
  it('handles identical yellow and red thresholds (lower is better)', () => {
    // value ≤ 10 → green, value ≤ 10 → yellow (but green checked first), > 10 → red
    expect(getTrafficLight(10, 10, 10, false)).toBe('green');
    expect(getTrafficLight(11, 10, 10, false)).toBe('red');
  });

  it('handles identical yellow and red thresholds (higher is better)', () => {
    expect(getTrafficLight(10, 10, 10, true)).toBe('green');
    expect(getTrafficLight(9, 10, 10, true)).toBe('red');
  });

  it('handles negative values', () => {
    expect(getTrafficLight(-5, 0, 10, false)).toBe('green');
    expect(getTrafficLight(5, 0, 10, false)).toBe('yellow');
    expect(getTrafficLight(15, 0, 10, false)).toBe('red');
  });
});
