# Instagram Post 1

| **Title** | **Author(s)** | **Description** | **Link** |
|---|---|---|---|
| *The 50 Countries Most Impacted by Violent Conflict* | Powerful Countries; data source: ACLED Conflict Index | An Instagram map based on the ACLED Conflict Index, showing the fifty countries and territories most affected by violent conflict. | [Instagram post](https://www.instagram.com/p/DMMMCKBsBXP/) |

---

## Context: Political Violence

ACLED records political violence with details such as dates, locations, actors, event types, and fatalities. The Conflict Index brings these records together into four dimensions: deadliness, danger to civilians, geographic diffusion, and armed-group fragmentation.

The Instagram account Powerful Countries turns that detailed analysis into a **world overview that people can take in quickly while scrolling their feed**.

---

## Representation: Top 50 Countries by Violence

![World Map](https://github.com/PayThePizzo/war-civilian-violence/blob/main/docs/phase_2/images/Insta%201.png?raw=TRUE)

The main image is a **categorical world map**.

Each country stays in its geographic position, while **colour and emphasis identify the fifty countries** and territories included in the Conflict Index and distinguish their **conflict severity**. Instead, the remaining states are left blank, which helps the highlighted regions stand out on a phone screen.

The main feature of this representation make the map quick to read:

- Small set of colours
- Compact legend
- Clear headline
- Few labels

The only limit is given by the fact that, trivially, country size determines how much space it takes up. As a consequence, a large country can therefore draw more attention even if its index value is not proportionally higher (lower density of violence). Furthermore, the huge title would not be a problem if it was not accompanied by a long description inside the picture. This is justified from the map not being able to be displayed in a larger format.

The description clearly includes the sources, a brief description on the data's time range and the criteria for coloring.

---

## Knowledge: What can we learn from it?

The map helps us see **where affected countries cluster and which ones are neighbours**. In fact, a ranked table shows each country as a separate entry. Here, instead, regional groups and connected border zones become visible. The highlighted and blank areas also show how unevenly conflict burden is spread around the world.

These patterns invite to question about what nearby conflicts may share.Plus, the diagonally oriented distribution of the colors seems to cut the world in half. In a way, it points to the fact that we must ignore these conflicts, because they are closer than they look.

One problem that persist, it that the map helps us spot patterns, but it cannot tell us why two countries received a similar colour. For that, we need the four index components.

To sum up, this visualization let us learn about where severe conflicts cluster within regions and across borders, and how similar classifications can reflect different measures of severity.

---

## Pipeline from raw information to the visualizations

Luckily, we find some useful information in the post's description:

1. They took the data from ACLED, which codes events by date, location, event type, actors, fatalities, and civilian targeting. The events cover around 12 months from July 2024 to July 2025 from the description states.
2. The Conflict Index methodology groups these events together and all the countries are assigned a label directly related to the amount of total violence.
3. The top fifty countries are selected and shown on a simplified categorical world map, along with the label assigned.

### Sources and tools

- **Primary sources:**  [ACLED Conflict Index](https://acleddata.com/series/acled-conflict-index).