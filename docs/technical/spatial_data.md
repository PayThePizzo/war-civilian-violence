# Spatial Data Preparation

`03_prepare_spatial.py` generates `data/processed/spatial_events.geojson` from the canonical event-level Sudan dataset.

## Aggregation decision

The output remains at event level. Each point preserves its date or period fields, violence type, fatality measures, coordinates, and actor identifiers/names where they are available. This is sufficient for an initial spatial visualization and keeps later filtering by time and violence type possible.

Spatial aggregation is therefore deferred to the future map layer, where a dynamic view can choose an appropriate representation for the current zoom, time selection, and event density. Hexagons or another aggregation should be introduced only if the event-level view becomes difficult to read. No hexagonal or other spatial aggregation is performed by this preparation script.

Events without both latitude and longitude cannot be represented as GeoJSON points. They are excluded from this spatial output but are counted and reported by the script; they remain available in `data/processed/events_sudan.csv`.
