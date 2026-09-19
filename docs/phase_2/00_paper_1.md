
## Paper 1

| **Title** | **Author(s)** | **Description** | **Link** |
|---|---|---|---|
| *VEHICLE: Validation and Exploration of the Hierarchical Integration of Conflict Event Data* | Benedikt Mayer, Kai Lawonn, Karsten Donnay, Bernhard Preim, and Monique Meuschke | A visual-analytics system for checking how conflict-event datasets from different institutions have been combined. Published in *Computer Graphics Forum*, 40(3), 2021. | [Paper and DOI](https://doi.org/10.1111/cgf.14284) | 

*You can read the local copy of the paper* [here](https://github.com/PayThePizzo/war-civilian-violence/blob/main/docs/phase_2/papers/VEHICLE.pdf).

---

## Context: Combining Conflict Datasets

Researchers often need to combine conflict records from different organizations. That isn't straightforward: the **same incident can appear in several databases** with different dates, locations, actor names, event categories, or levels of geographic detail. An incident may also appear in one source and be missing from another.

The paper looks at the results of MELTT, a semi-automatic procedure for matching and combining conflict datasets. MELTT **uses limits on distance and time, along with hierarchical classifications, to decide which records may describe the same event**. A table can list those matches, but it is harder to see the overall pattern.

---

## Selected Representations

The interface uses **multiple coordinated views**. Each shows a different part of the matching problem, and they update together. This lets researchers examine whether two databases are describing the same events from several angles.

### ParaMultiples

**ParaMultiples** shows a grid of small histograms. Each cell represents a combination of distance and time thresholds, and its histogram shows how many matches that setting produces and their quality. Researchers can compare nearby cells to see what changes when they adjust the settings.

![ParaMultiples](https://github.com/PayThePizzo/war-civilian-violence/blob/main/docs/phase_2/images/Paper1%20-%20ParaMultiples.png?raw=TRUE)

### TempMap

**TempMap** combines a map with a radial time histogram. The map shows *where* candidate events happened, and the circular display shows *when*. Selecting events connects the two views, so researchers can look at place and time together.

![TempMap](https://github.com/PayThePizzo/war-civilian-violence/blob/main/docs/phase_2/images/Paper1%20-%20TempMap.png?raw=TRUE)

### EventCharts

**EventCharts** use hierarchical stacked bars. Longer bars show larger amounts, segments show what makes up each total, and the hierarchy lets researchers move from broad event or actor classes to more specific ones.

![EventCharts](https://github.com/PayThePizzo/war-civilian-violence/blob/main/docs/phase_2/images/Paper1%20-%20EventCharts.png?raw=TRUE)

### MatchTree

**MatchTree** shows the matching classifications as a radial branching structure. Each branch belongs to a category, and the marks along it show where matches gather or disappear.

![MatchTree](https://github.com/PayThePizzo/war-civilian-violence/blob/main/docs/phase_2/images/Paper1%20-%20MatchTree.png?raw=TRUE)

### Other Options

Brushing, filtering, highlighting, and drill-down link the views. Select a bar, map region, parameter cell, or tree branch, and the same records are highlighted across the interface.

This makes it easier to follow a problem through the different views.

---

## Knowledge: What can we learn from it?

The linked views help show whether agreement and disagreement between sources follow **systematic patterns**. A table. instead, can only tell us which records matched.

The interface also shows whether matching failures gather in a particular country, period or part of the event classification. For example,

- Clusters in TempMap may point to uneven geographic or time coverage, while
- Uneven stacked bars may suggest that one source supplies a disproportionate share of certain event types.

In particular ParaMultiples helps researchers judge **how stable the integration is**. If the nearby cells look similar, small changes to the thresholds probably make little difference to the combined dataset. On the other hand, a sudden change between cells points to a parameter "cliff": a small choice produces a very different result. **That kind of sensitivity is almost impossible to spot in a match table**.

The views also **make it easier to notice local problems in results that look good overall.** A setting may produce an acceptable total while the map or classification reveals a serious failure.

Thus, we can learn *where the sources agree, where they disagree, which choices affect that disagreement, and whether the combined dataset is reliable enough for a particular research question*.

---

## Pipeline from raw information to the visualizations

From the paper, we can briefly summarize the representations pipeline as follows:

1. Data is collected autonoumously by ACLED, UCDP GED, the Global Terrorism Database, and the Social Conflict Analysis Database.
2. The records are standardized and sorted using shared classifications for actors, event types, and geographic precision.
3. MELTT uses distance and time thresholds to find possible matches, then calculates similarity using the classifications.
4. VEHICLE calculates counts, distributions, match scores, and differences between settings.
5. The results appear in linked maps, histograms, hierarchical bars, and radial trees.

### Sources and tools

- **Primary sources:** [ACLED](https://acleddata.com/), [UCDP GED](https://ucdp.uu.se/ged/), [Global Terrorism Database](https://www.start.umd.edu/data-tools/GTD), and [Social Conflict Analysis Database](https://korbel.du.edu/sie/social-conflict-analysis-database/). The study covers 197,502 conflict events in Africa from 1997 to 2016.
