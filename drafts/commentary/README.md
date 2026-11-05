# SpiritBible commentary — approved review archive

**Release update, 5 November 2026:** the user approved this collection for publication. The reviewed payload has been promoted to `data/notes.json`; see [RELEASE.md](RELEASE.md). The files below retain the pre-publication review record.

This was a proposed replacement commentary collection, separate from the live website. The existing Bible text and eleven sample notes have not been changed. The application changes are limited to a height limit and scrolling for long popups, plus recognisable source links using the existing link colour and a compact reference line. The reader layout and book selector are preserved. Nothing in this directory is imported by the application or served from its public directory. The popup adjustments are also local and have not been deployed.

The brief is approximately 1,000 selected notes across all 73 books, each with 100–200 words of accessible explanation. Theological and philosophical ideas should be expressed plainly; original-language observations need specific source support. Notes end with short linked references to the Catechism, Catholic Encyclopedia or Church Fathers. **CE** abbreviates Catholic Encyclopedia; **CCC** identifies numbered Catechism paragraphs.

## Review the notes

Open **[review.html](review.html)** in a browser. It is a self-contained document and needs no server or account. Filter by book, search a topic, or focus on original-language notes and patristic sources. Each note shows its phrase highlighted in the current Bible translation, with neighbouring verses for context. Source links open the original website.

You can mark a note as reviewed or needing revision, and add a comment. These marks remain in your browser where local storage is available. Use **Export review decisions** to download a JSON file for sharing or safekeeping. Changes to the note text, anchor, reference or source records invalidate its old review mark, so marks do not silently carry over to revised content. Marking a note here does not publish it.

The “Why these sources are cited” section gives a fuller locator and an original summary of the source's contribution. This research apparatus is for review; the eventual reader popup contains only the explanation and abbreviated source links.

## Files

- `notes.json`: candidate import data, using the reader's existing schema. This would replace the sample collection after approval; it must not simply be appended to the eleven samples, because some passages overlap.
- `editorial.json`: the same notes plus titles, themes, interpretation categories and citation provenance.
- `coverage.json`: book-by-book counts, word counts, citation totals and validation scope.
- `baseline.json`: starting commit and hashes of the protected application content.
- `review.html`: the standalone review document.
- `REVIEW-NOTES.md`: editorial observations and limitations from the review pass.
- `samples.md`: representative notes for a first reading.

## Editorial approach

The local Bible text establishes the anchor and immediate context. The Catechism supplies Catholic doctrinal context; a Father's interpretation is attributed to that author. Christian spiritual readings are distinguished from a passage's immediate narrative or historical meaning. The Catholic Encyclopedia is useful historical scholarship, but its early-twentieth-century judgements on dating, authorship and other disputed questions are not treated as current scholarly consensus.

Sources are paraphrased in original prose. Each source record has a precise locator and a brief account of the claim it supports. During assembly, a short supporting excerpt was matched against both the extracted text and the hash-verified HTML of the downloaded page. Full fetched pages and internal quotation excerpts are kept out of this draft bundle. A source match establishes traceability; it does not establish that every inference is correct. Human editorial and theological review is still needed before publication.

Later Christian readings do not erase Israel's own history. Difficult passages about violence, suffering, slavery or judgement need particular attention. Original-language claims are intentionally limited to distinctions supported by the consulted sources; the notes do not pretend that a word's etymology determines every use of it.

## Verify or regenerate the review

Use Node.js 26 and the repository's installed dependencies:

```sh
node scripts/commentary-draft.cjs --check
node scripts/commentary-review.cjs
node --test tests/commentary-validation.test.cjs tests/commentary-draft.test.cjs
npm test
```

The draft tests build a temporary SQLite database and exercise the real reader component against the candidate notes. They do not replace `data/notes.json` or the application's database. They also check that every proposed popup opens on its own phrase without changing the verse text.

For this research session only, source-level assembly can be repeated with:

```sh
node scripts/commentary-draft.cjs --assemble /workspace/commentary-research
node scripts/commentary-review.cjs
```

That command requires the separately saved research batches and downloaded source cache. The ordinary checks and review page do not depend on those temporary research files.

## Before eventual publication

Review the representative samples and the coverage report, then record revisions in the review document. Resolve substantive theological or lexical questions against the linked sources. Once the collection is approved, a separate change can replace the live notes and rebuild the database through the existing data pipeline. This draft makes no deployment or architecture migration necessary.
