# Deeper commentary and contemplative reading

Supplementary collection reviewed on 6 November 2026: **108 notes and 31 connected-passage explanations**, adding 82 passage endpoints. All 73 books were audited against existing commentary and connections. There was no target count: candidates were retained for a distinct, supported insight and rejected where existing material already did the work.

The complete collection now has 1,162 notes, 109 connections and 73 book introductions. The new explanations contain 18,452 prose words and cite 94 distinct source pages. New notes range from 117 to 151 words.

## Sources and interpretation

The Catechism, New Advent’s Church Fathers and Catholic Encyclopedia remain the main sources. Six carefully placed contributions (5 notes and 1 connection) also draw on primary CCEL texts:

- Teresa of Ávila, *Interior Castle*: the Stanbrook Benedictines translation revised by Benedict Zimmerman, third edition 1921.
- Catherine of Siena, *Dialogue*: Algar Thorold’s translation.
- *The Cloud of Unknowing*: anonymous medieval work in the Evelyn Underhill edition 1922. Underhill is the editor, not the author.

Each published item ends with abbreviated source links. The explanations are original paraphrases. A spiritual writer’s application is identified as such; it is not passed off as the biblical author’s literal intention or as a condition of holiness binding every reader. Patristic interpretations of difficult passages are likewise distinguished from a uniquely settled explanation. Language variants are not explained from memory when a checked source does not support the explanation.

## Review and selection

Five agents audited their assigned groups; a separate primary-source pass covered the three spiritual classics. A second AI agent independently read each group’s biblical contexts and source material. The parent agent reviewed the proposed prose and connections, resolved overlaps across groups, and performed the final merge. These are editorial and technical checks, not an ecclesiastical approval or a human scholar’s review.

The individual book audits and review findings are retained in [audits](audits). They record the pre-integration review stages; the final parent review explains the last consolidations. Examples of corrections:

- Omitted Catherine’s mutual-dependence note because the adjacent existing 1 Corinthians 12 note already expressed its central insight.
- Combined two music notes into one Chronicles/Colossians connection.
- Incorporated Matthew 18 into the restoration connection instead of repeating the same correction advice locally.
- Removed duplicate conscience, craftsmanship, dishonest-scales and spiritual-consolation explanations.
- Moved Revelation’s personal-name note to 2:17, the passage specifically cited by its source.
- Kept the Psalm 40/Hebrews 10 wording comparison conservative because the checked sources did not explain the Hebrew/Greek variant directly.

Short books with adequate existing coverage were not given new entries merely to increase a total. [coverage.json](coverage.json) lists every book’s existing and added coverage.

## Files and verification

- [editorial.json](editorial.json): reviewed supplementary notes, exact anchors, source locators and verified source hashes.
- [notes.json](notes.json): corresponding production payload.
- [connections.json](connections.json): supplementary links; source excerpts and item hashes are also included in the combined [study review](../study/review.json).
- [source-evidence.json](source-evidence.json): short exact supporting excerpts for new notes, keyed by note and citation.
- [baseline.json](baseline.json): original Bible/commentary/study hashes and counts.

Run from the repository:

```sh
node scripts/deeper-review.cjs
npm test
npm run build
```

Where the research cache is available, additionally run `node scripts/deeper-review.cjs /workspace/commentary-research/cache`. This checks source excerpts against both extracted text and the hash-verified fetched HTML. Excerpt matching establishes provenance; contextual interpretation also required the editorial review described above.

New notes are appended after the original 1,054 entries, preserving numeric note IDs used in shared links. The original Bible text, notes, 78 connections and 73 introductions are preserved exactly. The generator rebuilds the reading database and search index together. No reader layout or styling changes form part of this expansion.

## Validation of the assembled collection

- All nine test files passed, including rendering and opening every production commentary note without altering Bible text.
- The production build and TypeScript checks passed; the database contains 35,420 verse records, 1,162 notes, 109 connections and 73 introductions.
- Cache-backed validation checked the new notes and the complete study review against the retrieved source HTML and recorded hashes.
- Chromium checked all 108 added note payloads and all 82 endpoints of the 31 added connections across 168 chapters, opened ten representative pop-outs, checked commentary search, and displayed a contemplative note at 320px in dark mode without horizontal overflow or console errors.
- Whole-chapter clipboard links, direct range searches, precise text highlighting, invalid-reference feedback and mobile reading passed the existing browser regression check.
