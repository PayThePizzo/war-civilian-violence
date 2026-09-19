/**
 * Shared semantic colors for every visualization and legend: state-based = orange,
 * non-state = light blue, one-sided violence against civilians = red. Author-chosen palette
 * (not the dataviz skill's validated set); orange vs red are separated by lightness, so keep
 * the two from being the only cue where they touch (see legends and direct labels).
 */
export const violenceColors = Object.freeze({
  stateBased: "#f28c28",
  nonState: "#55a8e6",
  oneSided: "#c8281e",
} as const);
