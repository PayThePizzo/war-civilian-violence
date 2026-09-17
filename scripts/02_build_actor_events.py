"""
Build the actor-event representation used by actor-specific analyses.

This module converts the cleaned event-level UCDP dataset into a long-form
representation in which each row describes the participation of one armed
actor in one event.

The transformation is required because the raw UCDP event table represents
actors in separate `side_a` and `side_b` columns. That format is appropriate
for describing individual conflict events but inconvenient for answering
questions such as:

- How frequently was a specific actor involved in direct combat?
- How frequently was the same actor associated with one-sided violence?
- How many fatalities occurred in events involving that actor?
- How did an actor's geographic or temporal violence profile change?

The actor-event table provides a consistent actor-centric representation
without changing the original event-level dataset.

Expected input
--------------
The script expects:

    data/processed/events_clean.parquet

The input must have been produced by `01_clean_events.py` and must therefore
contain unique event identifiers, parsed dates, validated violence types,
fatality fields, geographic fields, and the derived combat/one-sided flags.

Actor expansion rules
---------------------
For state-based and non-state conflict events (`type_of_violence` equal to
1 or 2), both armed sides are represented.

For example:

    event_id = E1
    side_a   = Actor A
    side_b   = Actor B

becomes:

    E1 | Actor A | side_a
    E1 | Actor B | side_b

For one-sided violence (`type_of_violence` equal to 3), only the armed actor
is represented. The civilian side is deliberately excluded from the actor
table because civilians are not an armed actor to be compared in the actor
profile visualization.

Actor identity
--------------
Stable UCDP actor identifiers should be preferred over actor names.

The canonical actor identifier should be constructed from the relevant
`side_*_new_id` value. Human-readable actor names are retained separately.

If a stable UCDP actor identifier is unexpectedly unavailable, a normalized
name-based fallback may be used, but the condition must be reported as a
warning because name-based identifiers are less robust.

Actor-specific fatalities
--------------------------
`actor_deaths_suffered` represents fatalities attributed to the selected
actor side:

    side_a -> deaths_a
    side_b -> deaths_b

Other event-level fatality variables are preserved because they describe
the context of the event in which the actor participated.

In particular:

    combatant_fatalities
    civilian_fatalities
    one_sided_civilian_fatalities
    best
    low
    high

are copied from the canonical event-level dataset.

Important counting rule
-----------------------
An event involving two armed actors appears twice in this actor-centric
dataset, once for each actor.

This is intentional.

The actor-event table must never be summed across all actors to reconstruct
the total number of unique conflict events. Dataset-wide totals must always
be computed from `events_clean.parquet`.

This distinction prevents double counting.

Validation
----------
The module verifies:

- the expected input schema;
- uniqueness of the cleaned event identifier;
- availability of an armed actor for each generated actor-event row;
- uniqueness of the `(event_id, actor_id)` pair;
- consistency between actor identifiers and actor names.

Multiple textual names associated with the same UCDP actor identifier should
be reported. A deterministic canonical name may be selected, preferably the
most frequently observed non-empty label.

Outputs
-------
The primary output is:

    data/processed/actor_events.parquet

It contains one row for each armed actor participating in each retained UCDP
event.

The secondary output is:

    data/processed/actor_lookup.csv

It contains one row per canonical actor and provides a stable mapping between
actor identifiers and display names, together with basic activity metadata.

The outputs serve as inputs for weekly actor metrics, spatial actor metrics,
actor profiles, and event-centred analyses.
"""

import os
import re
import sys
import pandas as pd

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
# Now seeing outside the scripts folder, so we can import from the project root

from project_paths import conf_path, events_clean, actor_events, actor_lookup, processed_data_dir
from config.config_parser import load_from_config

config = load_from_config(conf_path)


REQUIRED_INPUT_COLUMNS = {
    "event_id",
    "date_start",
    "type_of_violence",
    "is_combat",
    "is_one_sided",
    "side_a_new_id",
    "side_a",
    "side_b_new_id",
    "side_b",
    "deaths_a",
    "deaths_b",
    "combatant_fatalities",
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

REPLICATED_EVENT_COLUMNS = [
    "date_start",
    "type_of_violence",
    "is_combat",
    "is_one_sided",
    "combatant_fatalities",
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
]

ACTOR_EVENTS_COLUMN_ORDER = [
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
]

ACTOR_LOOKUP_COLUMN_ORDER = [
    "actor_id",
    "actor_name",
    "event_count",
    "first_event_date",
    "last_event_date",
]


def load_events_clean(path: str) -> pd.DataFrame:
    """Load the cleaned event-level dataset produced by `01_clean_events.py`.

    Args:
        path (str): Absolute path to `events_clean.parquet`.

    Returns:
        pd.DataFrame: The cleaned event-level dataset, unmodified.

    Raises:
        FileNotFoundError: If the input file does not exist.
    """
    if not os.path.exists(path):
        raise FileNotFoundError(
            f"events_clean.parquet not found at: {path}. Run 01_clean_events.py first."
        )
    return pd.read_parquet(path)


def validate_input(df: pd.DataFrame) -> None:
    """Fail if the input does not satisfy the contract produced by script 01.

    Args:
        df (pd.DataFrame): The loaded `events_clean` dataset.

    Raises:
        ValueError: If required columns are missing, or if `event_id` is
            null or duplicated.
    """
    missing = REQUIRED_INPUT_COLUMNS - set(df.columns)
    if missing:
        raise ValueError(f"events_clean.parquet is missing required columns: {sorted(missing)}")

    if df["event_id"].isna().any():
        raise ValueError("events_clean.parquet contains null event_id values.")
    if not df["event_id"].is_unique:
        dup = df.loc[df["event_id"].duplicated(), "event_id"].unique()
        raise ValueError(f"events_clean.parquet contains duplicate event_id values: {list(dup)[:10]}")


def normalize_actor_name(name: object) -> str:
    """Normalize a raw actor name into a fallback-identifier fragment.

    Args:
        name: Raw actor display name, possibly missing.

    Returns:
        str: Lowercased, whitespace-collapsed, underscore-joined name
            fragment suitable for use inside a `name:` fallback actor_id.
    """
    if name is None or (isinstance(name, float) and pd.isna(name)):
        return "unknown"
    text = str(name).strip().lower()
    text = re.sub(r"\s+", "_", text)
    text = re.sub(r"[^a-z0-9_]", "", text)
    return text or "unknown"


def build_actor_id_series(new_id: pd.Series, name: pd.Series) -> tuple:
    """Construct actor identifiers, preferring stable UCDP ids over names.

    Args:
        new_id (pd.Series): The `side_*_new_id` column for one side.
        name (pd.Series): The corresponding `side_*` display-name column.

    Returns:
        tuple: (actor_id (pd.Series[str]), used_fallback (pd.Series[bool])).
    """
    missing_identity = new_id.isna() & (
        name.isna() | name.astype("string").str.strip().eq("")
    )

    if missing_identity.any():
        raise ValueError(
            "Actor rows found with neither a stable UCDP id nor a usable actor name."
        )

    has_id = new_id.notna()

    actor_id = pd.Series(index=new_id.index, dtype=object)
    actor_id.loc[has_id] = new_id.loc[has_id].apply(lambda v: f"ucdp:{int(v)}")
    actor_id.loc[~has_id] = name.loc[~has_id].apply(lambda v: f"name:{normalize_actor_name(v)}")

    return actor_id, ~has_id


def expand_side(df: pd.DataFrame, side: str) -> pd.DataFrame:
    """Build the actor-event rows for one side (`a` or `b`) of a set of events.

    Args:
        df (pd.DataFrame): Subset of `events_clean` to expand (already
            filtered to the relevant violence-type rows by the caller).
        side (str): Either "a" or "b".

    Returns:
        pd.DataFrame: One row per input event for the given side, with
            actor identity, role, and actor-specific fatality columns
            attached.
    """
    new_id_col = f"side_{side}_new_id"
    name_col = f"side_{side}"
    deaths_col = f"deaths_{side}"

    actor_id, used_fallback = build_actor_id_series(df[new_id_col], df[name_col])

    out = df[["event_id"] + REPLICATED_EVENT_COLUMNS].copy()
    out["actor_id"] = actor_id
    out["actor_name"] = df[name_col]
    out["actor_role"] = f"side_{side}"
    out["is_one_sided_perpetrator"] = (side == "a") & df["is_one_sided"]
    out["actor_deaths_suffered"] = df[deaths_col]
    out["_used_id_fallback"] = used_fallback.values

    return out


def expand_actor_events(df: pd.DataFrame) -> pd.DataFrame:
    """Expand the event-level dataset into the long actor-event representation.

    Combat events (`is_combat`) generate one row per side. One-sided events
    (`is_one_sided`) generate a single row for `side_a` only; the civilian
    side is never represented as an actor.

    Args:
        df (pd.DataFrame): The validated `events_clean` dataset.

    Returns:
        pd.DataFrame: Long-form actor-event rows, not yet deduplicated or
            column-ordered.
    """
    combat = df[df["is_combat"]]
    one_sided = df[df["is_one_sided"]]

    parts = [
        expand_side(combat, "a"),
        expand_side(combat, "b"),
        expand_side(one_sided, "a"),
    ]
    return pd.concat(parts, ignore_index=True)


def report_actor_id_fallback_usage(df: pd.DataFrame) -> None:
    """Warn (do not fail) when name-based actor-id fallback was used.

    Args:
        df (pd.DataFrame): Expanded actor-event rows, including the internal
            `_used_id_fallback` marker column.
    """
    fallback_rows = df[df["_used_id_fallback"]]
    if len(fallback_rows) > 0:
        examples = fallback_rows["actor_id"].unique().tolist()
        print(
            f"WARNING: {len(fallback_rows)} actor-event rows used a name-based "
            f"actor_id fallback (missing side_*_new_id). Example ids: {examples[:10]}"
        )


def validate_actor_event_pairs(df: pd.DataFrame) -> None:
    """Fail if any (event_id, actor_id) pair is duplicated.

    Args:
        df (pd.DataFrame): Expanded actor-event rows.

    Raises:
        ValueError: If a duplicate (event_id, actor_id) pair is found.
    """
    dup_mask = df.duplicated(subset=["event_id", "actor_id"])
    if dup_mask.any():
        examples = df.loc[dup_mask, ["event_id", "actor_id"]].head(10).to_dict("records")
        raise ValueError(f"Duplicate (event_id, actor_id) pairs found: {examples}")


def build_actor_lookup(df: pd.DataFrame) -> pd.DataFrame:
    """Build the canonical actor_id -> actor_name mapping with activity metadata.

    Args:
        df (pd.DataFrame): Finalized actor-event rows (one row per
            actor-event participation).

    Returns:
        pd.DataFrame: One row per canonical actor, with the most frequently
            observed non-empty name selected and reported if ambiguous.
    """
    name_counts = df.dropna(subset=["actor_name"]).groupby(["actor_id", "actor_name"]).size()
    name_counts = name_counts.rename("count").reset_index()

    ambiguous = name_counts.groupby("actor_id")["actor_name"].nunique()
    ambiguous_ids = ambiguous[ambiguous > 1].index.tolist()
    if ambiguous_ids:
        print(f"WARNING: {len(ambiguous_ids)} actor_id values map to multiple actor_name variants: {ambiguous_ids[:10]}")

    canonical_name = (
        name_counts.sort_values(["actor_id", "count", "actor_name"], ascending=[True, False, True])
        .drop_duplicates(subset="actor_id", keep="first")
        .set_index("actor_id")["actor_name"]
    )

    activity = df.groupby("actor_id").agg(
        event_count=("event_id", "nunique"),
        first_event_date=("date_start", "min"),
        last_event_date=("date_start", "max"),
    )

    lookup = activity.join(canonical_name, how="left").reset_index()
    return lookup[ACTOR_LOOKUP_COLUMN_ORDER]


def finalize_actor_events(df: pd.DataFrame) -> pd.DataFrame:
    """Drop internal helper columns and apply the canonical column order/sort.

    Args:
        df (pd.DataFrame): Expanded, validated actor-event rows.

    Returns:
        pd.DataFrame: Rows restricted to `ACTOR_EVENTS_COLUMN_ORDER`, sorted
            by (event_id, actor_id).
    """
    df = df.sort_values(["event_id", "actor_id"]).reset_index(drop=True)
    return df[ACTOR_EVENTS_COLUMN_ORDER]


def print_summary(events_df: pd.DataFrame, actor_events_df: pd.DataFrame, lookup_df: pd.DataFrame) -> None:
    """Print a concise processing summary.

    Args:
        events_df (pd.DataFrame): The input `events_clean` dataset.
        actor_events_df (pd.DataFrame): The finalized actor-event dataset.
        lookup_df (pd.DataFrame): The finalized actor lookup table.
    """
    print("=== 02_build_actor_events summary ===")
    print(f"Input events:                {len(events_df)}")
    print(f"Combat events:               {int(events_df['is_combat'].sum())}")
    print(f"One-sided events:            {int(events_df['is_one_sided'].sum())}")
    print(f"Actor-event rows:            {len(actor_events_df)}")
    print(f"Distinct actors:             {len(lookup_df)}")


def main() -> None:
    """Run the event-to-actor-event expansion and write both outputs.

    Orchestrates input validation, side-a/side-b expansion, actor-id
    construction, duplicate-pair validation, actor-lookup construction, and
    the final writes to `data/processed/actor_events.parquet` and
    `data/processed/actor_lookup.csv`.
    """
    events_df = load_events_clean(events_clean)
    validate_input(events_df)

    expanded = expand_actor_events(events_df)
    report_actor_id_fallback_usage(expanded)
    validate_actor_event_pairs(expanded)

    actor_events_df = finalize_actor_events(expanded)
    lookup_df = build_actor_lookup(actor_events_df)

    os.makedirs(processed_data_dir, exist_ok=True)
    actor_events_df.to_parquet(actor_events, index=False)
    lookup_df.to_csv(actor_lookup, index=False)

    print_summary(events_df, actor_events_df, lookup_df)


if __name__ == "__main__":
    main()
