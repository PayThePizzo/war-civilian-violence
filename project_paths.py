"""External configuration values for the project.

This module defines paths to important directories and files used throughout the project.
By centralizing these paths in one module, we can easily manage and update them without 
having to search through the entire codebase.
"""

import os

# Root
base_dir = os.path.abspath(os.path.dirname(__file__))

# Main directories
data_dir = os.path.join(base_dir, "data")

raw_data_dir = os.path.join(data_dir, "raw")
processed_data_dir = os.path.join(data_dir, "processed")
social_data_dir = os.path.join(data_dir, "social")

# Raw
raw_dataset_csv = os.path.join(
    raw_data_dir,
    "GEDEvent_v26_1.csv"
)
