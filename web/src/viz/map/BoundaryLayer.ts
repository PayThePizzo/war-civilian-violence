/**
 * Optional restrained boundary overlay (country/ADM1 outline) beneath the analytical H3 layer.
 *
 * `src/assets/geo/sudan-boundary.geojson` ships as an empty FeatureCollection placeholder - no
 * real coordinates have been checked in, and this module must never fabricate any. It stays a
 * no-op (returns null, ConflictMap renders no boundary layer) until a valid GeoJSON boundary is
 * added to that file, at which point this is the only place that needs to change.
 */
import { GeoJsonLayer } from "@deck.gl/layers";
import type { Feature, FeatureCollection } from "geojson";

/** Returns null when `geojson` has no features, so callers can skip adding the layer entirely. */
export function buildBoundaryLayer(geojson: FeatureCollection): GeoJsonLayer<Feature> | null {
  if (!geojson.features || geojson.features.length === 0) return null;

  return new GeoJsonLayer<Feature>({
    id: "sudan-boundary",
    data: geojson,
    pickable: false,
    stroked: true,
    filled: false,
    lineWidthMinPixels: 1.5,
    getLineColor: [255, 255, 255, 160],
  });
}
