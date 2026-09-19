# 1. Focus del progetto

**Tema:** War
**Dataset:** UCDP Georeferenced Event Dataset (GED) Global
**Caso principale:** Sudan, idealmente **2023-2025**
**Focus analitico:** rapporto tra combattimento armato e violenza unilaterale contro i civili.

Titolo di lavoro:

> **From Battlefield to Civilians: Patterns of One-Sided Violence in the Sudan Conflict**

L'idea centrale non è dimostrare che una fazione “perde e quindi attacca i civili”, perché il GED non permette di osservare direttamente decisioni strategiche o perdita di territorio.

Il progetto cerca invece di mostrare **quando, dove e per quali attori il conflitto cambia forma**, passando da scontri tra attori armati a violenza deliberata contro civili.

---

# 2. Domanda di ricerca principale

Userei questa come formulazione definitiva:

> **When and where do armed actors shift from direct combat toward deliberate violence against civilians, and what temporal, spatial, and actor-specific patterns accompany this transition?**

In italiano:

> **Quando e dove gli attori armati passano dal combattimento diretto alla violenza deliberata contro i civili, e quali pattern temporali, geografici e specifici degli attori accompagnano questa transizione?**

La parola chiave è quindi:

> **shift**

Non necessariamente “causa”, “rappresaglia” o “decisione tattica”.

---

# 3. Sotto-domande

Le quattro rappresentazioni web corrispondono a quattro sotto-domande.

### Web 1 - WHEN?

> Come cambia nel tempo la composizione della violenza?

Vogliamo identificare:

* periodi dominati da combattimento;
* periodi dominati da one-sided violence;
* escalation;
* eventuali cambiamenti nella composizione della violenza.

---

### Web 2 - WHERE?

> Dove si concentra la violenza e come cambia geograficamente nel tempo?

Vogliamo capire:

* hotspot;
* concentrazione spaziale;
* spostamento del conflitto;
* aree in cui la violenza contro civili diventa dominante.

---

### Web 3 - WHO?

> Quali attori presentano profili di violenza differenti?

Confrontiamo gli attori in termini di:

* combattimento;
* violenza contro civili;
* mortalità;
* durata;
* dispersione geografica;
* frequenza degli eventi.

---

### Web 4 - BEFORE / AFTER?

> Cosa accade attorno ai principali episodi di violenza contro civili?

Questa è la visualizzazione che più direttamente affronta l'ipotesi iniziale.

Vogliamo verificare visivamente se i principali picchi di violenza contro civili sono preceduti o accompagnati da:

* aumento degli scontri;
* aumento delle fatalità;
* aumento della pressione militare osservabile;
* cambiamenti geografici;
* cambiamenti nel tipo di violenza.

Non parleremo però automaticamente di causalità.

---

# 4. Struttura narrativa del sito

Le quattro rappresentazioni non dovrebbero essere presentate come grafici indipendenti.

Le organizzerei come una storia:

```text
FROM BATTLEFIELD TO CIVILIANS
          │
          ▼
01 - WHEN?
How does violence change over time?
          │
          ▼
02 - WHERE?
How does violence move across space?
          │
          ▼
03 - WHO?
Which actors behave differently?
          │
          ▼
04 - BEFORE / AFTER?
What surrounds peaks of civilian violence?
          │
          ▼
CONCLUSION
What did visualization reveal?
```

Questo crea una progressione:

> **tempo → spazio → attori → relazione tra eventi**

che risponde molto bene all'obiettivo del corso.

---

# 5. Web visualization 1 - Conflict Timeline

## Obiettivo

Mostrare l'evoluzione del conflitto e il rapporto tra tipi di violenza.

## Possibile rappresentazione

Una combinazione di:

* streamgraph;
* stacked area;
* horizon chart;
* event timeline.

La sceglierei dopo aver visto effettivamente la distribuzione dei dati.

### Variabili

Principalmente:

* `date_start`;
* `type_of_violence`;
* `best`;
* `deaths_civilians`;
* actor;
* numero di eventi.

### Aggregazione

Probabilmente:

> **settimana**

Eventualmente mese se il dataset risulta troppo rumoroso.

### Interazione

L'utente può:

* filtrare per attore;
* filtrare tipologia;
* cambiare periodo;
* fare hover;
* selezionare una finestra temporale.

### Knowledge gained

La rappresentazione dovrebbe permettere di dire cose del tipo:

> “La composizione della violenza non rimane costante: determinati periodi di intensa attività militare sono seguiti o accompagnati da una maggiore presenza di one-sided violence.”

---

# 6. Web visualization 2 - Spatio-temporal Conflict Map

## Obiettivo

Mostrare dove il conflitto cambia forma.

## Rappresentazione

**Hexbin map temporale interattiva.**

Ogni esagono aggrega eventi geograficamente vicini.

Possibili encoding:

* altezza → intensità;
* colore → composizione della violenza;
* saturazione → intensità;
* tooltip → eventi, fatalità, attori;
* tempo → slider.

La versione 3D può essere testata, ma non deve essere obbligatoria.

Se il 3D riduce la leggibilità, si usa una mappa 2D.

### Interazione

* time slider;
* play animation;
* filtro attori;
* filtro tipo di violenza;
* hover;
* zoom;
* selezione temporale sincronizzata con Web 1.

### Knowledge gained

Per esempio:

> la violenza contro civili non segue necessariamente la stessa distribuzione geografica degli scontri militari.

Questo sarebbe un risultato interessante perché distingue:

> **battlefield geography**

da

> **civilian-targeting geography**.

---

# 7. Web visualization 3 - Actor Violence Fingerprints

## Obiettivo

Confrontare il comportamento dei diversi attori.

## Visualizzazione principale candidata

**Parallel Coordinates.**

Ogni linea rappresenta un attore.

Possibili assi:

1. combat events;
2. combat fatalities;
3. one-sided events;
4. civilian fatalities;
5. share of one-sided events;
6. geographic spread;
7. active months;
8. events per active month.

L'utente può evidenziare un attore facendo hover/click.

Potremmo eventualmente affiancare un piccolo elemento grafico più leggibile quando viene selezionato un actor.

### Knowledge gained

La rappresentazione dovrebbe far emergere qualcosa come:

> due attori ugualmente attivi militarmente possono avere profili radicalmente diversi in termini di violenza contro civili.

Questo è esattamente il tipo di informazione difficilmente visibile in una tabella.

---

# 8. Web visualization 4 - Event-centred temporal analysis

Questa è la rappresentazione analiticamente più importante.

## Obiettivo

Analizzare quello che succede prima e dopo i principali picchi di violenza contro civili.

### Metodo

Identifichiamo periodi chiave:

```text
T0 = peak of one-sided violence
```

e analizziamo una finestra:

```text
T-8 ... T-1 | T0 | T+1 ... T+8
```

per esempio in settimane.

Poi allineiamo più episodi rispetto a `T0`.

### Possibili metriche

Prima/dopo il picco:

* combat events;
* battle fatalities;
* civilian fatalities;
* number of active locations;
* spatial dispersion;
* type-of-violence mix.

### Rappresentazione

Potrebbe diventare:

* aligned timeline;
* heatmap temporale;
* small multiples;
* ridgeline;
* event-study-like plot.

Non dobbiamo decidere la forma definitiva prima di osservare i dati.

### Knowledge gained

Questa dovrebbe permettere l'affermazione principale del progetto.

Per esempio:

> “I principali picchi di one-sided violence tendono a verificarsi in prossimità di periodi caratterizzati da una maggiore intensità del combattimento.”

Oppure potremmo scoprire il contrario.

È importante: **il risultato non deve essere deciso prima dell'analisi**.

---

# 9. Instagram

Instagram deve raccontare, non permettere esplorazione.

Userei immagini **1080×1350, 4:5**, principalmente carousel.

## Instagram 1 - Temporal Story

Tema:

> **When war turns against civilians**

Possibile sequenza:

**Slide 1 - Hook**

Titolo + elemento grafico molto semplice.

**Slide 2 - Conflict**

Timeline del combattimento.

**Slide 3 - Shift**

Comparsa/aumento della one-sided violence.

**Slide 4 - Actors**

Confronto dei principali attori.

**Slide 5 - Finding**

Messaggio principale + numero/statistica rilevante.

---

# 10. Instagram 2 - Geographic Story

Tema:

> **How violence moved across Sudan**

Possibile struttura:

**Slide 1**

Mappa generale.

**Slide 2**

Early conflict.

**Slide 3**

Escalation.

**Slide 4**

Civilian violence peak.

**Slide 5**

Confronto geografico finale.

Qui userei **small multiple maps**, sfruttando lo swipe come sequenza temporale.

---

# 11. X post 1 - Main temporal finding

Su X farei un'immagine singola molto più condensata.

Formato prevalentemente orizzontale.

Titolo possibile:

> **When battlefield violence rises, what happens to civilians?**

Visualizzazione:

* due temporal layers;
* combattimento;
* civilian targeting;
* annotazione del periodo significativo.

Pochissimo testo.

Il post stesso può fornire il resto del contesto.

---

# 12. X post 2 - Actor comparison

Qui userei:

> **slopegraph / dumbbell / diverging actor comparison**

Massimo 5-6 attori.

Per esempio:

```text
More battle-oriented ←────────────→ More civilian-oriented

Actor A        ●
Actor B                              ●
Actor C                  ●
Actor D                       ●
```

Molto leggibile anche mentre l'utente scorre rapidamente il feed.

---

# 13. Stack tecnologico

Userei una separazione netta tra **data processing** e **visualizzazione**.

## Data processing

### Python

* pandas;
* numpy;
* geopandas;
* shapely;
* eventualmente scipy;
* eventualmente h3 se scegliamo aggregazione esagonale.

Python si occupa di:

* filtrare Sudan;
* ripulire date;
* normalizzare attori;
* aggregare settimane;
* calcolare metriche;
* creare dataset spaziali;
* costruire finestre temporali;
* esportare CSV/JSON/GeoJSON.

---

## Web

### D3.js

Per:

* timeline;
* parallel coordinates;
* temporal analysis;
* custom interactive graphics.

### MapLibre GL JS

Per la mappa di base.

### deck.gl

Per:

* hexbin;
* aggregation;
* eventuale extrusion;
* visualizzazione geospaziale pesante.

---

## Social export

Le immagini social possono essere generate anch'esse con codice.

Pipeline:

```text
HTML/CSS/D3
     ↓
fixed-size social page
     ↓
Playwright
     ↓
PNG
```

Per esempio:

```text
instagram/
  post_01/
    slide_01.html
    slide_02.html
    ...
```

Playwright genera automaticamente:

```text
slide_01.png
slide_02.png
...
```

Questo soddisfa bene il requisito di riproducibilità.

---

# 14. Pipeline dei dati

Terrei sempre separati raw e derived data.

```text
UCDP GED
   │
   ▼
RAW DATA
   │
   ▼
Python cleaning
   │
   ├─────────────┐
   ▼             ▼
event data    aggregated data
   │             │
   ▼             ▼
web datasets / social datasets
```

Possibile struttura:

```text
data/
├── raw/
│   └── ucdp_ged.csv
│
├── processed/
│   └── sudan_events.csv
│
└── derived/
    ├── weekly_conflict.csv
    ├── spatial_hex.csv
    ├── actor_profiles.csv
    └── event_windows.csv
```

---

# 15. Dataset associato a ogni rappresentazione

Questo è importante anche per la consegna.

| Representation       | Dataset                   |
| -------------------- | ------------------------- |
| Web 1 - Timeline     | `weekly_conflict.csv`     |
| Web 2 - Map          | `spatial_hex.csv`         |
| Web 3 - Actors       | `actor_profiles.csv`      |
| Web 4 - Before/After | `event_windows.csv`       |
| Instagram 1          | derivato da Web 1 + Web 4 |
| Instagram 2          | derivato da Web 2         |
| X 1                  | derivato da Web 4         |
| X 2                  | derivato da Web 3         |

Idealmente i social **riutilizzano la stessa analisi**.

Non creerei quattro analisi aggiuntive.

---

# 16. Metriche da derivare

Non userei solo `deaths_civilians`.

Creerei almeno:

```text
event_count
fatalities
civilian_fatalities
combat_events
one_sided_events
active_locations
active_weeks
```

e metriche derivate.

### One-sided violence share

```text
one_sided_events
-----------------
all_events
```

### Civilian fatality share

```text
civilian_fatalities
-------------------
total_fatalities
```

### Actor civilian-targeting ratio

Da definire con attenzione dopo avere analizzato la distribuzione.

### Geographic spread

Possibili misure:

* numero di celle H3;
* numero di località;
* area coperta;
* distanza media tra eventi.

---

# 17. Granularità temporale

Default:

> **week**

È probabilmente il compromesso migliore.

Giorno:

* troppo rumoroso.

Mese:

* rischia di nascondere transizioni brevi.

Ma il preprocessing dovrebbe permettere facilmente:

```text
daily
weekly
monthly
```

così possiamo verificare empiricamente quale funzioni meglio.

---

# 18. Cose da NON assumere

Questi diventano veri e propri vincoli metodologici.

Non possiamo automaticamente interpretare:

```text
high deaths_a
```

come:

```text
actor A is losing
```

Non possiamo automaticamente interpretare una sequenza:

```text
battle → civilians
```

come:

```text
military defeat → deliberate retaliation
```

Non possiamo parlare di:

* intenzioni;
* strategie;
* vendetta;
* perdita territoriale;

a meno che queste informazioni vengano ottenute da una fonte esterna.

Il GED permette invece di parlare di:

* associazioni;
* sequenze;
* concentrazioni;
* cambiamenti;
* escalation osservabile;
* pattern.

---

# 19. Incertidudine nei dati

Dovremo considerare anche:

```text
low
best
high
```

per le fatalità.

La visualizzazione principale può probabilmente usare `best`, ma il sito/report deve spiegare che:

> le fatalità UCDP sono stime.

Eventualmente possiamo mostrare l'incertezza nei tooltip o in una visualizzazione secondaria.

---

# 20. Etica visiva

Dato l'argomento eviterei una visual language troppo “militare” o spettacolare.

Quindi niente:

* explosion effects;
* blood splashes;
* crosshair;
* videogame aesthetics;
* animazioni decorative delle morti.

Preferirei:

* cartografia sobria;
* tipografia forte;
* colori funzionali;
* annotazioni;
* storytelling documentario.

---

# 21. Cosa deve emergere alla fine

La conclusione dovrebbe poter rispondere esplicitamente alla domanda del professore:

> **What knowledge did visualization reveal that was not visible in the original table?**

Una risposta ideale potrebbe assumere questa forma:

> The visualizations revealed that violence against civilians was neither spatially nor temporally uniform. Specific actors displayed distinct violence profiles, and major episodes of one-sided violence clustered around particular phases and locations of the conflict. Aligning these episodes with surrounding military activity exposed recurring temporal relationships that were not apparent from individual event records.

Naturalmente questa sarà la struttura della conclusione, non il risultato deciso in anticipo.

---

# 22. Architettura concettuale finale

Tutto il progetto può essere sintetizzato così:

```text
                         RESEARCH QUESTION
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
        WHEN?                WHERE?                WHO?
          │                    │                    │
       Web 01                Web 02               Web 03
     Timeline                 Map                 Actors
          │                    │                    │
          └────────────────────┼────────────────────┘
                               │
                          BEFORE/AFTER?
                               │
                            Web 04
                               │
                               ▼
                        MAIN INSIGHT
                               │
              ┌────────────────┴───────────────┐
              │                                │
          Instagram                            X
      narrative / carousel              concise evidence
```

Questa sarebbe la **versione consolidata del progetto**: una domanda unica, quattro viste complementari, social derivati dai risultati principali, una pipeline riproducibile e una distinzione chiara tra ciò che i dati mostrano e ciò che non possiamo inferire.
