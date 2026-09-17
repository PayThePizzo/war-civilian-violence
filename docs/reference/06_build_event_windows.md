# `06_build_event_windows.py`

Detect major one-sided-violence episodes and construct aligned temporal windows around them — **Web 4: BEFORE/AFTER?**

## Responsibility

Replace calendar time with time relative to a selected one-sided-violence peak (`T0`), so episodes occurring on different calendar dates can be compared.

## Input

```text
data/derived/weekly_metrics.csv
data/derived/actor_profiles.csv
```

```yaml
episodes:
  metric: "one_sided_civilian_fatalities"
  before_weeks: 8
  after_weeks: 8
  min_gap_weeks: 6
  top_k_per_actor: 10
```

## Episode detection (deterministic, not manual)

1. Exclude `actor_id == "__ALL__"` — episodes are detected per actor.
2. Use each actor's zero-filled weekly time series (guaranteed complete by [`03_build_weekly_metrics.py`](03_build_weekly_metrics.md)).
3. A week `t` is a peak candidate when `value[t] > 0` and `value[t] >= value[t-1]` and `value[t] >= value[t+1]` (local maximum).
4. Consecutive tied-maximum weeks (a plateau) collapse to a single peak, keeping the **first** week of the plateau.
5. Sort candidates by `(descending magnitude, ascending date)`.
6. Greedily select, enforcing `min_gap_weeks` separation from every already-selected episode (not just the nearest one).
7. Stop at `top_k_per_actor` episodes.
8. `episode_id = "<actor_id>__<YYYY-MM-DD>"` (e.g. `ucdp-1234__2024-06-03`), `:` sanitized to `-` in the actor-id portion.
9. `peak_rank = 1` for the actor's largest peak.

## Window construction

For each episode, one row per `relative_week` in `[-before_weeks, ..., 0, ..., +after_weeks]` (17 rows with defaults). `calendar_week = t0_date + relative_week * 7 days`.

**Boundary policy:** weeks inside the analysis period with zero events get `0` (genuine observed inactivity). Weeks falling **outside** `[analysis.start_date, analysis.end_date]` are **not** zero-filled — metrics are left missing and `is_observed_week = False`. This distinguishes "we observed nothing" from "we didn't observe this week at all."

## Output

```text
data/derived/event_windows.csv
```

Fields: `episode_id`, `actor_id`, `actor_name`, `peak_rank`, `t0_date`, `peak_metric_value`, `relative_week`, `calendar_week`, `is_observed_week`, `combat_event_count`, `combatant_fatalities`, `actor_deaths_suffered`, `one_sided_event_count`, `one_sided_civilian_fatalities`, `civilian_fatalities`, `active_location_count`.

## Invariants

```text
relative_week unique within an episode
exactly one row has relative_week == 0
calendar_week at T0 == t0_date
T0's one_sided_civilian_fatalities == the peak value used to select the episode
```

## Non-claim

This dataset supports descriptive temporal association only — it never establishes causation. "Military pressure caused attacks on civilians" is an explicit non-claim (see `PROJECT_SPEC.md` §66).

## Implementation notes

Structured as `load_weekly_metrics`, `load_actor_profiles`, `validate_inputs`, `select_actor_weekly`, `detect_peak_candidates`, `collapse_plateaus`, `select_episodes`, `sanitize_actor_id_for_episode`, `detect_episodes_for_actor`, `build_window_rows`, `build_all_episode_windows`, `validate_event_windows`, `print_summary`, `main`.

`ONLY_ELIGIBLE_ACTORS` is a module-level constant (default `False`, i.e. detect episodes for every actor, not just `eligible_for_web3` ones) — flagged in the docstring as an unresolved config surface: `config/config.yaml` has no corresponding key yet, so this was made a code constant rather than an invented config key. `collapse_plateaus` only merges candidate weeks that are both calendar-adjacent and equal-valued.

**Status:** implemented (582 lines), not yet run against the raw GED file.

---

## Loading and validation

::: scripts.06_build_event_windows.load_weekly_metrics

::: scripts.06_build_event_windows.load_actor_profiles

::: scripts.06_build_event_windows.validate_inputs

## Peak detection

::: scripts.06_build_event_windows.select_actor_weekly

::: scripts.06_build_event_windows.detect_peak_candidates

::: scripts.06_build_event_windows.collapse_plateaus

::: scripts.06_build_event_windows.select_episodes

## Episode/window construction

::: scripts.06_build_event_windows.sanitize_actor_id_for_episode

::: scripts.06_build_event_windows.detect_episodes_for_actor

::: scripts.06_build_event_windows.build_window_rows

::: scripts.06_build_event_windows.build_all_episode_windows

## Finalization and orchestration

::: scripts.06_build_event_windows.validate_event_windows

::: scripts.06_build_event_windows.print_summary

::: scripts.06_build_event_windows.main
