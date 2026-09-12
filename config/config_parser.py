"""Config parser module.

This module is responsible for:
- Parsing the config/config.yaml file;
- Returning a configuration object to define the behavior of the app.

Note:
- The configuration is defined using Pydantic models, which provide validation and type checking;
- The load_from_config function reads the YAML file and populates the AppConfig object with the specified parameters;
- The save_to_config function allows saving the configuration back to disk in either YAML or JSON format.

Warning:
- The YAML file must be well-formed; field types are validated by Pydantic;
- The save_to_config function will overwrite existing files without warning, so use with caution;
- In case pydantic is not installed, the code will fail to run.
"""

import os
import yaml
from pydantic import BaseModel, Field


class ViolenceTypesConfig(BaseModel):
    """Configuration for UCDP violence category codes.

    Attributes:
        state_based (int): The state-based conflict category code.
        non_state (int): The non-state conflict category code.
        one_sided (int): The one-sided violence category code.
    """

    state_based: int = 1
    non_state: int = 2
    one_sided: int = 3


class AnalysisConfig(BaseModel):
    """Configuration for the analysis.

    Attributes:
        country (str): The country of interest.
        start_date (str): The start date of the analysis period.
        end_date (str): The end date of the analysis period.
        violence_types (ViolenceTypesConfig): The UCDP violence category codes.
    """

    country: str = "Sudan"
    start_date: str = "2023-04-15"
    end_date: str = "2025-12-31"
    violence_types: ViolenceTypesConfig = Field(default_factory=ViolenceTypesConfig)


class TemporalConfig(BaseModel):
    """Configuration for temporal aggregation.

    Attributes:
        resolution (str): The temporal unit used by the visualizations.
        week_start (str): The first day of each week.
    """

    resolution: str = "week"
    week_start: str = "Monday"


class SpatialConfig(BaseModel):
    """Configuration for spatial processing.

    Attributes:
        h3_resolution (int): The H3 resolution used for spatial aggregation.
    """

    h3_resolution: int = 5


class ActorsConfig(BaseModel):
    """Configuration for actor display eligibility.

    Attributes:
        min_events (int): The event threshold for default display in Web 3.
    """

    min_events: int = 5


class EpisodesConfig(BaseModel):
    """Configuration for episode detection and temporal windows in Web 4.

    Attributes:
        metric (str): The weekly variable used to detect peaks.
        before_weeks (int): The number of weeks shown before T0.
        after_weeks (int): The number of weeks shown after T0.
        min_gap_weeks (int): The minimum separation between an actor's peaks.
        top_k_per_actor (int): The maximum episodes retained per actor.
    """

    metric: str = "one_sided_civilian_fatalities"
    before_weeks: int = 8
    after_weeks: int = 8
    min_gap_weeks: int = 6
    top_k_per_actor: int = 10


class AppConfig(BaseModel):
    """Top-level application configuration object.

    Aggregates all sub-configs. Each field defaults to its sub-config's own defaults,
    so an empty ``config.yaml`` is valid and produces a fully usable configuration.

    Attributes:
        analysis (AnalysisConfig): The analytical scope and violence categories.
        temporal (TemporalConfig): The temporal aggregation settings.
        spatial (SpatialConfig): The spatial processing settings.
        actors (ActorsConfig): The actor display eligibility settings.
        episodes (EpisodesConfig): The episode detection and window settings.
    """

    analysis: AnalysisConfig = Field(default_factory=AnalysisConfig)
    temporal: TemporalConfig = Field(default_factory=TemporalConfig)
    spatial: SpatialConfig = Field(default_factory=SpatialConfig)
    actors: ActorsConfig = Field(default_factory=ActorsConfig)
    episodes: EpisodesConfig = Field(default_factory=EpisodesConfig)


def load_from_config(path: str) -> AppConfig:
    """Load application configuration from a YAML file.

    Parses the specified YAML file and returns an AppConfig object
    composed of validated sub-configs.

    Args:
        path (str): Path to the configuration YAML file.

    Returns:
        AppConfig: A fully populated configuration object.
    """
    with open(path, "r") as f:
        data = yaml.safe_load(f)

    return AppConfig(**({} if data is None else data))


def save_to_config(
    path: str, config: AppConfig, name: str = "config", str_format: str = "yaml"
) -> None:
    """Save an AppConfig object to disk in YAML or JSON format.

    Args:
        path (str): Destination directory to save the file.
        config (AppConfig): The configuration object to serialize.
        name (str, optional): Filename prefix (without extension). Defaults to "config".
        str_format (str, optional): Output format, either "yaml" or "json". Defaults to "yaml".

    Raises:
        Exception: If an unsupported format is specified.
    """
    dst = os.path.join(path, f"{name}.{str_format}")

    with open(dst, "w") as f:
        if str_format == "yaml":
            yaml.safe_dump(config.model_dump(), f, indent=2, sort_keys=False)
        elif str_format == "json":
            f.write(config.model_dump_json(indent=2))
        else:
            raise Exception("Accepted formats are yaml or json")

    pass
