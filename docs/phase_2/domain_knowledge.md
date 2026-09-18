# Phase 2 - Domain Knowledge: Representing War Across Media

## Project Requirements

This phase looks at how information about war changes when it moves between media and reaches different audiences. For each example, we ask what information was selected, how it was grouped and shown, and how the finished piece helps people understand it.

We look at:

- two papers published in peer-reviewed international journals or conferences, mainly for researchers;
- two website articles that work on desktop and mobile, for professionals, researchers, and citizens;
- two Instagram posts, mainly for citizens;
- two posts on X, mainly for citizens and people following the news;
- two examples that use other approaches, such as virtual reality or a physical public installation.

For each example, we cover:

- the title, author or publisher, and link;
- the context in which it was made;
- how it presents information and uses visual features such as colour, size, and position;
- what we can learn from it that would be harder to spot in a table;
- how the raw information became the finished piece;
- how the format fits its audience and purpose;
- the sources and tools used, where these are publicly documented.

---

## Paper 1

| **Title** | **Author(s)** | **Description** | **Link** |
|---|---|---|---|
| *VEHICLE: Validation and Exploration of the Hierarchical Integration of Conflict Event Data* | Benedikt Mayer, Kai Lawonn, Karsten Donnay, Bernhard Preim, and Monique Meuschke | A visual-analytics system for checking how conflict-event datasets from different institutions have been combined. Published in *Computer Graphics Forum*, 40(3), 2021. | [Paper and DOI](https://doi.org/10.1111/cgf.14284) |

You can read the local copy of the paper [here](papers/vehicle-conflict-event-data.pdf).

### Context

Researchers often need to combine conflict records from different organizations. That isn't straightforward: the same incident can appear in several databases with different dates, locations, actor names, event categories, or levels of geographic detail. An incident may also appear in one source and be missing from another.

The paper looks at the results of MELTT, a semi-automatic procedure for matching and combining conflict datasets. MELTT uses limits on distance and time, along with hierarchical classifications, to decide which records may describe the same event. Changing these settings can change the matches. A table can list those matches, but it's harder to see the overall pattern, the overlap between sources, or how much the results depend on the settings.

VEHICLE helps researchers check this process before they use the combined data in statistical analysis.

### How it works

The interface uses **multiple coordinated views**. Each shows a different part of the matching problem, and they update together. This lets researchers examine whether two databases are describing the same events from several angles.

- **ParaMultiples** shows a grid of small histograms. Each cell represents a combination of distance and time thresholds, and its histogram shows how many matches that setting produces and their quality. Researchers can compare nearby cells to see what changes when they adjust the settings.
- **TempMap** combines a map with a radial time histogram. The map shows *where* candidate events happened, and the circular display shows *when*. Selecting events connects the two views, so researchers can look at place and time together.
- **EventCharts** use hierarchical stacked bars. Longer bars show larger amounts, segments show what makes up each total, and the hierarchy lets researchers move from broad event or actor classes to more specific ones.
- **MatchTree** shows the matching classifications as a radial branching structure. Each branch belongs to a category, and the marks along it show where matches gather or disappear.
- Brushing, filtering, highlighting, and drill-down link the views. Select a bar, map region, parameter cell, or tree branch, and the same records are highlighted across the interface. This makes it easier to follow a problem through the different views.

<!-- Add one or more representations here.

Suggested material:
- overview of the complete VEHICLE interface;
- ParaMultiples view;
- TempMap or MatchTree detail.

![Figure 1 — VEHICLE overview](images/paper-1-vehicle-overview.png)
![Figure 2 — VEHICLE detail](images/paper-1-vehicle-detail.png)
-->

### What we can learn from it

The linked views help show whether agreement and disagreement between sources follow **systematic patterns**. A table can tell us which records matched. The interface also shows whether matching failures gather in a particular country, period, source, actor category, or part of the event classification. Clusters in TempMap may point to uneven geographic or time coverage. Uneven stacked bars may suggest that one source supplies a disproportionate share of certain event types.

ParaMultiples helps researchers judge **how stable the integration is**. If nearby cells look similar, small changes to the thresholds probably make little difference to the combined dataset. A sudden change between cells points to a parameter “cliff”: a small choice produces a very different result. That kind of sensitivity is almost impossible to spot in a single exported match table.

The views also make it easier to notice local problems in results that look good overall. A setting may produce an acceptable total while the map or classification reveals a serious failure in one region or category. We can therefore learn *where the sources agree, where they disagree, which choices affect that disagreement, and whether the combined dataset is reliable enough for a particular research question*.

#### From raw information to the finished piece

1. ACLED, UCDP GED, the Global Terrorism Database, and the Social Conflict Analysis Database collect conflict records independently.
2. The records are standardized and sorted using shared classifications for actors, event types, and geographic precision.
3. MELTT uses distance and time thresholds to find possible matches, then calculates similarity using the classifications.
4. VEHICLE calculates counts, distributions, match scores, and differences between settings.
5. The results appear in linked maps, histograms, hierarchical bars, and radial trees.

#### Audience and format

Researchers need enough detail to compare settings, question the matching process, investigate unusual results, and export selected records. VEHICLE gives them room to do that without steering them toward one conclusion. The detailed interface suits that audience, though it would be too dense for a short post aimed at the public.

### Sources and tools

- **Data:** ACLED, UCDP GED, Global Terrorism Database, and Social Conflict Analysis Database. The study covers 197,502 conflict events in Africa from 1997 to 2016.
- **Transformation method:** MELTT's hierarchical event-matching procedure, using distance and time settings.
- **Design method:** Munzner's Nested Model, domain-task abstraction, iterative prototypes, case studies, and evaluation with conflict researchers.
- **Representation tools:** a browser-based visual-analytics application with custom interactive statistical, geographic, and hierarchical views. The paper focuses on how the system looks and works, rather than on a particular commercial charting tool.
- **Primary source:** [Computer Graphics Forum article](https://onlinelibrary.wiley.com/doi/full/10.1111/cgf.14284).

---

## Paper 2

| **Title** | **Author(s)** | **Description** | **Link** |
|---|---|---|---|
| *A Visual Analytics Framework for Identifying Topic Drivers in Media Events* | Yafeng Lu, Hong Wang, Steven T. Landis, and Ross Maciejewski | A visual-analytics framework for exploring possible links between media attention and outside event drivers, using media collections and an armed-conflict event dataset. Published in *IEEE Transactions on Visualization and Computer Graphics*, 24(9), 2501–2515, 2018. | [DOI](https://doi.org/10.1109/TVCG.2017.2752166) · [Institutional repository](https://oasis.library.unlv.edu/political_science_articles/159/) |

### Context

This paper presents a visual-analytics framework for exploring whether topics in media collections relate to possible outside event drivers. Researchers can retrieve events through related words, test possible causal links, and add annotations. They can also inspect the words behind a match and use their knowledge of the subject to refine it.

Here, we look at **Figure 10 in Section 7.2**, “Climate-Induced Unrest During Drought.” The case study asks whether the 2014 drought in the Greater Horn of Africa coincided with reports of social unrest and political violence. The analyst selects an agriculture topic from a social-unrest media collection, ACLED events labelled “violence against civilians,” and the starting terms **water**, **food**, **farmer**, and **climate**.

### How it works

Figure 10 shows the framework's **Cluster View**. It uses a force-directed bubble layout to help the analyst inspect and filter words that the system considers related in meaning.

- Each circle is a word. Filled circles are the selected media keywords. Outlined circles are related words found in ACLED event descriptions by the semantic model.
- Colour shows the starting search concept: **farmer** is blue, **climate** red, **water** tan, and **food** orange.
- Circle size is proportional to how often a word appears in the event records. Large nodes such as *fire*, *air*, *water*, and *food* draw more attention than small terms around the edges.
- Distance and outlines show groups of related words. Similar words attract one another, and automatically drawn boundaries separate the groups formed by the similarity threshold and the analyst's changes.
- The dashed box on the right is the **word-selection area**. Words or smaller groups moved into it become the filters used to retrieve events.
- The faded red *climate* group shows a match that the analyst rejected. Even with the similarity threshold set to 0.75, *climate* brought up *way*, *order*, *demand*, *tension*, and *control*, rather than a clear agricultural meaning. The analyst removed it, and the event list updated.

The image shows the analyst working through the results. We can see both the associations produced by the system and the point where someone with domain knowledge decides which ones make sense.

<!-- Add one or more representations here.

Suggested material:
- Figure 10 in full, including the colour legend and word-selection container;
- an enlarged crop of the faded *climate* cluster and the accepted *water*, *food*, and *farmer* groups.

![Figure 3 — Semantic word clustering and filtering](images/paper-2-semantic-word-clustering.png)
![Figure 4 — Accepted and rejected semantic groups](images/paper-2-semantic-filter-detail.png)
-->

### What we can learn from it

A table could list the keywords and their similarity scores. The bubble groups make **ambiguity in word meaning** easier to see, showing how one search term can lead in several directions:

- searching for *climate* does not guarantee environmental or agricultural language; in conflict-event descriptions, it also brings up words about social conditions, order, demand, tension, and control;
- *food* forms a recognizable group about nourishment, but it also sits near *treat*, *centre*, and *stick*, which may have little to do with the intended meaning;
- *farmer* and *water* form smaller, more coherent groups, while circle sizes show which related words appear often and which are rare;
- moving chosen words into the selection box changes the query, so the analyst's reading of the graphic directly affects which events are retrieved.

This tells us something about both the topic and the method. The same word can mean different things in different datasets. Seeing the associations helps an expert understand why the retrieved events might be misleading, remove a problematic concept, and keep the links that fit the research question.

After these changes, the Section 7.2 case study produced an insignificant causal model (lag = 2, R² = 0.090). Looking through the retrieved events also showed that some shared words linked drought terms to violence with no stated motive. The analyst therefore found the proposed link between resource shortages and civilian abuse less plausible. The visualization helps explain that cautious conclusion by showing how weak the initial word associations were.

#### From raw information to the finished piece

1. The analyst selects the agriculture topic from the social-unrest media collection and ACLED events labelled violence against civilians.
2. The analysis focuses on the months around the 2014 Greater Horn of Africa drought.
3. The words *water*, *food*, *farmer*, and *climate* provide the starting points for a semantic dictionary.
4. The text is normalized, and words with related meanings are extracted from ACLED event descriptions.
5. Complete-link agglomerative clustering and a force-directed layout group similar words. Colour shows the starting keyword, and circle size shows frequency in event text.
6. The analyst adjusts the similarity threshold, moves words between groups, puts accepted terms in the selection box, and removes misleading associations such as the *climate* group.
7. The filtered events are grouped into a time series and passed to the causality model to test the hypothesis.

#### Audience and format

This is designed for researchers who know that words can change meaning between text collections and that observational conflict data alone cannot establish causality. They can inspect the intermediate words, rather than judge the result only by a similarity score. Moving and filtering terms lets them bring their knowledge into the search process. That makes the view useful for developing and questioning hypotheses, but too specialized for a quick public graphic.

### Sources and tools

- **Data:** a social-unrest media collection built from 128 English-language RSS feeds, alongside ACLED conflict-event descriptions.
- **Case-study selections:** the agriculture topic, drought-related terms from March-June 2014, and ACLED violence-against-civilians events in the Greater Horn of Africa context.
- **Transformations:** text normalization, matching words by meaning, similarity-threshold filtering, complete-link agglomerative clustering, regrouping by the analyst, event aggregation, and causality modelling.
- **Representation tools:** a custom interactive force-directed Cluster View with colour-coded categories, frequency-scaled circles, group boundaries, drag-and-drop filtering, and a word-selection box.
- **Primary sources:** [IEEE DOI record](https://doi.org/10.1109/TVCG.2017.2752166) and the [University of Nevada, Las Vegas repository record](https://oasis.library.unlv.edu/political_science_articles/159/).

---

## Responsive Web Article 1

| **Title** | **Author(s)** | **Description** | **Link** |
|---|---|---|---|
| *How Drone Combat in Ukraine Is Changing Warfare* | Reuters Graphics; Mariano Zafra, Max Hunder, Anurag Rao, Sudev Kiyada, and collaborators | A visual investigation that works on desktop and mobile, explaining drone roles, operation, range, cost, and how they work together on the battlefield in Ukraine. | [Reuters article](https://www.reuters.com/graphics/UKRAINE-CRISIS/DRONES/dwpkeyjwkpm/) |

### Context

When the article was published in March 2024, drones had become central to reconnaissance, artillery guidance, direct attacks, and long-range strikes in Ukraine. Reuters drew on more than 50 attack videos, technical UAV research, interviews with manufacturers, soldiers, and officials, and information about drone types and battlefield roles.

Reuters needed to explain how this technology works on the battlefield to a broad audience, including citizens, journalists, professionals, and people interested in policy.

### How it works

The article uses **scroll-driven visual explanation**. As readers scroll, objects, labels, routes, ranges, and tactical stages appear. The scene stays in place while details change, making it easier to focus on one relationship at a time.

Labelled drawings explain drone components and roles. Maps and distance comparisons show how far drones can travel, while silhouettes and proportional drawings show their physical size. Arrows and transitions walk readers through reconnaissance, target identification, communication, artillery direction, and attack. Photographs and evidence from video connect the diagrams to observed battlefield use.

The story starts with an individual drone, moves out to the nearby battlefield, and then shows the wider geography of long-range strikes. This gives numbers such as range, cost, and payload a context. On mobile, wide scenes become vertical sequences, with labels reduced or moved so the explanation stays in the same order.

<!-- Add one or more representations here.

Suggested material:
- an overview showing different drone roles;
- a range or scale comparison;
- a scroll sequence explaining the reconnaissance-to-strike process.

![Figure 5 — Reuters drone system](images/web-1-reuters-drone-system.png)
![Figure 6 — Reuters range comparison](images/web-1-reuters-drone-range.png)
-->

### What we can learn from it

A table could compare drone models, costs, speeds, payloads, and ranges. The diagrams help us see **how their roles depend on one another**: reconnaissance drones locate activity, communications pass on the information, artillery or attack drones respond, and longer-range systems reach beyond the front. Their battlefield effect depends on how these roles work together.

The changes in scale also help us understand distance. “Ten kilometres” or “several hundred kilometres” becomes a visible relationship between the front line, command infrastructure, cities, and launch or target areas. We can distinguish tactical drones used near soldiers from strategic systems able to reach far behind the front.

Putting observation, decision, and attack in one sequence shows how inexpensive aerial systems can shorten the time between spotting a target and acting on the information. It also shows the imbalance between relatively cheap devices and potentially high-value targets. These relationships would be hard to pick up from a specification table.

#### From raw information to the finished piece

1. Reuters gathers video evidence, technical research, interviews, and specifications.
2. The material is checked and organized by drone type, function, range, and stage of use.
3. Journalists select representative examples from the evidence archive.
4. Technical details become diagrams, maps, size and distance comparisons, and a step-by-step account of operations.
5. Scrolling reveals the information in an order that guides the explanation.

#### Audience and format

Readers follow an explanation chosen by the journalists. Short passages, animation, and responsive graphics make the military system understandable without specialist knowledge. The story offers more detail than a social post and more guidance than a research dashboard, where users would choose their own questions and filters.

### Sources and tools

- **Information sources:** analysis of more than 50 drone-attack videos, UAV research, and interviews with more than a dozen manufacturers, soldiers, and officials.
- **Representation tools:** custom responsive graphics, labelled illustrations, maps, animation, and scroll-driven transitions. Reuters does not publicly list every software library used on the page.
- **Primary source:** [Reuters visual investigation](https://www.reuters.com/graphics/UKRAINE-CRISIS/DRONES/dwpkeyjwkpm/).

---

## Responsive Web Article 2

| **Title** | **Author(s)** | **Description** | **Link** |
|---|---|---|---|
| *How Ukraine Has Faced Its Worst Month on the Battlefield in Two Years — Visualised* | Ed Gargan, Pablo Gutiérrez, and Ashley Kirk; design by Prina Shah | A series of charts and maps for desktop and mobile showing Russian territorial gains in Ukraine in 2024, with a focus on November. | [The Guardian article](https://www.theguardian.com/world/ng-interactive/2024/dec/04/how-ukraine-faced-worst-month-battlefield-in-two-years-visualised) |

### Context

The article was published in December 2024, after Ukraine lost more territory in November than in any month since September 2022. The authors look at how those losses compare with earlier months, where they happened, and what the captured land contained, so readers can judge what the area totals mean strategically.

The main source is the Institute for the Study of War's daily control-of-terrain files. These distinguish areas under control, contested areas, and areas where advances have been recorded.

### How it works

The article combines a **time series of territorial change** with **annotated control-of-terrain maps**. The chart lines up the months on one time axis and shows the amount of land gained or lost. This makes faster changes and unusually large monthly losses easy to spot. A note highlights November 2024.

The maps show what those square kilometres look like on the ground. Colour distinguishes control, advances, and contested areas. Regional boundaries locate the changes, while settlement labels and infrastructure references help explain their strategic importance. The story moves from Ukraine as a whole to Donetsk and then to individual advances, connecting the national totals to local places.

The order of the story connects the two views. First, the time series shows *when the change became exceptional*. Then, the maps explain *where it happened and what was in the captured area*.

<!-- Add one or more representations here.

Suggested material:
- monthly territorial-change chart;
- regional map of gains in Donetsk;
- comparison between land area and the location of major settlements or infrastructure.

![Figure 7 — Monthly territorial change](images/web-2-guardian-monthly-change.png)
![Figure 8 — Territorial gains map](images/web-2-guardian-map.png)
-->

### What we can learn from it

A table can tell us that Russia captured approximately 1,202 square kilometres in November 2024. The chart shows why that number matters: it stands out from the surrounding months and marks Ukraine's worst monthly territorial loss in roughly two years.

The maps add context to that total. Most of the change happened in Donetsk, and much of the area was agricultural land, forest, or fields rather than major cities or transport hubs. We can see that **the amount of land gained and its strategic value are related, but they are not the same thing**.

The shape of the advances also tells us how the losses happened. The 1,202 square kilometres were gained through several gradual, uneven movements. Looking at the chart and maps together, we can see that November brought severe losses in area, while the consequences depended on where those losses occurred, the settlements involved, and their distance from strategically important places.

#### From raw information to the finished piece

1. Daily territorial-control files come from the Institute for the Study of War.
2. Mapped control areas, stored as polygons, are compared across dates to estimate gains and losses.
3. Changes are grouped by month and region.
4. Settlement and infrastructure information adds context, helping distinguish rural land from strategic locations.
5. The article arranges charts and maps so readers move from the headline trend to a more detailed geographic explanation.

#### Audience and format

The article gives citizens and professionals a clear account of a changing battlefield. It simplifies the daily control files while keeping the difference between area gained and strategic importance visible. Desktop readers get more detail, and mobile readers can follow the charts and maps in a vertical sequence.

### Sources and tools

- **Data:** daily control-of-terrain files from the Institute for the Study of War.
- **Transformations:** comparing polygons, estimating land area, grouping changes by month and region, and adding settlement context.
- **Representation tools:** custom responsive charts, annotated maps, and editorial text. The article does not list all the libraries used to make it.
- **Primary source:** [The Guardian visual article](https://www.theguardian.com/world/ng-interactive/2024/dec/04/how-ukraine-faced-worst-month-battlefield-in-two-years-visualised).

---

## Instagram Post 1

| **Title** | **Author(s)** | **Description** | **Link** |
|---|---|---|---|
| *The 50 Countries Most Impacted by Violent Conflict* | Powerful Countries; data source: ACLED Conflict Index | An Instagram map based on the ACLED Conflict Index, showing the fifty countries and territories most affected by violent conflict. | [Instagram post](https://www.instagram.com/p/DMMMCKBsBXP/) |

### Context

ACLED records political violence with details such as dates, locations, actors, event types, and fatalities. The Conflict Index brings these records together into four dimensions: deadliness, danger to civilians, geographic diffusion, and armed-group fragmentation.

The Instagram account Powerful Countries turns that detailed analysis into a world overview that people can take in quickly while scrolling their feed.

### How it works

The main image is a **categorical world map**. Each country stays in its geographic position, while colour and emphasis identify the fifty countries and territories included in the Conflict Index and distinguish their conflict severity. Areas outside the selection are muted, helping the highlighted regions stand out on a phone screen.

A small set of colours, a compact legend, a clear headline, and a few labels make the map quick to read. Viewers can first take in the worldwide pattern, then check labels or the caption for individual countries and the dimensions behind the ranking.

The map gives an overview, with an important limitation: country size determines how much space it takes up. Colour shows its conflict category. A large country can therefore draw more attention even if its index value isn't proportionally higher.

<!-- Add one or more representations here.

Suggested material:
- the lead map;
- additional carousel slides explaining the index dimensions or leading countries, if present.

![Figure 9 — ACLED Conflict Index Instagram map](images/instagram-1-acled-conflict-index.png)
-->

### What we can learn from it

The map helps us see **where affected countries cluster and which ones are neighbours**. In a ranked table, each country appears as a separate entry. On the map, regional groups and connected cross-border zones become visible. The highlighted and blank areas also show how unevenly conflict burden is spread around the world.

These patterns invite questions about what nearby conflicts may share: regional conditions, armed groups operating across borders, refugee movements, or effects on neighbouring countries’ security. Those connections are harder to notice in a sorted list.

Reading the legend and the index behind it also makes clear that severity has several dimensions. A country may be included because violence is especially deadly, widely spread, dangerous to civilians, fragmented among armed groups, or severe across several of these measures. The map helps us spot patterns, but it can't tell us why two countries received a similar colour. For that, we need the four index components.

#### From raw information to the finished piece

1. ACLED codes events by date, location, event type, actors, fatalities, and civilian targeting.
2. The Conflict Index methodology brings these events together.
3. Countries are assessed for deadliness, civilian danger, geographic diffusion, and fragmentation.
4. The top fifty are selected and shown on a simplified categorical world map.
5. Labels and short text explain the main message without displaying the full event-level dataset.

#### Audience and format

Someone browsing Instagram should be able to recognize and remember the main pattern quickly. The post uses a clear visual hierarchy and one central message to make that possible. Details about the method sit in the caption or linked ACLED material. This speeds up reading, but leaves less room to inspect uncertainty or individual events.

### Sources and tools

- **Data and method:** ACLED event records and the ACLED Conflict Index.
- **Indicators:** deadliness, danger to civilians, geographic diffusion, and armed-group fragmentation.
- **Representation tools:** static social-media maps and graphic design. The exact software is not publicly documented.
- **Sources:** [Instagram post](https://www.instagram.com/p/DMMMCKBsBXP/) and [ACLED Conflict Index](https://acleddata.com/series/acled-conflict-index).

---

## Instagram Post 2

| **Title** | **Author(s)** | **Description** | **Link** |
|---|---|---|---|
| *25 Years On: The Human Toll of 9/11* | Forbes India / Network18 Creative | A pictogram comparison of estimated deaths in post-9/11 wars, the Vietnam War, the Korean War, and the 1991 Gulf War, marking the 25th anniversary of the September 11 attacks. | [Instagram post](https://www.instagram.com/p/DdJcYNuMyWO/) |

### Context

War-death estimates usually come in reports and tables that separate conflicts, periods, direct violent deaths, and indirect deaths from disease, malnutrition, displacement, or infrastructure collapse. Those distinctions matter. But for a general reader, a table doesn't immediately show how the scale of one war compares with another.

Forbes India published the post on 11 September 2026, marking the 25th anniversary of the September 11 attacks. It compares estimated deaths in major wars involving the United States since 1945. The image names Brown University's Costs of War project, US government data, and Reuters as its main sources.

### How it works

The graphic places four estimated death ranges alongside one another in a horizontal layout:

- **post-9/11 wars:** 4.5–4.7 million;
- **Vietnam War:** approximately 3 million or more;
- **Korean War:** approximately 2.5–3 million;
- **1991 Gulf War:** approximately 143,000–206,000.

Each estimate comes with a block of repeated human pictograms and a documentary photograph. The blocks differ in size, with post-9/11 wars highlighted in red and the historical comparisons in grey. A side panel covers illnesses among 9/11 responders and survivors, including more than 9,000 deceased members of the World Trade Center Health Program.

The layout works for a phone screen. The title introduces the point, the numbers keep the ranges visible, and the blocks of figures give a quick sense of scale. The image doesn't state a fixed value for each icon, so the figures are a proportional comparison with a human reference, rather than a literal one-symbol-per-person chart.

The numbers, pictograms, and photographs each have a role. Readers can check the values or ranges, compare the size of the groups, and connect them to recognizable historical conflicts. The red/grey contrast draws attention to post-9/11 deaths before the historical comparisons.

<!-- Add one or more representations here.

Suggested material:
- the complete pictogram comparison with all four war estimates;
- a detail showing the post-9/11 estimate, source note, and the side panel on responder and survivor illnesses.

![Figure 10 — Human toll of major US-involved wars](images/instagram-2-human-toll-overview.png)
![Figure 11 — Post-9/11 estimate and source detail](images/instagram-2-human-toll-detail.png)
-->

### What we can learn from it

The blocks make the differences in scale visible at a glance. Post-9/11 wars form the largest group, followed by Vietnam and Korea, while the 1991 Gulf War is much smaller. Highlighting post-9/11 wars in red also makes clear which consequence the post wants readers to focus on.

The graphic brings in deaths that a battle-death table might leave out. Damaged healthcare, hunger, disease, and infrastructure collapse keep causing deaths beyond direct violence. Including these indirect deaths is why the post-9/11 estimate is so large. The comparison helps us see both the scale of loss and how much the definition behind an estimate matters.

We still need to read the comparison carefully. The conflicts lasted for different periods, and the post-9/11 total explicitly includes direct and indirect deaths. The pictograms make a persuasive ranking, but only the printed ranges show uncertainty. The image also doesn't fully establish whether the historical estimates use equivalent methods.

#### From raw information to the finished piece

1. Death estimates come from Brown University's Costs of War project, US government data, and Reuters reporting.
2. Four major categories of wars involving the United States are chosen for comparison.
3. Point estimates and uncertainty ranges are shortened into labels that fit a phone screen.
4. Repeated human pictograms, exact numerical labels, colour, and documentary photographs show the quantities.
5. A separate callout adds long-term deaths associated with illnesses among 9/11 responders and survivors.
6. A footnote explains that post-9/11 deaths include direct violent deaths and indirect deaths from war-related disease, malnutrition, and infrastructure collapse.

#### Audience and format

The post is meant for citizens coming across the subject in a social feed. A familiar anniversary, human figures, contrasting colours, and a few comparisons make numbers in the millions easier to grasp within seconds. Photographs provide historical context, while the ordered blocks and printed ranges carry the numerical comparison.

This makes the comparison memorable, but leaves little space to explain the methods. The source line and the footnote about direct and indirect deaths are essential. Readers who want to reuse the figures should check the underlying Costs of War research.

### Sources and tools

- **Sources named in the image:** Brown University's Costs of War project, US government data, and Reuters.
- **Transformations:** choosing conflicts, combining direct and indirect deaths, simplifying ranges, and scaling the pictograms.
- **Representation tools:** a static editorial infographic with repeated symbols, typography, colour, and documentary photographs. The software is not disclosed.
- **Primary source:** [Forbes India Instagram post](https://www.instagram.com/p/DdJcYNuMyWO/).
- **Supporting source:** [Brown University Costs of War](https://watson.brown.edu/costsofwar/).
- **Critical limitation:** the categories cover different periods, and the post does not establish that every estimate uses the same method. It is an overview of orders of magnitude, rather than a precise statistical ranking.

---

## X Post 1

| **Title** | **Author(s)** | **Description** | **Link** |
|---|---|---|---|
| *In Three Years of War, Almost 7 Million Ukrainians Have Fled* | Statista | An X post with a horizontal bar chart comparing the countries with the most registered refugees from Ukraine, using UNHCR data. | [Post on X](https://x.com/StatistaCharts/status/1894411533658001761) |

### Context

Russia's full-scale invasion of Ukraine forced large numbers of people to cross borders. UNHCR records refugee populations by host country and reporting date. Statista uses those records for a compact ranking on X, letting readers compare countries quickly while retaining the exact figures found in the tables.

The post was published on 25 February 2025, three years after the full-scale invasion. It reports almost 7 million registered refugees in Europe and elsewhere and highlights the countries with the largest registered populations.

### How it works

The attached image is a **ranked horizontal bar chart**. Country names line up on the left, and all bars use the same numerical scale. Bar length shows the number of registered refugees, end labels give exact values, and ordering the bars from largest to smallest makes the ranking easy to follow.

Germany, Russia, and Poland clearly form the leading group. Their bars are much longer than those for the Czech Republic, followed by the United Kingdom, Spain, Romania, Italy, and Slovakia. An overall total and a small directional Ukraine icon add context without taking attention away from the country comparison.

The horizontal layout leaves room for readable country names and large values while fitting the whole ranking into one mobile image. A short source and date note at the bottom tells readers where the figures came from.

<!-- Add one or more representations here.

Suggested material:
- screenshot of the complete X post;
- crop of the attached horizontal bar chart with source and date note visible.

![Figure 12 — Countries hosting the largest numbers of Ukrainian refugees](images/x-1-statista-ukraine-refugees.png)
-->

### What we can learn from it

The bars make the **shape and tiers** of the distribution easy to see. Germany, Russia, and Poland each have roughly one million or more registrations. There is then a sharp drop to the Czech Republic, which forms a second tier, followed by much smaller totals for the other displayed countries. These gaps are easier to spot in bar lengths than in a column of numbers.

The overall total could hide how uneven the distribution is. A few countries account for a large share of the registrations shown. This raises questions about how the counts compare with host populations and how they have changed over time, neither of which this absolute-count chart answers.

The footnote matters here: the country figures don't all refer to the same reporting date. Russia's figure is older than most of the others. The chart is still useful for an approximate ranking, but small differences shouldn't be treated as exact comparisons at the same point in time.

#### From raw information to the finished piece

1. UNHCR country-level records are selected for refugees displaced from Ukraine since 24 February 2022.
2. Reporting dates are aligned where possible, with exceptions noted in the footnote.
3. Countries are ranked by the number of registered refugees.
4. The largest destinations are shown as aligned horizontal bars.
5. Exact values, an overall total, and a short source note make the image understandable on its own.

#### Audience and format

The post fits how people use X: it is topical, quick to read, and easy to share. A large operational dataset becomes an answer to one question—where refugees were registered. Readers can see the pattern without opening another page, and the source and date notes give them a way back to the evidence. The chart leaves out trends, counts relative to host populations, and uncertainty in registration figures.

### Sources and tools

- **Data:** UNHCR refugee-registration records for people displaced from Ukraine.
- **Transformations:** grouping records by country, ranking counts from largest to smallest, choosing the leading destinations, and drawing horizontal bars.
- **Representation tools:** a static Statista social-media chart. The production software is not specified.
- **Sources:** [X post](https://x.com/StatistaCharts/status/1894411533658001761) and the [UNHCR Ukraine Refugee Situation portal](https://data.unhcr.org/en/situations/ukraine).
- **Date note:** most figures cover 16 December 2024 to 16 February 2025, while Russia's figure is reported to 30 June 2024. The image makes this difference in reporting dates visible.

---

## X Post 2

| **Title** | **Author(s)** | **Description** | **Link** |
|---|---|---|---|
| *UCDP Candidate Events Data: Lethal Events at PRIO-GRID Level* | Uppsala Conflict Data Program | An X post announcing updated candidate-event data and showing lethal organized violence on a standardized spatial grid. | [Post on X](https://x.com/UCDP/status/1883788484592415223) |

### Context

UCDP Candidate Events provide near-real-time records that have not yet gone through the full annual release process. An event may include a date, location, actors, type of organized violence, and estimated fatalities. There are too many records to show individually in a post, and a global total would lose the geographic pattern.

The post groups lethal events into PRIO-GRID cells, using the same spatial unit around the world to give readers a quick map update.

### How it works

The image is a **gridded event map**. Each event with a location is assigned to a PRIO-GRID cell. These cells provide a common spatial unit, instead of grouping events by country, province, or named place. Filled cells or changes in intensity show where lethal organized violence was recorded during the stated period.

Every cell follows the same processing rule, which makes the pattern easier to compare. Nearby active cells can form concentrations, corridors, isolated incidents, or wider zones of activity. The world map helps readers locate them, while a simple legend and short notes keep the image readable in the X feed.

Grouping events this way allows several records to share one cell. Nearby events become a pattern rather than overlapping dots. Readers who need individual events or more detailed attributes can follow the link to the higher-resolution product.

<!-- Add one or more representations here.

Suggested material:
- screenshot of the X post;
- higher-resolution version of the PRIO-GRID event map.

![Figure 13 — UCDP lethal candidate events map](images/x-2-ucdp-candidate-events.png)
-->

### What we can learn from it

The map shows **where violence gathers, spreads, and connects across space**. A table of coordinates identifies individual events. Here, adjacent active cells help us see whether lethal violence forms one dense hotspot, separate conflict areas, a cluster crossing a border, or a long corridor.

The grid doesn't stop at administrative borders. That helps us notice cross-border connections and conflict zones near the edges of countries or provinces. It is especially useful where armed activity follows terrain, trade routes, ethnic regions, or front lines rather than formal boundaries.

The grouping also limits what we can learn. The map doesn't show who was responsible, whether one cell contains several incidents, or how uncertain the original coordinates might be. It helps us understand *where violence clusters*, but leaves questions about *who acted, why, and what happened in each event* open.

#### From raw information to the finished piece

1. Candidate events are filtered to the reporting period and to lethal organized violence.
2. Their coordinates are assigned to PRIO-GRID cells.
3. Events or fatalities are grouped within each cell.
4. The worldwide pattern is shown with a simple legend and short notes.
5. The post links the condensed map to downloadable or higher-resolution material.

#### Audience and format

Citizens, journalists, and researchers following new releases can take in one geographic finding and then go straight to the underlying data. The post reads like a research announcement: current, concise, and clear about its source. That gives it a different tone from the selected Instagram examples.

### Sources and tools

- **Data:** the UCDP Candidate Events Dataset.
- **Spatial framework:** PRIO-GRID, a standardized global grid used in conflict research.
- **Transformations:** filtering by time and fatalities, assigning coordinates to cells, and grouping events by location.
- **Representation tools:** a static map. The software used to make it is not specified.
- **Primary source:** [UCDP post on X](https://x.com/UCDP/status/1883788484592415223).

---

## Alternative Paradigm Representation 1

| **Title** | **Author(s)** | **Description** | **Link** |
|---|---|---|---|
| *Russia Bombs Ukraine Almost Every Night. This Is What It Sounds Like.* | *The Washington Post*: Lizzie Johnson, Serhii Korolchuk, Anastacia Galouchka, Kostiantyn Khudov, Ed Ram, Yutao Chen, Júlia Ledur, Bishop Sand, and collaborators | A 2025 interactive story about nights of aerial war, combining recordings, scroll-driven audio, drone-launch charts, loudness comparisons, and air-raid-siren durations. | [Interactive article](https://www.washingtonpost.com/world/interactive/2025/ukraine-bombing-sounds-war-sirens-russia/) |

### Context

By 2025, Russian drone and missile attacks had made sirens and explosions recurring sounds of life in Ukraine. Counts of drones, missiles, interceptions, and alarm durations show how attacks escalated. They are harder to use to understand what repeated nighttime attacks sound and feel like.

The Washington Post combines data with recordings from the field and audio that plays as readers scroll. Sound is part of the evidence and explanation, which places this example among the alternative approaches. Readers hear the environment of an attack alongside seeing how often attacks occurred.

### How it works

The experience asks readers to turn on the sound and listen as they scroll. Recorded explosions, drones, and warning sirens accompany the story and graphics, including:

- a weekly time series of drone launches from January 2024 to July 2025;
- daily comparisons of drones launched, shot down, and jammed;
- comparisons between the perceived loudness of war sounds and familiar everyday sounds;
- timelines showing how many hours air-raid sirens lasted during the day and at night;
- photographs, maps, notes, and testimony that connect the sounds to the places where people live.

This is an **interactive sonic or aural data narrative**. It combines quantitative graphics with documentary recordings. It is not pure algorithmic sonification, which would translate numerical values directly into sounds such as pitch or rhythm.

The story moves between three scales. Charts covering several months show the escalation. Daily graphics distinguish launches from interceptions and jamming. Sound and testimony bring readers back to one night and its duration. Scrolling keeps these layers together, and an audio control lets readers choose when to listen.

<!-- Add one or more representations here.

Suggested material:
- opening audio-enable interface;
- weekly drone-launch time series;
- loudness comparison or day/night siren-duration graphic.

![Figure 14 — Audio-enabled opening](images/alternative-1-ukraine-audio-opening.png)
![Figure 15 — Drone and siren data views](images/alternative-1-ukraine-sonic-data.png)
-->

### What we can learn from it

The time series shows a sharp rise in drone launches. The daily graphics separate “launched,” “intercepted,” and “reached the defended area,” helping readers distinguish the size of an assault from the number of weapons that get through the defenses.

The siren timelines show **how much time alarms take up**, or temporal saturation. People may spend hours uncertain whether an alarm will end quietly or with an impact. Separating day and night makes the disruption to sleep and ordinary routines visible in a way that a daily total cannot.

Hearing the sounds adds something a table cannot provide. Loudness, repetition, mechanical drone tones, sirens, and sudden explosions give a bodily sense of distance and threat. Comparing them with familiar sounds provides a reference, while the recordings keep loudness measurements connected to the experience they describe.

Taken together, the charts and recordings show attacks becoming more frequent, occupying more of the night, and repeatedly putting civilians on alert. They also show how the acoustic environment persists even when many drones are intercepted. This helps readers understand the escalation as an experience of daily life.

#### From raw information to the finished piece

1. Ukrainian armed-forces reports provide dates and counts of Russian drone launches and defensive outcomes.
2. Alarm records from Ukrainian authorities provide the timing and duration of air-raid sirens.
3. Documentary teams record attacks, drones, alarms, testimony, and affected places.
4. Loudness references and comparisons put the recorded sounds in context.
5. The numerical series become line charts, daily-status graphics, and duration graphics.
6. Scrolling brings together the charts, text, images, and audio, connecting measurements with what readers hear.

#### Audience and format

The piece is made for a broad international audience on desktop and mobile. Readers take part by scrolling and listening. The charts allow numerical comparison, and the audio makes the consequences easier to remember and feel. Headphones or speakers help with the intended experience, and the intensity of the sounds calls for clear audio controls.

### Sources and tools

- **Data:** Russian drone-launch and defensive-outcome counts reported by the Ukrainian armed forces; air-raid-siren records from Ukrainian authorities; and loudness references from the World Health Organization.
- **Documentary sources:** original reporting, field recordings, photography, and testimony from Ukraine.
- **Transformations:** grouping figures by week and day, comparing launches and interceptions, calculating alarm duration, comparing perceived loudness, and arranging the story.
- **Representation tools:** responsive scrollytelling, interactive audio, documentary recordings, line and duration charts, maps, photography, and notes.
- **Primary source:** [The Washington Post interactive](https://www.washingtonpost.com/world/interactive/2025/ukraine-bombing-sounds-war-sirens-russia/).

---

## Alternative Paradigm Representation 2

| **Title** | **Author(s)** | **Description** | **Link** |
|---|---|---|---|
| *War Up Close — VR Museum of the War in Ukraine* | Mykola Omelchenko with Discover.ua, FreegenGroup, and project collaborators | A virtual-reality and immersive exhibition showing war damage in Ukrainian cities through 360-degree panoramas, drone footage, photogrammetry, and 3D models. | [Official project](https://warupclose.com/) |

### Context

The project documents the physical effects of Russia's full-scale invasion of Ukraine: damage to residential buildings, infrastructure, streets, monuments, and public spaces. People can view the material online, through VR headsets, and in travelling exhibitions.

Its focus is the view from inside damaged places. Recording those views preserves spatial evidence for memory, communication, assessment, and possible reconstruction. Comparing event frequencies is not its main purpose.

### How it works

The project uses an **immersive spatial representation**. A 360-degree panorama places photographs all around the viewer, who can look in different directions by moving their head or pointer. This puts them inside the documented location, with a view they can explore.

Panoramas show how floors, façades, rooms, streets, vehicles, debris, and neighbouring buildings connect. Hotspots or tour links move viewers between capture positions. Photogrammetric or laser-scanned 3D models add depth and geometry they can navigate, while drone footage gives a view from above.

Each view shows a different scale. Aerial imagery reveals the extent of damage, street-level panoramas help viewers find their bearings and judge proximity, and detailed models preserve surfaces and structural form. In an exhibition, a headset, surrounding projection, physical objects, or themed installation can make the experience more physical.

<!-- Add one or more representations here.

Suggested material:
- screenshot from a 360-degree panorama;
- a 3D reconstruction or drone view;
- photograph of a visitor using the VR exhibition.

![Figure 16 — War Up Close panorama](images/alternative-2-war-up-close-panorama.png)
![Figure 17 — War Up Close exhibition](images/alternative-2-war-up-close-vr.png)
-->

### What we can learn from it

A table can record a location, coordinates, date, building type, and damage category. The immersive view shows **how the damage is arranged**. Viewers can see whether it affects one façade or continues through nearby rooms and buildings, how debris fills streets, and how damaged structures relate to surrounding homes, public spaces, and infrastructure.

Moving between aerial and ground-level views helps with orientation and scale. From above, viewers can take in an affected neighbourhood. Within a panorama, they see its walls, rooms, roads, and sight lines. A label such as “residential building destroyed” becomes easier to understand as a place.

The views also preserve details that a damage category leaves out: blast direction, exposed interiors, the density of nearby buildings, distances between structures, and which damaged and standing elements remain alongside one another. These observations can support memory, testimony, public understanding, and later assessment questions.

The detail tells us about the places shown. A tour can document selected sites closely, but it doesn't tell us how common that level of damage is across the whole war zone. We learn *what these documented places are spatially like*, without being able to infer the overall frequency of each damage category.

#### From raw information to the finished piece

1. Teams obtain access and permission to document affected sites.
2. They take 360-degree images and conventional photographs, record drone video, and capture spatial scans.
3. Images are stitched into panoramas. Laser scanning and photogrammetry produce 3D models where appropriate.
4. Sites are arranged into virtual tours and immersive exhibition sequences.
5. The material is shared through browsers, Google Street View or Maps, VR headsets, immersive theatres, and travelling exhibitions.

#### Audience and format

The project is mainly for the international public, including people far from Ukraine. It lets them look around documented places as active observers. The experience supports a sense of presence, spatial understanding, memory, and testimony, while giving up the speed of comparison that a statistical view would offer.

Immersion can make the emotional impact stronger. The presentation should give clear context, warn about disturbing material, explain where the evidence comes from, and take care not to turn suffering into spectacle.

### Sources and tools

- **Information sources:** documentary photographs and videos taken at damaged sites in Ukraine.
- **Capture tools:** high-resolution 360-degree cameras, drones, laser scanning, and photogrammetry.
- **Delivery tools:** 3D modelling, virtual-tour software, Google Street View or Maps, VR headsets, browser-based panoramas, and immersive exhibition spaces.
- **Creators and partners:** Mykola Omelchenko, Discover.ua, FreegenGroup, and public-agency and exhibition partners.
- **Sources:** [official project](https://warupclose.com/), [project and production description](https://onova.org.ua/en/projects/the-war-up-close-project), and [exhibition overview](https://victimsofcommunism.org/event/war-up-close/).

---

## Cross-Format Comparison

The ten examples show how much the treatment of war-related information depends on who will see it and what they are expected to do with it.

| **Format** | **Main audience** | **How it treats raw information** | **How it presents the information** | **What the audience is expected to do** | **What we can learn** |
|---|---|---|---|---|---|
| Scientific paper | Researchers and domain experts | Keeps variables, methods, uncertainty, alternatives, and source history | Coordinated views, method diagrams, interaction, and checks of parameter settings | Compare, question, validate, and reproduce | How data or results were built and how assumptions affect them |
| Responsive web article | Citizens, professionals, and researchers | Selects evidence and reveals it step by step | Scroll-driven explanations with responsive maps, charts, diagrams, and notes | Follow the story and examine selected evidence | How something unfolds, works, or varies over time and space |
| Instagram | Citizens and the broad public | Reduces evidence to one main message or a short carousel | A clear visual hierarchy and a simplified map or chart that fits a phone screen | Quickly recognize and remember a pattern | A striking comparison, geographic pattern, scale, or consequence |
| X | Citizens, journalists, and people following the news | Focuses on a current period, release, or observation | One compact visual claim, ranked bar chart, or map | Notice, understand, share, and follow the source | What changed, how cases compare, where activity clusters, or why an update matters |
| Alternative paradigm | Visitors and the general public | Combines data or documented places with sound, immersion, and sensory experience | Interactive audio, VR, 360-degree media, documentary recordings, and scrollytelling | Hear or experience duration, magnitude, proximity, or place | What repeated attacks or damaged environments mean at a human scale |

### How each format handles the information

Scientific papers treat data as **evidence we can inspect**. They keep enough detail for other researchers to question the method and judge the conclusion. VEHICLE shows overlap between sources and sensitivity to settings. The topic-driver framework’s Cluster View shows ambiguous word matches and lets experts decide which associations belong in the analysis.

Responsive web articles turn data into **something the reader can follow and understand**. Reuters and *The Guardian* choose the evidence and the order in which it appears. Readers get more depth than a social post offers, with an editorial story guiding how far and in which directions they explore.

Instagram turns data into **a message people can quickly recognize and remember**. A post has to work on a small screen among unrelated content, so it reduces the detail and gives the main point visual priority. In these examples, the map shows geographic concentration and the pictograms show order of magnitude. Definitions still need to be available in the image, caption, or linked source, especially the difference between direct and indirect war deaths.

X turns data into **a compact finding about a current topic**. Ranked bars or a new map can spread quickly among citizens, journalists, and researchers. A focused question and clear claim help people understand an update, but the reporting date, denominator, and source must stay visible for the comparison to be valid.

Alternative approaches turn data or documentary evidence into **an experience**. The Washington Post lets readers hear the repetition, loudness, and duration of aerial attacks. *War Up Close* lets them look around damaged environments. Alongside numerical comparison, these formats help us understand how time is taken up by danger, how places connect, and how close the effects can feel.

### What each example helps us see

| **Case study** | **How it shows the information** | **What it helps us understand** |
|---|---|---|
| VEHICLE | Repeated histograms show parameter combinations; linked map and time views show events; stacked bars and a radial tree show source and classification makeup | Whether integration is stable, where sources disagree systematically, and whether good overall matching hides failures in a region or category |
| Topic-driver framework, Figure 10 | Circle sizes show word frequency; colour shows the starting concept; distance and groups show related meanings; a selection box holds accepted terms | Which automated associations fit the intended meaning, which are ambiguous, and why the proposed drought–civilian-abuse link is weak |
| Reuters drone investigation | Scroll-driven diagrams, maps, arrows, and labelled images show drone roles, ranges, scale, and operational stages | How drones work together from reconnaissance to strike, how tactical and strategic ranges differ, and how the sensor-to-strike process gets shorter |
| *The Guardian* territorial-change story | A shared time axis shows monthly change; coloured areas and notes show control and advances | Why November 2024 stood out, where changes happened, and why area gained does not directly tell us strategic value |
| ACLED Conflict Index Instagram map | Location identifies countries; colour and emphasis show inclusion and severity | Where severe conflicts cluster within regions and across borders, and how similar classifications can reflect different measures of severity |
| Forbes India human-toll pictogram | Printed values and repeated figures show death ranges; red/grey contrast and photographs guide attention | How the selected wars differ in order of magnitude, and how including indirect deaths shapes the post-9/11 estimate |
| Statista Ukrainian-refugee chart | Aligned horizontal bars, descending order, and exact labels show host-country counts | How registrations concentrate in the leading countries, how sharply counts drop after the top three, and how different reporting dates affect comparison |
| UCDP candidate-events grid map | Lethal events are grouped into uniform spatial cells | Hotspots, corridors, isolated conflict areas, and cross-border patterns that are harder to spot in coordinates or country totals |
| Washington Post sonic narrative | Charts and documentary audio show attack frequency, interceptions, loudness, and siren duration together | How escalation affects sound and time, through disrupted nights, uncertainty during alarms, and continued threat even when drones are intercepted |
| *War Up Close* | Navigable 360-degree panoramas, aerial footage, and reconstructed 3D geometry show damaged sites | How damaged rooms, buildings, streets, and neighbourhoods connect, and their orientation and proximity, without assuming they are statistically representative |

### General conclusion

The same kinds of records—dates, locations, actors, event types, fatalities, displacement status, territorial control, or damage categories—can become very different representations. Simplifying them is not automatically a weakness. It becomes a problem when the missing information is needed to interpret the claim responsibly.

Choosing a design means thinking beyond which chart fits the data:

> **Who is going to see this, what should they learn or be able to do, and what context do they need to interpret it properly?**

Whatever the format, readers should be able to see where the information comes from and which period it covers. Observations and estimates should be clearly distinguished, and fatality figures should not look more precise than the sources allow. Terms such as civilian targeting and territorial control need clear definitions. Emotional imagery also needs care, so that suffering does not become spectacle.
