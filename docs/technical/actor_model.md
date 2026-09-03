# Actor model

Investigation into how UCDP GED represents armed actors in the filtered
Sudan dataset (`data/processed/events_sudan.csv`, 1,807 events, 2023-2025),
and whether/how the same real-world actor can be tracked consistently
across state-based, non-state, and one-sided violence. Findings below are
based on directly inspecting that file — nothing here is inferred from the
GED codebook alone.

## 1. Relevant actor columns

| Column | Role |
|---|---|
| `side_a`, `side_b` | Actor names (human-readable, GED-assigned). |
| `side_a_new_id`, `side_b_new_id` | Actor identifiers, current GED numbering. |
| `side_a_dset_id`, `side_b_dset_id` | Legacy per-dataset-version actor identifiers (retained in the processed CSV but not used below — superseded by `*_new_id`). |
| `dyad_name`, `dyad_new_id` | The specific side_a/side_b pairing for an event. |
| `conflict_name`, `conflict_new_id` | Broader grouping GED assigns a dyad to. |
| `type_of_violence` | 1 = state-based, 2 = non-state, 3 = one-sided — determines what `side_a`/`side_b` *mean* (see §2). |

`type_of_violence` isn't itself an actor column, but no actor column can be
interpreted without it.

## 2. How `side_a`/`side_b` behave across violence types

Behavior differs by `type_of_violence`, confirmed directly against the
1,807-row filtered file:

- **State-based (1), n=1,259:** `side_a` is always `Government of Sudan`
  (1 distinct value). `side_b` is one of `RSF`, `SPLM/A-North`, `SFA` (3
  distinct values). Both sides are organized armed actors; this is
  government-vs-armed-group combat.
- **Non-state (2), n=41:** both `side_a` and `side_b` are drawn from a set
  of 9 names each (18 distinct actors total in this subset), e.g.
  `Arab - Masalit`, `Hausa - Nuba`, `Twic Dinka - Ngok Dinka`. Most of these
  are communal/ethnic group labels, not formal organizations — a different
  kind of "actor" than a state or a named armed group like RSF. `SLFA,
  SLM/A - RSF` is the one non-state dyad where a formally-named armed group
  (RSF) fights another organized actor rather than a communal group. Which
  side GED lists as `side_a` vs `side_b` is not verified here to encode
  "aggressor" vs "defender" — treat the ordering as arbitrary unless the
  GED codebook says otherwise.
- **One-sided (3), n=507:** `side_a` is the organized perpetrator —
  `Government of Sudan`, `RSF`, `SFA`, or `Government of Russia (Soviet
  Union)` (4 distinct values, `side_a_new_id` confirms 4 distinct ids).
  `side_b` is **always** the literal string `"Civilians"`, and
  `side_b_new_id` is the single constant value `1` for every one of the 507
  rows. `side_b` in one-sided violence is not a trackable actor — it's
  GED's fixed pseudo-actor standing in for "the civilian population," not
  a comparable entity to the armed groups on `side_a`.

## 3. Which IDs are more reliable than names

`side_a_new_id`/`side_b_new_id` were checked for 1:1 consistency against
`side_a`/`side_b` names across all three violence types and both roles
(i.e. does a name ever map to more than one id, or an id to more than one
name, regardless of whether it appears as `side_a` or `side_b`, or under
state-based/non-state/one-sided). Result on this 1,807-row subset: **zero
collisions in either direction.** For example:

- `RSF` → id `8635` as `side_b` in state-based, `side_b` in non-state, and
  `side_a` in one-sided — same id every time.
- `Government of Sudan` → id `112` as `side_a` in both state-based and
  one-sided.
- `SFA` → id `9645` as `side_b` in state-based and `side_a` in one-sided.

So within this filtered dataset, `side_a_new_id`/`side_b_new_id` are a
reliable, role-independent, violence-type-independent key for a given
actor. Names happen to match up perfectly too in this subset, but IDs are
still the recommended key: GED's own derived `dyad_name` field is built by
concatenating `side_a`/`side_b` and has internal formatting inconsistencies
(e.g. `"Habaniya  - Salamat Baggara"` — double space, and `"Habaniya "` — a
trailing space, absent from the underlying `side_a`/`side_b` values
themselves). Parsing composite GED text fields is not reliable; the
`side_*_new_id` columns are.

**Caveat:** this 1:1 stability is confirmed only within the current
1,807-row filtered subset (Sudan, 2023-2025). It has not been checked
against the full global GED file, where the same id could in principle be
reused differently over a longer time span, or the same actor could be
recoded under a new id. Re-verify before relying on this across a wider
date range or country set.

## 4. How one-sided perpetrators should be identified

For `type_of_violence == 3`, the perpetrator is unambiguous: it's
`side_a` (`side_a_new_id`/`side_a_name`). `side_b` must never be treated as
an actor to track — it's the constant `"Civilians"` pseudo-actor
(`side_b_new_id == 1`), representing the target population, not an
organized entity comparable to the ones on `side_a`.

## 5. Limitations

- **Non-state directionality unverified.** Whether `side_a`/`side_b`
  ordering in non-state dyads carries meaning (e.g. initiator vs.
  responder) was not checked against the GED codebook here — don't assume
  it does.
- **Actor category mismatch.** Non-state `side_a`/`side_b` values are
  mostly communal/ethnic labels (`Arab`, `Masalit`, `Twic Dinka`, …),
  while state-based/one-sided actors are formal organizations (government,
  named armed groups). A single "actor" concept spanning both kinds of
  label needs to account for this difference in what's being named — it's
  not just a naming inconsistency, it's two different kinds of entity.
- **Formal actor label ≠ commonly reported group name.** Two one-sided
  events (GED ids `596286`, `611826`, South Darfur, Sept. 2025) are coded
  with perpetrator `Government of Russia (Soviet Union)`, but their
  `source_article` text describes them as `"Wagner Group"` activity. GED's
  formal state-actor coding can diverge from the group name that's
  actually reported in the press — don't assume the `side_a` label is the
  same name a viewer would recognize from news coverage.
- **Small, filtered sample.** 1,807 rows and ~19 distinct actor names is
  not enough to be confident the id/name 1:1 mapping generalizes; see the
  caveat in §3.
- **Dyadic structure, not multi-actor.** GED encodes one actor pair per
  row. A real-world event involving more than two actors (e.g. a
  coalition) would appear as multiple dyad rows rather than one row with
  multiple actors — actor-level aggregation later needs to account for
  this, not just group by a single id column.
- **`conflict_new_id` is finer-grained than expected.** 18 distinct
  `conflict_new_id` values exist for only 4 one-sided perpetrators and a
  handful of dyads — it does not behave as a stable "campaign" grouping
  that could be used to link an actor's events across violence types.

## 6. Proposed canonical actor representation

Given §2's finding that `side_b` means fundamentally different things
depending on `type_of_violence` (a real armed actor for state-based/
non-state, a fixed civilian pseudo-actor for one-sided), a single unified
`actor` column collapsing `side_a`/`side_b` into one field is **not**
implemented — doing so would either silently equate "Civilians" with an
armed group, or require a directionality/role decision for non-state
dyads that hasn't been verified (§5).

What's proposed instead, and implemented in `scripts/features.py` (§7):

- Keep `side_a`/`side_b` and their `*_new_id` companions as the source of
  truth for actor identity, in all three violence types.
- Add a narrow, unambiguous derived pair — `one_sided_perpetrator_id` /
  `one_sided_perpetrator_name` — that surfaces `side_a`'s id/name only for
  `type_of_violence == 3` rows (`NaN` elsewhere). This is the one place
  where "perpetrator" has a single, justified meaning per §4, so it's safe
  to compute now.
- Defer any state-based/non-state actor-role unification (e.g. "who
  initiated") until the ordering question in §5 is resolved from the GED
  codebook rather than guessed.
- When an actor-comparison view is eventually built, it should query
  `side_a_new_id`/`side_b_new_id` directly per violence type rather than
  through a premature unified column, until a role mapping can be
  justified for state-based and non-state dyads too.

## 7. Helpers implemented

Two additions to `scripts/features.py`, following the existing pure
`Series → Series` pattern:

- `derive_one_sided_perpetrator_id(side_a_new_id, type_of_violence)`
- `derive_one_sided_perpetrator_name(side_a, type_of_violence)`

Both are wired into `add_derived_features()`, so
`one_sided_perpetrator_id`/`one_sided_perpetrator_name` are present in
`data/processed/events_sudan.csv` for any future view to use directly,
without recomputing the `type_of_violence == 3` condition itself.
