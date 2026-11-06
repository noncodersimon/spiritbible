# Final commentary audit

This release reviews the existing commentary and related passages across all 73 books. The Bible wording remains unchanged and was checked against the pinned World English Bible British Catholic source files. Existing note IDs, phrase anchors and connection targets are preserved so shared links continue to work.

The editorial aim is a concise, complete explanation of a significant feature of the passage. A shorter note is preferable when it carries the insight clearly. Additions address meaningful omissions rather than a target count. The accompanying book-group reports document the complete chapter reading and the independent reviews; the Catechism report maps the principal themes.

## Reading priorities

Both notes and connections have a `significance` value:

- `fundamental`: a central theological meaning, an explicit biblical connection, or a clarification essential to reading the passage responsibly.
- `interest`: a useful further detail, a less central connection or an attributed spiritual application.

These are reading priorities, not grades of doctrinal authority. The interface distinguishes them through stronger/subtler colour, labels and an additional dotted treatment. Commentary is purple in dark mode. A persistent System/Light/Dark control allows readers to override their device preference.

## Sources and interpretation

The initial audit used the Vatican Catechism, New Advent's Church Fathers and Catholic Encyclopedia, and the approved CCEL editions of Teresa's *Interior Castle*, Catherine's *Dialogue* and *The Cloud of Unknowing*. The user subsequently authorised official Vatican writings by John Paul II and Benedict XVI. The focused additions and revisions are documented in [the papal supplement](../papal-commentary/README.md); the complete current payload remains here. Distinctive papal readings are attributed and linked to their documents; no text imitates or invents papal authorship.

The notes distinguish a passage's literary setting, Catholic doctrinal reception, an individual Father's interpretation and a later spiritual application. Difficult ancient texts are not presented as permission for contemporary harm. Where a source supports an interpretive boundary rather than a complete historical resolution, the note keeps that limitation visible.

This is a source-checked editorial review, not ecclesiastical approval or a claim to have exhausted all scholarly interpretations or all Church literature.

## Release records

- `baseline-*.json`: immutable snapshots of the preceding published release.
- `decisions.json`: a reason and classification for every existing note and connection.
- `editorial.json`: the complete reviewed commentary with editorial identifiers and source metadata.
- `notes.json`, `study.json`: the release payloads, checked against production data.
- `source-evidence.json`: exact supporting excerpts and retrieval hashes for revised/new notes.
- `coverage.json`: release counts, classifications and commentary lengths.
- `reports/`: author checklists, independent reviews, thematic audit and browser validation results for the initial full audit. Subsequent papal-supplement reports are in `../papal-commentary/reports/`.

Earlier draft archives retain the material from their own release. Their historical checks do not require the current prose to remain identical to those earlier drafts.

## Validation

From the repository root, using Node.js 26:

```sh
npm test
npm run build
node scripts/final-review.cjs /path/to/source-cache
node scripts/deeper-review.cjs --historical /path/to/source-cache
python scripts/import-web.py --check
```

The source cache contains retrieved HTML and metadata used for exact-excerpt/hash verification; it is not committed to the repository. The release validator also runs without that optional cache to check archived evidence hashes, payload equality, classifications, safe markup, phrase anchors, stable IDs and preserved connection endpoints. Source semantics are reviewed separately: a hash match alone does not establish that a source supports a claim.
