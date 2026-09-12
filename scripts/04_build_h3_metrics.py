"""
Build weekly H3 spatial aggregations for the conflict map.

This module produces the spatial dataset used by Web Visualization 2.

Only events with valid geographic coordinates are included. Events excluded
from this stage remain available to non-spatial analyses.

The module assigns each eligible event to an H3 cell at the resolution
configured for the project and aggregates conflict metrics by week, H3 cell,
and actor.

Expected inputs
---------------
The script expects:

    data/processed/events_clean.parquet
    data/processed/actor_events.parquet

The project configuration must define:

    spatial.h3_resolution

Only rows with `spatial_eligible = True` are considered.

H3 assignment
--------------
Each valid latitude/longitude pair is converted to an H3 cell using the
configured resolution.

The generated cell identifier is validated and its resolution must match the
configured resolution.

The geographic centre of each H3 cell is also stored to simplify debugging,
inspection, and potential downstream uses.

Aggregation levels
------------------
Two classes of records are generated.

Conflict-wide records are computed directly from the unique event table and
receive:

    actor_id = "__ALL__"

Actor-specific records are computed from the actor-event table.

As in the weekly temporal dataset, global values must never be reconstructed
by summing actor-specific rows because combat events may appear once for each
participating actor.

Metrics
-------
For each week/H3/actor combination the module computes:

    event_count
    state_based_event_count
    non_state_event_count
    one_sided_event_count
    combat_event_count
    combatant_fatalities
    civilian_fatalities
    one_sided_civilian_fatalities
    best_fatalities
    one_sided_event_share
    civilian_fatality_share
    one_sided_civilian_fatality_share

Shares with a zero denominator are defined as zero.

Actor display names are re-derived in-script (most frequently observed
non-empty `actor_name` per `actor_id` in `actor_events.parquet`), following
the same convention used in `03_build_weekly_metrics.py`, rather than read
from `actor_lookup.csv`, which is not a declared input of this stage.

Unlike `03_build_weekly_metrics.py`, this script does not build a complete
week x H3-cell grid: rows are only produced for (week, h3_id) combinations
that actually contain at least one spatially eligible event. A dense grid
here would mostly represent geography with no conflict activity, which is
not informative for the map and would make the output far larger than
necessary.

Validation
----------
The module verifies:

- all included rows have valid coordinates;
- every generated H3 identifier is valid;
- every H3 cell uses the configured resolution;
- event and fatality counts are non-negative;
- all shares lie between zero and one;
- violence-type event counts sum correctly;
- global H3 event counts for each week equal the number of spatially eligible
  unique events for that week.

Output
------
The script writes:

    data/derived/h3_weekly_metrics.csv

Each row represents one actor-week-H3 combination or one conflict-wide
week-H3 combination.

This file is the canonical input for the interactive spatio-temporal H3 map.
"""

import os
import sys

import h3
import numpy as np
import pandas as pd

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
# Now seeing outside the scripts folder, so we can import from the project root

from project_paths import conf_path, events_clean, actor_events, h3_weekly_metrics, derived_data_dir
from config.config_parser import AppConfig, load_from_config

config = load_from_config(conf_path)


ALL_ACTOR_ID = "__ALL__"
ALL_ACTOR_NAME = "All actors"

EVENTS_REQUIRED_COLUMNS = {
    "event_id",
    "date_start",
    "type_of_violence",
    "spatial_eligible",
    "latitude",
    "longitude",
    "combatant_fatalities",
    "civilian_fatalities",
    "one_sided_civilian_fatalities",
    "best",
}

ACTOR_EVENTS_REQUIRED_COLUMNS = {
    "event_id",
    "actor_id",
    "actor_name",
    "date_start",
    "type_of_violence",
    "spatial_eligible",
    "latitude",
    "longitude",
    "combatant_fatalities",
    "civilian_fatalities",
    "one_sided_civilian_fatalities",
    "best",
}

H3_METRICS_COLUMN_ORDER = [
    "week_start",
    "actor_id",
    "actor_name",
    "h3_id",
    "h3_resolution",
    "h3_center_lat",
    "h3_center_lon",
    "event_count",
    "state_based_event_count",
    "non_state_event_count",
    "one_sided_event_count",
    "combat_event_count",
    "combatant_fatalities",
    "civilian_fatalities",
    "one_sided_civilian_fatalities",
    "best_fatalities",
    "one_sided_event_share",
    "civilian_fatality_share",
    "one_sided_civilian_fatality_share",
]


def load_events_clean(path: str) -> pd.DataFrame:
    """Load the cleaned event-level dataset.

    Args:
        path (str): Absolute path to `events_clean.parquet`.

    Returns:
        pd.DataFrame: The cleaned event-level dataset, unmodified.

    Raises:
        FileNotFoundError: If the input file does not exist.
    """
    if not os.path.exists(path):
        raise FileNotFoundError(f"events_clean.parquet not found at: {path}. Run 01_clean_events.py first.")
    return pd.read_parquet(path)


def load_actor_events(path: str) -> pd.DataFrame:
    """Load the actor-event dataset.

    Args:
        path (str): Absolute path to `actor_events.parquet`.

    Returns:
        pd.DataFrame: The actor-event dataset, unmodified.

    Raises:
        FileNotFoundError: If the input file does not exist.
    """
    if not os.path.exists(path):
        raise FileNotFoundError(f"actor_events.parquet not found at: {path}. Run 02_build_actor_events.py first.")
    return pd.read_parquet(path)


def validate_inputs(events_df: pd.DataFrame, actor_df: pd.DataFrame) -> None:
    """Fail if either input dataset does not satisfy its expected contract.

    Args:
        events_df (pd.DataFrame): The loaded `events_clean` dataset.
        actor_df (pd.DataFrame): The loaded `actor_events` dataset.

    Raises:
        ValueError: If required columns are missing from either dataset.
    """
    missing_events = EVENTS_REQUIRED_COLUMNS - set(events_df.columns)
    if missing_events:
        raise ValueError(f"events_clean.parquet is missing required columns: {sorted(missing_events)}")

    missing_actor = ACTOR_EVENTS_REQUIRED_COLUMNS - set(actor_df.columns)
    if missing_actor:
        raise ValueError(f"actor_events.parquet is missing required columns: {sorted(missing_actor)}")


def filter_spatially_eligible(df: pd.DataFrame) -> pd.DataFrame:
    """Restrict a dataset to rows with valid geographic coordinates.

    Args:
        df (pd.DataFrame): Dataset with a `spatial_eligible` column.

    Returns:
        pd.DataFrame: Rows where `spatial_eligible` is True.
    """
    return df[df["spatial_eligible"]].copy()


def compute_week_start(dates: pd.Series) -> pd.Series:
    """Assign each date to its Monday-starting week.

    Args:
        dates (pd.Series): Parsed datetime values.

    Returns:
        pd.Series: The Monday `week_start` timestamp for each date.
    """
    return dates.dt.to_period("W-SUN").dt.start_time


def assign_h3_cells(df: pd.DataFrame, resolution: int) -> pd.DataFrame:
    """Assign an H3 cell to every row and validate the generated identifiers.

    Args:
        df (pd.DataFrame): Spatially eligible rows with `latitude`/`longitude`.
        resolution (int): Configured H3 resolution.

    Returns:
        pd.DataFrame: Copy of the input with an `h3_id` column added.

    Raises:
        ValueError: If any generated H3 identifier is invalid or does not
            match the configured resolution.
    """
    df = df.copy()
    df["h3_id"] = df.apply(
        lambda row: h3.latlng_to_cell(row["latitude"], row["longitude"], resolution), axis=1
    )

    invalid = ~df["h3_id"].apply(h3.is_valid_cell)
    if invalid.any():
        raise ValueError(f"Generated invalid H3 cell identifiers for events: {df.loc[invalid, 'event_id'].tolist()[:10]}")

    wrong_resolution = df["h3_id"].apply(h3.get_resolution) != resolution
    if wrong_resolution.any():
        raise ValueError(
            f"Generated H3 cells at the wrong resolution for events: {df.loc[wrong_resolution, 'event_id'].tolist()[:10]}"
        )

    return df


def build_h3_centers(h3_ids: pd.Series) -> pd.DataFrame:
    """Compute the geographic centre of each distinct H3 cell.

    Args:
        h3_ids (pd.Series): H3 cell identifiers, possibly with duplicates.

    Returns:
        pd.DataFrame: One row per distinct `h3_id`, with `h3_center_lat`
            and `h3_center_lon` columns.
    """
    distinct = pd.Series(h3_ids.unique(), name="h3_id")
    centers = distinct.apply(h3.cell_to_latlng)
    return pd.DataFrame(
        {
            "h3_id": distinct,
            "h3_center_lat": centers.apply(lambda c: c[0]),
            "h3_center_lon": centers.apply(lambda c: c[1]),
        }
    )


def build_canonical_actor_names(actor_df: pd.DataFrame) -> pd.Series:
    """Derive a stable actor_id -> actor_name mapping from raw per-event names.

    Args:
        actor_df (pd.DataFrame): The actor-event dataset (spatially filtered).

    Returns:
        pd.Series: Indexed by `actor_id`, the most frequently observed
            non-empty `actor_name` for that id.
    """
    counts = actor_df.dropna(subset=["actor_name"]).groupby(["actor_id", "actor_name"]).size()
    counts = counts.rename("count").reset_index()

    # TODO: Use name_counts.sort_values(["actor_id", "count", "actor_name"], ascending=[True, False, True]) instead for explicit tie-breaking?
    return (
        counts.sort_values(["actor_id", "count"], ascending=[True, False])
        .drop_duplicates(subset="actor_id", keep="first")
        .set_index("actor_id")["actor_name"]
    )


def add_shares(df: pd.DataFrame) -> pd.DataFrame:
    """Compute the three share metrics, defined as zero on a zero denominator.

    Args:
        df (pd.DataFrame): Aggregated rows with `event_count`,
            `one_sided_event_count`, `civilian_fatalities`,
            `one_sided_civilian_fatalities`, and `best_fatalities`.

    Returns:
        pd.DataFrame: Copy of the input with `one_sided_event_share`,
            `civilian_fatality_share`, and `one_sided_civilian_fatality_share`
            added.
    """
    df = df.copy()
    df["one_sided_event_share"] = np.where(
        df["event_count"] > 0, df["one_sided_event_count"] / df["event_count"], 0.0
    )
    df["civilian_fatality_share"] = np.where(
        df["best_fatalities"] > 0, df["civilian_fatalities"] / df["best_fatalities"], 0.0
    )
    df["one_sided_civilian_fatality_share"] = np.where(
        df["best_fatalities"] > 0, df["one_sided_civilian_fatalities"] / df["best_fatalities"], 0.0
    )
    return df


def aggregate_global(events_df: pd.DataFrame, resolution: int) -> pd.DataFrame:
    """Compute the conflict-wide (`__ALL__`) week x H3-cell series.

    Args:
        events_df (pd.DataFrame): Spatially eligible rows from `events_clean`,
            already assigned an `h3_id`.
        resolution (int): Configured H3 resolution.

    Returns:
        pd.DataFrame: One row per (week_start, h3_id) combination with at
            least one event, with `actor_id = "__ALL__"`.
    """
    df = events_df.copy()
    df["week_start"] = compute_week_start(df["date_start"])

    grouped = df.groupby(["week_start", "h3_id"]).agg(
        event_count=("event_id", "nunique"),
        state_based_event_count=("type_of_violence", lambda s: int((s == config.analysis.violence_types.state_based).sum())),
        non_state_event_count=("type_of_violence", lambda s: int((s == config.analysis.violence_types.non_state).sum())),
        one_sided_event_count=("type_of_violence", lambda s: int((s == config.analysis.violence_types.one_sided).sum())),
        combatant_fatalities=("combatant_fatalities", "sum"),
        civilian_fatalities=("civilian_fatalities", "sum"),
        one_sided_civilian_fatalities=("one_sided_civilian_fatalities", "sum"),
        best_fatalities=("best", "sum"),
    ).reset_index()

    grouped["combat_event_count"] = grouped["state_based_event_count"] + grouped["non_state_event_count"]
    grouped["actor_id"] = ALL_ACTOR_ID
    grouped["actor_name"] = ALL_ACTOR_NAME
    grouped["h3_resolution"] = resolution

    return add_shares(grouped)


def aggregate_actors(actor_df: pd.DataFrame, resolution: int) -> pd.DataFrame:
    """Compute actor-specific week x H3-cell series from `actor_events`.

    Args:
        actor_df (pd.DataFrame): Spatially eligible rows from `actor_events`,
            already assigned an `h3_id`.
        resolution (int): Configured H3 resolution.

    Returns:
        pd.DataFrame: One row per (actor_id, week_start, h3_id) combination
            with at least one event.
    """
    df = actor_df.copy()
    df["week_start"] = compute_week_start(df["date_start"])

    grouped = df.groupby(["actor_id", "week_start", "h3_id"]).agg(
        event_count=("event_id", "nunique"),
        state_based_event_count=("type_of_violence", lambda s: int((s == config.analysis.violence_types.state_based).sum())),
        non_state_event_count=("type_of_violence", lambda s: int((s == config.analysis.violence_types.non_state).sum())),
        one_sided_event_count=("type_of_violence", lambda s: int((s == config.analysis.violence_types.one_sided).sum())),
        combatant_fatalities=("combatant_fatalities", "sum"),
        civilian_fatalities=("civilian_fatalities", "sum"),
        one_sided_civilian_fatalities=("one_sided_civilian_fatalities", "sum"),
        best_fatalities=("best", "sum"),
    ).reset_index()

    grouped["combat_event_count"] = grouped["state_based_event_count"] + grouped["non_state_event_count"]
    grouped["h3_resolution"] = resolution

    canonical_names = build_canonical_actor_names(actor_df)
    grouped["actor_name"] = grouped["actor_id"].map(canonical_names)

    return add_shares(grouped)


def validate_h3_metrics(df: pd.DataFrame, events_df: pd.DataFrame) -> None:
    """Fail if the assembled H3 dataset violates its structural invariants.

    Args:
        df (pd.DataFrame): The finalized h3-metrics dataset.
        events_df (pd.DataFrame): The spatially eligible subset of
            `events_clean`, used to independently re-check the `__ALL__`
            series (spatial conservation).

    Raises:
        ValueError: If any non-negativity, share-bound, decomposition, or
            spatial-conservation invariant is violated.
    """
    count_cols = [
        "event_count",
        "state_based_event_count",
        "non_state_event_count",
        "one_sided_event_count",
        "combat_event_count",
        "combatant_fatalities",
        "civilian_fatalities",
        "one_sided_civilian_fatalities",
        "best_fatalities",
    ]
    if (df[count_cols] < 0).any().any():
        raise ValueError("h3_weekly_metrics contains negative counts or fatalities.")

    share_cols = ["one_sided_event_share", "civilian_fatality_share", "one_sided_civilian_fatality_share"]
    for col in share_cols:
        if not df[col].between(0, 1).all():
            raise ValueError(f"h3_weekly_metrics: {col} outside [0, 1].")

    decomposition_ok = df["event_count"] == (
        df["state_based_event_count"] + df["non_state_event_count"] + df["one_sided_event_count"]
    )
    if not decomposition_ok.all():
        raise ValueError("h3_weekly_metrics: violence-type event counts do not sum to event_count.")

    combat_ok = df["combat_event_count"] == (df["state_based_event_count"] + df["non_state_event_count"])
    if not combat_ok.all():
        raise ValueError("h3_weekly_metrics: combat_event_count does not equal state_based + non_state.")

    all_rows = df[df["actor_id"] == ALL_ACTOR_ID]
    per_week_sum = all_rows.groupby("week_start")["event_count"].sum()

    check = events_df.copy()
    check["week_start"] = compute_week_start(check["date_start"])
    expected = check.groupby("week_start")["event_id"].nunique()

    actual = per_week_sum.reindex(expected.index, fill_value=0)
    mismatch = actual != expected
    if mismatch.any():
        bad_weeks = expected.index[mismatch].tolist()
        raise ValueError(
            "__ALL__ H3 event_count does not match "
            f"spatially eligible event counts for weeks: {bad_weeks[:10]}"
        )


def finalize(global_df: pd.DataFrame, actor_df: pd.DataFrame, centers_df: pd.DataFrame) -> pd.DataFrame:
    """Combine the global and actor-specific series, attach H3 centres, and order columns.

    Args:
        global_df (pd.DataFrame): The `__ALL__` week x H3-cell series.
        actor_df (pd.DataFrame): The actor-specific week x H3-cell series.
        centers_df (pd.DataFrame): Distinct `h3_id` -> centre-coordinate mapping.

    Returns:
        pd.DataFrame: Combined dataset restricted to
            `H3_METRICS_COLUMN_ORDER`, sorted by (actor_id, week_start, h3_id).
    """
    combined = pd.concat([global_df, actor_df], ignore_index=True)
    combined = combined.merge(centers_df, on="h3_id", how="left")
    combined = combined.sort_values(["actor_id", "week_start", "h3_id"]).reset_index(drop=True)
    return combined[H3_METRICS_COLUMN_ORDER]


def print_summary(df: pd.DataFrame) -> None:
    """Print a concise processing summary.

    Args:
        df (pd.DataFrame): The finalized h3-metrics dataset.
    """
    print("=== 04_build_h3_metrics summary ===")
    print(f"Distinct H3 cells:            {df['h3_id'].nunique()}")
    print(f"Weeks with spatial activity:  {df['week_start'].nunique()}")
    print(f"Distinct actors (incl. ALL):  {df['actor_id'].nunique()}")
    print(f"Total rows:                   {len(df)}")


def main() -> None:
    """Run the H3 spatial-aggregation stage and write the output.

    Orchestrates input loading/validation, spatial-eligibility filtering,
    H3 cell assignment/validation, the global (`__ALL__`) and
    actor-specific aggregations, structural validation of the combined
    result, and the final write to `data/derived/h3_weekly_metrics.csv`.
    """
    events_df = load_events_clean(events_clean)
    actor_df = load_actor_events(actor_events)
    validate_inputs(events_df, actor_df)

    resolution = config.spatial.h3_resolution

    spatial_events = assign_h3_cells(filter_spatially_eligible(events_df), resolution)
    spatial_actor_events = assign_h3_cells(filter_spatially_eligible(actor_df), resolution)

    centers_df = build_h3_centers(
        pd.concat([spatial_events["h3_id"], spatial_actor_events["h3_id"]], ignore_index=True)
    )

    global_df = aggregate_global(spatial_events, resolution)
    actor_h3_df = aggregate_actors(spatial_actor_events, resolution)

    result = finalize(global_df, actor_h3_df, centers_df)
    validate_h3_metrics(result, spatial_events)

    os.makedirs(derived_data_dir, exist_ok=True)
    result.to_csv(h3_weekly_metrics, index=False)

    print_summary(result)


if __name__ == "__main__":
    main()
