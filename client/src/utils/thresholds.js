export function getTrafficLight(value, yellowThreshold, redThreshold, higherIsBetter = false) {
  if (higherIsBetter) {
    if (value >= yellowThreshold) return 'green';
    if (value >= redThreshold)   return 'yellow';
    return 'red';
  }
  if (value <= yellowThreshold) return 'green';
  if (value <= redThreshold)    return 'yellow';
  return 'red';
}

/**
 * Reads the current value of a CSS custom property from <html>.
 * Falls back to the provided default if the property isn't set.
 */
function cssVar(name, fallback) {
  if (typeof document === 'undefined') return fallback;
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim() || fallback;
}

/** Returns the current success/warning/danger hex values from the active palette. */
export function getLightHex(light) {
  switch (light) {
    case 'green':  return cssVar('--p-success', '#54E075');
    case 'yellow': return cssVar('--p-warning', '#F9BD33');
    case 'red':    return cssVar('--p-danger',  '#F36059');
    default:       return cssVar('--p-accent-h', '#3F64F7');
  }
}

export const LIGHT_COLORS = {
  green:   { bg: 'bg-sigma-green/10',  border: 'border-sigma-green/30',  text: 'text-sigma-green',  dot: 'bg-sigma-green',  hex: '#54E075' },
  yellow:  { bg: 'bg-sigma-yellow/10', border: 'border-sigma-yellow/30', text: 'text-sigma-yellow', dot: 'bg-sigma-yellow', hex: '#F9BD33' },
  red:     { bg: 'bg-sigma-red/10',    border: 'border-sigma-red/30',    text: 'text-sigma-red',    dot: 'bg-sigma-red',    hex: '#F36059' },
  neutral: { bg: 'bg-sigma-midnight',  border: 'border-sigma-blue/25',   text: 'text-sigma-ice/70', dot: 'bg-sigma-accent', hex: '#3F64F7' },
};
