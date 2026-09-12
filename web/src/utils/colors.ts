/**
 * Shared semantic colors for every visualization and legend.
 * First three slots of the validated categorical palette (blue/orange/aqua);
 * see dataviz skill's palette.md - this ordering clears the CVD/contrast gates
 * as an all-pairs-safe set, which a hand-picked triple did not.
 */
export const violenceColors = Object.freeze({
  stateBased: "#2a78d6",
  nonState: "#eb6834",
  oneSided: "#1baf7a",
} as const);
