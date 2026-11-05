# Editorial review of the commentary draft

**Archive note:** this records the pre-publication review. The user subsequently approved publication on 5 November 2026; see [RELEASE.md](RELEASE.md).

The candidate contains **1,054 notes across all 73 books**, with **132,825 words of explanatory prose**. Each note has 114–160 prose words, within the requested 100–200-word range. There are 32 language or translation notes. The 1,196 citation records link to 275 distinct pages in the three requested source collections.

Start with [the representative samples](samples.md), then use [the full review document](review.html) to browse books, follow references and record revisions. [The coverage report](coverage.md) shows the distribution by book.

## Content review

Six groups drafted the collection. Each group then received a second AI review by a different agent, covering the local verses and the cited source sections. Every retained note is included in that review record. Human editorial and theological review remains outstanding.

The review identified eleven specific corrections or improvements, all resolved. These included:

- Correcting the Ruth note so Naomi addresses the townspeople about her grief, rather than being described as addressing God directly.
- Making source records point to the particular claim used in the note, including Jeremiah's righteous branch, Obadiah's subject matter and Revelation's river of life.
- Adding more precise support for royal and divine sonship, and distinguishing Hebrew background from the Greek wording of John's Gospel.
- Differentiating overlapping Gospel explanations, the Purim and Nehemiah feast notes, and a Psalm about envy.
- Removing one repeated Joseph/providence note, while retaining the fuller explanation at Genesis 50:20.

[editorial-review.json](editorial-review.json) records the review coverage and resolutions. There are no unresolved issues in those AI review reports. That records the outcome of this review process; it is not a claim of external scholarly or ecclesiastical approval.

## Interpretive choices to review

The notes distinguish the passage's immediate setting from a later Christian spiritual reading. Examples include Augustine's interpretation of Psalm 137:9, Christian readings of Wisdom and the Song of Songs, and the relation between Old Testament promises and Christ. Individual Fathers are named where their particular interpretation is being used.

The Catholic Encyclopedia is treated as historical scholarship. Its observations about a text can be useful without presenting its early-twentieth-century conclusions about authorship, dating or ancient languages as current scholarly consensus. Language claims were checked against the cited English reference works; this was not an independent manuscript or lexicon study.

Psalm references are mapped to the text actually present in SpiritBible. New Advent's page titles and the older Psalm numbers within Augustine's translated text can differ. Esther, Baruch, Daniel and other deuterocanonical passages likewise use the app's current WEB numbering. Job 13:15 explicitly respects this edition's less familiar wording.

The draft is deliberately selective. Repeated themes sometimes recur where the local passage adds a different aspect, but repeated explanations have been reduced. The review document provides the verse and its immediate neighbours; some notes discuss a wider passage that should also be read before making an editorial judgement.

## Technical checks

- All notes pass the existing data validator and additional checks for exact, unique phrase anchors, non-overlapping highlights, safe HTML, permitted source collections and 100–200 prose words.
- Every citation has a structured source record. Internal evidence excerpts were matched against both extracted text and the actual hash-verified fetched HTML. Excerpts and full copied source pages are excluded from the review bundle.
- The candidate successfully builds a separate SQLite database with all 35,420 verse records and all 1,054 notes. The current eleven-note application database continues to use the unchanged live JSON sources.
- Every proposed note was opened and closed through the real reader component under JSDOM. Tests check the complete verse text, highlight, popup body and source links.
- The complete repository test suite and production build pass. The final native-browser results and screenshots are linked below.

The evidence checks establish traceability and integrity of the consulted source material. Whether an interpretation follows adequately from that source remains an editorial question.

## Reader and review-document changes

The application changes are limited to bounding long popups by the viewport, allowing scrolling, and making source references visibly clickable using the existing link colour and an underline. The new reference paragraph is slightly smaller than the explanation. The book selector, overall reader layout, Scripture and existing notes are preserved.

The standalone review document supports book and topic filters, revision marks, comments and export of decisions. Review marks are tied to the note's wording, reference, anchor, source records and displayed verse context. Changing that content invalidates an old mark. Status-dependent filters update immediately after a mark changes.

- [Phone preview](mobile-preview.png)
- [Phone preview in dark mode](mobile-dark-preview.png)
- [Desktop preview](desktop-preview.png)
- [Review-document preview](review-preview.png)
- [Browser-check record](browser-checks.json)

Nothing has been committed, pushed or deployed. The candidate replaces the eleven sample notes only if it is later approved and deliberately imported; it must not be appended to them.
