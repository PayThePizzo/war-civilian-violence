"""
Build weekly conflict metrics for the temporal visualization.

This module produces the canonical weekly dataset used by Web Visualization 1
and by later event-centred analyses.

The output contains both conflict-wide weekly observations and actor-specific
weekly observations.

The conflict-wide series is identified by:

    actor_id = "__ALL__"

and must be computed directly from the unique event-level dataset.

Actor-specific series are computed from the actor-event dataset.

This distinction is essential because a direct combat event can involve two
armed actors and therefore appears twice in the actor-event representation.
Summing actor-level observations would consequently double-count many events.

Expected inputs
---------------
The module expects:

    data/processed/events_clean.parquet
    data/processed/actor_events.parquet

Both files must satisfy the contracts defined by the preceding preprocessing
stages.

Temporal aggregation
--------------------
Each event is assigned to a Monday-starting week using its `date_start`.

The module constructs a complete weekly calendar spanning the configured
analysis period.

Missing actor-week combinations within the observation period are explicitly
represented with zero-valued additive metrics. This is required so that the
frontend can distinguish a week with no recorded activity from a missing row.

Metrics
-------
For each week, the module computes:

    event_count
    state_based_event_count
    non_state_event_count
    one_sided_event_count
    combat_event_count
    combatant_fatalities
    actor_deaths_suffered
    civilian_fatalities
    one_sided_civilian_fatalities
    best_fatalities
    low_fatalities
    high_fatalities
    active_location_count
    one_sided_event_share

`event_count` is always based on unique UCDP event identifiers.

`one_sided_event_share` is defined as:

    one_sided_event_count / event_count

and is set to zero for weeks with zero events.

`actor_deaths_suffered` is the weekly sum of fatalities attributed to the
actor side (see `02_build_actor_events.py`). It is undefined for the
conflict-wide `__ALL__` series and is left missing (`NA`) there, because an
all-actor aggregate is not a meaningful actor-specific loss variable.

Global and actor-specific series
--------------------------------
Global metrics are computed from `events_clean.parquet`.

Actor-specific metrics are computed from `actor_events.parquet`.

The global series receives:

    actor_id   = "__ALL__"
    actor_name = "All actors"

The global series must never be reconstructed by summing actor-level rows.

Actor display names are re-derived here (most frequently observed non-empty
`actor_name` per `actor_id` in `actor_events.parquet`) rather than imported
from `actor_lookup.csv`, since that file is not a declared input of this
stage; grouping directly by the raw per-event name would otherwise fragment
a single actor's weekly series whenever its recorded name varies by event.

Validation
----------
The module checks that:

- input schemas are valid;
- weekly dates fall within the configured analysis period;
- event counts are non-negative;
- fatality metrics are non-negative;
- one-sided shares lie in [0, 1];
- the three violence-type event counts sum to the total event count;
- the combat event count equals the sum of state-based and non-state events;
- global weekly event counts match direct aggregation from unique cleaned
  events.

Output
------
The script writes:

    data/derived/weekly_metrics.csv

The output contains one row for each actor-week combination, including zero
weeks, plus the special `__ALL__` series representing the conflict as a
whole.

The dataset is the primary input of the interactive temporal visualization
and is also used as the base time series for event-window construction.
"""

import os
import sys
import numpy as np
import pandas as pd

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
# Now seeing outside the scripts folder, so we can import from the project root

from project_paths import conf_path, events_clean, actor_events, weekly_metrics, derived_data_dir
from config.config_parser import load_from_config

config = load_from_config(conf_path)


ALL_ACTOR_ID = "__ALL__"
ALL_ACTOR_NAME = "All actors"

EVENTS_REQUIRED_COLUMNS = {
    "event_id",
    "date_start",
    "type_of_violence",
    "combatant_fatalities",
    "civilian_fatalities",
    "one_sided_civilian_fatalities",
    "best",
    "low",
    "high",
    "where_coordinates",
}

ACTOR_EVENTS_REQUIRED_COLUMNS = {
    "event_id",
    "actor_id",
    "actor_name",
    "date_start",
    "type_of_violence",
    "combatant_fatalities",
    "actor_deaths_suffered",
    "civilian_fatalities",
    "one_sided_civilian_fatalities",
    "best",
    "low",
    "high",
    "where_coordinates",
}

ADDITIVE_METRIC_COLUMNS = [
    "event_count",
    "state_based_event_count",
    "non_state_event_count",
    "one_sided_event_count",
    "combat_event_count",
    "combatant_fatalities",
    "civilian_fatalities",
    "one_sided_civilian_fatalities",
    "best_fatalities",
    "low_fatalities",
    "high_fatalities",
    "active_location_count",
]

WEEKLY_METRICS_COLUMN_ORDER = [
    "week_start",
    "actor_id",
    "actor_name",
    "event_count",
    "state_based_event_count",
    "non_state_event_count",
    "one_sided_event_count",
    "combat_event_count",
    "combatant_fatalities",
    "actor_deaths_suffered",
    "civilian_fatalities",
    "one_sided_civilian_fatalities",
    "best_fatalities",
    "low_fatalities",
    "high_fatalities",
    "active_location_count",
    "one_sided_event_share",
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
        ValueError: If required columns are missing, or if either dataset's
            primary key is invalid.
    """
    missing_events = EVENTS_REQUIRED_COLUMNS - set(events_df.columns)
    if missing_events:
        raise ValueError(f"events_clean.parquet is missing required columns: {sorted(missing_events)}")

    missing_actor = ACTOR_EVENTS_REQUIRED_COLUMNS - set(actor_df.columns)
    if missing_actor:
        raise ValueError(f"actor_events.parquet is missing required columns: {sorted(missing_actor)}")

    if not events_df["event_id"].is_unique or events_df["event_id"].isna().any():
        raise ValueError("events_clean.parquet does not have a valid unique event_id.")

    pair = actor_df[["event_id", "actor_id"]]
    if pair.duplicated().any() or actor_df["actor_id"].isna().any():
        raise ValueError("actor_events.parquet does not have a valid unique (event_id, actor_id) pair.")


def compute_week_start(dates: pd.Series) -> pd.Series:
    """Assign each date to its Monday-starting week.

    Args:
        dates (pd.Series): Parsed datetime values.

    Returns:
        pd.Series: The Monday `week_start` timestamp for each date.
    """
    return dates.dt.to_period("W-SUN").dt.start_time


def build_full_week_grid(start_date: str, end_date: str) -> pd.DatetimeIndex:
    """Construct the complete Monday-starting weekly calendar for the analysis period.

    Args:
        start_date (str): Configured analysis start date.
        end_date (str): Configured analysis end date.

    Returns:
        pd.DatetimeIndex: Every `week_start` Monday between the configured
            start and end dates, inclusive.
    """
    first_week = compute_week_start(pd.Series([pd.Timestamp(start_date)]))[0]
    last_week = compute_week_start(pd.Series([pd.Timestamp(end_date)]))[0]
    return pd.date_range(first_week, last_week, freq="7D")


def aggregate_global(events_df: pd.DataFrame, weeks: pd.DatetimeIndex) -> pd.DataFrame:
    """Compute the conflict-wide (`__ALL__`) weekly series directly from `events_clean`.

    Args:
        events_df (pd.DataFrame): The cleaned event-level dataset.
        weeks (pd.DatetimeIndex): The complete weekly calendar to reindex onto.

    Returns:
        pd.DataFrame: One row per week, including weeks with zero events,
            with `actor_id = "__ALL__"`.
    """
    df = events_df.copy()
    df["week_start"] = compute_week_start(df["date_start"])

    grouped = df.groupby("week_start").agg(
        event_count=("event_id", "nunique"),
        state_based_event_count=("type_of_violence", lambda s: int((s == config.analysis.violence_types.state_based).sum())),
        non_state_event_count=("type_of_violence", lambda s: int((s == config.analysis.violence_types.non_state).sum())),
        one_sided_event_count=("type_of_violence", lambda s: int((s == config.analysis.violence_types.one_sided).sum())),
        combatant_fatalities=("combatant_fatalities", "sum"),
        civilian_fatalities=("civilian_fatalities", "sum"),
        one_sided_civilian_fatalities=("one_sided_civilian_fatalities", "sum"),
        best_fatalities=("best", "sum"),
        low_fatalities=("low", "sum"),
        high_fatalities=("high", "sum"),
        active_location_count=("where_coordinates", "nunique"),
    )
    grouped["combat_event_count"] = grouped["state_based_event_count"] + grouped["non_state_event_count"]

    grouped = grouped.reindex(weeks, fill_value=0)
    grouped.index.name = "week_start"
    grouped = grouped.reset_index()

    grouped["actor_id"] = ALL_ACTOR_ID
    grouped["actor_name"] = ALL_ACTOR_NAME
    grouped["actor_deaths_suffered"] = np.nan

    grouped["one_sided_event_share"] = np.where(
        grouped["event_count"] > 0,
        grouped["one_sided_event_count"] / grouped["event_count"],
        0.0,
    )

    return grouped


def build_canonical_actor_names(actor_df: pd.DataFrame) -> pd.Series:
    """Derive a stable actor_id -> actor_name mapping from raw per-event names.

    Args:
        actor_df (pd.DataFrame): The actor-event dataset.

    Returns:
        pd.Series: Indexed by `actor_id`, the most frequently observed
            non-empty `actor_name` for that id.
    """
    counts = actor_df.dropna(subset=["actor_name"]).groupby(["actor_id", "actor_name"]).size()
    counts = counts.rename("count").reset_index()

    return (
        counts.sort_values(["actor_id", "count", "actor_name"], ascending=[True, False, True])
        .drop_duplicates(subset="actor_id", keep="first")
        .set_index("actor_id")["actor_name"]
    )


def aggregate_actors(actor_df: pd.DataFrame, weeks: pd.DatetimeIndex) -> pd.DataFrame:
    """Compute actor-specific weekly series from `actor_events`.

    Args:
        actor_df (pd.DataFrame): The actor-event dataset.
        weeks (pd.DatetimeIndex): The complete weekly calendar to reindex onto.

    Returns:
        pd.DataFrame: One row per (actor_id, week) combination, including
            zero-activity weeks for every actor observed in the dataset.
    """
    df = actor_df.copy()
    df["week_start"] = compute_week_start(df["date_start"])

    grouped = df.groupby(["actor_id", "week_start"]).agg(
        event_count=("event_id", "nunique"),
        state_based_event_count=("type_of_violence", lambda s: int((s == config.analysis.violence_types.state_based).sum())),
        non_state_event_count=("type_of_violence", lambda s: int((s == config.analysis.violence_types.non_state).sum())),
        one_sided_event_count=("type_of_violence", lambda s: int((s == config.analysis.violence_types.one_sided).sum())),
        combatant_fatalities=("combatant_fatalities", "sum"),
        actor_deaths_suffered=("actor_deaths_suffered", "sum"),
        civilian_fatalities=("civilian_fatalities", "sum"),
        one_sided_civilian_fatalities=("one_sided_civilian_fatalities", "sum"),
        best_fatalities=("best", "sum"),
        low_fatalities=("low", "sum"),
        high_fatalities=("high", "sum"),
        active_location_count=("where_coordinates", "nunique"),
    )
    grouped["combat_event_count"] = grouped["state_based_event_count"] + grouped["non_state_event_count"]

    actor_ids = df["actor_id"].unique()
    full_index = pd.MultiIndex.from_product([actor_ids, weeks], names=["actor_id", "week_start"])

    fill_cols = ADDITIVE_METRIC_COLUMNS + ["actor_deaths_suffered"]
    grouped = grouped.reindex(full_index)
    grouped[fill_cols] = grouped[fill_cols].fillna(0)
    grouped = grouped.reset_index()

    canonical_names = build_canonical_actor_names(actor_df)
    grouped["actor_name"] = grouped["actor_id"].map(canonical_names)

    grouped["one_sided_event_share"] = np.where(
        grouped["event_count"] > 0,
        grouped["one_sided_event_count"] / grouped["event_count"],
        0.0,
    )

    return grouped


def validate_weekly_metrics(df: pd.DataFrame, events_df: pd.DataFrame) -> None:
    """Fail if the assembled weekly dataset violates its structural invariants.

    Args:
        df (pd.DataFrame): The finalized weekly-metrics dataset.
        events_df (pd.DataFrame): The original cleaned event-level dataset,
            used to independently re-check the `__ALL__` series.

    Raises:
        ValueError: If any non-negativity, share-bound, decomposition, or
            global-consistency invariant is violated.
    """
    numeric_nonneg_cols = ADDITIVE_METRIC_COLUMNS
    if (df[numeric_nonneg_cols] < 0).any().any():
        raise ValueError("weekly_metrics contains negative counts or fatalities.")

    if not df["one_sided_event_share"].between(0, 1).all():
        raise ValueError("weekly_metrics contains one_sided_event_share outside [0, 1].")

    decomposition_ok = df["event_count"] == (
        df["state_based_event_count"] + df["non_state_event_count"] + df["one_sided_event_count"]
    )
    if not decomposition_ok.all():
        raise ValueError("weekly_metrics: violence-type event counts do not sum to event_count.")

    combat_ok = df["combat_event_count"] == (df["state_based_event_count"] + df["non_state_event_count"])
    if not combat_ok.all():
        raise ValueError("weekly_metrics: combat_event_count does not equal state_based + non_state.")

    all_rows = df[df["actor_id"] == ALL_ACTOR_ID].copy()
    check = events_df.copy()
    check["week_start"] = compute_week_start(check["date_start"])
    expected = check.groupby("week_start")["event_id"].nunique()

    actual = all_rows.set_index("week_start")["event_count"]
    mismatch = expected.reindex(actual.index, fill_value=0) != actual
    if mismatch.any():
        bad_weeks = actual.index[mismatch].tolist()
        raise ValueError(f"__ALL__ event_count does not match unique events_clean counts for weeks: {bad_weeks[:10]}")


def finalize(global_df: pd.DataFrame, actor_df: pd.DataFrame) -> pd.DataFrame:
    """Combine the global and actor-specific series and apply the canonical schema.

    Args:
        global_df (pd.DataFrame): The `__ALL__` weekly series.
        actor_df (pd.DataFrame): The actor-specific weekly series.

    Returns:
        pd.DataFrame: Combined dataset restricted to
            `WEEKLY_METRICS_COLUMN_ORDER`, sorted by (actor_id, week_start).
    """
    combined = pd.concat([global_df, actor_df], ignore_index=True)
    combined = combined.sort_values(["actor_id", "week_start"]).reset_index(drop=True)
    return combined[WEEKLY_METRICS_COLUMN_ORDER]


def print_summary(df: pd.DataFrame) -> None:
    """Print a concise processing summary.

    Args:
        df (pd.DataFrame): The finalized weekly-metrics dataset.
    """
    print("=== 03_build_weekly_metrics summary ===")
    print(f"Weeks in calendar:            {df['week_start'].nunique()}")
    print(f"Distinct actors (incl. ALL):  {df['actor_id'].nunique()}")
    print(f"Total rows:                   {len(df)}")
    all_rows = df[df["actor_id"] == ALL_ACTOR_ID]
    print(f"Total events (__ALL__ sum):   {int(all_rows['event_count'].sum())}")


def main() -> None:
    """Run the weekly-aggregation stage and write the output.

    Orchestrates input loading/validation, the global (`__ALL__`) and
    actor-specific aggregations, structural validation of the combined
    result, and the final write to `data/derived/weekly_metrics.csv`.
    """
    events_df = load_events_clean(events_clean)
    actor_df = load_actor_events(actor_events)
    validate_inputs(events_df, actor_df)

    weeks = build_full_week_grid(config.analysis.start_date, config.analysis.end_date)

    global_df = aggregate_global(events_df, weeks)
    actor_weekly_df = aggregate_actors(actor_df, weeks)

    result = finalize(global_df, actor_weekly_df)
    validate_weekly_metrics(result, events_df)

    os.makedirs(derived_data_dir, exist_ok=True)
    result.to_csv(weekly_metrics, index=False)

    print_summary(result)


if __name__ == "__main__":
    main()
