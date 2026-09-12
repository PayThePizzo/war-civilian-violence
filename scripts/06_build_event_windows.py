"""
Detect major one-sided-violence episodes and construct aligned temporal
windows around them.

This module produces the analytical dataset used by Web Visualization 4.

The purpose of the transformation is to replace ordinary calendar time with
time relative to a selected one-sided-violence episode.

Instead of comparing events occurring on unrelated calendar dates, the
resulting dataset aligns episodes around:

    T0 = the week of a selected one-sided-violence peak

and represents surrounding activity as:

    T-8 ... T-1 | T0 | T+1 ... T+8

or using the alternative window size defined by configuration.

Expected inputs
---------------
The script expects:

    data/derived/weekly_metrics.csv
    data/derived/actor_profiles.csv

The weekly dataset must contain complete zero-filled actor time series over
the analysis period.

`actor_profiles.csv` is loaded and schema-validated because it is a declared
input, but `eligible_for_web3` is not used to restrict episode detection by
default: `ONLY_ELIGIBLE_ACTORS = False` below. SCRIPTS.md leaves this choice
configurable but `config/config.yaml` has no corresponding key, so all
actors present in `weekly_metrics.csv` are eligible for episode detection
unless that constant is flipped.

Episode detection
-----------------
Episodes are identified separately for each armed actor.

The default peak metric is:

    one_sided_civilian_fatalities

A week becomes a peak candidate when:

1. the selected metric is greater than zero;
2. its value is at least as large as the immediately preceding week;
3. its value is at least as large as the immediately following week.

Consecutive tied maxima are collapsed deterministically into a single peak.
The first week of the plateau is selected.

Candidate peaks are then ordered by:

1. descending peak magnitude;
2. ascending calendar date as a deterministic tie-breaker.

A greedy separation rule is applied so that selected episodes are at least
the configured number of weeks apart.

The procedure stops when the configured maximum number of episodes for the
actor has been selected.

This algorithm is intentionally explicit and deterministic. Episodes must
not be manually selected because manual selection would make the resulting
visual analysis difficult to reproduce.

Window construction
-------------------
For every selected episode the module creates one row for each relative week
within the configured temporal window.

For example, with eight weeks before and after T0:

    -8, -7, ..., -1, 0, +1, ..., +8

The corresponding actual calendar week is stored separately.

Weeks inside the analysis period with no observed events are represented by
zero values because they represent genuine observed inactivity.

Weeks falling outside the configured analysis period are not assigned zero.
Their metric values are left missing and:

    is_observed_week = False

This distinction prevents the visualization from confusing unavailable data
with an observed absence of violence.

Metrics
-------
Each episode-window row contains temporal conflict measures such as:

    combat_event_count
    combatant_fatalities
    actor_deaths_suffered
    one_sided_event_count
    one_sided_civilian_fatalities
    civilian_fatalities
    active_location_count

Episode metadata includes:

    episode_id
    actor_id
    actor_name
    peak_rank
    t0_date
    peak_metric_value

Episode ids are actor_id-based (`<actor_id>__<YYYY-MM-DD>`, e.g.
`ucdp-1234__2024-06-03`), with `:` in the actor_id replaced by `-` for the
id string; the actor_id field itself is left unmodified.

Validation
----------
The module verifies:

- the special `__ALL__` actor is excluded from actor episode detection;
- selected peaks have positive peak values;
- selected peaks satisfy the configured minimum temporal separation;
- no actor has more than the configured number of episodes;
- every relative week lies inside the configured window;
- relative week zero corresponds exactly to `t0_date`;
- the T0 metric equals the metric value used for peak detection;
- weeks outside the observation period are marked unobserved rather than
  filled with zero.

Output
------
The script writes:

    data/derived/event_windows.csv

The file contains one row per episode-relative-week combination and is the
canonical input for the event-centred matrix and summary visualization.

The resulting dataset supports descriptive analysis of temporal patterns
around one-sided-violence episodes. It does not establish causal effects or
demonstrate that preceding military activity caused subsequent violence
against civilians.
"""

import os
import sys

import numpy as np
import pandas as pd

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
# Now seeing outside the scripts folder, so we can import from the project root

from project_paths import conf_path, weekly_metrics, actor_profiles, event_windows, derived_data_dir
from config.config_parser import AppConfig, load_from_config

config = load_from_config(conf_path)


ALL_ACTOR_ID = "__ALL__"

ONLY_ELIGIBLE_ACTORS = config.episodes.only_eligible_actors

WEEKLY_METRICS_REQUIRED_COLUMNS = {
    "week_start",
    "actor_id",
    "actor_name",
    "combat_event_count",
    "combatant_fatalities",
    "actor_deaths_suffered",
    "one_sided_event_count",
    "one_sided_civilian_fatalities",
    "civilian_fatalities",
    "active_location_count",
}

ACTOR_PROFILES_REQUIRED_COLUMNS = {"actor_id", "eligible_for_web3"}

WINDOW_METRIC_COLUMNS = [
    "combat_event_count",
    "combatant_fatalities",
    "actor_deaths_suffered",
    "one_sided_event_count",
    "one_sided_civilian_fatalities",
    "civilian_fatalities",
    "active_location_count",
]

EVENT_WINDOWS_COLUMN_ORDER = [
    "episode_id",
    "actor_id",
    "actor_name",
    "peak_rank",
    "t0_date",
    "peak_metric_value",
    "relative_week",
    "calendar_week",
    "is_observed_week",
] + WINDOW_METRIC_COLUMNS


def load_weekly_metrics(path: str) -> pd.DataFrame:
    """Load the weekly conflict-metrics dataset.

    Args:
        path (str): Absolute path to `weekly_metrics.csv`.

    Returns:
        pd.DataFrame: The weekly-metrics dataset, unmodified.

    Raises:
        FileNotFoundError: If the input file does not exist.
    """
    if not os.path.exists(path):
        raise FileNotFoundError(f"weekly_metrics.csv not found at: {path}. Run 03_build_weekly_metrics.py first.")
    return pd.read_csv(path, parse_dates=["week_start"])


def load_actor_profiles(path: str) -> pd.DataFrame:
    """Load the actor-profiles dataset.

    Args:
        path (str): Absolute path to `actor_profiles.csv`.

    Returns:
        pd.DataFrame: The actor-profiles dataset, unmodified.

    Raises:
        FileNotFoundError: If the input file does not exist.
    """
    if not os.path.exists(path):
        raise FileNotFoundError(f"actor_profiles.csv not found at: {path}. Run 05_build_actor_profiles.py first.")
    return pd.read_csv(path)


def validate_inputs(weekly_df: pd.DataFrame, profiles_df: pd.DataFrame, metric_column: str) -> None:
    """Fail if either input dataset does not satisfy its expected contract.

    Args:
        weekly_df (pd.DataFrame): The loaded `weekly_metrics` dataset.
        profiles_df (pd.DataFrame): The loaded `actor_profiles` dataset.
        metric_column (str): The configured episode-detection metric column
            name, which must exist in `weekly_df`.

    Raises:
        ValueError: If required columns are missing from either dataset.
    """
    missing_weekly = WEEKLY_METRICS_REQUIRED_COLUMNS - set(weekly_df.columns)
    if missing_weekly:
        raise ValueError(f"weekly_metrics.csv is missing required columns: {sorted(missing_weekly)}")

    if metric_column not in weekly_df.columns:
        raise ValueError(f"weekly_metrics.csv is missing the configured episode metric column: {metric_column!r}")

    missing_profiles = ACTOR_PROFILES_REQUIRED_COLUMNS - set(profiles_df.columns)
    if missing_profiles:
        raise ValueError(f"actor_profiles.csv is missing required columns: {sorted(missing_profiles)}")


def select_actor_weekly(weekly_df: pd.DataFrame, profiles_df: pd.DataFrame) -> pd.DataFrame:
    """Restrict the weekly dataset to actors eligible for episode detection.

    Args:
        weekly_df (pd.DataFrame): The full weekly-metrics dataset.
        profiles_df (pd.DataFrame): The actor-profiles dataset.

    Returns:
        pd.DataFrame: Actor-specific rows (`__ALL__` excluded), further
            restricted to `eligible_for_web3` actors if
            `ONLY_ELIGIBLE_ACTORS` is True.
    """
    df = weekly_df[weekly_df["actor_id"] != ALL_ACTOR_ID].copy()

    if ONLY_ELIGIBLE_ACTORS:
        eligible_ids = set(profiles_df.loc[profiles_df["eligible_for_web3"], "actor_id"])
        df = df[df["actor_id"].isin(eligible_ids)]

    return df


def detect_peak_candidates(series: pd.Series) -> pd.Series:
    """Find local-maximum candidate weeks in a single actor's metric series.

    Args:
        series (pd.Series): The metric values indexed by `week_start`,
            sorted ascending, covering a complete weekly grid.

    Returns:
        pd.Series: The subset of `series` at candidate weeks (positive
            value, at least as large as both neighbours).
    """
    prev_values = series.shift(1).fillna(-1)
    next_values = series.shift(-1).fillna(-1)
    is_candidate = (series > 0) & (series >= prev_values) & (series >= next_values)
    return series[is_candidate]


def collapse_plateaus(candidates: pd.Series) -> list:
    """Collapse consecutive equal-valued candidate weeks into a single peak.

    Args:
        candidates (pd.Series): Candidate weeks from `detect_peak_candidates`,
            indexed by `week_start` in ascending order.

    Returns:
        list: `(week_start, value)` tuples, one per collapsed plateau, using
            the first week of each plateau.
    """
    weeks = candidates.index.to_list()
    values = candidates.to_list()

    collapsed = []
    i = 0
    while i < len(weeks):
        j = i
        while (
            j + 1 < len(weeks)
            and weeks[j + 1] == weeks[j] + pd.Timedelta(days=7)
            and values[j + 1] == values[i]
        ):
            j += 1
        collapsed.append((weeks[i], values[i]))
        i = j + 1

    return collapsed


def select_episodes(collapsed: list, min_gap_weeks: int, top_k: int) -> list:
    """Greedily select the top episodes respecting the minimum separation.

    Args:
        collapsed (list): `(week_start, value)` tuples from `collapse_plateaus`.
        min_gap_weeks (int): Minimum separation, in weeks, between two
            selected episodes for the same actor.
        top_k (int): Maximum number of episodes to retain.

    Returns:
        list: Selected `(week_start, value)` tuples, ordered by descending
            magnitude (ascending date as tie-breaker) — i.e. in `peak_rank`
            order.
    """
    ordered = sorted(collapsed, key=lambda item: (-item[1], item[0]))

    min_gap = pd.Timedelta(weeks=min_gap_weeks)
    selected = []
    for week, value in ordered:
        if all(abs(week - s_week) >= min_gap for s_week, _ in selected):
            selected.append((week, value))
        if len(selected) == top_k:
            break

    return selected


def sanitize_actor_id_for_episode(actor_id: str) -> str:
    """Sanitize an actor_id for embedding inside an episode_id string.

    Args:
        actor_id (str): The canonical actor identifier (e.g. `"ucdp:1234"`).

    Returns:
        str: The actor_id with `:` replaced by `-` (e.g. `"ucdp-1234"`).
    """
    return actor_id.replace(":", "-")


def detect_episodes_for_actor(actor_id: str, actor_weekly: pd.DataFrame, metric_column: str) -> list:
    """Detect all episodes for one actor.

    Args:
        actor_id (str): The actor identifier.
        actor_weekly (pd.DataFrame): This actor's weekly rows, indexed by
            `week_start`, sorted ascending.
        metric_column (str): The configured episode-detection metric column.

    Returns:
        list: Dicts with `episode_id`, `t0_date`, `peak_metric_value`, and
            `peak_rank`, one per selected episode.
    """
    series = actor_weekly[metric_column]
    candidates = detect_peak_candidates(series)
    collapsed = collapse_plateaus(candidates)
    selected = select_episodes(collapsed, config.episodes.min_gap_weeks, config.episodes.top_k_per_actor)

    episodes = []
    for rank, (week, value) in enumerate(selected, start=1):
        episodes.append(
            {
                "episode_id": f"{sanitize_actor_id_for_episode(actor_id)}__{week:%Y-%m-%d}",
                "actor_id": actor_id,
                "t0_date": week,
                "peak_metric_value": value,
                "peak_rank": rank,
            }
        )
    return episodes


def build_window_rows(episode: dict, actor_name: str, actor_weekly: pd.DataFrame) -> pd.DataFrame:
    """Build the relative-week window rows for one episode.

    Args:
        episode (dict): One episode dict from `detect_episodes_for_actor`.
        actor_name (str): The actor's canonical display name.
        actor_weekly (pd.DataFrame): This actor's weekly rows, indexed by
            `week_start`.

    Returns:
        pd.DataFrame: One row per relative week in
            `[-before_weeks, after_weeks]`, with metric columns populated
            for observed weeks and left missing (`NA`) for weeks outside
            the configured analysis period.
    """
    before = config.episodes.before_weeks
    after = config.episodes.after_weeks

    # Compared against week-start Mondays (calendar_week is always
    # week-aligned), not the raw configured dates, which need not fall on a
    # Monday themselves — this must match 03_build_weekly_metrics.py's
    # build_full_week_grid exactly, or a real week present in the weekly
    # grid can get misclassified as unobserved.
    first_observed_week = pd.Timestamp(config.analysis.start_date).to_period("W-SUN").start_time
    last_observed_week = pd.Timestamp(config.analysis.end_date).to_period("W-SUN").start_time

    rows = []
    for relative_week in range(-before, after + 1):
        calendar_week = episode["t0_date"] + pd.Timedelta(weeks=relative_week)
        is_observed = first_observed_week <= calendar_week <= last_observed_week

        row = {
            "episode_id": episode["episode_id"],
            "actor_id": episode["actor_id"],
            "actor_name": actor_name,
            "peak_rank": episode["peak_rank"],
            "t0_date": episode["t0_date"],
            "peak_metric_value": episode["peak_metric_value"],
            "relative_week": relative_week,
            "calendar_week": calendar_week,
            "is_observed_week": is_observed,
        }

        if is_observed and calendar_week in actor_weekly.index:
            for col in WINDOW_METRIC_COLUMNS:
                row[col] = actor_weekly.loc[calendar_week, col]
        else:
            for col in WINDOW_METRIC_COLUMNS:
                row[col] = np.nan

        rows.append(row)

    return pd.DataFrame(rows)


def build_all_episode_windows(weekly_df: pd.DataFrame, metric_column: str) -> pd.DataFrame:
    """Detect episodes for every actor and build their window rows.

    Args:
        weekly_df (pd.DataFrame): Actor-specific weekly rows (no `__ALL__`),
            already restricted to eligible actors if configured.
        metric_column (str): The configured episode-detection metric column.

    Returns:
        pd.DataFrame: All episode-window rows, restricted to
            `EVENT_WINDOWS_COLUMN_ORDER`, sorted by
            (actor_id, peak_rank, relative_week).
    """
    all_rows = []

    for actor_id, group in weekly_df.groupby("actor_id"):
        actor_weekly = group.sort_values("week_start").set_index("week_start")
        actor_name = actor_weekly["actor_name"].iloc[0]

        episodes = detect_episodes_for_actor(actor_id, actor_weekly, metric_column)
        for episode in episodes:
            all_rows.append(build_window_rows(episode, actor_name, actor_weekly))

    if not all_rows:
        return pd.DataFrame(columns=EVENT_WINDOWS_COLUMN_ORDER)

    combined = pd.concat(all_rows, ignore_index=True)
    combined = combined.sort_values(["actor_id", "peak_rank", "relative_week"]).reset_index(drop=True)
    return combined[EVENT_WINDOWS_COLUMN_ORDER]


def validate_event_windows(df: pd.DataFrame, metric_column: str) -> None:
    """Fail if the assembled event-windows dataset violates its structural invariants.

    Args:
        df (pd.DataFrame): The finalized event-windows dataset.
        metric_column (str): The configured episode-detection metric column.

    Raises:
        ValueError: If any exclusion, positivity, separation, cardinality,
            range, T0-alignment, T0-metric, or observed-week invariant is
            violated.
    """
    if (df["actor_id"] == ALL_ACTOR_ID).any():
        raise ValueError("event_windows contains the __ALL__ actor, which must be excluded.")

    peak_values = df.drop_duplicates("episode_id")[["episode_id", "peak_metric_value"]]
    if not (peak_values["peak_metric_value"] > 0).all():
        raise ValueError("event_windows contains episodes with a non-positive peak_metric_value.")

    min_gap = pd.Timedelta(weeks=config.episodes.min_gap_weeks)
    for actor_id, group in df.drop_duplicates("episode_id").groupby("actor_id"):
        t0_dates = sorted(group["t0_date"])
        for a, b in zip(t0_dates, t0_dates[1:]):
            if (b - a) < min_gap:
                raise ValueError(f"Episodes for actor {actor_id!r} violate the minimum gap: {a} and {b}.")

    episode_counts = df.groupby("actor_id")["episode_id"].nunique()
    if (episode_counts > config.episodes.top_k_per_actor).any():
        raise ValueError("An actor exceeds the configured maximum number of episodes.")

    expected_relative_weeks = set(range(-config.episodes.before_weeks, config.episodes.after_weeks + 1))
    for episode_id, group in df.groupby("episode_id"):
        observed_weeks = set(group["relative_week"])
        if observed_weeks != expected_relative_weeks:
            raise ValueError(f"Episode {episode_id!r} does not cover the expected relative-week range.")
        if not group["relative_week"].is_unique:
            raise ValueError(f"Episode {episode_id!r} has duplicate relative_week values.")

        t0_rows = group[group["relative_week"] == 0]
        if len(t0_rows) != 1:
            raise ValueError(f"Episode {episode_id!r} does not have exactly one relative_week == 0 row.")

        t0_row = t0_rows.iloc[0]
        if t0_row["calendar_week"] != t0_row["t0_date"]:
            raise ValueError(f"Episode {episode_id!r}: calendar_week at T0 does not equal t0_date.")
        if t0_row[metric_column] != t0_row["peak_metric_value"]:
            raise ValueError(f"Episode {episode_id!r}: T0 metric value does not equal peak_metric_value.")

    unobserved = ~df["is_observed_week"]
    if df.loc[unobserved, WINDOW_METRIC_COLUMNS].notna().any().any():
        raise ValueError("event_windows has non-null metrics on an unobserved (out-of-period) week.")


def print_summary(df: pd.DataFrame) -> None:
    """Print a concise processing summary.

    Args:
        df (pd.DataFrame): The finalized event-windows dataset.
    """
    print("=== 06_build_event_windows summary ===")
    print(f"Episodes detected:            {df['episode_id'].nunique()}")
    print(f"Actors with episodes:         {df['actor_id'].nunique()}")
    print(f"Total window rows:            {len(df)}")


def main() -> None:
    """Run the episode-detection and window-construction stage and write the output.

    Orchestrates input loading/validation, actor-eligibility restriction,
    per-actor peak detection, window construction, structural validation,
    and the final write to `data/derived/event_windows.csv`.
    """
    metric_column = config.episodes.metric

    if metric_column not in WINDOW_METRIC_COLUMNS:
        raise ValueError(
            f"Episode metric {metric_column!r} is not supported "
            "by event_windows output."
        )

    weekly_df = load_weekly_metrics(weekly_metrics)
    profiles_df = load_actor_profiles(actor_profiles)
    validate_inputs(weekly_df, profiles_df, metric_column)

    actor_weekly_df = select_actor_weekly(weekly_df, profiles_df)
    result = build_all_episode_windows(actor_weekly_df, metric_column)

    if len(result) > 0:
        validate_event_windows(result, metric_column)

    os.makedirs(derived_data_dir, exist_ok=True)
    result.to_csv(event_windows, index=False)

    print_summary(result)


if __name__ == "__main__":
    main()
