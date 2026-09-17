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

### Representation

**Description:** The interface combines multiple coordinated views rather than presenting one definitive chart. Its principal components include:

- **ParaMultiples**, a matrix of small histograms showing how spatial and temporal matching parameters affect the number and quality of matches;
- **TempMap**, which places events on a map and links them to a radial temporal histogram;
- **EventCharts**, hierarchical stacked bar charts for comparing source datasets, actor types, event types, and matched versus unique records;
- **MatchTree**, a radial tree showing how matches are distributed across hierarchical categories;
- brushing, filtering, highlighting, drill-down, undo/redo, and data export.

<!-- Add one or more representations here.

Suggested material:
- overview of the complete VEHICLE interface;
- ParaMultiples view;
- TempMap or MatchTree detail.

![Figure 1 — VEHICLE overview](images/paper-1-vehicle-overview.png)
![Figure 2 — VEHICLE detail](images/paper-1-vehicle-detail.png)
-->

#### Knowledge gained beyond a table

The coordinated views reveal whether agreement and disagreement between sources are systematic. The analyst can see, for example, whether unmatched events cluster in a particular country, period, source, or branch of an event taxonomy. The parameter matrix also shows whether a small change in the allowed spatial or temporal distance produces a disproportionate change in the integrated dataset.

This knowledge is difficult to obtain from rows alone because the relevant pattern is relational: it concerns the interaction among geography, time, source coverage, event classification, and matching parameters. The visualization exposes not just what is in the integrated dataset, but how the dataset was constructed and where that construction may be fragile.

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
| *Expert Exploranation for Communicating Scientific Methods — A Case Study in Conflict Research* | Benedikt Mayer, Karsten Donnay, Kai Lawonn, Bernhard Preim, and Monique Meuschke | An interactive visual-storytelling approach that combines explanation and exploration to communicate a causal-inference method to conflict researchers. Published in *Computers & Graphics*, 120, 103937, 2024. | [Journal article](https://doi.org/10.1016/j.cag.2024.103937) · [Open preprint](https://arxiv.org/abs/2405.14345) |

See the local copy of the paper [here](papers/expert-exploranation-conflict-research.pdf).

### Context

Scientific methods are normally communicated through formulas, technical prose, and static diagrams. These forms are precise, but they can make a method difficult to understand for researchers entering a neighboring field. The authors investigate whether an interactive visual story can explain a causal-inference method without removing the assumptions that specialists need to evaluate.

The case study focuses on **matched wake analysis**, a method for estimating whether a treatment event changes subsequent conflict activity. Treatment cases are matched with comparable control observations in space and time, and their post-treatment trajectories are compared.

### Representation

**Description:** The authors call the result an *expert exploranation*: a representation that combines a guided explanatory sequence with opportunities for the reader to manipulate parameters and inspect examples. The story uses maps, time-based diagrams, animated transitions, matched treatment/control cases, before-and-after windows, annotations, and stepwise disclosure of the method.

Instead of opening with the entire statistical method, the interface introduces one conceptual step at a time. Exploratory controls are added where they help the reader test the explanation rather than merely accept it.

<!-- Add one or more representations here.

Suggested material:
- one explanatory step from the interactive story;
- the treatment/control matching view;
- the before/after or wake-comparison view.

![Figure 3 — Expert exploranation overview](images/paper-2-exploranation-overview.png)
![Figure 4 — Matched wake analysis view](images/paper-2-matched-wake.png)
-->

#### Knowledge gained beyond a table

A result table might report an estimated treatment effect, but it would not make the inferential construction easy to inspect. The visual story reveals:

- how treatment and comparison cases are selected;
- whether matched cases appear comparable before treatment;
- how spatial radius and temporal windows define the analysis;
- how post-treatment divergence produces the inferred effect;
- where methodological choices enter the result.

The main gain is procedural knowledge. The reader understands not only the output of the method, but also the sequence of decisions that makes the output possible. This supports a more critical question than “what is the effect?”: “compared with what, over which area and period, and under which assumptions?”

#### From raw information to representation

1. Georeferenced conflict-event records provide event dates, locations, and relevant event categories.
2. A treatment event and its spatial-temporal wake are defined.
3. Comparable non-treatment observations are selected through matching.
4. Outcomes before and after treatment are aligned and compared.
5. The method is decomposed into a narrative sequence, with interactions exposing important analytical choices.

#### Audience and format

The audience is expert but not assumed to know the specific method. Consequently, the representation retains methodological rigor while controlling the order in which complexity appears. Unlike a conventional dashboard, it provides editorial guidance. Unlike a general-public explainer, it does not hide the matching logic or causal assumptions.

### Information Sources and Tools Used

- **Data type:** georeferenced and time-stamped conflict-event data used in matched wake analysis.
- **Analytical method:** matched wake analysis for causal inference in spatial-temporal conflict research.
- **Representation method:** interactive visual storytelling, progressive disclosure, animation, maps, timelines, and controlled exploration.
- **Design process:** three versions of the story were developed and evaluated with conflict experts who differed in prior familiarity with the method.
- **Primary sources:** [Computers & Graphics article](https://doi.org/10.1016/j.cag.2024.103937), [open preprint](https://arxiv.org/abs/2405.14345), and the author's [project overview](https://www.benediktmayer.com/).

---

## Responsive Web Article 1

| **Title** | **Author(s)** | **Description** | **Link** |
|---|---|---|---|
| *How Drone Combat in Ukraine Is Changing Warfare* | Reuters Graphics; Mariano Zafra, Max Hunder, Anurag Rao, Sudev Kiyada, and collaborators | A responsive visual investigation explaining the roles, operation, range, cost, and tactical integration of drones in the war in Ukraine. | [Reuters article](https://www.reuters.com/graphics/UKRAINE-CRISIS/DRONES/dwpkeyjwkpm/) |

### Context

The article was published in March 2024, when drones had become central to reconnaissance, artillery guidance, direct attack, and long-range strikes in Ukraine. The raw material was heterogeneous: more than 50 attack videos, technical UAV research, interviews with manufacturers, soldiers and officials, and information about different drone types and battlefield roles.

The challenge was therefore not simply to plot a dataset. Reuters needed to explain a technological and tactical system to a mixed audience that included citizens, journalists, professionals, and policy-oriented readers.

### Representation

**Description:** The article uses a scroll-driven sequence of illustrations, diagrams, maps, annotated images, motion, and proportional comparisons. Drone types are introduced progressively and placed in operational context: observation, target detection, communication, artillery direction, attack, and long-range penetration.

The reader encounters the system in stages rather than through one dense overview. The responsive design can replace wide desktop arrangements with stacked or simplified mobile compositions while preserving the narrative order.

<!-- Add one or more representations here.

Suggested material:
- an overview showing different drone roles;
- a range or scale comparison;
- a scroll sequence explaining the reconnaissance-to-strike process.

![Figure 5 — Reuters drone system](images/web-1-reuters-drone-system.png)
![Figure 6 — Reuters range comparison](images/web-1-reuters-drone-range.png)
-->

#### Knowledge gained beyond a table

A table could compare model, cost, speed, payload, and range, but it would leave each drone as an isolated object. The web story reveals the operational relationships among them. Small reconnaissance drones, first-person-view attack drones, artillery, communications, and long-range systems form a connected battlefield process.

The user also gains a spatial sense of what “near the front” and “hundreds of kilometres away” mean. The representation turns specifications into tactical consequences: low-cost devices can extend vision, shorten the sensor-to-strike cycle, and permit attacks at multiple distances.

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

### Representation

**Description:** The article combines a time series of monthly territorial change with regional maps, control-area overlays, geographic annotations, and contextual comparisons. The sequence moves from the overall monthly trend to Donetsk and then to the character of the captured territory and settlements.

<!-- Add one or more representations here.

Suggested material:
- monthly territorial-change chart;
- regional map of gains in Donetsk;
- comparison between land area and the location of major settlements or infrastructure.

![Figure 7 — Monthly territorial change](images/web-2-guardian-monthly-change.png)
![Figure 8 — Territorial gains map](images/web-2-guardian-map.png)
-->


#### Knowledge gained beyond a table

A table can show that Russia took approximately 1,202 square kilometres in November 2024. The maps reveal where those gains occurred and what kind of territory was involved. Most of the area was in Donetsk and much of it was agricultural land, forest, or fields rather than major urban or transport infrastructure.



The combined views therefore prevent a simplistic interpretation of area alone. The month was quantitatively severe, but the strategic value of territory was uneven. The reader can distinguish magnitude from military significance and can see the incremental spatial pattern of advance.

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
| *The 50 Countries Most Impacted by Violent Conflict* | ACLED | An Instagram map derived from the ACLED Conflict Index, showing the fifty countries and territories most affected by violent conflict. | [Instagram post](https://www.instagram.com/p/DMMMCKBsBXP/) |

### Context

ACLED's event database contains detailed records of political violence with dates, locations, actors, event types, fatalities, and other attributes. The Conflict Index transforms those records into four higher-level dimensions: deadliness, danger to civilians, geographic diffusion, and armed-group fragmentation.

The Instagram post reduces this multidimensional analytical product to a visually immediate global overview for citizens encountering the graphic in a fast-moving feed.

### Representation

**Description:** The lead representation is a world map that highlights the top fifty conflict-affected countries and organizes them by severity. A strong title, limited palette, geographic overview, short explanatory copy, and source branding make the result readable at phone size.

<!-- Add one or more representations here.

Suggested material:
- the lead map;
- additional carousel slides explaining the index dimensions or leading countries, if present.

![Figure 9 — ACLED Conflict Index Instagram map](images/instagram-1-acled-conflict-index.png)
-->

#### Knowledge gained beyond a table

A ranked table would communicate order, but the map reveals geographic concentration and adjacency. It becomes possible to see that severe conflict is not evenly distributed and that high-severity cases form regional belts and clusters.

The underlying index also communicates that conflict severity is multidimensional. A country may be especially deadly, dangerous for civilians, geographically widespread, or fragmented among many armed groups. The map provides the overview; the index categories explain why countries with different conflict structures can all appear among the most severe cases.

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
| *Millions of Syrians Have Returned Home — Here Is What You Need to Know* | UNHCR, the UN Refugee Agency | A citizen-facing Instagram post that condenses displacement and return information into a short visual narrative about Syrian families returning after years of conflict. | [Instagram post](https://www.instagram.com/p/DQEnqhyidK6/) |

### Context

Displacement data are normally stored as country-period totals, registered populations, movements, demographic groups, and operational indicators. Such tables are valuable to humanitarian professionals but do not automatically communicate what “return” means for families or communities.

UNHCR reframes this information around a public-facing question: what happens after people leave camps or places of refuge and return home? The post connects aggregate movement with the continuing need to restore housing, services, security, and daily life.

### Representation

**Description:** The post uses a compact mobile-first composition in which a strong opening statement leads into short explanatory units. Large-number statements and concise text are combined with human-centred imagery so that the statistical phenomenon is linked to lived consequences.

<!-- Add one or more representations here.

Suggested material:
- the opening slide;
- one quantitative slide;
- one slide connecting return figures to housing, services, or recovery.

![Figure 10 — UNHCR Syria return post, opening](images/instagram-2-unhcr-opening.png)
![Figure 11 — UNHCR Syria return post, detail](images/instagram-2-unhcr-detail.png)
-->

#### Knowledge gained beyond a table

A table may show how many people returned and when, but the post makes a conceptual distinction visible: **return is not the same as recovery**. Movement back to a place of origin does not by itself indicate that housing, education, healthcare, livelihoods, or safety have been restored.

The representation also shifts attention from an abstract population flow to a process experienced by households. This adds interpretive knowledge that the raw count alone cannot supply: the endpoint of displacement statistics may be the beginning of reconstruction.

#### From raw information to representation

1. UNHCR and partner systems collect population, displacement, registration, and return information.
2. The material is reduced to a small set of public-relevant facts about scale, direction, and consequences.
3. Technical categories are rewritten as short statements.
4. Statistics are combined with human-centred imagery and a slide-by-slide hierarchy.
5. Additional operational detail remains available through UNHCR's data portals and linked resources.

#### Audience and format

The representation is intended for citizens rather than analysts. It uses emotional proximity and short text to make the topic legible within seconds. The cost of this accessibility is a loss of methodological detail, confidence ranges, and granular geographic comparison. The post is effective when treated as an entry point to the evidence rather than a substitute for the full humanitarian dataset.

### Information Sources and Tools Used

- **Information sources:** UNHCR operational data and reporting concerning Syrian displacement and return.
- **Supporting data portal:** [Syria Regional Refugee Response](https://data.unhcr.org/en/situations/syria).
- **Representation tools:** mobile-first editorial graphic design and documentary imagery; the exact software is not disclosed.
- **Primary source:** [UNHCR Instagram post](https://www.instagram.com/p/DQEnqhyidK6/).

---

## X Post 1

| **Title** | **Author(s)** | **Description** | **Link** |
|---|---|---|---|
| *Ukraine by the Numbers, 6–12 September 2025* | ACLED | A compact weekly conflict update combining event totals, civilian-targeting incidents, fatalities, and changes from the previous week. | [Post on X](https://x.com/ACLEDINFO/status/1969318111577805306) |

### Context

ACLED continually publishes event-based monitoring of the war in Ukraine. The underlying records contain many variables and thousands of observations. On X, the goal is not open-ended exploration but rapid situational awareness: what changed during one week, and which indicators deserve attention?

### Representation

**Description:** The post compresses one reporting window into a small collection of headline indicators. Counts and week-on-week percentage changes are visually prioritized, supported by a map or compact branded card. The text and graphic are designed to be understood without opening a dashboard.

<!-- Add one or more representations here.

Suggested material:
- screenshot of the complete X post;
- attached weekly map or indicator card.

![Figure 12 — ACLED weekly Ukraine update](images/x-1-acled-ukraine-week.png)
-->

#### Knowledge gained beyond a table

The post makes the selected week function as an analytical unit. The reader immediately sees whether overall political violence, violence targeting civilians, and related fatalities moved in the same direction or diverged from the previous week.

This supports a rapid distinction between frequency and human impact. A week can contain many conflict events without an equivalent rise in civilian targeting, or a smaller number of incidents can produce a severe fatality outcome. Visual hierarchy makes these relationships visible more quickly than scanning a table of weekly values.

#### From raw information to representation

1. Event records are filtered to Ukraine and the specified seven-day period.
2. Events are grouped into a small set of monitoring indicators.
3. Totals are compared with the preceding week.
4. Only the most newsworthy counts and changes are retained.
5. The result is encoded as a compact card and short post suitable for immediate circulation.

#### Audience and format

X favours topicality, compression, and shareability. The representation behaves like a visual claim rather than a complete analysis. It gives citizens and journalists a fast update, while the link to ACLED's monitor allows specialists to inspect definitions and a broader time series. The format is successful when the reporting window and source are explicit.

### Information Sources and Tools Used

- **Data:** ACLED event data and the Ukraine Conflict Monitor.
- **Transformations:** weekly filtering, category aggregation, fatality totals, and comparison with the previous week.
- **Representation tools:** a static social-media graphic produced from ACLED's monitoring workflow; the exact design software is not specified.
- **Sources:** [X post](https://x.com/ACLEDINFO/status/1969318111577805306) and [ACLED Ukraine Conflict Monitor](https://acleddata.com/monitor/ukraine-conflict-monitor).

---

## X Post 2

| **Title** | **Author(s)** | **Description** | **Link** |
|---|---|---|---|
| *UCDP Candidate Events Data: Lethal Events at PRIO-GRID Level* | Uppsala Conflict Data Program | An X post announcing updated candidate-event data and showing lethal organized-violence events on a standardized spatial grid. | [Post on X](https://x.com/UCDP/status/1883788484592415223) |

### Context

UCDP Candidate Events provide near-real-time records that have not yet completed the full annual data-release process. Each event can include a date, location, actors, type of organized violence, and estimated fatalities. Publishing every row in a post would be impossible, while a global total would remove spatial structure.

The post aggregates lethal events to PRIO-GRID cells, creating a consistent global spatial unit for a rapid map-based update.

### Representation

**Description:** The attached map turns many event rows into marks or intensities on a regular geographic grid. The post text states the temporal coverage and directs readers to the higher-resolution product or data source.

<!-- Add one or more representations here.

Suggested material:
- screenshot of the X post;
- higher-resolution version of the PRIO-GRID event map.

![Figure 13 — UCDP lethal candidate events map](images/x-2-ucdp-candidate-events.png)
-->

#### Knowledge gained beyond a table

The map reveals concentration, diffusion, and regional clustering. It shows whether lethal violence is confined to a few local cells, distributed along borders or corridors, or spread across multiple theatres. These spatial relationships would require extensive sorting and coordinate comparison in a table.

The regular grid also avoids implying that all events belong naturally to administrative units. It supports comparison across national borders and makes areas with repeated lethal activity visually salient.

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
| *Blood Swept Lands and Seas of Red* | Artist Paul Cummins and designer Tom Piper, presented by Historic Royal Palaces | A public installation of 888,246 ceramic poppies in the Tower of London moat, with one poppy representing each British and Colonial military fatality at the front during the First World War. | [Historic Royal Palaces](https://www.hrp.org.uk/tower-of-london/history-and-stories/the-tower-remembers/) |

### Context

The installation marked the centenary of the outbreak of the First World War. Between July and November 2014, volunteers progressively filled the Tower of London moat with handmade red ceramic poppies.

The source information could be expressed as a single number: 888,246 military fatalities. The artists instead converted the total into a one-to-one physical representation occupying a historically significant public space.

### Representation

**Description:** Each fatality is represented by one ceramic poppy. Repetition, accumulation, colour, physical scale, and the architecture of the Tower create the visualization. The installation developed over time as more poppies were added, so visitors experienced both the final magnitude and the process of accumulation.

<!-- Add one or more representations here.

Suggested material:
- wide view of the completed moat;
- close view showing individual ceramic poppies;
- image of the installation during its progressive growth.

![Figure 14 — Completed installation](images/alternative-1-poppies-overview.png)
![Figure 15 — Individual poppies](images/alternative-1-poppies-detail.png)
-->

#### Knowledge gained beyond a table

The installation gives perceptual form to a number that is otherwise difficult to imagine. A table communicates the total precisely but does not show how 888,246 individual units occupy space. The repeated objects allow the audience to move between collective magnitude and individual loss.

The work also reveals accumulation. Visitors can understand the total not as one abstract mass but as the result of hundreds of thousands of separate deaths. Physical presence, walking time, viewing distance, and the contrast between the red field and the stone fortress produce embodied knowledge that a conventional chart cannot reproduce.

#### From raw information to representation

1. A historical military-fatality total is selected.
2. A strict one-to-one mapping is defined: one fatality equals one ceramic poppy.
3. Hundreds of thousands of individual objects are manufactured.
4. The objects are progressively installed in the Tower moat.
5. The audience perceives the count through area, density, repetition, and bodily movement.

#### Audience and format

The work targets the general public and visitors rather than analysts. Numerical comparison is secondary to remembrance, magnitude, and emotional reflection. The physical encoding is intentionally inefficient as data storage: its value lies in making scale experiential and in treating the unit as an individual memorial object.

### Information Sources and Tools Used

- **Information source:** the historical count of British and Colonial military fatalities at the front during the First World War.
- **Physical encoding:** 888,246 handmade ceramic poppies, one per fatality.
- **Production:** ceramic manufacture, landscape installation, volunteer participation, and progressive public display.
- **Sources:** [Historic Royal Palaces](https://www.hrp.org.uk/tower-of-london/history-and-stories/the-tower-remembers/) and [Paul Cummins Ceramics](https://www.paulcumminsceramics.com/blood-swept-lands-and-seas-of-red).

---

## Alternative Paradigm Representation 2

| **Title** | **Author(s)** | **Description** | **Link** |
|---|---|---|---|
| *War Up Close — VR Museum of the War in Ukraine* | Mykola Omelchenko with Discover.ua, FreegenGroup, and project collaborators | A virtual-reality and immersive exhibition using 360-degree panoramas, drone footage, photogrammetry, and 3D models to document war damage in Ukrainian cities. | [Official project](https://warupclose.com/) |

### Context

The project documents the physical consequences of Russia's full-scale invasion of Ukraine. Its material includes destroyed residential buildings, infrastructure, streets, monuments, and public spaces. The creators present the work online, through VR headsets, and in travelling exhibitions.

Unlike a statistical conflict map, the project is not primarily designed to compare event frequencies. It records what damaged places look like from within and preserves spatial evidence for memory, communication, assessment, and possible reconstruction.

### Representation

**Description:** Viewers enter 360-degree panoramas or reconstructed 3D environments and can look around damaged sites. Drone footage adds an aerial scale, while close-range panoramas preserve surface detail and spatial continuity. Some exhibitions combine VR with physical objects and themed installations.

<!-- Add one or more representations here.

Suggested material:
- screenshot from a 360-degree panorama;
- a 3D reconstruction or drone view;
- photograph of a visitor using the VR exhibition.

![Figure 16 — War Up Close panorama](images/alternative-2-war-up-close-panorama.png)
![Figure 17 — War Up Close exhibition](images/alternative-2-war-up-close-vr.png)
-->

#### Knowledge gained beyond a table

A table can record a location, coordinates, date, building type, and damage classification. The immersive representation reveals how damage is arranged in space: the relationship between rooms, façades, streets, nearby buildings, and the surrounding urban fabric.

The viewer gains orientation, proximity, and continuity. A label such as “residential building destroyed” becomes a navigable environment in which the scale and texture of destruction can be inspected. This does not replace quantitative evidence, but it answers a different question: what does the recorded damage look and feel like as a place?

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
| Instagram | Citizens and broad public | Reduces the evidence to one main message or a short carousel | Strong hierarchy, large numbers, simplified map or chart, and human-centred imagery | Recognize and remember a pattern quickly | One salient comparison, scale, or consequence |
| X | Citizens, journalists, and news-oriented users | Narrows data to a current period, release, or observation | Compact visual claim, weekly indicators, or one map | Notice, understand, share, and follow a source | What changed now, where it is concentrated, or why an update matters |
| Alternative paradigm | Visitors and general public | Converts counts or documented places into spatial, physical, or immersive experience | One-to-one physicalization, VR, 360-degree media, and public installation | Experience magnitude, proximity, or place | What an abstract number or damaged environment means at human scale |

### How the formats portray raw information differently

Scientific papers use data as **evidence to inspect**. Their representations retain complexity because peers must be able to challenge the method and determine whether the conclusion is defensible. VEHICLE exposes source overlap and parameter sensitivity; the expert exploranation exposes how causal comparison is constructed.

Responsive web articles use data as **an explained phenomenon**. Reuters and *The Guardian* select evidence and determine the order in which it appears. The reader receives more depth than in social media, but the exploration is bounded by an editorial story.

Instagram uses data as **a visually memorable message**. The evidence is heavily reduced, and strong hierarchy is necessary because the post appears among unrelated content on a small screen. The format is effective for recognition and awareness, but important definitions must remain available in the caption or linked source.

X uses data as **a compact and current finding**. A weekly change or a newly released map can circulate quickly among citizens, journalists, and researchers. The narrow time window and strong claim improve immediacy, but they can overemphasize short-term variation unless baseline and source are clear.

Alternative paradigms use data or documentary evidence as **experience**. The Tower of London installation materializes a casualty total; *War Up Close* reconstructs damaged places. These forms are less efficient for numerical comparison but much stronger for perceiving magnitude, spatial continuity, and proximity.

### General conclusion

The same type of raw record—date, location, actor, event type, fatality count, displacement status, territorial control, or damage classification—can support very different representations. Simplification is not inherently a weakness. It becomes problematic when the information removed is necessary to interpret the claim responsibly.

The appropriate design question is therefore not only “Which chart represents these data?” but:

> **Who is expected to view the representation, what should they be able to learn or do, and which contextual information must remain visible for that interpretation to be valid?**

Across all formats, responsible war visualization should make the source and time period explicit, distinguish observations from estimates, avoid treating fatality figures as exact when the source does not support that precision, provide definitions for categories such as civilian targeting or territorial control, and use emotional imagery without turning suffering into spectacle.
