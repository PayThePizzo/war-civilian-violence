/**
 * Same semantic palette as web/src/utils/colors.ts, copied verbatim rather
 * than imported across the social/web package boundary. This is the *only*
 * color allowed to encode violence-category data in the Instagram posts,
 * exactly as on the website - never invent a separate palette here.
 */
export const violenceColors = Object.freeze({
  stateBased: "#2a78d6",
  nonState: "#eb6834",
  oneSided: "#1baf7a",
} as const);
