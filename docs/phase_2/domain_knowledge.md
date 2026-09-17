# Phase 2 — Domain Knowledge: Representing War Across Media

## Project Requirements

This phase examines how war-related information is transformed into representations for different media and audiences. The aim is not only to collect examples, but to understand how each format selects, aggregates, encodes, and explains raw information.

The review includes:

- two papers published in peer-reviewed international journals or conferences, aimed primarily at researchers;
- two articles delivered through responsive websites for desktop and mobile devices, aimed at professionals, researchers, and citizens;
- two Instagram posts, aimed primarily at citizens;
- two posts on X, aimed primarily at citizens and news-oriented audiences;
- two representations based on alternative paradigms, such as virtual reality or a physical public installation.

For every case study, the analysis reports:

- the title, author or publisher, and link;
- the context in which the representation was produced;
- the representation technique and visual encoding;
- the knowledge gained from the representation that would not be immediately visible in a table;
- the transformation from raw information to the final representation;
- the relationship between format, audience, and communicative purpose;
- the information sources and production tools, when publicly documented.

The central analytical model used throughout the report is:

> **raw information → selection and transformation → visual encoding → audience task → knowledge gained**

The analytical priority in every case study is the relationship between **representation** and **knowledge**. The report therefore first identifies the marks, spatial arrangements, visual variables, interaction techniques, narrative sequence, or sensory channels used. It then asks what pattern, relationship, hierarchy, uncertainty, or lived quality becomes perceptible through those choices. Context, data preparation, audience, and tools are retained as supporting information rather than treated as the main result.

A dataset does not determine a single visualization. The same records can support a complex research interface, a guided web story, a compact social-media graphic, or an embodied installation. What changes is the audience, the time available for interpretation, the degree of interactivity, and the purpose of the representation.

---

## Paper 1

| **Title** | **Author(s)** | **Description** | **Link** |
|---|---|---|---|
| *VEHICLE: Validation and Exploration of the Hierarchical Integration of Conflict Event Data* | Benedikt Mayer, Kai Lawonn, Karsten Donnay, Bernhard Preim, and Monique Meuschke | A visual-analytics system for validating the integration of conflict-event datasets from different institutions. Published in *Computer Graphics Forum*, 40(3), 2021. | [Paper and DOI](https://doi.org/10.1111/cgf.14284) |

See the local copy of the paper [here](papers/vehicle-conflict-event-data.pdf).

### Context

Conflict researchers often combine event records collected by different organizations. A single real-world incident may appear in more than one database, but with different dates, locations, actor names, event categories, or geographic precision. Conversely, one source may record incidents that another source omits.

The paper studies the output of MELTT, a semi-automatic matching procedure that integrates multiple conflict datasets through spatial and temporal thresholds and hierarchical taxonomies. The resulting matches are sensitive to the selected parameters. A conventional table can list matched records, but it does not make the global structure, source overlap, or parameter sensitivity easy to assess.

VEHICLE was designed for conflict researchers who need to validate the integration process before using the merged data in subsequent statistical analysis.

### Representation used

**Description:** The interface uses a **multiple-coordinated-view** representation. No single chart is expected to answer whether two conflict databases describe the same events; instead, each view exposes a different dimension of the matching problem and all views update together.

- **ParaMultiples** represents the parameter space as a matrix of small histograms. Position identifies a particular combination of spatial and temporal thresholds, while the distribution inside each cell shows how many matches and match qualities that setting produces. Repetition makes neighbouring settings visually comparable.
- **TempMap** combines geographic position with a radial temporal histogram. Map marks answer *where* candidate events occur, while the circular time display answers *when* they occur. Selection connects the two dimensions rather than forcing the analyst to compare separate tables.
- **EventCharts** use hierarchical stacked bars. Bar length supports magnitude comparison, segments show composition, and nesting lets the analyst move from broad event or actor classes to more specific categories.
- **MatchTree** converts the hierarchical matching taxonomy into a radial branching structure. Branch position indicates category membership, while the distribution of marks across branches exposes where matches accumulate or disappear.
- Brushing, filtering, highlighting, and drill-down link the views. Selecting an unusual bar, map region, parameter cell, or tree branch immediately reveals the same subset elsewhere, turning the dashboard into a visual diagnostic process rather than a collection of independent charts.

<!-- Add one or more representations here.

Suggested material:
- overview of the complete VEHICLE interface;
- ParaMultiples view;
- TempMap or MatchTree detail.

![Figure 1 — VEHICLE overview](images/paper-1-vehicle-overview.png)
![Figure 2 — VEHICLE detail](images/paper-1-vehicle-detail.png)
-->

### Knowledge produced by examining the representation

The coordinated views reveal whether agreement and disagreement between sources are **systematic rather than accidental**. A table may identify individual matched and unmatched rows, but the interface shows whether failures concentrate in one country, time period, source, actor category, or branch of the event taxonomy. Clustering in the TempMap suggests geographic or temporal coverage bias; imbalance in the stacked bars suggests that one source contributes disproportionately to particular event classes.

ParaMultiples reveals the **stability of the integration**. If adjacent parameter cells look similar, the merged dataset is relatively robust to small threshold changes. If the match distribution changes abruptly between neighbouring cells, the result sits on a parameter “cliff”: a minor analytical choice produces a substantially different dataset. That fragility is almost impossible to recognize by inspecting one exported match table.

The linked representations also distinguish global quality from local exceptions. A parameter setting may appear acceptable in aggregate while the map or taxonomy reveals a serious regional or categorical failure. The knowledge gained is therefore not simply the number of matches; it is an explanation of *where the sources agree, where they disagree, which analytical choices create that disagreement, and whether the merged dataset can be trusted for a particular research question*.

#### From raw information to representation

1. Conflict records are collected independently by ACLED, UCDP GED, the Global Terrorism Database, and the Social Conflict Analysis Database.
2. Records are standardized and classified through common taxonomies for actors, event types, and geographic precision.
3. MELTT identifies candidate matches according to spatial and temporal thresholds and calculates similarity through the taxonomies.
4. VEHICLE derives counts, distributions, match scores, and differences among parameter combinations.
5. These results are encoded in linked maps, histograms, hierarchical bars, and radial trees.

#### Audience and format

The representation preserves complexity because the target users are researchers expected to compare alternatives, question the integration, inspect anomalies, and export subsets. The interface does not force a single conclusion; it supports an analytical workflow. This is appropriate for an expert audience, but the density and specialized encodings would be excessive for a brief public-facing post.

### Information Sources and Tools Used

- **Data:** ACLED, UCDP GED, Global Terrorism Database, and Social Conflict Analysis Database; the reported study covers 197,502 African conflict events between 1997 and 2016.
- **Transformation method:** MELTT hierarchical event-matching procedure using spatial and temporal parameters.
- **Design method:** Munzner's Nested Model, domain-task abstraction, iterative prototyping, case studies, and evaluation with conflict researchers.
- **Representation tools:** a browser-based visual-analytics application with custom interactive statistical, geographic, and hierarchical views. The paper documents the visual system and interaction design rather than foregrounding a particular commercial charting tool.
- **Primary source:** [Computer Graphics Forum article](https://onlinelibrary.wiley.com/doi/full/10.1111/cgf.14284).

---

## Paper 2

| **Title** | **Author(s)** | **Description** | **Link** |
|---|---|---|---|
| *A Visual Analytics Framework for Identifying Topic Drivers in Media Events* | Yafeng Lu, Hong Wang, Steven T. Landis, and Ross Maciejewski | A visual-analytics framework that connects media attention to possible external event drivers, demonstrated with media datasets and an armed-conflict event dataset. Published in *IEEE Transactions on Visualization and Computer Graphics*, 24(9), 2501–2515, 2018. | [DOI](https://doi.org/10.1109/TVCG.2017.2752166) · [Institutional repository](https://oasis.library.unlv.edu/political_science_articles/159/) |

### Context

The paper introduces a visual-analytics framework for connecting topics in media collections with possible external event drivers. It combines semantic event retrieval, causality testing, and annotation so researchers can move from a media topic to related events, inspect the words responsible for the match, and refine the relationship with domain knowledge.

The representation examined here is **Figure 10 from Section 7.2**, “Climate-Induced Unrest During Drought.” The case study asks whether the 2014 drought in the Greater Horn of Africa coincided with reports of social unrest and political violence. The analyst selects an agriculture topic from a social-unrest media collection, “violence against civilians” events from ACLED, and the initial terms **water**, **food**, **farmer**, and **climate**.

### Representation used

**Description:** Figure 10 shows the framework's **Cluster View**, a force-directed bubble representation for inspecting and filtering semantic word matches.

- Each circle is a word. The selected media keywords use filled backgrounds, while outlined circles represent words extracted from ACLED event descriptions that the semantic model considers related.
- Colour identifies the originating search concept: **farmer** in blue, **climate** in red, **water** in tan, and **food** in orange.
- Circle size is proportional to how frequently the word occurs in the event records. Large nodes such as *fire*, *air*, *water*, and *food* therefore have greater influence on what the analyst notices than very small peripheral terms.
- Distance and enclosure express semantic grouping. Related words attract one another, while automatically drawn outlines separate the conceptual clusters produced by the similarity threshold and the analyst's regrouping actions.
- The dashed container on the right is the **word-selection area**. Words or conceptual subclusters moved there become the active semantic filter used to retrieve events.
- The pale red *climate* group records an analytical rejection. Even after the similarity threshold was adjusted to 0.75, *climate* retrieved words such as *way*, *order*, *demand*, *tension*, and *control* rather than a coherent agricultural meaning. The analyst therefore removed *climate*, and the event list updated.

The image represents an interactive reasoning step: it shows not only the output of semantic matching, but also where a domain expert intervenes to decide which machine-generated associations should count as meaningful.

<!-- Add one or more representations here.

Suggested material:
- Figure 10 in full, including the colour legend and word-selection container;
- an enlarged crop of the faded *climate* cluster and the accepted *water*, *food*, and *farmer* groups.

![Figure 3 — Semantic word clustering and filtering](images/paper-2-semantic-word-clustering.png)
![Figure 4 — Accepted and rejected semantic groups](images/paper-2-semantic-filter-detail.png)
-->

### Knowledge produced by examining the representation

A table could list every selected keyword and its similarity score, but it would not make the **structure of semantic ambiguity** easy to see. The bubble clusters reveal that a single word can pull the analysis toward several meanings:

- *climate* does not necessarily retrieve environmental or agricultural language in the conflict-event corpus; it also attracts vocabulary concerning social conditions, order, demand, tension, and control;
- *food* forms a recognizable nourishment-related group but also sits near terms such as *treat*, *centre*, and *stick* that may be irrelevant to the analyst's intended concept;
- *farmer* and *water* create smaller, more coherent groups, while the relative node sizes reveal which related words are common or rare in the event descriptions;
- moving selected words into the filter container turns the analyst's visual interpretation into a revised computational query.

The knowledge gained is therefore methodological as well as substantive. The image shows that semantic matching is not neutral: two datasets may use the same or similar vocabulary in different senses. A domain expert can see why an automatically retrieved set of conflict events is misleading, remove the problematic concept, and preserve only the associations that fit the research question.

After this refinement, the Section 7.2 case study produced an insignificant causal model (lag = 2, R² = 0.090). Inspection of the retrieved events also showed that some shared vocabulary connected the drought terms to violence whose reported motive was unstated. The analyst consequently judged the proposed relationship between resource shortages and civilian abuse to be less plausible. The visualization supports that cautious conclusion by exposing the weak semantic foundation of the initial link.

#### From raw information to representation

1. The analyst selects the agriculture topic from the social-unrest media collection and ACLED events categorized as violence against civilians.
2. The period is restricted to the months surrounding the 2014 Greater Horn of Africa drought.
3. The initial media keywords *water*, *food*, *farmer*, and *climate* seed a semantic dictionary.
4. Text is normalized and semantically related words are extracted from the ACLED event descriptions.
5. Complete-link agglomerative clustering and a force-directed layout group the words by similarity; colour records the seed keyword and node size records event-text frequency.
6. The analyst adjusts the similarity threshold, drags words between conceptual groups, moves accepted terms into the selection container, and removes misleading associations such as the *climate* group.
7. The filtered events are aggregated into a time series and passed to the causality model for hypothesis testing.

#### Audience and format

The target audience is researchers who understand that words change meaning across corpora and that observational conflict data cannot establish causality on its own. The representation deliberately exposes intermediate terms rather than hiding them behind a single similarity score. Its direct-manipulation design lets experts inject contextual knowledge into the retrieval process, making it suitable for hypothesis formation and methodological scrutiny but too specialized for a quick public-facing graphic.

### Information Sources and Tools Used

- **Data:** a social-unrest media collection assembled from 128 English-language RSS feeds and ACLED conflict-event descriptions.
- **Case-study selections:** the agriculture topic, March-June 2014 drought-related terms, and ACLED violence-against-civilians events in the Greater Horn of Africa context.
- **Transformations:** text normalization, semantic lexical matching, similarity-threshold filtering, complete-link agglomerative clustering, analyst-guided regrouping, event aggregation, and causality modelling.
- **Representation tools:** a custom interactive force-directed Cluster View with categorical colour, frequency-scaled nodes, conceptual boundaries, drag-and-drop filtering, and a word-selection container.
- **Primary sources:** [IEEE DOI record](https://doi.org/10.1109/TVCG.2017.2752166) and the [University of Nevada, Las Vegas repository record](https://oasis.library.unlv.edu/political_science_articles/159/).

---

## Responsive Web Article 1

| **Title** | **Author(s)** | **Description** | **Link** |
|---|---|---|---|
| *How Drone Combat in Ukraine Is Changing Warfare* | Reuters Graphics; Mariano Zafra, Max Hunder, Anurag Rao, Sudev Kiyada, and collaborators | A responsive visual investigation explaining the roles, operation, range, cost, and tactical integration of drones in the war in Ukraine. | [Reuters article](https://www.reuters.com/graphics/UKRAINE-CRISIS/DRONES/dwpkeyjwkpm/) |

### Context

The article was published in March 2024, when drones had become central to reconnaissance, artillery guidance, direct attack, and long-range strikes in Ukraine. The raw material was heterogeneous: more than 50 attack videos, technical UAV research, interviews with manufacturers, soldiers and officials, and information about different drone types and battlefield roles.

The challenge was therefore not simply to plot a dataset. Reuters needed to explain a technological and tactical system to a mixed audience that included citizens, journalists, professionals, and policy-oriented readers.

### Representation used

**Description:** The article uses **scroll-driven visual explanation**. Scrolling does more than move past illustrations: it controls when objects, labels, routes, ranges, and tactical stages appear. A stable visual scene is progressively modified so the reader can observe one relationship at a time.

Annotated technical illustrations identify drone components and roles. Maps and distance comparisons encode operational range; silhouettes and proportional drawings communicate physical scale; arrows and ordered transitions represent the movement from reconnaissance to target identification, communication, artillery direction, and attack. Photographs and video-derived evidence reconnect the explanatory diagrams to observed battlefield use.

The sequence changes scale deliberately. It moves from an individual device, to the immediate battlefield, to the longer-range geography of strikes. This nested structure prevents specifications such as range, cost, or payload from remaining isolated numbers. On mobile, wide compositions become vertically stacked and annotations are reduced or repositioned, but the explanatory order remains the same.

<!-- Add one or more representations here.

Suggested material:
- an overview showing different drone roles;
- a range or scale comparison;
- a scroll sequence explaining the reconnaissance-to-strike process.

![Figure 5 — Reuters drone system](images/web-1-reuters-drone-system.png)
![Figure 6 — Reuters range comparison](images/web-1-reuters-drone-range.png)
-->

### Knowledge produced by examining the representation

A table could compare model, cost, speed, payload, and range, but it would leave each drone as an isolated object. The staged diagrams reveal a **system of interdependent roles**: reconnaissance drones locate activity, communications transfer information, artillery or attack drones act on it, and longer-range systems extend the conflict beyond the front. The central insight is that battlefield effect emerges from coordination, not from one device specification.

Changes in scale produce spatial knowledge. “Ten kilometres” or “several hundred kilometres” becomes a visible relationship among the front line, command infrastructure, cities, and launch or target areas. The reader can distinguish tactical devices operating near soldiers from strategic systems capable of reaching far behind the front.

The representation also makes the changing sensor-to-strike process perceptible. By placing observation, decision, and attack in one visual sequence, it shows how inexpensive aerial systems can compress the time between seeing a target and acting on that information. This operational chain, and the asymmetry between relatively low-cost devices and potentially high-value targets, would not emerge clearly from a specification table.

#### From raw information to representation

1. Reuters gathers video evidence, technical research, interviews, and specifications.
2. Material is verified and categorized by drone type, function, range, and stage of operation.
3. The journalists select representative examples instead of exposing the complete evidence archive.
4. Technical attributes are converted into diagrams, maps, scale comparisons, and an ordered operational sequence.
5. Scrolling controls the release of information and maintains a clear explanatory path.

#### Audience and format

The story preserves more depth than a social post but provides more guidance than a research dashboard. Readers are expected to follow an editorial explanation rather than define their own analytical query. The combination of short text, animation, and responsive graphics makes a complex military system understandable without requiring specialist knowledge.

### Information Sources and Tools Used

- **Information sources:** analysis of more than 50 drone-attack videos, UAV research, and interviews with more than a dozen manufacturers, soldiers, and officials.
- **Representation tools:** custom responsive web graphics, annotated illustrations, maps, motion, and scroll-driven transitions. Reuters does not publicly identify every software library used on the page.
- **Primary source:** [Reuters visual investigation](https://www.reuters.com/graphics/UKRAINE-CRISIS/DRONES/dwpkeyjwkpm/).

---

## Responsive Web Article 2

| **Title** | **Author(s)** | **Description** | **Link** |
|---|---|---|---|
| *How Ukraine Has Faced Its Worst Month on the Battlefield in Two Years — Visualised* | Ed Gargan, Pablo Gutiérrez, and Ashley Kirk; design by Prina Shah | A responsive sequence of charts and maps explaining Russian territorial gains in Ukraine during 2024, with emphasis on November. | [The Guardian article](https://www.theguardian.com/world/ng-interactive/2024/dec/04/how-ukraine-faced-worst-month-battlefield-in-two-years-visualised) |

### Context

Published in December 2024, the article investigates a headline fact: Ukraine lost more territory in November than in any month since September 2022. However, the authors do not treat square kilometres as sufficient evidence of strategic meaning. They combine changes over time with the geography and settlement structure of the captured land.

The main source is the Institute for the Study of War's daily control-of-terrain files, which classify areas as controlled, contested, or subject to advances.

### Representation used

**Description:** The article combines two complementary representations: a **time-series view of territorial change** and a sequence of **annotated control-of-terrain maps**. The chart places months on a common temporal axis and encodes land gained or lost through magnitude, making acceleration and exceptional months visible. Annotation singles out November 2024 instead of requiring the reader to search the series unaided.

The maps then replace the abstract unit of square kilometres with geographic shape. Colour distinguishes control, advance, or contested areas; overlaid boundaries locate the changes within regions; settlement labels and infrastructure references provide strategic context. The story progressively zooms from Ukraine as a whole to Donetsk and then to particular advances, allowing the reader to connect national totals with local geography.

These views are deliberately coordinated by narrative order rather than by a dashboard filter. The time series establishes *when the change became exceptional*; the maps establish *where it happened and what the gained area contained*.

<!-- Add one or more representations here.

Suggested material:
- monthly territorial-change chart;
- regional map of gains in Donetsk;
- comparison between land area and the location of major settlements or infrastructure.

![Figure 7 — Monthly territorial change](images/web-2-guardian-monthly-change.png)
![Figure 8 — Territorial gains map](images/web-2-guardian-map.png)
-->

### Knowledge produced by examining the representation

A table can show that Russia took approximately 1,202 square kilometres in November 2024, but the time series reveals why that value matters: it is not simply large in isolation; it breaks with the pattern of surrounding months and marks the worst monthly territorial loss for Ukraine in roughly two years.

The maps add a second correction to the headline total. They show that most of the change was concentrated in Donetsk and that much of the measured area consisted of agricultural land, forest, or fields rather than major cities or transport hubs. The reader therefore learns that **territorial magnitude and strategic value are related but not equivalent**.

The shapes of the mapped advances also reveal process. Instead of imagining 1,202 square kilometres as one block changing hands at once, the reader sees several incremental and geographically uneven movements. Examining the chart and maps together produces a more defensible conclusion: November was quantitatively severe, but the consequences varied according to location, settlement structure, and proximity to strategically important places.

#### From raw information to representation

1. Daily territorial-control files are collected from the Institute for the Study of War.
2. Control polygons are compared across dates to estimate gains and losses.
3. Changes are aggregated by month and region.
4. Settlement and infrastructure context is added to distinguish rural area from strategic locations.
5. The article sequences charts and maps from the headline trend to a geographically qualified interpretation.

#### Audience and format

The design serves citizens and professionals who need a concise explanation of a changing battlefield. It reduces the complexity of daily control files but preserves the distinction between quantity and meaning. Responsive charts and maps offer more detail on desktop while remaining readable as vertically stacked units on mobile.

### Information Sources and Tools Used

- **Data:** daily control-of-terrain files from the Institute for the Study of War.
- **Transformations:** polygon comparison, land-area estimation, monthly and regional aggregation, and settlement-based contextualization.
- **Representation tools:** custom responsive charts, annotated maps, and editorial text. The article does not identify all production libraries.
- **Primary source:** [The Guardian visual article](https://www.theguardian.com/world/ng-interactive/2024/dec/04/how-ukraine-faced-worst-month-battlefield-in-two-years-visualised).

---

## Instagram Post 1

| **Title** | **Author(s)** | **Description** | **Link** |
|---|---|---|---|
| *The 50 Countries Most Impacted by Violent Conflict* | Powerful Countries; data source: ACLED Conflict Index | An Instagram map derived from the ACLED Conflict Index, showing the fifty countries and territories most affected by violent conflict. | [Instagram post](https://www.instagram.com/p/DMMMCKBsBXP/) |

### Context

ACLED's event database contains detailed records of political violence with dates, locations, actors, event types, fatalities, and other attributes. The Conflict Index transforms those records into four higher-level dimensions: deadliness, danger to civilians, geographic diffusion, and armed-group fragmentation.

The Instagram account Powerful Countries reduces this multidimensional analytical product to a visually immediate global overview for citizens encountering the graphic in a fast-moving feed.

### Representation used

**Description:** The lead representation is a **categorical world map**. Countries are the basic marks: geographic position preserves their real-world arrangement, while colour and emphasis identify the fifty countries and territories included in the Conflict Index and differentiate their conflict severity. Unselected territory remains visually quiet, producing a figure-ground contrast that lets the affected regions dominate the phone-sized image.

The post uses a limited palette, a compact legend, a strong headline, and minimal annotation. These choices remove the need to read fifty separate rows. The viewer first perceives the global distribution, then uses labels or the caption to interpret individual cases and the index dimensions behind the ranking.

The representation is deliberately an overview rather than a precise statistical chart. Area on the screen is determined by country size, not by conflict severity, while colour carries the analytical category. Large countries therefore occupy more visual space even when their index values are not proportionally larger.

<!-- Add one or more representations here.

Suggested material:
- the lead map;
- additional carousel slides explaining the index dimensions or leading countries, if present.

![Figure 9 — ACLED Conflict Index Instagram map](images/instagram-1-acled-conflict-index.png)
-->

### Knowledge produced by examining the representation

A ranked table would communicate order, but the map reveals **geographic concentration and adjacency**. Conflict-affected countries appear as regional groupings rather than independent entries, making it easier to recognize that severe violence often occupies connected cross-border zones. The blank and highlighted areas also show that conflict burden is distributed very unevenly across the world.

The map changes the question from “Which country is ranked fifth?” to “Where do severe and difficult-to-resolve conflicts cluster?” That spatial question can suggest shared regional conditions, cross-border armed-group activity, refugee movement, or neighbouring security effects that a sorted list does not invite the viewer to consider.

Examining the legend and the underlying index adds another insight: severity is multidimensional. A country can appear because violence is exceptionally deadly, geographically diffuse, dangerous to civilians, fragmented among many armed groups, or severe across several dimensions. The representation is therefore useful for identifying spatial patterns, but it cannot by itself explain *why* two similarly coloured countries received similar classifications; that knowledge requires returning to the four index components.

#### From raw information to representation

1. Individual ACLED events are coded by date, location, event type, actors, fatalities, and civilian targeting.
2. Events are aggregated within the Conflict Index methodology.
3. Countries are evaluated across deadliness, civilian danger, geographic diffusion, and fragmentation.
4. The top fifty are selected and simplified into a categorical global map.
5. Labels and short copy identify the principal message without exposing the full event-level dataset.

#### Audience and format

Instagram users are not expected to configure filters or study a dense methodological interface. The post therefore prioritizes recognition and memorability: a global pattern, a clear hierarchy, and one principal message. Methodological detail is displaced to the caption or linked ACLED material. This increases speed of comprehension but reduces the reader's ability to inspect uncertainty or individual events.

### Information Sources and Tools Used

- **Data and method:** ACLED event data and the ACLED Conflict Index.
- **Indicators:** deadliness, danger to civilians, geographic diffusion, and armed-group fragmentation.
- **Representation tools:** static social-media cartography and graphic design; the exact design software is not publicly documented.
- **Sources:** [Instagram post](https://www.instagram.com/p/DMMMCKBsBXP/) and [ACLED Conflict Index](https://acleddata.com/series/acled-conflict-index).

---

## Instagram Post 2

| **Title** | **Author(s)** | **Description** | **Link** |
|---|---|---|---|
| *25 Years On: The Human Toll of 9/11* | Forbes India / Network18 Creative | A pictogram comparison of estimated deaths in post-9/11 wars, the Vietnam War, the Korean War, and the 1991 Gulf War, published for the 25th anniversary of the September 11 attacks. | [Instagram post](https://www.instagram.com/p/DdJcYNuMyWO/) |

### Context

War-death estimates are normally presented in reports and tables that distinguish conflicts, time periods, direct violent deaths, and indirect deaths caused by disease, malnutrition, displacement, or infrastructure collapse. These distinctions matter, but a table does not make the relative scale of several wars immediately perceptible to a general audience.

Published by Forbes India on 11 September 2026, the post uses the 25th anniversary of the September 11 attacks to compare the estimated human toll of major US-involved wars since 1945. Its principal sources are identified in the image as Brown University's Costs of War project, US government data, and Reuters.

### Representation used

**Description:** The graphic places four estimated death ranges on a common horizontal composition:

- **post-9/11 wars:** 4.5–4.7 million;
- **Vietnam War:** approximately 3 million or more;
- **Korean War:** approximately 2.5–3 million;
- **1991 Gulf War:** approximately 143,000–206,000.

Each estimate is reinforced with a differently sized block of repeated human pictograms and a documentary photograph. Post-9/11 wars are emphasized in red, while the historical comparisons use grey. A side panel adds a second consequence of 9/11: illnesses among responders and survivors, including more than 9,000 deceased members of the World Trade Center Health Program.

The visual hierarchy is designed for a phone screen. The title states the claim, the numbers preserve the ranges, and the pictogram blocks make the order of magnitude visible without requiring close reading of a table. The repeated figures should be read as a proportional and humanizing comparison rather than a literal one-symbol-per-person unit chart, because the graphic does not supply a fixed value for each icon.

The composition combines three representational layers: exact or ranged text supports numerical lookup; pictogram mass supports rapid magnitude comparison; and photographs associate each quantity with a recognizable historical conflict. The red/grey contrast directs attention to the post-9/11 total before the viewer compares it with the historical baselines.

<!-- Add one or more representations here.

Suggested material:
- the complete pictogram comparison with all four war estimates;
- a detail showing the post-9/11 estimate, source note, and the side panel on responder and survivor illnesses.

![Figure 10 — Human toll of major US-involved wars](images/instagram-2-human-toll-overview.png)
![Figure 11 — Post-9/11 estimate and source detail](images/instagram-2-human-toll-detail.png)
-->

### Knowledge produced by examining the representation

A table can provide the four ranges, but the pictogram blocks make the steep difference in magnitude immediately visible. The post-9/11 estimate is represented as the largest human cluster, followed by Vietnam and Korea, while the 1991 Gulf War appears much smaller. The red emphasis also frames post-9/11 wars as the central consequence under examination rather than merely one row in a list.

The representation draws attention to another form of knowledge that a simple battle-death table may omit: wars continue to produce deaths through damaged healthcare, hunger, disease, and infrastructure collapse. That expanded definition is precisely why the post-9/11 estimate is so large. The graphic therefore teaches both a magnitude comparison and the importance of what a casualty estimate includes.

The comparison must nevertheless be interpreted cautiously. The image combines broad estimates from conflicts of different duration and uses a post-9/11 total that explicitly includes both direct and indirect deaths. The pictograms create a persuasive visual ranking, but they do not display uncertainty beyond the printed ranges or fully explain whether every historical estimate uses an identical methodology.

#### From raw information to representation

1. Death estimates are assembled from Brown University's Costs of War project, US government data, and Reuters reporting.
2. Four major US-involved war categories are selected for comparison.
3. Point estimates and uncertainty ranges are shortened into mobile-readable labels.
4. The quantities are encoded through repeated human pictograms, exact text labels, colour emphasis, and documentary photographs.
5. A separate callout adds long-term deaths linked to illnesses among 9/11 responders and survivors.
6. A footnote discloses that the post-9/11 total includes direct violent deaths and indirect deaths from war-related disease, malnutrition, and infrastructure collapse.

#### Audience and format

The representation is intended for citizens encountering the subject in a social feed. It uses a familiar anniversary, repeated human symbols, contrast, and a small number of comparisons to make millions of deaths legible within seconds. Photographs provide historical context, but the quantitative message is carried by the ordered pictogram blocks and printed ranges rather than by numbers placed decoratively over images.

This compression makes the comparison memorable but leaves little room for methodological explanation. The source line and direct/indirect-death footnote are therefore essential, and readers seeking to reuse the numbers should consult the underlying Costs of War research.

### Information Sources and Tools Used

- **Sources named in the image:** Brown University Costs of War project, US government data, and Reuters.
- **Transformations:** cross-conflict selection, aggregation of direct and indirect deaths, range simplification, and pictogram scaling.
- **Representation tools:** static editorial infographic design combining repeated-unit symbols, typography, colour, and documentary photographs; the exact software is not disclosed.
- **Primary source:** [Forbes India Instagram post](https://www.instagram.com/p/DdJcYNuMyWO/).
- **Supporting source:** [Brown University Costs of War](https://watson.brown.edu/costsofwar/).
- **Critical limitation:** the war categories cover different periods and the post does not demonstrate that every estimate was produced with the same methodology; the comparison should be read as an order-of-magnitude overview rather than a precise statistical ranking.

---

## X Post 1

| **Title** | **Author(s)** | **Description** | **Link** |
|---|---|---|---|
| *In Three Years of War, Almost 7 Million Ukrainians Have Fled* | Statista | An X post with a horizontal bar chart comparing the countries that had registered the largest numbers of refugees from Ukraine, based on UNHCR data. | [Post on X](https://x.com/StatistaCharts/status/1894411533658001761) |

### Context

Russia's full-scale invasion of Ukraine produced a large cross-border displacement crisis. UNHCR data record refugee populations by host country and reporting date. In a table, the reader can retrieve exact values; on X, Statista turns the same country-by-country comparison into a compact visual ranking designed for immediate reading.

The post was published on 25 February 2025, three years after the full-scale invasion. Its image reports almost 7 million registered refugees in Europe and elsewhere and emphasizes the principal destination countries.

### Representation used

**Description:** The attached image is a **ranked horizontal bar chart**, not a text-only card or link preview. Country names share a left baseline and the bars extend along one quantitative scale, so length directly encodes registered refugee count. Exact values at the bar ends support lookup, while descending order turns the chart into an immediate ranking.

Germany, Russia, and Poland form a visually distinct leading group; a large length break separates them from the Czech Republic and the shorter bars for the United Kingdom, Spain, Romania, Italy, and Slovakia. A separate overall total and a small directional Ukraine icon provide context without competing with the main comparison.

The horizontal orientation is important for the social format: country labels remain readable, the longest values receive sufficient space, and the entire ordering fits within one mobile image. A compact source and date note preserves provenance at the bottom of the chart.

<!-- Add one or more representations here.

Suggested material:
- screenshot of the complete X post;
- crop of the attached horizontal bar chart with source and date note visible.

![Figure 12 — Countries hosting the largest numbers of Ukrainian refugees](images/x-1-statista-ukraine-refugees.png)
-->

### Knowledge produced by examining the representation

The chart reveals the distribution's **shape and tiers** immediately. Germany, Russia, and Poland each register roughly one million or more refugees, after which the values drop sharply. The Czech Republic forms a second tier, while the remaining displayed countries have substantially smaller totals. These discontinuities are easier to perceive from aligned lengths than from a column of numbers.

The chart also corrects a possible misconception created by the overall total. “Almost seven million” is not evenly spread across Europe; a small number of countries account for a large share of the displayed registrations. This raises further analytical questions—such as burden relative to host population or change over time—that the absolute-count chart does not answer.

Examining the footnote reveals another important piece of knowledge: the country values are not all synchronized to the same reporting date. Russia's value is older than most others. The graphic remains useful for approximate ranking, but the visible date discrepancy warns against treating small differences as exact contemporaneous comparisons.

#### From raw information to representation

1. UNHCR country-level refugee records are selected for people displaced from Ukraine since 24 February 2022.
2. Reporting dates are aligned as far as possible, with exceptions disclosed in the graphic's footnote.
3. Countries are ranked by registered refugee count.
4. The largest destinations are selected for display and encoded as aligned horizontal bars.
5. Exact labels, an overall total, and a short source note are added for a self-contained social image.

#### Audience and format

X favours topicality, compression, and shareability. The post reduces a large operational dataset to one question—where refugees were registered—and one ordered comparison. Citizens can understand the pattern without opening another page, while the source label and date note preserve a route to the underlying evidence. The tradeoff is that the graphic does not show change over time, refugee shares relative to host population, or uncertainty in registration counts.

### Information Sources and Tools Used

- **Data:** UNHCR refugee-registration data concerning displacement from Ukraine.
- **Transformations:** country aggregation, descending ranking, top-destination selection, and horizontal-bar encoding.
- **Representation tools:** a static Statista social-media chart; the exact production software is not specified.
- **Sources:** [X post](https://x.com/StatistaCharts/status/1894411533658001761) and the [UNHCR Ukraine Refugee Situation portal](https://data.unhcr.org/en/situations/ukraine).
- **Date note:** the chart states that most values cover 16 December 2024 to 16 February 2025, with Russia reported to 30 June 2024; this comparability caveat is visible in the image.

---

## X Post 2

| **Title** | **Author(s)** | **Description** | **Link** |
|---|---|---|---|
| *UCDP Candidate Events Data: Lethal Events at PRIO-GRID Level* | Uppsala Conflict Data Program | An X post announcing updated candidate-event data and showing lethal organized-violence events on a standardized spatial grid. | [Post on X](https://x.com/UCDP/status/1883788484592415223) |

### Context

UCDP Candidate Events provide near-real-time records that have not yet completed the full annual data-release process. Each event can include a date, location, actors, type of organized violence, and estimated fatalities. Publishing every row in a post would be impossible, while a global total would remove spatial structure.

The post aggregates lethal events to PRIO-GRID cells, creating a consistent global spatial unit for a rapid map-based update.

### Representation used

**Description:** The attached image is a **gridded event map**. Each georeferenced candidate event is assigned to a PRIO-GRID cell, and the cell becomes the common spatial unit rather than a country, province, or named locality. Filled cells or changes in intensity encode where lethal organized violence was recorded during the stated period.

The regular lattice creates visual comparability: every cell is processed according to the same rule, and neighbouring cells can be read as concentrations, corridors, isolated incidents, or broader zones of activity. The world map supplies geographic orientation, while a restrained legend and short annotation keep the image legible in the X feed.

Aggregation is central to the representation. Multiple event rows can occupy one cell, and nearby events become a spatial pattern rather than a stack of overlapping point symbols. The post then links to a higher-resolution product for readers who need exact events or attributes.

<!-- Add one or more representations here.

Suggested material:
- screenshot of the X post;
- higher-resolution version of the PRIO-GRID event map.

![Figure 13 — UCDP lethal candidate events map](images/x-2-ucdp-candidate-events.png)
-->

### Knowledge produced by examining the representation

The map reveals **concentration, diffusion, and spatial continuity**. A table of coordinates can identify each event, but it cannot immediately show whether lethal violence forms one dense hotspot, several disconnected theatres, a border-spanning cluster, or a broad corridor. Adjacent active cells make these configurations perceptually available.

The regular grid also changes how territory is interpreted. Because the cells do not stop at administrative borders, the representation does not imply that violence is naturally contained by countries or provinces. Cross-border continuities and peripheral conflict zones remain visible, which is especially valuable when armed activity follows terrain, trade routes, ethnic regions, or front lines rather than formal boundaries.

At the same time, the map reveals only the spatial structure retained after aggregation. It does not show which actors produced the violence, whether several incidents occupy the same cell, or how uncertain individual coordinates may be. Examining it therefore yields knowledge about *where violence clusters*, not a complete explanation of *who acted, why, or what happened in each event*.

#### From raw information to representation

1. Candidate events are filtered to the relevant reporting period and to lethal organized violence.
2. Event coordinates are assigned to PRIO-GRID cells.
3. Events or fatalities are aggregated within each cell.
4. The global distribution is encoded spatially with a limited legend and compact annotation.
5. The post links the compressed map back to the downloadable or higher-resolution material.

#### Audience and format

The X post addresses citizens, journalists, and researchers following new releases. It compresses an update into one spatial finding while retaining a direct path to the underlying data. Compared with Instagram, the tone is closer to a research announcement: current, concise, and source-oriented.

### Information Sources and Tools Used

- **Data:** UCDP Candidate Events Dataset.
- **Spatial framework:** PRIO-GRID, a standardized global grid used in conflict research.
- **Transformations:** temporal and fatality filtering, coordinate-to-grid assignment, and spatial aggregation.
- **Representation tools:** static cartography; the exact software used for the posted map is not specified.
- **Primary source:** [UCDP post on X](https://x.com/UCDP/status/1883788484592415223).

---

## Alternative Paradigm Representation 1

| **Title** | **Author(s)** | **Description** | **Link** |
|---|---|---|---|
| *Russia Bombs Ukraine Almost Every Night. This Is What It Sounds Like.* | *The Washington Post*: Lizzie Johnson, Serhii Korolchuk, Anastacia Galouchka, Kostiantyn Khudov, Ed Ram, Yutao Chen, Júlia Ledur, Bishop Sand, and collaborators | A 2025 interactive sonic data narrative that combines recordings, scroll-driven audio, drone-launch charts, loudness comparisons, and air-raid-siren durations to represent the nightly experience of aerial war. | [Interactive article](https://www.washingtonpost.com/world/interactive/2025/ukraine-bombing-sounds-war-sirens-russia/) |

### Context

By 2025, Russian drone and missile attacks had made air-raid warnings and explosive sounds a recurring part of life in Ukraine. Counts of drones, missiles, interceptions, and alarm durations document the escalation, but tables cannot convey the sensory burden of repeated nighttime attacks.

The Washington Post combines data with field recordings and audio-enabled scrolling. It is an alternative paradigm because sound is part of the evidential and explanatory representation: the reader does not only inspect how frequently attacks occurred, but hears the acoustic environment associated with them.

### Representation used

**Description:** The experience asks the reader to enable audio and is explicitly designed to be experienced with sound on. Recorded explosions, drones, and warning sirens are coordinated with a scroll-driven narrative and conventional graphics, including:

- a weekly time series of drones launched from January 2024 to July 2025;
- daily comparisons of drones launched, shot down, or jammed;
- perceived-loudness comparisons between war sounds and familiar daily sounds;
- timelines showing how many hours air-raid sirens lasted during day and night;
- photographs, maps, annotations, and testimony that locate the sounds in lived environments.

This is better described as an **interactive sonic or aural data narrative** than as pure algorithmic sonification: it combines quantitative mappings with documentary recordings rather than translating every numeric value directly into pitch or rhythm.

The representation alternates between three scales of evidence. Long-run charts establish escalation across months; daily graphics distinguish launches from interceptions or jamming; sound and testimony return the reader to the duration of an individual night. Scroll position synchronizes these layers, while the audio control preserves the reader's ability to enter or leave the sensory experience.

<!-- Add one or more representations here.

Suggested material:
- opening audio-enable interface;
- weekly drone-launch time series;
- loudness comparison or day/night siren-duration graphic.

![Figure 14 — Audio-enabled opening](images/alternative-1-ukraine-audio-opening.png)
![Figure 15 — Drone and siren data views](images/alternative-1-ukraine-sonic-data.png)
-->

### Knowledge produced by examining the representation

The time series reveals a sharp escalation in the number of drones launched, while the daily graphics show that “launched,” “intercepted,” and “reached the defended area” describe different stages of the attack process. The reader can therefore distinguish the scale of the assault from the number of weapons that ultimately penetrate defenses.

The siren timelines expose **temporal saturation**. Danger is not only the number of attacks; it is also the number of hours during which people cannot know whether an alarm will end quietly or with an impact. Day/night separation makes the disruption of sleep and ordinary routines visible in a way that a daily total cannot.

The audio layer adds perceptual knowledge unavailable in a table. Loudness, repetition, mechanical drone tones, warning signals, and sudden explosions produce a bodily understanding of distance and threat. The comparison with familiar everyday sounds supplies a perceptual reference scale, while the recordings prevent the loudness values from remaining abstract measurements.

Examining the charts and sound together changes the conclusion from “drone launches increased” to a richer one: the attacks became more frequent, occupied more of the night, repeatedly forced civilians into states of alert, and created an acoustic environment that persists even when many drones are intercepted. That experiential knowledge is the central contribution of the alternative paradigm.

#### From raw information to representation

1. Ukrainian armed-forces reports provide dates and counts for Russian drone launches and defensive outcomes.
2. Ukrainian authorities' alarm records provide the timing and duration of air-raid sirens.
3. Documentary teams record attacks, drones, alarms, testimony, and affected places.
4. Loudness references and comparisons are used to contextualize the recorded sound environment.
5. Quantitative series are encoded as line, daily-status, and duration graphics.
6. Scrolling synchronizes charts, narrative text, imagery, and audio so the reader moves between measurement and sensory experience.

#### Audience and format

The experience targets a broad international audience on desktop and mobile, but it asks for active participation through sound and scrolling. Charts preserve enough quantitative structure for comparison, while the audio makes the consequences memorable and embodied. The design should be approached with headphones or speakers, and its sensory intensity warrants clear user control over audio.

### Information Sources and Tools Used

- **Data:** Russian drone-launch and defensive-outcome figures reported by the Ukrainian armed forces; air-raid-siren data from Ukrainian authorities; loudness references from the World Health Organization.
- **Documentary sources:** original reporting, field audio, photography, and testimony from Ukraine.
- **Transformations:** weekly and daily aggregation, launch/interception comparison, alarm-duration calculation, perceived-loudness comparison, and narrative sequencing.
- **Representation tools:** responsive scrollytelling, interactive audio, documentary sound, line and duration charts, maps, photography, and annotations.
- **Primary source:** [The Washington Post interactive](https://www.washingtonpost.com/world/interactive/2025/ukraine-bombing-sounds-war-sirens-russia/).

---

## Alternative Paradigm Representation 2

| **Title** | **Author(s)** | **Description** | **Link** |
|---|---|---|---|
| *War Up Close — VR Museum of the War in Ukraine* | Mykola Omelchenko with Discover.ua, FreegenGroup, and project collaborators | A virtual-reality and immersive exhibition using 360-degree panoramas, drone footage, photogrammetry, and 3D models to document war damage in Ukrainian cities. | [Official project](https://warupclose.com/) |

### Context

The project documents the physical consequences of Russia's full-scale invasion of Ukraine. Its material includes destroyed residential buildings, infrastructure, streets, monuments, and public spaces. The creators present the work online, through VR headsets, and in travelling exhibitions.

Unlike a statistical conflict map, the project is not primarily designed to compare event frequencies. It records what damaged places look like from within and preserves spatial evidence for memory, communication, assessment, and possible reconstruction.

### Representation used

**Description:** The project uses an **immersive spatial representation** rather than a conventional statistical chart. A 360-degree panorama maps photographs around the viewer, allowing head or pointer movement to determine the field of view. The audience is positioned inside the documented location instead of looking down on it from a fixed map.

Panoramas preserve continuous relationships among floors, façades, rooms, streets, vehicles, debris, and neighbouring buildings. Hotspots or tour links move the viewer between capture positions. Photogrammetric or laser-scanned 3D models add depth and navigable geometry, while drone footage supplies an aerial overview that is unavailable from street level.

The different views operate as a scale sequence: aerial imagery establishes the extent of damage; street-level panoramas establish orientation and proximity; detailed models preserve surfaces and structural form. In exhibitions, a headset, surrounding projection, physical objects, or a themed installation can further convert viewing into bodily participation.

<!-- Add one or more representations here.

Suggested material:
- screenshot from a 360-degree panorama;
- a 3D reconstruction or drone view;
- photograph of a visitor using the VR exhibition.

![Figure 16 — War Up Close panorama](images/alternative-2-war-up-close-panorama.png)
![Figure 17 — War Up Close exhibition](images/alternative-2-war-up-close-vr.png)
-->

### Knowledge produced by examining the representation

A table can record a location, coordinates, date, building type, and damage classification, but the immersive representation reveals **how damage is arranged**. The viewer can see whether destruction is confined to one façade or continues through neighbouring rooms and buildings, how debris occupies streets, and how damaged structures relate to homes, public spaces, and infrastructure around them.

Moving between aerial and ground-level views produces orientation and scale. From above, the viewer perceives the extent of an affected neighbourhood; from within a panorama, the same area becomes a sequence of walls, rooms, roads, and sight lines. A label such as “residential building destroyed” is transformed from a category into a spatial situation.

The representation also preserves continuity and texture that classification removes: blast direction, exposed interiors, the density of surrounding construction, distances between structures, and the coexistence of damaged and still-standing elements. These observations can support memory, testimony, public understanding, and questions for later assessment.

The gained knowledge is experiential rather than statistically representative. A tour can show selected places with extraordinary detail, but it does not establish how common that degree of damage is across the entire war zone. The viewer learns *what these documented places are spatially like*, not the overall frequency of each damage category.

#### From raw information to representation

1. Teams obtain access and permissions to document affected sites.
2. They capture 360-degree photography, conventional photographs, drone video, and spatial scans.
3. Images are stitched into panoramas; laser scanning and photogrammetry generate three-dimensional models where appropriate.
4. Sites are organized into virtual tours and immersive exhibition sequences.
5. The material is delivered through browsers, Google Street View or Maps, VR headsets, immersive theatres, and travelling exhibitions.

#### Audience and format

The primary audience is the international public, including people geographically distant from Ukraine. The project minimizes abstraction and makes the viewer an active observer inside a documented environment. It sacrifices the efficiency of statistical comparison in exchange for presence, spatial understanding, memory, and testimony.

Because immersion can intensify emotional impact, presentation should include clear contextual framing, warnings for disturbing material, transparent provenance, and care not to turn suffering into spectacle.

### Information Sources and Tools Used

- **Information sources:** on-site documentary photography and video of damaged locations in Ukraine.
- **Capture tools:** high-resolution 360-degree cameras, drones, laser scanning, and photogrammetry.
- **Delivery tools:** 3D modelling, virtual-tour software, Google Street View or Maps, VR headsets, browser-based panoramas, and immersive exhibition spaces.
- **Creators and partners:** Mykola Omelchenko, Discover.ua, FreegenGroup, and public-agency and exhibition partners.
- **Sources:** [official project](https://warupclose.com/), [project and production description](https://onova.org.ua/en/projects/the-war-up-close-project), and [exhibition overview](https://victimsofcommunism.org/event/war-up-close/).

---

## Cross-Format Comparison

The ten examples show that the transformation of war-related information depends on the target audience and the task assigned to that audience.

| **Format** | **Primary audience** | **Treatment of raw information** | **Dominant representation strategy** | **Expected audience task** | **Principal knowledge produced** |
|---|---|---|---|---|---|
| Scientific paper | Researchers and domain experts | Preserves variables, methods, uncertainty, alternatives, and provenance | Coordinated views, methodological diagrams, interaction, and parameter inspection | Compare, question, validate, and reproduce | How a result or dataset was constructed, and where assumptions affect it |
| Responsive web article | Citizens, professionals, and researchers | Selects evidence and reveals it progressively | Scroll-driven explanation, responsive maps, charts, diagrams, and annotations | Follow a narrative and inspect selected evidence | How a phenomenon develops, operates, or varies across time and space |
| Instagram | Citizens and broad public | Reduces the evidence to one main message or a short carousel | Strong hierarchy and a simplified map or chart optimized for a phone screen | Recognize and remember a pattern quickly | One salient comparison, spatial pattern, scale, or consequence |
| X | Citizens, journalists, and news-oriented users | Narrows data to a current period, release, or observation | Compact visual claim, ranked bar chart, or one map | Notice, understand, share, and follow a source | What changed, how cases compare, where activity is concentrated, or why an update matters |
| Alternative paradigm | Visitors and general public | Combines data or documented places with sound, spatial immersion, and sensory experience | Interactive audio, VR, 360-degree media, documentary recordings, and scrollytelling | Hear or experience duration, magnitude, proximity, or place | What repeated attacks or a damaged environment mean at human scale |

### How the formats portray raw information differently

Scientific papers use data as **evidence to inspect**. Their representations retain complexity because peers must be able to challenge the method and determine whether the conclusion is defensible. VEHICLE exposes source overlap and parameter sensitivity; the topic-driver framework's Cluster View exposes ambiguous semantic matches and lets an expert decide which word associations should enter the analysis.

Responsive web articles use data as **an explained phenomenon**. Reuters and *The Guardian* select evidence and determine the order in which it appears. The reader receives more depth than in social media, but the exploration is bounded by an editorial story.

Instagram uses data as **a visually memorable message**. The evidence is heavily reduced, and strong hierarchy is necessary because the post appears among unrelated content on a small screen. In the selected examples, a map communicates geographic concentration while a pictogram chart communicates order of magnitude. The format is effective for recognition and awareness, but definitions—especially the distinction between direct and indirect war deaths—must remain visible in the image, caption, or linked source.

X uses data as **a compact and current finding**. A ranked bar chart or a newly released map can circulate quickly among citizens, journalists, and researchers. The narrow question and strong claim improve immediacy, but the reporting date, denominator, and source must be visible so that fast comparison does not become misleading.

Alternative paradigms use data or documentary evidence as **experience**. The Washington Post's sonic narrative makes the repetition, loudness, and duration of aerial attacks perceptible; *War Up Close* reconstructs damaged places. These forms supplement numerical comparison with sensory and spatial knowledge, making temporal saturation, continuity, and proximity easier to understand.

### Representation-to-knowledge synthesis

| **Case study** | **What the representation encodes** | **Knowledge produced by examining it** |
|---|---|---|
| VEHICLE | Parameter combinations as repeated histograms; events through linked geography and time; source and taxonomy composition through stacked bars and a radial tree | Whether integration is stable, where sources systematically disagree, and whether an apparently good global match hides regional or categorical failures |
| Topic-driver framework, Figure 10 | Words as frequency-scaled bubbles; seed concepts through colour; semantic similarity through distance and clustering; accepted terms through a filter container | Which machine-generated word associations match the researcher's intended meaning, which are ambiguous, and why the proposed drought–civilian-abuse link remains weak |
| Reuters drone investigation | Drone roles, ranges, scale, and operational stages through scroll-driven diagrams, maps, arrows, and annotated imagery | How different drones form a reconnaissance-to-strike system, how tactical and strategic ranges differ, and how the sensor-to-strike process is compressed |
| *The Guardian* territorial-change story | Monthly change through a common time axis; control and advance through coloured geographic areas and annotations | Why November 2024 was exceptional, where the changes occurred, and why square kilometres gained do not directly equal strategic value |
| ACLED Conflict Index Instagram map | Countries through geographic position; inclusion and severity through categorical colour and emphasis | Where severe conflicts form regional clusters and cross-border belts, while also revealing that similar categories may arise from different dimensions of severity |
| Forbes India human-toll pictogram | Death ranges through printed values and repeated human symbols; editorial priority through red/grey contrast and photographs | The order-of-magnitude difference among the selected wars and the decisive effect of including indirect deaths in the post-9/11 estimate |
| Statista Ukrainian-refugee chart | Host countries through aligned horizontal bars, descending order, and exact value labels | The concentration of registrations in a small leading group, the steep falloff after the top three, and the comparability problem created by different reporting dates |
| UCDP candidate-events grid map | Lethal events aggregated into uniform spatial cells | Hotspots, corridors, isolated theatres, and cross-border continuities that are not apparent from coordinate rows or country totals |
| Washington Post sonic narrative | Attack frequency, interceptions, loudness, and siren duration through charts synchronized with documentary audio | Escalation as an acoustic and temporal burden: repeated disrupted nights, uncertainty during alarms, and persistent threat even when many drones are intercepted |
| *War Up Close* | Damaged sites through navigable 360-degree panoramas, aerial footage, and reconstructed 3D geometry | Spatial continuity, orientation, proximity, and the relationship between damaged rooms, buildings, streets, and neighbourhoods—without claiming statistical representativeness |

### General conclusion

The same type of raw record—date, location, actor, event type, fatality count, displacement status, territorial control, or damage classification—can support very different representations. Simplification is not inherently a weakness. It becomes problematic when the information removed is necessary to interpret the claim responsibly.

The appropriate design question is therefore not only “Which chart represents these data?” but:

> **Who is expected to view the representation, what should they be able to learn or do, and which contextual information must remain visible for that interpretation to be valid?**

Across all formats, responsible war visualization should make the source and time period explicit, distinguish observations from estimates, avoid treating fatality figures as exact when the source does not support that precision, provide definitions for categories such as civilian targeting or territorial control, and use emotional imagery without turning suffering into spectacle.
