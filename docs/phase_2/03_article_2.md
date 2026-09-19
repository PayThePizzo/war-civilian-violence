
## Responsive Web Article 2

| **Title** | **Author(s)** | **Description** | **Link** |
|---|---|---|---|
| *How Ukraine Has Faced Its Worst Month on the Battlefield in Two Years - Visualised* | Ed Gargan, Pablo Gutiérrez, and Ashley Kirk; design by Prina Shah | A series of charts and maps for desktop and mobile showing Russian territorial gains in Ukraine in 2024, with a focus on November. | [The Guardian article](https://www.theguardian.com/world/ng-interactive/2024/dec/04/how-ukraine-faced-worst-month-battlefield-in-two-years-visualised) |

---

## Context: Lost Terrain

The article was published in December 2024, after Ukraine lost more territory in November than in any month since September 2022. The authors look at how those losses compare with earlier months, where they happened, and what the captured land contained, so readers can judge what the area totals mean strategically.

![Lost Terrain](https://github.com/PayThePizzo/war-civilian-violence/blob/main/docs/phase_2/gifs/Article2.gif?raw=TRUE)

The main source is the Institute for the Study of War's daily control-of-terrain files. These distinguish areas under control, contested areas, and areas where advances have been recorded.

---

## Representations: Lost Terrain and Chart

The article combines a **time series of territorial change** with **annotated control-of-terrain maps**. 

The chart lines up the months on one time axis and shows the amount of land gained or lost. This makes faster changes and unusually large monthly losses easy to spot. A note highlights November 2024.

![Chart](https://github.com/PayThePizzo/war-civilian-violence/blob/main/docs/phase_2/images/Article2%20-%20Chart.png?raw=TRUE)

The maps show what those square kilometres look like on the ground. Colour distinguishes control, advances, and contested areas. 

| **April 2024**       | **September 2024**  |
|----------------------|---------------------|
| ![Before](https://github.com/PayThePizzo/war-civilian-violence/blob/main/docs/phase_2/images/Article%202%20Before.png?raw=TRUE) | ![After](https://github.com/PayThePizzo/war-civilian-violence/blob/main/docs/phase_2/images/Article%202%20After.png?raw=TRUE) |

Regional boundaries locate the changes, while settlement labels and infrastructure references help explain their strategic importance. The story moves from Ukraine as a whole to Donetsk and then to individual advances, connecting the national totals to local places.

The order of the story connects the two views. First, the time series shows *when the change became exceptional*. Then, the maps explain *where it happened and what was in the captured area*.

---

## Knowledge: What can we learn from it?

A table can tell us that Russia captured approximately 1,202 square kilometres in November 2024. The chart shows why that number matters: it stands out from the surrounding months and marks Ukraine's worst monthly territorial loss in roughly two years.

The maps add context to that total. Most of the change happened in Donetsk, and much of the area was agricultural land, forest, or fields rather than major cities or transport hubs. We can see that **the amount of land gained and its strategic value are related, but they are not the same thing**.

The shape of the advances also tells us how the losses happened. The 1,202 square kilometres were gained through several gradual, uneven movements. Looking at the chart and maps together, we can see that November brought severe losses in area, while the consequences depended on where those losses occurred, the settlements involved, and their distance from strategically important places.

---

## Pipeline from raw information to the visualizations

1. Daily territorial-control files come from the Institute for the Study of War.
2. Mapped control areas, stored as polygons, are compared across dates to estimate gains and losses.
3. Changes are grouped by month and region.
4. Settlement and infrastructure information adds context, helping distinguish rural land from strategic locations.
5. The article arranges charts and maps so readers move from the headline trend to a more detailed geographic explanation.

### Audience and format

The article gives citizens and professionals a clear account of a changing battlefield. It simplifies the daily control files while keeping the difference between area gained and strategic importance visible. Desktop readers get more detail, and mobile readers can follow the charts and maps in a vertical sequence.

### Sources and tools

- **Data:** daily control-of-terrain files from the Institute for the Study of War.
- **Transformations:** comparing polygons, estimating land area, grouping changes by month and region, and adding settlement context.
- **Representation tools:** custom responsive charts, annotated maps, and editorial text. The article does not list all the libraries used to make it.
- **Primary source:** [The Guardian visual article](https://www.theguardian.com/world/ng-interactive/2024/dec/04/how-ukraine-faced-worst-month-battlefield-in-two-years-visualised).
