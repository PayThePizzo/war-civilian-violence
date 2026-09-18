
## Paper 2

| **Title** | **Author(s)** | **Description** | **Link** |
|---|---|---|---|
| *A Visual Analytics Framework for Identifying Topic Drivers in Media Events* | Yafeng Lu, Hong Wang, Steven T. Landis, and Ross Maciejewski | A visual-analytics framework for exploring possible links between media attention and outside event drivers, using media collections and an armed-conflict event dataset. Published in *IEEE Transactions on Visualization and Computer Graphics*, 24(9), 2501-2515, 2018. | [DOI](https://doi.org/10.1109/TVCG.2017.2752166) · [Institutional repository](https://oasis.library.unlv.edu/political_science_articles/159/) |

---

## Context: Words Matter

This paper presents a visual-analytics framework for exploring whether topics in media collections relate to possible outside event drivers. Researchers can retrieve events through related words, test possible causal links, and add annotations. They can also inspect the words behind a match and use their knowledge of the subject to refine it.

Here, we look at **Figure 10 in Section 7.2**, “Climate-Induced Unrest During Drought.” The case study asks whether the 2014 drought in the Greater Horn of Africa coincided with reports of social unrest and political violence. The analyst selects an agriculture topic from a social-unrest media collection, ACLED events labelled “violence against civilians,” and the starting terms **water**, **food**, **farmer**, and **climate**.

---

## Representation: Cluster View

Figure 10 shows the framework's **Cluster View**. It uses a force-directed bubble layout to help the analyst inspect and filter words that the system considers related in meaning.

![Cluster View](https://github.com/PayThePizzo/war-civilian-violence/blob/main/docs/phase_2/images/Paper2%20-%20ClusterView.png?raw=TRUE)

- Each circle is a word. Filled circles are the selected media keywords. Outlined circles are related words found in ACLED event descriptions by the semantic model.
- Colour shows the starting search concept: **farmer** is blue, **climate** red, **water** tan, and **food** orange.
- Circle size is proportional to how often a word appears in the event records. Large nodes such as *fire*, *air*, *water*, and *food* draw more attention than small terms around the edges.
- Distance and outlines show groups of related words. Similar words attract one another, and automatically drawn boundaries separate the groups formed by the similarity threshold and the analyst's changes.
- The dashed box on the right is the **word-selection area**. Words or smaller groups moved into it become the filters used to retrieve events.
- The faded red *climate* group shows a match that the analyst rejected. Even with the similarity threshold set to 0.75, *climate* brought up *way*, *order*, *demand*, *tension*, and *control*, rather than a clear agricultural meaning. The analyst removed it, and the event list updated.

The image shows the analyst working through the results. We can see both the associations produced by the system and the point where someone with domain knowledge decides which ones make sense.

---

## Knowledge: What can we learn from it?

A table could list the keywords and their similarity scores. The bubble groups make **ambiguity in word meaning** easier to see, showing how one search term can lead in several directions:

- searching for *climate* does not guarantee environmental or agricultural language; in conflict-event descriptions, it also brings up words about social conditions, order, demand, tension, and control;
- *food* forms a recognizable group about nourishment, but it also sits near *treat*, *centre*, and *stick*, which may have little to do with the intended meaning;
- *farmer* and *water* form smaller, more coherent groups, while circle sizes show which related words appear often and which are rare;
- moving chosen words into the selection box changes the query, so the analyst's reading of the graphic directly affects which events are retrieved.

This tells us something about both the topic and the method. The same word can mean different things in different datasets. Seeing the associations helps an expert understand why the retrieved events might be misleading, remove a problematic concept, and keep the links that fit the research question.

After these changes, the Section 7.2 case study produced an insignificant causal model (lag = 2, R² = 0.090). Looking through the retrieved events also showed that some shared words linked drought terms to violence with no stated motive. The analyst therefore found the proposed link between resource shortages and civilian abuse less plausible. The visualization helps explain that cautious conclusion by showing how weak the initial word associations were.

---

## Pipeline from raw information to the visualizations

1. The analyst selects the agriculture topic from the social-unrest media collection and ACLED events labelled violence against civilians.
2. The analysis focuses on the months around the 2014 Greater Horn of Africa drought.
3. The words *water*, *food*, *farmer*, and *climate* provide the starting points for a semantic dictionary.
4. The text is normalized, and words with related meanings are extracted from ACLED event descriptions.
5. Complete-link agglomerative clustering and a force-directed layout group similar words. Colour shows the starting keyword, and circle size shows frequency in event text.
6. The analyst adjusts the similarity threshold, moves words between groups, puts accepted terms in the selection box, and removes misleading associations such as the *climate* group.
7. The filtered events are grouped into a time series and passed to the causality model to test the hypothesis.

### Sources and tools

- **Data:** a social-unrest media collection built from 128 English-language RSS feeds, alongside ACLED conflict-event descriptions.
- **Case-study selections:** the agriculture topic, drought-related terms from March-June 2014, and ACLED violence-against-civilians events in the Greater Horn of Africa context.
- **Transformations:** text normalization, matching words by meaning, similarity-threshold filtering, complete-link agglomerative clustering, regrouping by the analyst, event aggregation, and causality modelling.
- **Representation tools:** a custom interactive force-directed Cluster View with colour-coded categories, frequency-scaled circles, group boundaries, drag-and-drop filtering, and a word-selection box.
- **Primary sources:** [IEEE DOI record](https://doi.org/10.1109/TVCG.2017.2752166) and the [University of Nevada, Las Vegas repository record](https://oasis.library.unlv.edu/political_science_articles/159/).

