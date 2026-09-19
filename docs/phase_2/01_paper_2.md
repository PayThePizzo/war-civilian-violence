
## Paper 2

| **Title** | **Author(s)** | **Description** | **Link** |
|---|---|---|---|
| *A Visual Analytics Framework for Identifying Topic Drivers in Media Events* | Yafeng Lu, Hong Wang, Steven T. Landis, and Ross Maciejewski | A visual-analytics framework for exploring possible links between media attention and outside event drivers, using media collections and an armed-conflict event dataset. Published in *IEEE Transactions on Visualization and Computer Graphics*, 24(9), 2501-2515, 2018. | [DOI](https://doi.org/10.1109/TVCG.2017.2752166) · [Institutional repository](https://oasis.library.unlv.edu/political_science_articles/159/) |

*You can read the local copy of the paper* [here](https://github.com/PayThePizzo/war-civilian-violence/blob/main/docs/phase_2/papers/A_Visual_Analytics_Framework.pdf).

---

## Context: Words Matter

This paper presents a visual-analytics framework for **exploring whether topics in media collections relate to possible outside event drivers**. 

Researchers can retrieve events through related words, test possible causal links, and add annotations. They can also inspect the words behind a match and use their knowledge of the subject to refine it.

Here, we look at **Figure 10 in Section 7.2**, "Climate-Induced Unrest During Drought." The case study asks whether the 2014 drought in the Greater Horn of Africa coincided with reports of social unrest and political violence. The analyst selects an agriculture topic from a social-unrest media collection, ACLED events labelled "violence against civilians," and the starting terms **water**, **food**, **farmer**, and **climate**.

---

## Representation: Cluster View

For context we show the full analytics interface

![Full View](https://github.com/PayThePizzo/war-civilian-violence/blob/main/docs/phase_2/images/Paper2%20-%20FullView.png?raw=TRUE)

Let us focus on the the Cluster View.

![Final Cluster](https://github.com/PayThePizzo/war-civilian-violence/blob/main/docs/phase_2/images/Paper2%20-%20FinalCluster.png?raw=TRUE)

It uses a bubble layout to help the analyst inspect and filter words that the system considers related in meaning. This introduces semantic interactions betweeen different data sources and improves the data annotation.

More in detail,

- **Each circle is a word**, and filled circles are the selected media keywords. Plus,outlined circles are related words found in ACLED event descriptions by the semantic model.
- Colour shows the starting search concept: **farmer** is blue, **climate** red, **water** tan, and **food** orange.
- **Circle size is proportional to how often a word appears in the event records**. Large nodes such as *fire*, *air*, *water*, and *food* draw more attention than small terms around the edges.
- **Distance and outlines show groups of related words**. Similar words attract one another, and automatically drawn boundaries separate the groups formed by the similarity threshold and the analyst's changes.
- The dashed box on the right is the **word-selection area**. Words or smaller groups moved into it become the filters used to retrieve events.

---

## Knowledge: What can we learn from it?

A table could list the keywords and their similarity scores. The bubble groups make **ambiguity in word meaning** easier to see, showing how one search term can lead in several directions. Furthermore, moving chosen words into the selection box changes the query, so the analyst's reading of the graphic directly affects which events are retrieved.

**This tells us the same word can mean different things in different datasets**. In fact, seeing the associations **helps an expert understand why the retrieved events might be misleading**.

---

## Pipeline from raw information to the visualizations

Taking the example of the paper to describe the phases, we can say that:

1. The analyst selects the topic from the data collections and the labels. This analysis focuses on the months around the 2014 Greater Horn of Africa drought.
2. The words *water*, *food*, *farmer*, and *climate* provide the starting points for a semantic dictionary. Then, the text is normalized, and words with related meanings are extracted from ACLED event descriptions.
3. Here, we have a complete-link agglomerative clustering and a force-directed layout to group similar words. Colour shows the starting keyword, and circle size shows frequency in event text.
4. The analyst adjusts the similarity threshold, moves words between groups, puts accepted terms in the selection box, and removes misleading associations such as the *climate* group.
5. The filtered events are grouped into a time series and passed to the causality model to test the hypothesis.

![Cluster View](https://github.com/PayThePizzo/war-civilian-violence/blob/main/docs/phase_2/images/Paper2%20-%20ClusterView.png?raw=TRUE)

### Sources and tools

- **Primary sources:** [ACLED](https://acleddata.com/), [The Climate Change Media Dataset](https://www.kaggle.com/datasets/deffro/the-climate-change-twitter-dataset), [Social-Unrest Media Collection](https://www.imf.org/en/publications/wp/issues/2020/07/17/measuring-social-unrest-using-media-reports-49573).