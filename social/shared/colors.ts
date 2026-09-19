/**
 * Same semantic palette as web/src/utils/colors.ts (state-based orange, non-state light blue,
 * one-sided red), copied verbatim rather than imported across the social/web package boundary.
 * This is the *only* color allowed to encode violence-category data in the Instagram/X posts,
 * exactly as on the website - never invent a separate palette here.
 */
export const violenceColors = Object.freeze({
  stateBased: "#f28c28",
  nonState: "#55a8e6",
  oneSided: "#c8281e",
} as const);
