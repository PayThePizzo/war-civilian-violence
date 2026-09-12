"""
Build multidimensional violence profiles for armed actors.

This module produces the actor-level dataset used by Web Visualization 3.

The purpose of the actor profile table is to represent each armed actor with
a consistent set of temporal, behavioral, fatality, and geographic metrics.
The resulting table contains exactly one row per canonical actor.

Expected inputs
---------------
The module expects:

    data/processed/actor_events.parquet
    data/processed/actor_lookup.csv

The actor-event dataset must contain unique `(event_id, actor_id)` pairs and
the canonical actor identifier produced by `02_build_actor_events.py`.

The project configuration may define a minimum event threshold used by the
frontend to determine whether an actor should be displayed by default.

Actor-level metrics
-------------------
For each actor the module calculates:

    first_event_date
    last_event_date
    active_week_count
    total_event_count
    combat_event_count
    one_sided_event_count
    combatant_fatalities_in_involved_events
    actor_deaths_suffered
    civilian_fatalities_in_involved_events
    one_sided_civilian_fatalities
    one_sided_event_share
    active_location_count
    active_h3_cell_count
    events_per_active_week
    one_sided_events_per_active_week
    civilian_fatalities_per_active_week

`combatant_fatalities_in_involved_events` represents the total combatant
fatalities recorded in combat events involving the actor. It must not be
interpreted as fatalities suffered by the actor itself.

`actor_deaths_suffered` is kept separately for that purpose.

Actors are grouped by `actor_id` only (not `(actor_id, actor_name)`); the
canonical `actor_name` is attached afterward from `actor_lookup.csv`, which
is a declared input of this stage. Grouping by the raw per-event name would
otherwise fragment one actor's profile whenever its recorded name varies by
event, the same reasoning applied in `03_build_weekly_metrics.py` and
`04_build_h3_metrics.py` (which re-derive a canonical name in-script instead,
since `actor_lookup.csv` is not one of their declared inputs).

Geographic spread
-----------------
Geographic spread is measured using both named locations and H3 cells.

Only spatially eligible events contribute to geographic spread metrics.

The H3 resolution must be identical to the one used by
`04_build_h3_metrics.py`.

Visualization eligibility
-------------------------
Actors are not removed because they have few events.

Instead the module creates:

    eligible_for_web3

based on the configured minimum number of events.

This allows the raw analytical table to remain complete while preventing the
parallel-coordinates visualization from becoming unreadable by default.

Validation
----------
The module verifies:

- exactly one profile is produced per actor;
- event counts are based on unique event identifiers;
- combat and one-sided event counts are mutually exhaustive under the current
  three-category violence definition;
- all derived counts and fatality values are non-negative;
- proportions lie in [0, 1];
- active-week counts are positive for every actor in the output;
- actor names are consistent with the canonical actor lookup table.

Output
------
The script writes:

    data/derived/actor_profiles.csv

Each row describes one armed actor and provides the canonical input for the
actor parallel-coordinates visualization and actor-selection controls used
throughout the web application.
"""

import os
import sys

import h3
import numpy as np
import pandas as pd

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
# Now seeing outside the scripts folder, so we can import from the project root

from project_paths import conf_path, actor_events, actor_lookup, actor_profiles, derived_data_dir
from config.config_parser import AppConfig, load_from_config

config = load_from_config(conf_path)


ACTOR_EVENTS_REQUIRED_COLUMNS = {
    "event_id",
    "actor_id",
    "date_start",
    "is_combat",
    "is_one_sided",
    "combatant_fatalities",
    "actor_deaths_suffered",
    "civilian_fatalities",
    "one_sided_civilian_fatalities",
    "spatial_eligible",
    "latitude",
    "longitude",
    "where_coordinates",
}

ACTOR_LOOKUP_REQUIRED_COLUMNS = {"actor_id", "actor_name"}

ACTOR_PROFILES_COLUMN_ORDER = [
    "actor_id",
    "actor_name",
    "first_event_date",
    "last_event_date",
    "active_week_count",
    "total_event_count",
    "combat_event_count",
    "one_sided_event_count",
    "combatant_fatalities_in_involved_events",
    "actor_deaths_suffered",
    "civilian_fatalities_in_involved_events",
    "one_sided_civilian_fatalities",
    "one_sided_event_share",
    "active_location_count",
    "active_h3_cell_count",
    "events_per_active_week",
    "one_sided_events_per_active_week",
    "civilian_fatalities_per_active_week",
    "eligible_for_web3",
]


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


def load_actor_lookup(path: str) -> pd.DataFrame:
    """Load the canonical actor-id-to-name lookup table.

    Args:
        path (str): Absolute path to `actor_lookup.csv`.

    Returns:
        pd.DataFrame: The actor lookup table, unmodified.

    Raises:
        FileNotFoundError: If the input file does not exist.
    """
    if not os.path.exists(path):
        raise FileNotFoundError(f"actor_lookup.csv not found at: {path}. Run 02_build_actor_events.py first.")
    return pd.read_csv(path)


def validate_inputs(actor_df: pd.DataFrame, lookup_df: pd.DataFrame) -> None:
    """Fail if either input dataset does not satisfy its expected contract.

    Args:
        actor_df (pd.DataFrame): The loaded `actor_events` dataset.
        lookup_df (pd.DataFrame): The loaded `actor_lookup` dataset.

    Raises:
        ValueError: If required columns are missing, if `(event_id, actor_id)`
            is not unique, or if `actor_id` is not unique in the lookup.
    """
    if actor_df["actor_id"].isna().any():
        raise ValueError(
            "actor_events.parquet contains null actor_id values."
        )

    if lookup_df["actor_id"].isna().any():
        raise ValueError(
            "actor_lookup.csv contains null actor_id values."
        )

    if actor_df[["event_id", "actor_id"]].duplicated().any():
        raise ValueError("actor_events.parquet does not have a valid unique (event_id, actor_id) pair.")

    # TODO: Should I use `if not lookup_df["actor_id"].is_unique` or `if lookup_df["actor_id"].duplicated().any()` ?
    if not lookup_df["actor_id"].is_unique:
        raise ValueError("actor_lookup.csv does not have a unique actor_id.")

    missing_actor = ACTOR_EVENTS_REQUIRED_COLUMNS - set(actor_df.columns)
    missing_lookup = ACTOR_LOOKUP_REQUIRED_COLUMNS - set(lookup_df.columns)

    if missing_actor:
        raise ValueError(f"actor_events.parquet is missing required columns: {sorted(missing_actor)}")

    if missing_lookup:
        raise ValueError(f"actor_lookup.csv is missing required columns: {sorted(missing_lookup)}")


def compute_week_start(dates: pd.Series) -> pd.Series:
    """Assign each date to its Monday-starting week.

    Args:
        dates (pd.Series): Parsed datetime values.

    Returns:
        pd.Series: The Monday `week_start` timestamp for each date.
    """
    return dates.dt.to_period("W-SUN").dt.start_time


def assign_h3_cells(df: pd.DataFrame, resolution: int) -> pd.DataFrame:
    """Assign an H3 cell to spatially eligible rows, at the same resolution as Web 2.

    Args:
        df (pd.DataFrame): Spatially eligible rows with `latitude`/`longitude`.
        resolution (int): Configured H3 resolution.

    Returns:
        pd.DataFrame: Copy of the input with an `h3_id` column added.

    Raises:
        ValueError: If any generated H3 identifier is invalid.
    """
    df = df.copy()
    df["h3_id"] = df.apply(
        lambda row: h3.latlng_to_cell(row["latitude"], row["longitude"], resolution), axis=1
    )

    wrong_resolution = (df["h3_id"].apply(h3.get_resolution)!= resolution)

    if wrong_resolution.any():
        raise ValueError(
            "Generated H3 cells do not match the configured resolution."
        )

    invalid = ~df["h3_id"].apply(h3.is_valid_cell)
    if invalid.any():
        raise ValueError(f"Generated invalid H3 cell identifiers for events: {df.loc[invalid, 'event_id'].tolist()[:10]}")

    return df


def build_activity_metrics(actor_df: pd.DataFrame) -> pd.DataFrame:
    """Compute the temporal, behavioral, and fatality metrics for each actor.

    Args:
        actor_df (pd.DataFrame): The full actor-event dataset (not filtered
            to spatially eligible rows).

    Returns:
        pd.DataFrame: One row per `actor_id` with the non-geographic metrics.
    """
    df = actor_df.copy()
    df["week_start"] = compute_week_start(df["date_start"])

    return df.groupby("actor_id").agg(
        first_event_date=("date_start", "min"),
        last_event_date=("date_start", "max"),
        active_week_count=("week_start", "nunique"),
        total_event_count=("event_id", "nunique"),
        combat_event_count=("event_id", lambda s: s[df.loc[s.index, "is_combat"]].nunique()),
        one_sided_event_count=("event_id", lambda s: s[df.loc[s.index, "is_one_sided"]].nunique()),
        combatant_fatalities_in_involved_events=("combatant_fatalities", "sum"),
        actor_deaths_suffered=("actor_deaths_suffered", "sum"),
        civilian_fatalities_in_involved_events=("civilian_fatalities", "sum"),
        one_sided_civilian_fatalities=("one_sided_civilian_fatalities", "sum"),
    )


def build_geographic_metrics(actor_df: pd.DataFrame, resolution: int) -> pd.DataFrame:
    """Compute geographic-spread metrics from spatially eligible actor-event rows.

    Args:
        actor_df (pd.DataFrame): The full actor-event dataset.
        resolution (int): Configured H3 resolution, matching Web 2.

    Returns:
        pd.DataFrame: One row per `actor_id` (only actors with at least one
            spatially eligible event) with `active_location_count` and
            `active_h3_cell_count`.
    """
    spatial_df = actor_df[actor_df["spatial_eligible"]]
    spatial_df = assign_h3_cells(spatial_df, resolution)

    return spatial_df.groupby("actor_id").agg(
        active_location_count=("where_coordinates", "nunique"),
        active_h3_cell_count=("h3_id", "nunique"),
    )


def finalize(activity_df: pd.DataFrame, geo_df: pd.DataFrame, lookup_df: pd.DataFrame) -> pd.DataFrame:
    """Join activity and geographic metrics, attach canonical names, and derive rates.

    Args:
        activity_df (pd.DataFrame): Per-actor temporal/behavioral/fatality metrics.
        geo_df (pd.DataFrame): Per-actor geographic-spread metrics (may be
            missing rows for actors with zero spatially eligible events).
        lookup_df (pd.DataFrame): The canonical actor lookup table.

    Returns:
        pd.DataFrame: One row per actor, restricted to
            `ACTOR_PROFILES_COLUMN_ORDER`, sorted by `actor_id`.

    Raises:
        ValueError: If any actor_id in `activity_df` is missing from
            `actor_lookup.csv`.
    """
    df = activity_df.join(geo_df, how="left")
    df[["active_location_count", "active_h3_cell_count"]] = df[
        ["active_location_count", "active_h3_cell_count"]
    ].fillna(0).astype(int)

    df = df.reset_index()

    canonical_names = lookup_df.set_index("actor_id")["actor_name"]
    missing_names = df.loc[~df["actor_id"].isin(canonical_names.index), "actor_id"].tolist()
    if missing_names:
        raise ValueError(f"actor_events contains actor_id values missing from actor_lookup.csv: {missing_names[:10]}")
    df["actor_name"] = df["actor_id"].map(canonical_names)

    df["one_sided_event_share"] = np.where(
        df["total_event_count"] > 0, df["one_sided_event_count"] / df["total_event_count"], 0.0
    )
    df["events_per_active_week"] = df["total_event_count"] / df["active_week_count"]
    df["one_sided_events_per_active_week"] = df["one_sided_event_count"] / df["active_week_count"]
    df["civilian_fatalities_per_active_week"] = (
        df["civilian_fatalities_in_involved_events"] / df["active_week_count"]
    )

    df["eligible_for_web3"] = df["total_event_count"] >= config.actors.min_events

    df = df.sort_values("actor_id").reset_index(drop=True)
    return df[ACTOR_PROFILES_COLUMN_ORDER]


def validate_actor_profiles(df: pd.DataFrame, actor_df: pd.DataFrame) -> None:
    """Fail if the assembled actor-profile dataset violates its structural invariants.

    Args:
        df (pd.DataFrame): The finalized actor-profiles dataset.
        actor_df (pd.DataFrame): The original actor-event dataset, used to
            independently re-check per-actor event counts.

    Raises:
        ValueError: If any uniqueness, non-negativity, share-bound,
            decomposition, or active-week invariant is violated.
    """
    if not df["actor_id"].is_unique:
        raise ValueError("actor_profiles contains duplicate actor_id rows.")

    nonneg_cols = [
        "active_week_count",
        "total_event_count",
        "combat_event_count",
        "one_sided_event_count",
        "combatant_fatalities_in_involved_events",
        "actor_deaths_suffered",
        "civilian_fatalities_in_involved_events",
        "one_sided_civilian_fatalities",
        "active_location_count",
        "active_h3_cell_count",
    ]
    if (df[nonneg_cols] < 0).any().any():
        raise ValueError("actor_profiles contains negative counts or fatalities.")

    if not df["one_sided_event_share"].between(0, 1).all():
        raise ValueError("actor_profiles: one_sided_event_share outside [0, 1].")

    decomposition_ok = df["total_event_count"] == (df["combat_event_count"] + df["one_sided_event_count"])
    if not decomposition_ok.all():
        raise ValueError("actor_profiles: combat_event_count + one_sided_event_count != total_event_count.")

    if not (df["active_week_count"] > 0).all():
        raise ValueError("actor_profiles contains actors with zero active weeks.")

    expected_counts = actor_df.groupby("actor_id")["event_id"].nunique()
    actual_counts = df.set_index("actor_id")["total_event_count"]
    mismatch = expected_counts.reindex(actual_counts.index) != actual_counts
    if mismatch.any():
        bad_actors = actual_counts.index[mismatch].tolist()
        raise ValueError(f"actor_profiles.total_event_count does not match actor_events for actors: {bad_actors[:10]}")


def print_summary(df: pd.DataFrame) -> None:
    """Print a concise processing summary.

    Args:
        df (pd.DataFrame): The finalized actor-profiles dataset.
    """
    print("=== 05_build_actor_profiles summary ===")
    print(f"Total actors:                {len(df)}")
    print(f"Eligible for Web 3:          {int(df['eligible_for_web3'].sum())}")


def main() -> None:
    """Run the actor-profile construction stage and write the output.

    Orchestrates input loading/validation, activity-metric aggregation,
    geographic-metric aggregation (spatially eligible rows only, same H3
    resolution as `04_build_h3_metrics.py`), canonical-name attachment,
    rate/share derivation, structural validation, and the final write to
    `data/derived/actor_profiles.csv`.
    """
    actor_df = load_actor_events(actor_events)
    lookup_df = load_actor_lookup(actor_lookup)
    validate_inputs(actor_df, lookup_df)

    resolution = config.spatial.h3_resolution

    activity_df = build_activity_metrics(actor_df)
    geo_df = build_geographic_metrics(actor_df, resolution)

    result = finalize(activity_df, geo_df, lookup_df)
    validate_actor_profiles(result, actor_df)

    os.makedirs(derived_data_dir, exist_ok=True)
    result.to_csv(actor_profiles, index=False)

    print_summary(result)


if __name__ == "__main__":
    main()
