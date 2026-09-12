"""Filesystem path registry for the From Battlefield to Civilians project.

This module is the single, authoritative source of filesystem paths used across
the project. Every script under ``scripts/`` that needs to read or write a
project file imports the relevant path constant from this module instead of
constructing paths locally, per the project convention that path definitions
must not be duplicated or hardcoded inside pipeline modules.

The module defines two categories of constants.

Directory constants describe the fixed top level layout of the repository:
the data directory and its ``raw``, ``processed``, ``derived``, ``validation``
and ``social`` subdirectories.

File constants describe the exact, fixed dataset files that flow through the
analytical pipeline documented in ``PROJECT_SPEC.md``, from the raw UCDP GED
extract through the processed datasets that feed the four web representations
and the four social media exports.

This module intentionally contains only paths.

This module does not create any directory or file. Directory creation is the
responsibility of the scripts that write to a given path, at the point where
they need it to exist.
"""

import os


# Root directory of the repository, resolved as an absolute path so that every
# constant derived from it is absolute regardless of the caller's working
# directory.
base_dir = os.path.abspath(os.path.dirname(__file__))

# Configuration dir and file
conf_dir = os.path.abspath(os.path.join(base_dir, "config"))
conf_path = os.path.abspath(os.path.join(conf_dir, "config.yaml"))

# Data directory
data_dir = os.path.abspath(os.path.join(base_dir, "data"))

# Data subdirectories
raw_data_dir = os.path.abspath(os.path.join(data_dir, "raw"))
derived_data_dir = os.path.abspath(os.path.join(data_dir, "derived"))
processed_data_dir = os.path.abspath(os.path.join(data_dir, "processed"))
validation_data_dir = os.path.abspath(os.path.join(data_dir, "validation"))
social_data_dir = os.path.abspath(os.path.join(data_dir, "social"))

# Datasets and outputs 
raw_dataset_csv = os.path.abspath(os.path.join(raw_data_dir, "GEDEvent_v26_1.csv"))

# Event-level cleaned dataset produced by 01_clean_events.py
events_clean = os.path.abspath(os.path.join(processed_data_dir, "events_clean.parquet"))
# Actor-event long-format dataset produced by 02_build_actor_events.py
actor_events = os.path.abspath(os.path.join(processed_data_dir, "actor_events.parquet"))
# Canonical actor identifier/name mapping
actor_lookup = os.path.abspath(os.path.join(processed_data_dir, "actor_lookup.csv"))

# Dataset for Web 1 — temporal conflict visualization
weekly_metrics = os.path.abspath(os.path.join(derived_data_dir, "weekly_metrics.csv"))
# Dataset for Web 2 — H3 spatial visualization
h3_weekly_metrics = os.path.abspath(os.path.join(derived_data_dir, "h3_weekly_metrics.csv"))    
# Dataset for Web 3 — actor violence profiles
actor_profiles = os.path.abspath(os.path.join(derived_data_dir, "actor_profiles.csv"))
# Dataset for Web 4 — event-centred before/after analysis
event_windows = os.path.abspath(os.path.join(derived_data_dir, "event_windows.csv"))
# Metadata exposed to the web frontend
metadata = os.path.abspath(os.path.join(derived_data_dir, "metadata.json"))
# Technical information about the latest successful pipeline build
build_manifest = os.path.abspath(os.path.join(derived_data_dir, "build_manifest.json"))

# Final pipeline validation summary
validation_report = os.path.abspath(os.path.join(validation_data_dir, "validation_report.json"))
# Detailed failed validation checks
validation_failures = os.path.abspath(os.path.join(validation_data_dir, "validation_failures.csv"))