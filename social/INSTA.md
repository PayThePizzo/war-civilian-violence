For Instagram, I would take a different approach from the web: **I would not use screenshots or scaled-down versions of the four interactive visualizations**. The two posts should extract two specific messages from the data and build a layout that is readable without hover interactions, filters, or tooltips.

I would keep the scripts and datasets unchanged. I would directly reuse the same `weekly_metrics.csv`, `h3_weekly_metrics.csv`, `actor_profiles.csv`, and possibly `event_windows.csv` already used by the frontend.

## Instagram 1 - How violence changed over time

This would be the main temporal post, based primarily on **Web 1**.

**Format:** `1080 × 1350 px`, portrait 4:5.

**Input:** `weekly_metrics.csv`, using the rows where `actor_id = "__ALL__"`.

I would not copy the full timeline from the website. The Instagram version should be much more editorial:

```text
┌─────────────────────────────────────────┐
│ How did violence change over time       │
│ in Sudan?                               │
│                                         │
│ ─────────────────────────────────────── │
│                                         │
│  WEEKLY EVENTS                          │
│                                         │
│       █████                             │
│    █████████       ███                  │
│ ████████████████████████                │
│                                         │
│       ↑                                 │
│  annotation                             │
│                                         │
│ ─────────────────────────────────────── │
│                                         │
│ ONE-SIDED VIOLENCE                      │
│                                         │
│            ╭───╮             ╭─         │
│ ───────────╯   ╰─────────────╯          │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ MAIN FINDING                        │ │
│ │ Short evidence-based statement      │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ UCDP GED · Sudan · 2023-2025           │
└─────────────────────────────────────────┘
```

The upper section would show weekly events by type:

* state-based;
* non-state;
* one-sided.

The lower section would show **only** `one_sided_event_share` or `one_sided_civilian_fatalities`. Using both would bring us back to the complexity of the web visualization.

### What it should communicate

A single question:

> **Did the role of one-sided violence remain constant throughout the conflict?**

And a single visual answer, to be written only after identifying the actual pattern.

For example, if supported by the data:

> **One-sided violence was concentrated in particular phases rather than distributed uniformly throughout the conflict.**

I would avoid causal statements.

### Annotations

Annotations become important here. I would select at most **2-3 moments**:

```text
peak in one-sided share
major civilian-fatality episode
another major shift
```

with very short callouts.

I would not annotate every peak.

---

# Instagram 2 - Geography of violence

The second post should be deliberately different from the first and based on **Web 2**.

**Format:** again, `1080 × 1350`.

**Input:** `h3_weekly_metrics.csv`, `actor_id = "__ALL__"`.

Here I would use a **small multiples** layout, because a single aggregated map risks losing the temporal dimension.

```text
┌─────────────────────────────────────────┐
│ VIOLENCE DID NOT STAY IN ONE PLACE     │
│                                         │
│ Where did combat and civilian           │
│ targeting concentrate?                  │
│                                         │
│ ┌──────────────┐  ┌──────────────┐     │
│ │              │  │              │     │
│ │   MAP A      │  │    MAP B     │     │
│ │              │  │              │     │
│ │ Early phase  │  │ Later phase  │     │
│ └──────────────┘  └──────────────┘     │
│                                         │
│ Combat ─────────────── One-sided        │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ MAIN FINDING                        │ │
│ │ Short geographic interpretation     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ UCDP GED · Sudan · H3 aggregation      │
└─────────────────────────────────────────┘
```

An even better solution might be **three maps**:

```text
EARLY          MIDDLE          LATE
┌───────┐      ┌───────┐      ┌───────┐
│       │      │       │      │       │
│ map   │  →   │ map   │  →   │ map   │
│       │      │       │      │       │
└───────┘      └───────┘      └───────┘
```

but only if they remain readable at 1080 px.

Color should carry the same meaning as in the web map:

```text
combat-dominated  ─────────────  one-sided-dominated
```

and intensity can be represented through opacity.

**No 3D on Instagram.** In a static image, it adds perspective and occlusion without offering interaction.

---

# A potentially better alternative for Instagram 2

There is another option I consider equally valid: using **Web 3 / actor profiles** instead of the map.

This would give you:

### Instagram 1

**WHEN - temporal change**

### Instagram 2

**WHO - actor differences**

and leave the map primarily for the web.

The second post could look like this:

```text
┌─────────────────────────────────────────┐
│ NOT ALL ACTORS FIGHT THE SAME WAY      │
│                                         │
│ Share of recorded events that were      │
│ one-sided violence                      │
│                                         │
│ Actor A  █████████████████      34%     │
│ Actor B  ███████████            22%     │
│ Actor C  ███████                14%     │
│ Actor D  ███                     6%     │
│                                         │
│ ─────────────────────────────────────── │
│                                         │
│ Combat involvement     Civilian target. │
│        ●──────────────●                  │
│                                         │
│ MAIN FINDING                            │
│ Different actors show substantially     │
│ different violence profiles.            │
│                                         │
│ UCDP GED · Sudan                        │
└─────────────────────────────────────────┘
```

For Instagram, this could be **more effective than a map**, because actor names and differences remain readable on a smartphone.

My choice would be:

> **Instagram 1 = temporal story**
> **Instagram 2 = actor story**

and I would leave geography to one of the two posts for X or to the web visualization.

---

# I would not use Parallel Coordinates on Instagram

Web 3 works because you have:

* hover;
* detail panel;
* selection;
* horizontal space.

On Instagram, parallel coordinates would become too dense.

For Instagram, I would turn the same data into something easier to grasp:

* ranked bars;
* dumbbell;
* slopegraph;
* direct labels.

The same analysis, a different representation.

---

# File structure

I would keep the social media assets completely separate from the web frontend:

```text
social/
├── instagram/
│   ├── post-01-temporal/
│   │   ├── index.html
│   │   ├── post.ts
│   │   └── post.css
│   │
│   └── post-02-actors/
│       ├── index.html
│       ├── post.ts
│       └── post.css
│
├── shared/
│   ├── data.ts
│   ├── colors.ts
│   └── typography.css
│
└── output/
    ├── instagram-01.png
    └── instagram-02.png
```

Alternatively, we could put everything under `web/social/`, but I prefer a top-level `social/` directory because these are **separate deliverables** from the website.

---

# Reproducibility

I would not create the posts manually in Photoshop.

I would use:

```text
derived CSV
     ↓
HTML + CSS + D3
     ↓
fixed 1080 × 1350 canvas
     ↓
Playwright screenshot
     ↓
PNG
```

This keeps every post fully reproducible.

For example:

```ts
await page.setViewportSize({
  width: 1080,
  height: 1350
});
```

and then take a screenshot.

---

# Palette and visual identity

I would reuse the exact palette from the website:

```text
State-based → blue
Non-state   → orange
One-sided   → green
```

as the current visualizations already do.

The following should also match the website:

* font;
* titles;
* background;
* number formatting;
* annotation style.

Instagram should feel like an extension of the project, not a separate design project.

---

# What I would NOT do

I would avoid:

* direct screenshots of the website;
* tooltips turned into fixed text;
* miniature parallel coordinates;
* a static 3D hex map;
* four charts in the same post;
* 15 numbers in a single image;
* lengthy methodological explanations.

The principle is:

> **one post = one claim.**

The web is for exploration.

Instagram is for **taking away a message**.

---

## The two outputs I would settle on

### Instagram Post 1 - Temporal

**Title**

> **When does violence turn toward civilians?**

**Data**

`weekly_metrics.csv`

**Visual**

Simplified weekly violence composition + one-sided trend.

**Main purpose**

Show that the relative importance of one-sided violence changes over time.

---

### Instagram Post 2 - Actors

**Title**

> **Not all armed actors show the same violence profile**

**Data**

`actor_profiles.csv`

**Visual**

A ranked bar or dumbbell comparison of the main actors, focusing on:

```text
combat_event_count
one_sided_event_share
one_sided_civilian_fatalities
```

**Main purpose**

Show that highly active actors can have very different ratios of combat to violence against civilians.

---

These two posts complement the website well: **Instagram tells the WHEN + WHO story**, while the web retains detailed exploration of **WHEN + WHERE + WHO + BEFORE/AFTER**.
