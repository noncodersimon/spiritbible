# John Paul II and Benedict XVI supplement

The user extended the approved sources to writings by John Paul II and Benedict XVI on vatican.va after the full Bible audit was published as `cd8fa4588235bb148b04ad32d8c714ef2cd97a88`.

This focused supplement enriches passages where the selected documents offer a distinct insight. It preserves the concise style, the fundamental/of-interest classifications, all existing shared-note anchors and connection targets, the Bible translation and the reader's appearance. Individual papal interpretations are attributed; a theological proposal is not presented as a new formal definition.

All supporting sections were read in context and compared with the local biblical passage and existing commentary. Sources are linked at the bottom with abbreviated document titles and paragraph numbers. New prose is original paraphrase. Short evidence excerpts, raw-page hashes and metadata support source verification; these do not replace semantic review.

## Release records

- `baseline.json`: immediate published baseline, including all 1,205 note anchors/body hashes, 145 connection fingerprints and the book-introduction hash.
- `changes.json`: reasons for selected revisions and IDs of appended notes/connections.
- `editorial-changes.json`: the validated changed/new notes.
- `reports/`: author source-reading reports, independent review and validation results.

The complete current release remains in `drafts/final-audit/` and is checked against `data/notes.json` and `data/study.json`. The reports from the earlier full audit describe that earlier stage; this directory records the subsequent source expansion. The immediate baseline adds protection for the 43 notes and 36 connections introduced in that audit.

## Checks

```sh
npm test
npm run build
node scripts/papal-review.cjs /path/to/source-cache
```

Without the optional source cache, the release check verifies evidence fingerprints, reviewed payload equality, approved sources, safe HTML, exact anchors and preserved shared targets. With the cache it additionally checks supporting excerpts against the retrieved primary HTML. The older historical draft checks remain available separately.

This supplement is a selected, independently reviewed reading of the supporting papal sections, not a claim to have reviewed either pope's entire corpus.
