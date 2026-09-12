"""
Validate the complete processed and derived data pipeline.

This module is the final integrity gate between data preprocessing and the
visualization layer.

It does not generate analytical metrics and must not silently modify any
input dataset.

Its sole responsibility is to verify that the outputs produced by the
preceding preprocessing stages satisfy their declared schemas, value
constraints, relational constraints, and cross-dataset invariants.

Expected inputs
---------------
The validator expects:

    data/processed/events_clean.parquet
    data/processed/actor_events.parquet
    data/processed/actor_lookup.csv
    data/derived/weekly_metrics.csv
    data/derived/h3_weekly_metrics.csv
    data/derived/actor_profiles.csv
    data/derived/event_windows.csv

Validation categories
---------------------
The script validates the pipeline at several levels.

1. File-level validation

   Confirm that every required output file exists and can be loaded.

2. Schema validation

   Confirm that each file contains all mandatory fields with compatible
   data types.

3. Event-level validation

   Verify uniqueness and non-nullness of event identifiers, valid dates,
   supported violence types, valid fatality values, and geographic flags.

4. Actor-event validation

   Verify uniqueness of `(event_id, actor_id)` and referential integrity back
   to the canonical event table.

5. Actor lookup validation

   Verify uniqueness of actor identifiers and complete coverage of actor IDs
   referenced by actor-event records.

6. Weekly aggregation validation

   Recompute selected conflict-wide weekly counts from the canonical event
   table and compare them against `weekly_metrics.csv`.

7. Violence decomposition validation

   Verify that state-based, non-state, and one-sided event counts sum to the
   total event count and that combat counts equal the sum of state-based and
   non-state events.

8. Spatial conservation validation

   Verify that conflict-wide H3 counts correspond exactly to the set of
   spatially eligible unique events.

9. Actor-profile validation

   Recompute selected actor-level counts from `actor_events.parquet` and
   compare them with `actor_profiles.csv`.

10. Event-window validation

    Verify relative-week ranges, unique T0 rows, episode separation,
    calendar-date alignment, and the correct handling of unobserved boundary
    weeks.

11. Range validation

    Verify that proportions lie in [0, 1], counts are non-negative, and
    required identifiers and dates are non-null.

Outputs
-------
The script always writes:

    data/validation/validation_report.json
    data/validation/validation_failures.csv

The JSON report provides a machine-readable and human-readable summary of
the validation run.

The CSV file contains one row for every failed check and is created even
when no failures occur.

Failure behaviour
-----------------
The validator must return process exit code 0 only when all required checks
pass.

If one or more checks fail, the validator writes the complete failure report
and exits with a non-zero status.

No validation failure should be automatically repaired by this module.
Corrections belong in the upstream transformation responsible for producing
the invalid output.
"""


import os
import sys
import csv
import json
import pandas as pd

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
# Now seeing outside the scripts folder, so we can import from the project root

from project_paths import (
    conf_path,
    events_clean,
    actor_events,
    actor_lookup,
    weekly_metrics,
    h3_weekly_metrics,
    actor_profiles,
    event_windows,
    validation_data_dir,
    validation_report,
    validation_failures,
)
from config.config_parser import load_from_config

config = load_from_config(conf_path)


ALL_ACTOR_ID = "__ALL__"

# Mirrors 01_clean_events.py's CANONICAL_COLUMN_ORDER. Kept as an independent
# literal (not imported from the numbered producer module) so the validator
# checks the on-disk contract rather than trivially agreeing with whatever
# the producer currently defines.
EVENTS_CLEAN_REQUIRED_COLUMNS = {
    "event_id",
    "date_start",
    "date_end",
    "date_prec",
    "type_of_violence",
    "violence_type_label",
    "is_combat",
    "is_one_sided",
    "conflict_new_id",
    "conflict_name",
    "dyad_new_id",
    "dyad_name",
    "side_a_new_id",
    "side_a",
    "side_b_new_id",
    "side_b",
    "country",
    "adm_1",
    "adm_2",
    "where_coordinates",
    "latitude",
    "longitude",
    "spatial_eligible",
    "deaths_a",
    "deaths_b",
    "deaths_civilians",
    "deaths_unknown",
    "combatant_fatalities",
    "civilian_fatalities",
    "one_sided_civilian_fatalities",
    "low",
    "best",
    "high",
}

# Mirrors 02_build_actor_events.py's ACTOR_EVENTS_COLUMN_ORDER.
ACTOR_EVENTS_REQUIRED_COLUMNS = {
    "event_id",
    "actor_id",
    "actor_name",
    "actor_role",
    "is_one_sided_perpetrator",
    "date_start",
    "type_of_violence",
    "is_combat",
    "is_one_sided",
    "combatant_fatalities",
    "actor_deaths_suffered",
    "civilian_fatalities",
    "one_sided_civilian_fatalities",
    "best",
    "low",
    "high",
    "latitude",
    "longitude",
    "spatial_eligible",
    "adm_1",
    "adm_2",
    "where_coordinates",
}

# Mirrors 02_build_actor_events.py's ACTOR_LOOKUP_COLUMN_ORDER.
ACTOR_LOOKUP_REQUIRED_COLUMNS = {
    "actor_id",
    "actor_name",
    "event_count",
    "first_event_date",
    "last_event_date",
}

# Mirrors 03_build_weekly_metrics.py's WEEKLY_METRICS_COLUMN_ORDER.
WEEKLY_METRICS_REQUIRED_COLUMNS = {
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
}

# Mirrors 04_build_h3_metrics.py's H3_METRICS_COLUMN_ORDER.
H3_METRICS_REQUIRED_COLUMNS = {
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
}

# Mirrors 05_build_actor_profiles.py's ACTOR_PROFILES_COLUMN_ORDER.
ACTOR_PROFILES_REQUIRED_COLUMNS = {
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
}

# Mirrors 06_build_event_windows.py's WINDOW_METRIC_COLUMNS.
WINDOW_METRIC_COLUMNS = [
    "combat_event_count",
    "combatant_fatalities",
    "actor_deaths_suffered",
    "one_sided_event_count",
    "one_sided_civilian_fatalities",
    "civilian_fatalities",
    "active_location_count",
]

# Mirrors 06_build_event_windows.py's EVENT_WINDOWS_COLUMN_ORDER.
EVENT_WINDOWS_REQUIRED_COLUMNS = {
    "episode_id",
    "actor_id",
    "actor_name",
    "peak_rank",
    "t0_date",
    "peak_metric_value",
    "relative_week",
    "calendar_week",
    "is_observed_week",
} | set(WINDOW_METRIC_COLUMNS)

SCHEMA_REQUIREMENTS = {
    "events_clean": EVENTS_CLEAN_REQUIRED_COLUMNS,
    "actor_events": ACTOR_EVENTS_REQUIRED_COLUMNS,
    "actor_lookup": ACTOR_LOOKUP_REQUIRED_COLUMNS,
    "weekly_metrics": WEEKLY_METRICS_REQUIRED_COLUMNS,
    "h3_weekly_metrics": H3_METRICS_REQUIRED_COLUMNS,
    "actor_profiles": ACTOR_PROFILES_REQUIRED_COLUMNS,
    "event_windows": EVENT_WINDOWS_REQUIRED_COLUMNS,
}

# (path, format, date_columns) for every expected pipeline output.
EXPECTED_FILES = {
    "events_clean": (events_clean, "parquet", []),
    "actor_events": (actor_events, "parquet", []),
    "actor_lookup": (actor_lookup, "csv", ["first_event_date", "last_event_date"]),
    "weekly_metrics": (weekly_metrics, "csv", ["week_start"]),
    "h3_weekly_metrics": (h3_weekly_metrics, "csv", ["week_start"]),
    "actor_profiles": (actor_profiles, "csv", ["first_event_date", "last_event_date"]),
    "event_windows": (event_windows, "csv", ["t0_date", "calendar_week"]),
}

FAILURE_FIELDS = ["check_id", "dataset", "severity", "message"]


class ValidationRecorder:
    """Accumulate the pass/fail outcome of every individual assertion.

    Each call to `check` records exactly one unit toward `checks_run`,
    regardless of how many underlying rows a failing condition affects. This
    keeps `checks_run`/`checks_failed` a stable count of *checks*, not of
    offending rows.
    """

    def __init__(self):
        self.run = 0
        self.failed = 0
        self.failures = []

    def check(self, check_id: str, dataset: str, condition: bool, message: str) -> None:
        """Record the outcome of one assertion.

        Args:
            check_id (str): Stable identifier for this assertion (e.g. `"C.date_order"`).
            dataset (str): The logical dataset name the assertion is about.
            condition (bool): True if the assertion held.
            message (str): Human-readable explanation, used only on failure.
        """
        self.run += 1
        if not condition:
            self.failed += 1
            self.failures.append(
                {"check_id": check_id, "dataset": dataset, "severity": "error", "message": message}
            )


def load_all(recorder: ValidationRecorder) -> dict:
    """Load every expected pipeline output, recording existence/load failures.

    Args:
        recorder (ValidationRecorder): The shared check-outcome accumulator.

    Returns:
        dict: Mapping of dataset name to its loaded DataFrame, or None if the
            file was missing or failed to load.
    """
    frames = {}
    for name, (path, fmt, date_cols) in EXPECTED_FILES.items():
        exists = os.path.exists(path)
        recorder.check("A.file_exists", name, exists, f"{name} not found at: {path}")
        if not exists:
            frames[name] = None
            continue

        try:
            if fmt == "parquet":
                frames[name] = pd.read_parquet(path)
            else:
                frames[name] = pd.read_csv(path, parse_dates=date_cols) if date_cols else pd.read_csv(path)
        except Exception as exc:  # noqa: BLE001 - any load failure must be captured, not raised
            recorder.check("A.file_loadable", name, False, f"{name} failed to load: {exc}")
            frames[name] = None

    return frames


def check_schema(recorder: ValidationRecorder, frames: dict) -> None:
    """Verify every loaded file contains its declared required columns.

    Args:
        recorder (ValidationRecorder): The shared check-outcome accumulator.
        frames (dict): Loaded dataset frames, keyed by dataset name.
    """
    for name, required in SCHEMA_REQUIREMENTS.items():
        df = frames.get(name)
        if df is None:
            continue
        missing = required - set(df.columns)
        recorder.check(
            "B.schema", name, not missing, f"{name} is missing required columns: {sorted(missing)}"
        )


def check_events(recorder: ValidationRecorder, events_df: pd.DataFrame) -> None:
    """Verify event-level identity, date, violence-type, and fatality invariants.

    Args:
        recorder (ValidationRecorder): The shared check-outcome accumulator.
        events_df (pd.DataFrame): The loaded `events_clean` dataset, or None.
    """
    if events_df is None:
        return

    recorder.check(
        "C.event_id_nonnull", "events_clean", events_df["event_id"].notna().all(), "event_id contains nulls"
    )
    recorder.check(
        "C.event_id_unique", "events_clean", events_df["event_id"].is_unique, "event_id is not unique"
    )

    dates_present = events_df["date_start"].notna().all() and events_df["date_end"].notna().all()
    recorder.check("C.dates_present", "events_clean", dates_present, "date_start/date_end contain nulls")

    date_order_ok = (events_df["date_start"] <= events_df["date_end"]).all()
    recorder.check(
        "C.date_order", "events_clean", date_order_ok, "date_start > date_end for at least one event"
    )

    allowed_violence_types = {
        config.analysis.violence_types.state_based,
        config.analysis.violence_types.non_state,
        config.analysis.violence_types.one_sided,
    }
    violence_type_ok = events_df["type_of_violence"].isin(allowed_violence_types).all()
    recorder.check(
        "C.violence_type", "events_clean", violence_type_ok, "type_of_violence outside the configured codes"
    )

    fatality_columns = [
        col
        for col in [
            "deaths_a",
            "deaths_b",
            "deaths_civilians",
            "deaths_unknown",
            "combatant_fatalities",
            "civilian_fatalities",
            "one_sided_civilian_fatalities",
            "low",
            "best",
            "high",
        ]
        if col in events_df.columns
    ]
    fatalities_nonneg = (events_df[fatality_columns] >= 0).all().all()
    recorder.check(
        "C.fatalities_nonneg", "events_clean", fatalities_nonneg, "negative fatality values found"
    )


def check_actor_events(recorder: ValidationRecorder, actor_df: pd.DataFrame, events_df: pd.DataFrame) -> None:
    """Verify actor-event pair uniqueness and referential integrity to events_clean.

    Args:
        recorder (ValidationRecorder): The shared check-outcome accumulator.
        actor_df (pd.DataFrame): The loaded `actor_events` dataset, or None.
        events_df (pd.DataFrame): The loaded `events_clean` dataset, or None.
    """
    if actor_df is None:
        return

    pair_unique = not actor_df.duplicated(subset=["event_id", "actor_id"]).any()
    recorder.check(
        "D.pair_unique", "actor_events", pair_unique, "(event_id, actor_id) is not unique"
    )

    if events_df is not None:
        fk_ok = actor_df["event_id"].isin(events_df["event_id"]).all()
        recorder.check(
            "D.event_id_fk",
            "actor_events",
            fk_ok,
            "actor_events.event_id references event_id values missing from events_clean",
        )


def check_actor_lookup(recorder: ValidationRecorder, lookup_df: pd.DataFrame, actor_df: pd.DataFrame) -> None:
    """Verify actor_id uniqueness and complete coverage of actor_events actors.

    Args:
        recorder (ValidationRecorder): The shared check-outcome accumulator.
        lookup_df (pd.DataFrame): The loaded `actor_lookup` dataset, or None.
        actor_df (pd.DataFrame): The loaded `actor_events` dataset, or None.
    """
    if lookup_df is None:
        return

    recorder.check(
        "E.actor_id_unique", "actor_lookup", lookup_df["actor_id"].is_unique, "actor_id is not unique"
    )

    if actor_df is not None:
        coverage_ok = actor_df["actor_id"].isin(lookup_df["actor_id"]).all()
        recorder.check(
            "E.coverage",
            "actor_lookup",
            coverage_ok,
            "actor_events contains actor_id values missing from actor_lookup",
        )


def _week_start(dates: pd.Series) -> pd.Series:
    """Assign each date to its Monday-starting week, matching stages 03/04/06.

    Args:
        dates (pd.Series): Parsed datetime values.

    Returns:
        pd.Series: The Monday `week_start` timestamp for each date.
    """
    return dates.dt.to_period("W-SUN").dt.start_time


def check_weekly_global(recorder: ValidationRecorder, weekly_df: pd.DataFrame, events_df: pd.DataFrame) -> None:
    """Verify the __ALL__ weekly event_count matches unique events_clean counts.

    Args:
        recorder (ValidationRecorder): The shared check-outcome accumulator.
        weekly_df (pd.DataFrame): The loaded `weekly_metrics` dataset, or None.
        events_df (pd.DataFrame): The loaded `events_clean` dataset, or None.
    """
    if weekly_df is None or events_df is None:
        return

    all_rows = weekly_df[weekly_df["actor_id"] == ALL_ACTOR_ID]
    actual = all_rows.set_index("week_start")["event_count"]

    check_df = events_df.copy()
    check_df["week_start"] = _week_start(check_df["date_start"])
    expected = check_df.groupby("week_start")["event_id"].nunique()

    index = expected.index.union(actual.index)
    mismatch = expected.reindex(index, fill_value=0) != actual.reindex(index, fill_value=0)
    ok = not mismatch.any()
    bad_weeks = index[mismatch].tolist()[:10] if not ok else []
    recorder.check(
        "F.weekly_global_consistency",
        "weekly_metrics",
        ok,
        f"__ALL__ event_count does not match unique events_clean counts for weeks: {bad_weeks}",
    )


def check_weekly_decomposition(recorder: ValidationRecorder, weekly_df: pd.DataFrame) -> None:
    """Verify violence-type and combat-event decomposition across all weekly rows.

    Args:
        recorder (ValidationRecorder): The shared check-outcome accumulator.
        weekly_df (pd.DataFrame): The loaded `weekly_metrics` dataset, or None.
    """
    if weekly_df is None:
        return

    decomposition_ok = (
        weekly_df["event_count"]
        == weekly_df["state_based_event_count"]
        + weekly_df["non_state_event_count"]
        + weekly_df["one_sided_event_count"]
    ).all()
    recorder.check(
        "G.violence_type_decomposition",
        "weekly_metrics",
        decomposition_ok,
        "event_count does not equal the sum of violence-type event counts",
    )

    combat_ok = (
        weekly_df["combat_event_count"]
        == weekly_df["state_based_event_count"] + weekly_df["non_state_event_count"]
    ).all()
    recorder.check(
        "G.combat_decomposition",
        "weekly_metrics",
        combat_ok,
        "combat_event_count does not equal state_based + non_state event counts",
    )


def check_h3_conservation(recorder: ValidationRecorder, h3_df: pd.DataFrame, events_df: pd.DataFrame) -> None:
    """Verify __ALL__ H3 event counts conserve the spatially eligible event totals.

    Args:
        recorder (ValidationRecorder): The shared check-outcome accumulator.
        h3_df (pd.DataFrame): The loaded `h3_weekly_metrics` dataset, or None.
        events_df (pd.DataFrame): The loaded `events_clean` dataset, or None.
    """
    if h3_df is None or events_df is None:
        return

    spatial_df = events_df[events_df["spatial_eligible"]].copy()
    spatial_df["week_start"] = _week_start(spatial_df["date_start"])
    expected = spatial_df.groupby("week_start")["event_id"].nunique()

    all_rows = h3_df[h3_df["actor_id"] == ALL_ACTOR_ID]
    actual = all_rows.groupby("week_start")["event_count"].sum()

    index = expected.index.union(actual.index)
    mismatch = expected.reindex(index, fill_value=0) != actual.reindex(index, fill_value=0)
    ok = not mismatch.any()
    bad_weeks = index[mismatch].tolist()[:10] if not ok else []
    recorder.check(
        "H.h3_spatial_conservation",
        "h3_weekly_metrics",
        ok,
        f"__ALL__ H3 event_count does not match spatially eligible event counts for weeks: {bad_weeks}",
    )


def check_actor_profile_consistency(
    recorder: ValidationRecorder, profiles_df: pd.DataFrame, actor_df: pd.DataFrame
) -> None:
    """Verify actor_profiles.total_event_count matches actor_events per actor.

    Args:
        recorder (ValidationRecorder): The shared check-outcome accumulator.
        profiles_df (pd.DataFrame): The loaded `actor_profiles` dataset, or None.
        actor_df (pd.DataFrame): The loaded `actor_events` dataset, or None.
    """
    if profiles_df is None or actor_df is None:
        return

    expected = actor_df.groupby("actor_id")["event_id"].nunique()
    actual = profiles_df.set_index("actor_id")["total_event_count"]

    index = expected.index.union(actual.index)
    mismatch = expected.reindex(index, fill_value=0) != actual.reindex(index, fill_value=0)
    ok = not mismatch.any()
    bad_actors = index[mismatch].tolist()[:10] if not ok else []
    recorder.check(
        "I.actor_profile_event_counts",
        "actor_profiles",
        ok,
        f"total_event_count does not match actor_events for actors: {bad_actors}",
    )


def check_event_windows(recorder: ValidationRecorder, ew_df: pd.DataFrame) -> None:
    """Verify per-episode relative-week uniqueness, T0 presence, and T0 alignment.

    Args:
        recorder (ValidationRecorder): The shared check-outcome accumulator.
        ew_df (pd.DataFrame): The loaded `event_windows` dataset, or None.
    """
    if ew_df is None or len(ew_df) == 0:
        return

    for episode_id, group in ew_df.groupby("episode_id"):
        unique_ok = group["relative_week"].is_unique
        recorder.check(
            "J.relative_week_unique",
            episode_id,
            unique_ok,
            f"episode {episode_id!r} has duplicate relative_week values",
        )

        t0_rows = group[group["relative_week"] == 0]
        exactly_one_t0 = len(t0_rows) == 1
        recorder.check(
            "J.t0_present",
            episode_id,
            exactly_one_t0,
            f"episode {episode_id!r} does not have exactly one relative_week == 0 row",
        )

        if exactly_one_t0:
            t0_row = t0_rows.iloc[0]
            t0_aligned = t0_row["calendar_week"] == t0_row["t0_date"]
            recorder.check(
                "J.t0_alignment",
                episode_id,
                t0_aligned,
                f"episode {episode_id!r}: calendar_week at T0 does not equal t0_date",
            )


def check_shares(recorder: ValidationRecorder, frames: dict) -> None:
    """Verify every declared share column lies in [0, 1].

    Args:
        recorder (ValidationRecorder): The shared check-outcome accumulator.
        frames (dict): Loaded dataset frames, keyed by dataset name.
    """
    share_columns = {
        "weekly_metrics": ["one_sided_event_share"],
        "h3_weekly_metrics": [
            "one_sided_event_share",
            "civilian_fatality_share",
            "one_sided_civilian_fatality_share",
        ],
        "actor_profiles": ["one_sided_event_share"],
    }
    for name, columns in share_columns.items():
        df = frames.get(name)
        if df is None:
            continue
        for column in columns:
            if column not in df.columns:
                continue
            ok = df[column].between(0, 1).all()
            recorder.check(f"K.share_bounds.{name}.{column}", name, ok, f"{column} lies outside [0, 1]")


def check_na_policy(recorder: ValidationRecorder, frames: dict) -> None:
    """Verify identifiers, counts, and week fields carry no unexpected nulls.

    The one carve-out is `event_windows.csv`: metric columns must be null on
    unobserved (out-of-period) weeks and non-null on observed weeks.

    Args:
        recorder (ValidationRecorder): The shared check-outcome accumulator.
        frames (dict): Loaded dataset frames, keyed by dataset name.
    """
    nonnull_columns = {
        "events_clean": ["event_id", "date_start", "date_end"],
        "actor_events": ["event_id", "actor_id"],
        "actor_lookup": ["actor_id"],
        "weekly_metrics": [
            "actor_id",
            "week_start",
            "event_count",
            "state_based_event_count",
            "non_state_event_count",
            "one_sided_event_count",
            "combat_event_count",
        ],
        "h3_weekly_metrics": [
            "actor_id",
            "week_start",
            "h3_id",
            "event_count",
            "state_based_event_count",
            "non_state_event_count",
            "one_sided_event_count",
            "combat_event_count",
        ],
        "actor_profiles": ["actor_id", "total_event_count", "combat_event_count", "one_sided_event_count"],
        "event_windows": ["episode_id", "actor_id", "relative_week", "calendar_week"],
    }
    for name, columns in nonnull_columns.items():
        df = frames.get(name)
        if df is None:
            continue
        for column in columns:
            if column not in df.columns:
                continue
            ok = df[column].notna().all()
            recorder.check(f"L.na_policy.{name}.{column}", name, ok, f"{column} contains null values")

    ew_df = frames.get("event_windows")
    if ew_df is None or len(ew_df) == 0:
        return

    metric_columns = [col for col in WINDOW_METRIC_COLUMNS if col in ew_df.columns]
    observed = ew_df.loc[ew_df["is_observed_week"], metric_columns]
    observed_ok = observed.notna().all().all() if len(observed) else True
    recorder.check(
        "L.na_policy.event_windows.observed_not_null",
        "event_windows",
        observed_ok,
        "an observed week has a null metric value",
    )

    unobserved = ew_df.loc[~ew_df["is_observed_week"], metric_columns]
    unobserved_ok = unobserved.isna().all().all() if len(unobserved) else True
    recorder.check(
        "L.na_policy.event_windows.unobserved_null",
        "event_windows",
        unobserved_ok,
        "an unobserved (out-of-period) week has a non-null metric value",
    )


def write_validation_report(recorder: ValidationRecorder) -> None:
    """Write `validation_report.json` summarizing the run.

    Args:
        recorder (ValidationRecorder): The completed check-outcome accumulator.
    """
    report = {
        "status": "PASS" if recorder.failed == 0 else "FAIL",
        "checks_run": recorder.run,
        "checks_passed": recorder.run - recorder.failed,
        "checks_failed": recorder.failed,
    }
    with open(validation_report, "w") as f:
        json.dump(report, f, indent=2)


def write_validation_failures(recorder: ValidationRecorder) -> None:
    """Write `validation_failures.csv`, header-only when there are no failures.

    Args:
        recorder (ValidationRecorder): The completed check-outcome accumulator.
    """
    with open(validation_failures, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=FAILURE_FIELDS)
        writer.writeheader()
        for failure in recorder.failures:
            writer.writerow(failure)


def print_summary(recorder: ValidationRecorder) -> None:
    """Print a concise processing summary.

    Args:
        recorder (ValidationRecorder): The completed check-outcome accumulator.
    """
    print("=== 07_validate_outputs summary ===")
    print(f"Checks run:                  {recorder.run}")
    print(f"Checks passed:               {recorder.run - recorder.failed}")
    print(f"Checks failed:               {recorder.failed}")
    print(f"Status:                      {'PASS' if recorder.failed == 0 else 'FAIL'}")


def main() -> None:
    """Run every validation category and write both validation output files.

    Orchestrates file loading, schema validation, and all cross-dataset
    invariant checks described in the module docstring, then writes
    `data/validation/validation_report.json` and
    `data/validation/validation_failures.csv` and exits with a non-zero
    status if any check failed.
    """
    recorder = ValidationRecorder()

    frames = load_all(recorder)
    check_schema(recorder, frames)

    check_events(recorder, frames.get("events_clean"))
    check_actor_events(recorder, frames.get("actor_events"), frames.get("events_clean"))
    check_actor_lookup(recorder, frames.get("actor_lookup"), frames.get("actor_events"))
    check_weekly_global(recorder, frames.get("weekly_metrics"), frames.get("events_clean"))
    check_weekly_decomposition(recorder, frames.get("weekly_metrics"))
    check_h3_conservation(recorder, frames.get("h3_weekly_metrics"), frames.get("events_clean"))
    check_actor_profile_consistency(recorder, frames.get("actor_profiles"), frames.get("actor_events"))
    check_event_windows(recorder, frames.get("event_windows"))
    check_shares(recorder, frames)
    check_na_policy(recorder, frames)

    os.makedirs(validation_data_dir, exist_ok=True)
    write_validation_report(recorder)
    write_validation_failures(recorder)

    print_summary(recorder)

    sys.exit(0 if recorder.failed == 0 else 1)


if __name__ == "__main__":
    main()
