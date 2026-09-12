"""
Run the complete project data-preparation pipeline.

This module is the orchestration entry point for all preprocessing and
validation stages required by the visualization project.

It does not contain analytical transformation logic itself. Each
transformation remains implemented in the dedicated stage module so that
individual stages can be executed, tested, and debugged independently.

Pipeline order
--------------
The build executes the following stages in strict sequence:

    01_clean_events
        ->
    02_build_actor_events
        ->
    03_build_weekly_metrics
        ->
    04_build_h3_metrics
        ->
    05_build_actor_profiles
        ->
    06_build_event_windows
        ->
    07_validate_outputs

A downstream stage is executed only if every preceding stage has completed
successfully.

Expected inputs
---------------
The build requires:

    config/config.yaml
    data/raw/GEDEvent_v26_1.csv

The raw input path comes from `project_paths.raw_dataset_csv`, matching the
cleaning stage. The current configuration schema has no raw-path override.

Pre-flight validation
---------------------
Before starting the transformation pipeline, the orchestrator verifies:

- the configuration file exists and can be parsed;
- the raw GED input exists;
- required output directories can be created;
- the analysis start date precedes the end date;
- the configured H3 resolution is valid;
- event-window lengths are non-negative;
- the minimum episode separation is positive;
- the maximum number of episodes per actor is positive.

Execution behaviour
-------------------
Each processing module should expose a callable `main()` or build function so
that the orchestrator can invoke the stage directly.

If any stage raises an exception or returns a failure status, execution stops
immediately.

The pipeline must never continue using potentially stale downstream outputs
after an upstream failure.

Metadata
--------
After successful analytical processing the orchestrator writes:

    data/derived/metadata.json

This file contains the subset of methodological configuration required by
the frontend, such as country, temporal range, temporal resolution, H3
resolution, and event-window size.

The frontend should read this generated metadata rather than parsing the
Python YAML configuration directly.

Build manifest
--------------
After a successful build and validation, the orchestrator writes:

    data/derived/build_manifest.json

The manifest records technical provenance information such as:

- raw input path;
- raw input file checksum;
- configuration checksum;
- output row counts;
- validation result;
- optional build timestamp.

The manifest is intended for reproducibility and debugging rather than for
visualization.

Outputs
-------
The orchestrator indirectly produces all processed and derived datasets:

    data/processed/events_clean.parquet
    data/processed/actor_events.parquet
    data/processed/actor_lookup.csv

    data/derived/weekly_metrics.csv
    data/derived/h3_weekly_metrics.csv
    data/derived/actor_profiles.csv
    data/derived/event_windows.csv
    data/derived/metadata.json
    data/derived/build_manifest.json

    data/validation/validation_report.json
    data/validation/validation_failures.csv

A build is considered successful only when `07_validate_outputs.py` completes
with a successful validation status.
"""

import csv
import hashlib
import importlib.util
import json
import os
import sys
import tempfile
from datetime import date, datetime, timezone
from pathlib import Path

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.config_parser import AppConfig, load_from_config
from project_paths import (
    actor_events,
    actor_lookup,
    actor_profiles,
    build_manifest,
    conf_path,
    derived_data_dir,
    event_windows,
    events_clean,
    h3_weekly_metrics,
    metadata,
    processed_data_dir,
    raw_dataset_csv,
    validation_data_dir,
    validation_failures,
    validation_report,
    weekly_metrics,
)


STAGES = (
    "01_clean_events",
    "02_build_actor_events",
    "03_build_weekly_metrics",
    "04_build_h3_metrics",
    "05_build_actor_profiles",
    "06_build_event_windows",
    "07_validate_outputs",
)

ROW_COUNT_PATHS = {
    "rows_events_clean": events_clean,
    "rows_actor_events": actor_events,
    "rows_actor_lookup": actor_lookup,
    "rows_weekly_metrics": weekly_metrics,
    "rows_h3_weekly_metrics": h3_weekly_metrics,
    "rows_actor_profiles": actor_profiles,
    "rows_event_windows": event_windows,
}


def validate_config(config: AppConfig) -> None:
    """Reject invalid bounds and temporal settings unsupported by the stages."""
    start = date.fromisoformat(config.analysis.start_date)
    end = date.fromisoformat(config.analysis.end_date)
    if start >= end:
        raise ValueError("analysis.start_date must precede analysis.end_date")
    if not 0 <= config.spatial.h3_resolution <= 15:
        raise ValueError("spatial.h3_resolution must be between 0 and 15")
    for field in ("before_weeks", "after_weeks"):
        if getattr(config.episodes, field) < 0:
            raise ValueError(f"episodes.{field} must be non-negative")
    for field in ("min_gap_weeks", "top_k_per_actor"):
        if getattr(config.episodes, field) <= 0:
            raise ValueError(f"episodes.{field} must be positive")
    # Aggregation stages implement Monday-to-Sunday weeks explicitly.
    if config.temporal.resolution != "week" or config.temporal.week_start != "Monday":
        raise ValueError("The pipeline requires temporal.resolution='week' and week_start='Monday'")


def preflight() -> AppConfig:
    """Load configuration and check inputs, stage files, and writable outputs."""
    for path in (conf_path, raw_dataset_csv):
        if not Path(path).is_file():
            raise FileNotFoundError(f"Required input file is missing: {path}")
    config = load_from_config(conf_path)
    validate_config(config)
    for name in STAGES:
        path = Path(__file__).resolve().with_name(f"{name}.py")
        if not path.is_file():
            raise FileNotFoundError(f"Required stage module is missing: {path}")
    for directory in (processed_data_dir, derived_data_dir, validation_data_dir):
        Path(directory).mkdir(parents=True, exist_ok=True)
        # mkdir alone does not check write access to an existing directory.
        with tempfile.TemporaryFile(dir=directory):
            pass
    return config


def run_stage(name: str) -> None:
    """Invoke a stage directly, accepting None/zero or a successful SystemExit."""
    print(f"Running {name}...", flush=True)
    path = Path(__file__).resolve().with_name(f"{name}.py")
    spec = importlib.util.spec_from_file_location(f"_pipeline_{name}", path)
    if spec is None or spec.loader is None:
        raise ImportError(f"Cannot load stage: {path}")
    module = importlib.util.module_from_spec(spec)
    # Even a zero exit during import is premature: main() has not run yet.
    try:
        spec.loader.exec_module(module)
    except SystemExit as exc:
        raise RuntimeError(f"{name} exited during import with status {exc.code!r}") from exc
    entrypoint = getattr(module, "main", None)
    if not callable(entrypoint):
        entrypoint = getattr(module, "build", None)
    if not callable(entrypoint):
        raise TypeError(f"{name} must expose a callable main() or build()")
    try:
        result = entrypoint()
    except SystemExit as exc:
        if exc.code is not None and exc.code != 0:
            raise RuntimeError(f"{name} exited with failure status {exc.code!r}") from exc
        return
    if isinstance(result, bool):
        success = result
    else:
        success = result is None or (isinstance(result, int) and result == 0)
    if not success:
        raise RuntimeError(f"{name} returned failure status {result!r}")


def file_sha256(path: str) -> str:
    """Hash a file in bounded chunks, including large raw GED inputs."""
    digest = hashlib.sha256()
    with open(path, "rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def count_rows(path: str) -> int:
    """Count CSV records or read Parquet row counts without loading a table."""
    if Path(path).suffix == ".parquet":
        import pyarrow.parquet as parquet

        with parquet.ParquetFile(path) as table:
            return table.metadata.num_rows
    with open(path, encoding="utf-8", newline="") as stream:
        reader = csv.reader(stream)
        if next(reader, None) is None:
            raise ValueError(f"CSV output has no header: {path}")
        return sum(1 for row in reader if row)


def build_metadata(config: AppConfig) -> dict:
    """Return the frontend-facing configuration subset."""
    return {
        "country": config.analysis.country,
        "analysis_start": config.analysis.start_date,
        "analysis_end": config.analysis.end_date,
        "temporal_resolution": config.temporal.resolution,
        "week_start": config.temporal.week_start,
        "h3_resolution": config.spatial.h3_resolution,
        "event_window_before_weeks": config.episodes.before_weeks,
        "event_window_after_weeks": config.episodes.after_weeks,
    }


def write_json(path: str, payload: dict) -> None:
    """Replace a JSON output atomically, cleaning up any incomplete write."""
    temporary_path = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w", encoding="utf-8", dir=Path(path).parent, delete=False
        ) as stream:
            temporary_path = Path(stream.name)
            json.dump(payload, stream, indent=2, allow_nan=False)
            stream.write("\n")
        os.replace(temporary_path, path)
    finally:
        if temporary_path is not None:
            temporary_path.unlink(missing_ok=True)


def main() -> None:
    """Run all stages and publish build provenance only after validation passes."""
    config_checksum = file_sha256(conf_path)
    config = preflight()
    raw_checksum = file_sha256(raw_dataset_csv)

    # Outputs are rebuilt in place. Previous success records must not describe
    # a partially rebuilt dataset, and validation must produce a fresh report.
    for path in (build_manifest, metadata, validation_report, validation_failures):
        Path(path).unlink(missing_ok=True)

    for name in STAGES:
        run_stage(name)

    with open(validation_report, encoding="utf-8") as stream:
        report = json.load(stream)
    if report.get("status") != "PASS" or report.get("checks_failed") != 0:
        raise RuntimeError("Output validation did not report PASS with zero failed checks")
    if not Path(validation_failures).is_file():
        raise FileNotFoundError(f"Missing validation output: {validation_failures}")

    # Stages load the configuration themselves; reject a build if its inputs
    # changed during processing instead of publishing misleading provenance.
    if file_sha256(conf_path) != config_checksum or file_sha256(raw_dataset_csv) != raw_checksum:
        raise RuntimeError("Configuration or raw input changed during the build")

    manifest = {
        "raw_input_path": raw_dataset_csv,
        "raw_input_sha256": raw_checksum,
        "config_path": conf_path,
        "config_sha256": config_checksum,
        **{key: count_rows(path) for key, path in ROW_COUNT_PATHS.items()},
        "validation_status": report["status"],
        "build_timestamp": datetime.now(timezone.utc).isoformat(),
    }
    write_json(metadata, build_metadata(config))
    # Publish the success marker last.
    write_json(build_manifest, manifest)
    print(f"Build complete: validation PASS. Manifest: {build_manifest}", flush=True)


if __name__ == "__main__":
    main()
