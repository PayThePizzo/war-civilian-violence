"""
Clean and validate the raw UCDP Georeferenced Event Dataset used by the
project.

This module implements the first stage of the analytical pipeline. Its
responsibility is to transform the original UCDP GED file into a clean,
project-specific event-level dataset while preserving the original event as
the unit of observation.

The script does not perform actor expansion, weekly aggregation, spatial
aggregation, episode detection, or visualization-specific transformations.
Those operations are intentionally delegated to later stages of the pipeline.

Expected input
--------------
The script expects the raw UCDP GED CSV file at: data/raw/GEDEvent_v26_1.csv
or at the alternative path specified in the project configuration.

The input must contain, at minimum, the fields required to identify events,
dates, violence types, actors, fatalities, and geographic locations. These
include:

    id
    date_start
    date_end
    date_prec
    type_of_violence
    conflict_new_id
    conflict_name
    dyad_new_id
    dyad_name
    side_a_new_id
    side_a
    side_b_new_id
    side_b
    country
    adm_1
    adm_2
    where_coordinates
    latitude
    longitude
    deaths_a
    deaths_b
    deaths_civilians
    deaths_unknown
    low
    best
    high

Configuration
-------------
The country and temporal scope of the analysis are read from the project
configuration. For the current project the intended scope is Sudan during
the selected conflict period.

The configuration determines, at minimum:

    analysis.country
    analysis.start_date
    analysis.end_date

Processing
----------
The module performs the following operations:

1. Validate that all required columns are present.
2. Validate that the UCDP event identifier is non-null and unique.
3. Rename the raw `id` field to `event_id`.
4. Parse `date_start` and `date_end` as dates.
5. Validate that event start dates are not later than event end dates.
6. Restrict the dataset to the configured country.
7. Restrict the dataset to events whose `date_start` falls within the configured analysis period.
8. Validate `type_of_violence` against the supported UCDP categories {1, 2, 3}.
9. Create readable violence-type labels.
10. Derive boolean indicators for combat events and one-sided violence.
11. Convert fatality fields to numeric values.
12. Reject negative fatality counts.
13. Validate the expected ordering low <= best <= high where all three estimates are available.
14. Derive combatant, civilian, and one-sided civilian fatality variables.
15. Parse and validate geographic coordinates.
16. Create `spatial_eligible`, indicating whether an event can be used in geographic aggregation.
17. Apply conservative whitespace normalization to descriptive text fields.
18. Sort the output deterministically by event date and event identifier.

Important methodological definitions
------------------------------------
Events with `type_of_violence` equal to 1 or 2 are treated as direct combat
events for the purposes of this project.

Events with `type_of_violence` equal to 3 are treated as one-sided violence.

`combatant_fatalities` is defined as deaths_a + deaths_b for direct combat
events only.

`civilian_fatalities` preserves deaths_civilians for every violence type.

`one_sided_civilian_fatalities` contains deaths_civilians only for
one-sided violence events and is zero otherwise.

Events with missing or invalid coordinates are retained. They remain useful
for temporal and actor-based analyses but receive `spatial_eligible = False`
and are excluded from geographic aggregation in later stages.

Output
------
The script writes: data/processed/events_clean.parquet

The output contains exactly one row per retained UCDP event and forms the
canonical event-level input for all subsequent preprocessing stages.

Failure behaviour
-----------------
The script should fail loudly rather than silently repair data when any of
the following conditions occur:

- required columns are missing;
- event identifiers are null or duplicated;
- event dates cannot be parsed;
- event start dates occur after event end dates;
- unsupported violence-type values are present;
- fatality counts are negative;
- fatality estimate bounds violate low <= best <= high.

Invalid or missing geographic coordinates do not cause pipeline failure.
Instead, affected events are marked as spatially ineligible.

The script should print or log a concise processing summary including the
number of raw records, records retained after country filtering, records
retained after temporal filtering, records by violence type, and the number
and proportion of spatially eligible events.
"""

import os
import sys
import numpy as np
import pandas as pd

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
# Now seeing outside the scripts folder, so we can import from the project root

from project_paths import conf_path, raw_dataset_csv, events_clean, processed_data_dir
from config.config_parser import AppConfig, load_from_config

config = load_from_config(conf_path)


class SchemaError(Exception):
    """Raised when the raw input does not satisfy the expected column contract."""


REQUIRED_COLUMNS = {
    "id",
    "date_start",
    "date_end",
    "date_prec",
    "type_of_violence",
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
    "deaths_a",
    "deaths_b",
    "deaths_civilians",
    "deaths_unknown",
    "low",
    "best",
    "high",
}

TEXT_NORMALIZE_COLUMNS = [
    "side_a",
    "side_b",
    "conflict_name",
    "dyad_name",
    "adm_1",
    "adm_2",
    "where_coordinates",
]

FATALITY_COLUMNS = [
    "deaths_a",
    "deaths_b",
    "deaths_civilians",
    "deaths_unknown",
    "low",
    "best",
    "high",
]

CANONICAL_COLUMN_ORDER = [
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
]


def load_raw(path: str) -> pd.DataFrame:
    """Load the raw UCDP GED CSV file.

    Args:
        path (str): Absolute path to the raw GED CSV file.

    Returns:
        pd.DataFrame: The raw dataset, unmodified.

    Raises:
        FileNotFoundError: If the raw input file does not exist.
    """
    if not os.path.exists(path):
        raise FileNotFoundError(f"Raw GED input not found at: {path}")
    return pd.read_csv(path)


def validate_schema(df: pd.DataFrame, required: set) -> None:
    """Fail if any required column is missing from the raw dataset.

    Args:
        df (pd.DataFrame): The raw dataset.
        required (set): Column names that must be present.

    Raises:
        SchemaError: If one or more required columns are missing.
    """
    missing = required - set(df.columns)
    if missing:
        raise SchemaError(f"Missing required columns in raw GED input: {sorted(missing)}")


def validate_event_key(df: pd.DataFrame) -> None:
    """Fail if the raw `id` column is not a valid primary key.

    Args:
        df (pd.DataFrame): The raw dataset, still using the original `id` column.

    Raises:
        ValueError: If `id` contains nulls or duplicate values.
    """
    if df["id"].isna().any():
        raise ValueError("Raw GED input contains null event identifiers (`id`).")
    if not df["id"].is_unique:
        duplicated = df.loc[df["id"].duplicated(), "id"].unique()
        raise ValueError(f"Raw GED input contains duplicate event identifiers (`id`): {list(duplicated)[:10]}")


def parse_dates(df: pd.DataFrame) -> pd.DataFrame:
    """Parse `date_start` and `date_end` and validate their ordering.

    Args:
        df (pd.DataFrame): Dataset with raw `date_start`/`date_end` string columns.

    Returns:
        pd.DataFrame: Copy of the dataset with parsed datetime columns.

    Raises:
        ValueError: If any date cannot be parsed or if `date_start > date_end`
            for any retained event.
    """
    df = df.copy()
    df["date_start"] = pd.to_datetime(df["date_start"], errors="coerce")
    df["date_end"] = pd.to_datetime(df["date_end"], errors="coerce")

    if df["date_start"].isna().any() or df["date_end"].isna().any():
        raise ValueError("Raw GED input contains dates that could not be parsed.")

    if (df["date_start"] > df["date_end"]).any():
        bad_ids = df.loc[df["date_start"] > df["date_end"], "id"].tolist()
        raise ValueError(f"Events with date_start > date_end: {bad_ids[:10]}")

    return df


def filter_country(df: pd.DataFrame, config: AppConfig) -> pd.DataFrame:
    """Restrict the dataset to the configured country.

    Args:
        df (pd.DataFrame): Dataset with a `country` column.
        config (AppConfig): Project configuration.

    Returns:
        pd.DataFrame: Rows matching `config.analysis.country`.

    Raises:
        ValueError: If no rows remain after filtering.
    """
    country_clean = df["country"].astype(str).str.strip()
    out = df[country_clean == config.analysis.country].copy()

    if len(out) == 0:
        raise ValueError(f"No events found for configured country: {config.analysis.country!r}")

    return out


def filter_period(df: pd.DataFrame, config: AppConfig) -> pd.DataFrame:
    """Restrict the dataset to the configured analysis period.

    Args:
        df (pd.DataFrame): Dataset with a parsed `date_start` column.
        config (AppConfig): Project configuration.

    Returns:
        pd.DataFrame: Rows whose `date_start` falls within
            [analysis.start_date, analysis.end_date].
    """
    start = pd.Timestamp(config.analysis.start_date)
    end = pd.Timestamp(config.analysis.end_date)
    return df[df["date_start"].between(start, end)].copy()


def validate_violence_type(df: pd.DataFrame, config: AppConfig) -> None:
    """Fail if `type_of_violence` contains unsupported values.

    Args:
        df (pd.DataFrame): Dataset with a `type_of_violence` column.
        config (AppConfig): Project configuration, providing the allowed codes.

    Raises:
        ValueError: If any value falls outside the configured violence-type codes.
    """
    allowed = {
        config.analysis.violence_types.state_based,
        config.analysis.violence_types.non_state,
        config.analysis.violence_types.one_sided,
    }
    observed = set(df["type_of_violence"].unique())
    if not observed <= allowed:
        raise ValueError(f"Unsupported type_of_violence values: {sorted(observed - allowed)}")


def add_violence_labels(df: pd.DataFrame, config: AppConfig) -> pd.DataFrame:
    """Add a human-readable violence-type label and combat/one-sided flags.

    Args:
        df (pd.DataFrame): Dataset with a validated `type_of_violence` column.
        config (AppConfig): Project configuration, providing the violence-type codes.

    Returns:
        pd.DataFrame: Copy of the dataset with `violence_type_label`, `is_combat`,
            and `is_one_sided` columns added.
    """
    df = df.copy()
    vt = config.analysis.violence_types

    label_map = {
        vt.state_based: "state_based",
        vt.non_state: "non_state",
        vt.one_sided: "one_sided",
    }
    df["violence_type_label"] = df["type_of_violence"].map(label_map)

    df["is_combat"] = df["type_of_violence"].isin([vt.state_based, vt.non_state])
    df["is_one_sided"] = df["type_of_violence"].eq(vt.one_sided)

    return df


def clean_fatalities(df: pd.DataFrame) -> pd.DataFrame:
    """Cast fatality columns to numeric and validate their invariants.

    Args:
        df (pd.DataFrame): Dataset with raw fatality columns.

    Returns:
        pd.DataFrame: Copy of the dataset with numeric fatality columns.

    Raises:
        ValueError: If any fatality count is negative, or if
            low <= best <= high is violated where all three are available.
    """
    df = df.copy()
    for col in FATALITY_COLUMNS:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    if df[FATALITY_COLUMNS].lt(0).any().any():
        raise ValueError("Raw GED input contains negative fatality counts.")

    bounds_available = df[["low", "best", "high"]].notna().all(axis=1)
    ordering_ok = (df["low"] <= df["best"]) & (df["best"] <= df["high"])
    violations = bounds_available & ~ordering_ok
    if violations.any():
        bad_ids = df.loc[violations, "id"].tolist()
        raise ValueError(f"Events violating low <= best <= high: {bad_ids[:10]}")

    return df


def derive_fatality_fields(df: pd.DataFrame) -> pd.DataFrame:
    """Derive combatant, civilian, and one-sided civilian fatality fields.

    Args:
        df (pd.DataFrame): Dataset with numeric fatality columns and
            `is_combat`/`is_one_sided` flags.

    Returns:
        pd.DataFrame: Copy of the dataset with `combatant_fatalities`,
            `civilian_fatalities`, and `one_sided_civilian_fatalities` added.
    """
    df = df.copy()

    df["combatant_fatalities"] = np.where(
        df["is_combat"], df["deaths_a"] + df["deaths_b"], 0
    )
    df["civilian_fatalities"] = df["deaths_civilians"]
    df["one_sided_civilian_fatalities"] = np.where(
        df["is_one_sided"], df["deaths_civilians"], 0
    )

    return df


def check_one_sided_actor(df: pd.DataFrame) -> None:
    """Warn (do not fail) if one-sided events are missing a perpetrator.

    Args:
        df (pd.DataFrame): Dataset with `is_one_sided` and `side_a` columns.
    """
    missing_side_a = df["is_one_sided"] & df["side_a"].isna()
    if missing_side_a.any():
        bad_ids = df.loc[missing_side_a, "id"].tolist()
        print(f"WARNING: one-sided events missing side_a (perpetrator): {bad_ids[:10]}")


def validate_coordinates(df: pd.DataFrame) -> pd.DataFrame:
    """Parse coordinates and flag spatial eligibility without dropping rows.

    Args:
        df (pd.DataFrame): Dataset with raw `latitude`/`longitude` columns.

    Returns:
        pd.DataFrame: Copy of the dataset with numeric coordinates and a
            `spatial_eligible` boolean column.
    """
    df = df.copy()
    df["latitude"] = pd.to_numeric(df["latitude"], errors="coerce")
    df["longitude"] = pd.to_numeric(df["longitude"], errors="coerce")

    df["spatial_eligible"] = (
        df["latitude"].notna()
        & df["longitude"].notna()
        & df["latitude"].between(-90, 90)
        & df["longitude"].between(-180, 180)
    )

    return df


def normalize_text_fields(df: pd.DataFrame, columns: list) -> pd.DataFrame:
    """Apply conservative whitespace normalization to descriptive text fields.

    Args:
        df (pd.DataFrame): Dataset containing the columns to normalize.
        columns (list): Column names to strip whitespace from.

    Returns:
        pd.DataFrame: Copy of the dataset with the listed columns stripped.
    """
    df = df.copy()
    for col in columns:
        df[col] = df[col].astype(str).str.strip().replace({"nan": np.nan})
    return df


def finalize(df: pd.DataFrame) -> pd.DataFrame:
    """Rename the primary key, sort deterministically, and select the canonical schema.

    Args:
        df (pd.DataFrame): Fully transformed dataset, still keyed by `id`.

    Returns:
        pd.DataFrame: Dataset renamed to `event_id`, sorted by
            (date_start, event_id), restricted to the canonical column order.
    """
    df = df.rename(columns={"id": "event_id"})
    df = df.sort_values(["date_start", "event_id"]).reset_index(drop=True)
    return df[CANONICAL_COLUMN_ORDER]


def print_summary(
    raw_count: int,
    country_count: int,
    period_count: int,
    final_df: pd.DataFrame,
) -> None:
    """Print a concise processing summary.

    Args:
        raw_count (int): Number of records in the raw input.
        country_count (int): Number of records retained after country filtering.
        period_count (int): Number of records retained after temporal filtering.
        final_df (pd.DataFrame): The final cleaned dataset.
    """
    print("=== 01_clean_events summary ===")
    print(f"Raw records:                {raw_count}")
    print(f"After country filter:       {country_count}")
    print(f"After temporal filter:      {period_count}")
    print("By violence type:")
    print(final_df["violence_type_label"].value_counts().to_string())
    spatial_eligible_count = int(final_df["spatial_eligible"].sum())
    spatial_eligible_pct = 100 * spatial_eligible_count / len(final_df) if len(final_df) else 0.0
    print(f"Spatially eligible:          {spatial_eligible_count} ({spatial_eligible_pct:.1f}%)")
    print(f"Final retained events:      {len(final_df)}")


def main() -> None:
    """Run the raw-to-clean event transformation and write the output.

    Orchestrates schema validation, filtering, derived-field construction, and
    the final write to `data/processed/events_clean.parquet`. Raises on any
    fail-loud condition described in the module docstring.
    """
    raw = load_raw(raw_dataset_csv)
    raw_count = len(raw)

    validate_schema(raw, REQUIRED_COLUMNS)
    validate_event_key(raw)

    df = parse_dates(raw)

    df = filter_country(df, config)
    country_count = len(df)

    df = filter_period(df, config)
    period_count = len(df)

    validate_violence_type(df, config)
    df = add_violence_labels(df, config)

    df = clean_fatalities(df)
    df = derive_fatality_fields(df)
    check_one_sided_actor(df)

    df = validate_coordinates(df)
    df = normalize_text_fields(df, TEXT_NORMALIZE_COLUMNS)

    df = finalize(df)

    os.makedirs(processed_data_dir, exist_ok=True)
    df.to_parquet(events_clean, index=False)

    print_summary(raw_count, country_count, period_count, df)


if __name__ == "__main__":
    main()
