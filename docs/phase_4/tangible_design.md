# Phase 4 - Tangible design: El Fasher Massacre's Surrounding Violence

This tangible representation focuses on the **seven weeks surrounding the El Fasher reference week**, using a physical tower made of seven stacked cylinders.

Each cylinder represents one week. The tower develops **from past to future, bottom to top**:

```text
FUTURE
  ↑
  W+3
  W+2
  W+1
  W0   <- El Fasher reference week
  W-1
  W-2
  W-3
  ↑
  PAST
```

The representation is intentionally simple. The size of the cylinder shows the total number of fatalities in the week, while three fixed positions around each cylinder show the composition of those fatalities by violence type. A fourth position identifies the main actor for that week.

The resulting physical story is therefore:

```text
How many people died?
        ↓
Cylinder size

What type of violence produced those deaths?
        ↓
Red / Orange / Cyan circles

Who was the main actor?
        ↓
Bottom tactile icon

When did it happen?
        ↓
Vertical position in the tower
```

---

## Data, Variables and Transformations

The tangible representation uses two processed datasets derived from the **UCDP Georeferenced Event Dataset (GED)**:

- `event_windows.csv`, used to identify the El Fasher episode and its reference week;
- `weekly_metrics.csv`, used to obtain the weekly values represented by the physical components.

The selected episode is:

```text
episode_id = ucdp-9645__2025-10-20
actor      = SFA
t0_date    = 2025-10-20
```

The original event window covers a larger period around the episode. For the tangible representation, we keep only **seven weeks**:

| Relative Week | Calendar Week |
|---|---|
| W-3 | 29 September – 5 October 2025 |
| W-2 | 6 – 12 October 2025 |
| W-1 | 13 – 19 October 2025 |
| **W0** | **20 – 26 October 2025** |
| W+1 | 27 October – 2 November 2025 |
| W+2 | 3 – 9 November 2025 |
| W+3 | 10 – 16 November 2025 |

For every week, the `__ALL__` row of `weekly_metrics.csv` is used so that the cylinder represents the **overall violence occurring during that week**, rather than the activity of a single actor.

The variables used in the physicalization are:

| Variable | Meaning in the representation |
|---|---|
| `best_fatalities` | Total fatalities in the week |
| `one_sided_civilian_fatalities` | Fatalities associated with one-sided violence |
| Derived state-based fatalities | Fatalities associated with state-based violence |
| Derived non-state fatalities | Fatalities associated with non-state violence |
| Actor-specific weekly metrics | Used to select the main actor |

During these seven weeks, `non_state_event_count = 0` in every week. Therefore the weekly fatality composition is:

```text
Total fatalities
=
State-based fatalities
+
One-sided fatalities
```

and:

```text
Non-state fatalities = 0
```

State-based fatalities are therefore obtained as:

```text
State-based fatalities
=
best_fatalities
-
one_sided_civilian_fatalities
```

The resulting seven-week dataset is:

| Week | Total Fatalities | State-based | Non-state | One-sided |
|---|---:|---:|---:|---:|
| W-3 | 87 | 84 | 0 | 3 |
| W-2 | 344 | 332 | 0 | 12 |
| W-1 | 226 | 220 | 0 | 6 |
| **W0** | **59,517** | **771** | **0** | **58,746** |
| W+1 | 1,234 | 40 | 0 | 1,194 |
| W+2 | 163 | 163 | 0 | 0 |
| W+3 | 119 | 119 | 0 | 0 |

### Main actor

The bottom icon represents the actor associated with the highest estimated number of fatalities inflicted during the week.

The comparison is restricted to the three actors represented by the physical icons:

```text
🏠 Government of Sudan
🏛️ SFA
🏭 RSF
```

For each actor, the weekly score is calculated as:

```text
Estimated fatalities inflicted
=
combatant_fatalities
-
actor_deaths_suffered
+
one_sided_civilian_fatalities
```

This produces the following main actor sequence:

| Week | Main Actor |
|---|---|
| W-3 | 🏠 Government of Sudan |
| W-2 | 🏠 Government of Sudan |
| W-1 | 🏠 Government of Sudan |
| **W0** | 🏛️ **SFA** |
| W+1 | 🏛️ SFA |
| W+2 | 🏠 Government of Sudan |
| W+3 | 🏠 Government of Sudan |

---

## Mapping

### Cylinder

Each cylinder represents **one week**.

The cylinders are stacked chronologically from bottom to top and the **circumference of the cylinder represents total fatalities**.

Five cylinder sizes are available. Because the W0 value is much larger than the surrounding weeks, we use a simple magnitude-based classification:

| Cylinder Size | Total Fatalities |
|---|---:|
| **Size 1** | 1 – 9 |
| **Size 2** | 10 – 99 |
| **Size 3** | 100 – 999 |
| **Size 4** | 1,000 – 9,999 |
| **Size 5** | 10,000+ |

Applied to the seven weeks:

| Week | Total Fatalities | Cylinder |
|---|---:|---|
| W-3 | 87 | Size 2 |
| W-2 | 344 | Size 3 |
| W-1 | 226 | Size 3 |
| **W0** | **59,517** | **Size 5** |
| W+1 | 1,234 | Size 4 |
| W+2 | 163 | Size 3 |
| W+3 | 119 | Size 3 |

The fourth cylinder, W0, is the central reference point of the tower.

### Circles

Three fixed holes are used for the three UCDP violence categories:

```text
                         TOP
                       🔴 RED
                    ONE-SIDED
                         │


 LEFT                [ CYLINDER ]                RIGHT
🟠 ORANGE                                        🔵 CYAN
STATE-BASED                                      NON-STATE


                         │
                       BOTTOM
                    ACTOR ICON
```

The position never changes:

| Position | Circle | Variable |
|---|---|---|
| Top | 🔴 Red | One-sided fatalities |
| Left | 🟠 Orange | State-based fatalities |
| Right | 🔵 Cyan | Non-state fatalities |

The **size of every circle represents fatalities**, using the same scale:

| Circle Size | Fatalities |
|---|---:|
| No circle | 0 |
| **Size 1** | 1 – 9 |
| **Size 2** | 10 – 99 |
| **Size 3** | 100 – 999 |
| **Size 4** | 1,000 – 9,999 |
| **Size 5** | 10,000+ |

The three circles therefore use exactly the same quantitative rule.

#### One-sided - 🔴 Top

| Week | Fatalities | Circle |
|---|---:|---|
| W-3 | 3 | Size 1 |
| W-2 | 12 | Size 2 |
| W-1 | 6 | Size 1 |
| **W0** | **58,746** | **Size 5** |
| W+1 | 1,194 | Size 4 |
| W+2 | 0 | No circle |
| W+3 | 0 | No circle |

#### State-based - 🟠 Left

| Week | Fatalities | Circle |
|---|---:|---|
| W-3 | 84 | Size 2 |
| W-2 | 332 | Size 3 |
| W-1 | 220 | Size 3 |
| **W0** | **771** | **Size 3** |
| W+1 | 40 | Size 2 |
| W+2 | 163 | Size 3 |
| W+3 | 119 | Size 3 |

#### Non-state - 🔵 Right

No non-state events are recorded during the selected seven-week period.

Therefore:

```text
W-3 -> no cyan circle
W-2 -> no cyan circle
W-1 -> no cyan circle
W0  -> no cyan circle
W+1 -> no cyan circle
W+2 -> no cyan circle
W+3 -> no cyan circle
```

The empty right-side position is meaningful: it represents **zero non-state fatalities**.

### Other icons

The bottom hole identifies the main actor, and the physical mapping is:

| Icon | Actor |
|---|---|
| 🏠 House | Government of Sudan |
| 🏛️ Palace | SFA |
| 🏭 Factory | RSF |

The actor icon is categorical: its size does not change.

The four diagonal holes are ignored and remain empty.

### Accessible Choices

The physicalization does not rely on color alone. For a non-sighted user, the three violence categories are recognizable through their **fixed positions**:

```text
                    TOP
              ONE-SIDED
                    ●
                    │

                    │
STATE-BASED ●────---┼─────● NON-STATE
        LEFT        │        RIGHT
                    │

                MAIN ACTOR
                  BOTTOM
```

Furthermore, cylinders are assembled with the holes aligned. This creates stable "**virtual columns**" through the whole tower.

Finally, the size of the cylinders and circles play a great part in the tactile world, giving the possibility of feeling the "size of the violence".

---

## Sketches and Assembly

In the following mockups:

```text
⚪ S1–S5 = cylinder size
🔴 S1–S5 = one-sided circle size
🟠 S1–S5 = state-based circle size
🔵       = non-state circle
∅        = empty hole / zero
🏠       = Government of Sudan
🏛️       = SFA
🏭       = RSF
```

### Assembly 1 - Start

**W-3 - 29 September to 5 October 2025**

| **Feature** | **Value** | **Component and Size** |
|-------------|-----------:|------------------------|
| Total fatalities | 87 | ⚪ Cylinder Size 2 |
| One-sided fatalities | 3 | 🔴 Size 1 |
| State-based fatalities | 84 | 🟠 Size 2 |
| Non-state fatalities | 0 | No 🔵 circle |
| Main actor | Government of Sudan | 🏠 House |

This is the starting point of the story. Fatalities are relatively low compared with the following weeks and are almost entirely associated with state-based violence.

**2D top view**

![Assembly 1](https://github.com/PayThePizzo/war-civilian-violence/blob/main/docs/phase_4/images/Assembly1.png?raw=TRUE)

**Column after Assembly 1**

```text
            FUTURE
              ↑

            [⚪ S2]
      🔴S1   🟠S2   ∅   🏠
             W-3

              ↑
             PAST
```

### Assembly 2

**W-2 - 6 to 12 October 2025**

| **Feature** | **Value** | **Component and Size** |
|-------------|-----------:|------------------------|
| Total fatalities | 344 | ⚪ Cylinder Size 3 |
| One-sided fatalities | 12 | 🔴 Size 2 |
| State-based fatalities | 332 | 🟠 Size 3 |
| Non-state fatalities | 0 | No 🔵 circle |
| Main actor | Government of Sudan | 🏠 House |

Compared with W-3, the cylinder grows from Size 2 to Size 3. The increase is mainly associated with state-based fatalities, while one-sided fatalities also increase slightly.

**2D top view**

![Assembly 2](https://github.com/PayThePizzo/war-civilian-violence/blob/main/docs/phase_4/images/Assembly2.png?raw=TRUE)

**Column after Assembly 2**

```text
            FUTURE
              ↑

            [⚪ S3]   W-2
      🔴S2   🟠S3   ∅   🏠

            [⚪ S2]   W-3
      🔴S1   🟠S2   ∅   🏠

              ↑
             PAST
```

### Assembly 3

**W-1 - 13 to 19 October 2025**

| **Feature** | **Value** | **Component and Size** |
|-------------|-----------:|------------------------|
| Total fatalities | 226 | ⚪ Cylinder Size 3 |
| One-sided fatalities | 6 | 🔴 Size 1 |
| State-based fatalities | 220 | 🟠 Size 3 |
| Non-state fatalities | 0 | No 🔵 circle |
| Main actor | Government of Sudan | 🏠 House |

The total falls compared with W-2 but remains in the same physical size class. State-based violence continues to dominate the weekly fatality composition.

**2D top view**

![Assembly 3](https://github.com/PayThePizzo/war-civilian-violence/blob/main/docs/phase_4/images/Assembly3.png?raw=TRUE)

**Column after Assembly 3**

```text
            FUTURE
              ↑

            [⚪ S3]   W-1
      🔴S1   🟠S3   ∅   🏠

            [⚪ S3]   W-2
      🔴S2   🟠S3   ∅   🏠

            [⚪ S2]   W-3
      🔴S1   🟠S2   ∅   🏠

              ↑
             PAST
```

### Assembly 4 - El Fasher Week

**W0 - 20 to 26 October 2025**

| **Feature** | **Value** | **Component and Size** |
|-------------|-----------:|------------------------|
| Total fatalities | **59,517** | ⚪ **Cylinder Size 5** |
| One-sided fatalities | **58,746** | 🔴 **Size 5** |
| State-based fatalities | 771 | 🟠 Size 3 |
| Non-state fatalities | 0 | No 🔵 circle |
| Main actor | **SFA** | 🏛️ Palace |

W0 creates the strongest physical discontinuity in the tower. The cylinder reaches the maximum size, and the red one-sided add-on also reaches Size 5. The main change is therefore not only an increase in total fatalities, but also a major change in the composition of violence: one-sided fatalities overwhelmingly dominate the week.

The bottom actor icon also changes from the Government of Sudan to SFA.

**2D top view**

![Assembly 4](https://github.com/PayThePizzo/war-civilian-violence/blob/main/docs/phase_4/images/Assembly4.png?raw=TRUE)

**Column after Assembly 4**

```text
                 FUTURE
                   ↑

              ╔═ [⚪ S5] ═╗  W0
          🔴S5   🟠S3   ∅   🏛️
              ╚═══════════╝

                 [⚪ S3]   W-1
          🔴S1   🟠S3   ∅   🏠

                 [⚪ S3]   W-2
          🔴S2   🟠S3   ∅   🏠

                 [⚪ S2]   W-3
          🔴S1   🟠S2   ∅   🏠

                   ↑
                  PAST
```

### Assembly 5

**W+1 - 27 October to 2 November 2025**

| **Feature** | **Value** | **Component and Size** |
|-------------|-----------:|------------------------|
| Total fatalities | 1,234 | ⚪ Cylinder Size 4 |
| One-sided fatalities | 1,194 | 🔴 Size 4 |
| State-based fatalities | 40 | 🟠 Size 2 |
| Non-state fatalities | 0 | No 🔵 circle |
| Main actor | SFA | 🏛️ Palace |

The total drops sharply after W0, but it remains much higher than in the three preceding weeks. One-sided fatalities are still the dominant component, and SFA remains the main actor.

**2D top view**

![Assembly 5](https://github.com/PayThePizzo/war-civilian-violence/blob/main/docs/phase_4/images/Assembly5.png?raw=TRUE)

**Column after Assembly 5**

```text
                 FUTURE
                   ↑

                 [⚪ S4]   W+1
          🔴S4   🟠S2   ∅   🏛️

              ╔═ [⚪ S5] ═╗  W0
          🔴S5   🟠S3   ∅   🏛️
              ╚═══════════╝

                 [⚪ S3]   W-1
          🔴S1   🟠S3   ∅   🏠

                 [⚪ S3]   W-2
          🔴S2   🟠S3   ∅   🏠

                 [⚪ S2]   W-3
          🔴S1   🟠S2   ∅   🏠

                   ↑
                  PAST
```

### Assembly 6

**W+2 - 3 to 9 November 2025**

| **Feature** | **Value** | **Component and Size** |
|-------------|-----------:|------------------------|
| Total fatalities | 163 | ⚪ Cylinder Size 3 |
| One-sided fatalities | 0 | No 🔴 circle |
| State-based fatalities | 163 | 🟠 Size 3 |
| Non-state fatalities | 0 | No 🔵 circle |
| Main actor | Government of Sudan | 🏠 House |

At W+2, one-sided fatalities disappear from the weekly total. The red top position becomes empty, state-based fatalities account for the complete weekly total, and the main actor changes back to the Government of Sudan.

**2D top view**

![Assembly 6](https://github.com/PayThePizzo/war-civilian-violence/blob/main/docs/phase_4/images/Assembly6.png?raw=TRUE)


**Column after Assembly 6**

```text
                 FUTURE
                   ↑

                 [⚪ S3]   W+2
           ∅     🟠S3   ∅   🏠

                 [⚪ S4]   W+1
          🔴S4   🟠S2   ∅   🏛️

              ╔═ [⚪ S5] ═╗  W0
          🔴S5   🟠S3   ∅   🏛️
              ╚═══════════╝

                 [⚪ S3]   W-1
          🔴S1   🟠S3   ∅   🏠

                 [⚪ S3]   W-2
          🔴S2   🟠S3   ∅   🏠

                 [⚪ S2]   W-3
          🔴S1   🟠S2   ∅   🏠

                   ↑
                  PAST
```

### Assembly 7 - End

**W+3 - 10 to 16 November 2025**

| **Feature** | **Value** | **Component and Size** |
|-------------|-----------:|------------------------|
| Total fatalities | 119 | ⚪ Cylinder Size 3 |
| One-sided fatalities | 0 | No 🔴 circle |
| State-based fatalities | 119 | 🟠 Size 3 |
| Non-state fatalities | 0 | No 🔵 circle |
| Main actor | Government of Sudan | 🏠 House |

The final week follows the pattern already seen in W+2. The red one-sided add-on remains absent, all represented fatalities are state-based, and the Government of Sudan remains the main actor.

**2D top view**

![Assembly 7](https://github.com/PayThePizzo/war-civilian-violence/blob/main/docs/phase_4/images/Assembly7.png?raw=TRUE)


**Final column**

```text
                         FUTURE
                           ↑

                         [⚪ S3]   W+3
                   ∅     🟠S3   ∅   🏠

                         [⚪ S3]   W+2
                   ∅     🟠S3   ∅   🏠

                         [⚪ S4]   W+1
                  🔴S4   🟠S2   ∅   🏛️

                      ╔═ [⚪ S5] ═╗  W0
                  🔴S5   🟠S3   ∅   🏛️
                      ╚═══════════╝

                         [⚪ S3]   W-1
                  🔴S1   🟠S3   ∅   🏠

                         [⚪ S3]   W-2
                  🔴S2   🟠S3   ∅   🏠

                         [⚪ S2]   W-3
                  🔴S1   🟠S2   ∅   🏠

                           ↑
                          PAST
```

---

## Knowledge: What can we learn from it?

The tangible representation turns the seven-week sequence into a physical pattern that can be understood without reading a numerical table: 

> A relatively state-based violence pattern in the weeks before W0 is interrupted by an exceptional increase in fatalities dominated by one-sided violence, followed by a rapid decline and a return to a state-based pattern in the following weeks.

The first three cylinders establish a relatively stable pre-W0 situation. Their sizes remain between Size 2 and Size 3, and state-based violence is the dominant fatality category.

The fourth cylinder creates a strong break in this pattern:

```text
Total fatalities:

87 -> 344 -> 226 -> 59,517 -> 1,234 -> 163 -> 119
                    ↑
                    W0
```

The violence composition changes at the same point:

```text
One-sided fatalities:

3 -> 12 -> 6 -> 58,746 -> 1,194 -> 0 -> 0
                 ↑
                 W0
```

Before W0, the orange state-based component is dominant. During W0, the red one-sided component becomes overwhelmingly dominant. It remains important in W+1 and then disappears in W+2 and W+3.

The actor sequence reinforces the same temporal structure:

```text
🏠 -> 🏠 -> 🏠 -> 🏛️ -> 🏛️ -> 🏠 -> 🏠
                    ↑
                    W0
```

The physical representation therefore makes three changes easy to perceive together:

```text
1. A sudden increase in overall fatality magnitude.
2. A change from mainly state-based to mainly one-sided fatalities.
3. A temporary change in the main actor from Government of Sudan to SFA.
```

This is harder to perceive immediately from a tabular dataset because the reader has to compare several numerical columns at the same time.

The tangible representation also complements the fourth web visualization. The web version is better for exact values, longer windows, interaction and comparison between multiple episodes. The physical representation instead focuses on a single episode and makes its temporal structure directly visible and tactile.

For a blind user, the same story can be explored without relying on color. The user can move vertically through time or follow one virtual column:

```text
TOP column
-> evolution of one-sided fatalities

LEFT column
-> evolution of state-based fatalities

RIGHT column
-> evolution of non-state fatalities

BOTTOM column
-> evolution of the main actor
```

The size of the cylinders and add-ons can also be compared directly by touch.

---

## Limitations

The representation **deliberately simplifies the original data** in order to remain readable and accessible.

The first limitation is the **temporal window**: only seven weeks are shown. This gives a clear before-and-after story around W0 but does not represent the full Sudan conflict.

The second limitation is **discretization**. Exact fatality values are converted into five physical size classes. This makes tactile comparison possible, **but two different numerical values may use the same physical size**.

The third limitation concerns the **main actor**. The actor is selected using an estimated fatality score derived from the available actor-level metrics. It is therefore a compact storytelling variable rather than a complete description of all actors active during the week.

The **selected period also contains no non-state events**. The cyan right-side column is consequently empty throughout the seven cylinders. This is not missing information: the repeated absence communicates that non-state violence does not contribute to the fatality pattern in this specific window.

Finally, the accessibility choices are based on fixed positions, tactile size differences, distinct actor shapes and explicit orientation aids, which might not be enough.
