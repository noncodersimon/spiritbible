# Linked-study editorial review

This expansion adds 78 substantial connected-passage explanations and 73 book introductions. Selection was driven by distinct theological, spiritual and interpretive value, not a numerical quota. The original 1,054 phrase-anchored notes remain unchanged.

Each explanation develops one central insight. Its type distinguishes explicit quotation, explicit fulfilment, literary echo, Catholic typology and shared theme. Original Israelite contexts remain visible; Christian spiritual readings are not presented as if every later detail were explicit in the original passage. Introductions give literary setting and reading guidance without importing disputed dating or authorship claims as settled facts.

Production content is in `data/study.json`. `review.json` records item fingerprints, exact supporting source excerpts, cached HTML hashes and the specific support claimed. The source pages were actually read; excerpts are editorial evidence, not displayed as commentary. Original paraphrases with short source links are displayed in the app. A second AI agent independently checked every item against the cited sources and linked WEB passages. This is an editorial audit, not an ecclesiastical approval.

## Corrections from independent review

- Mary: CCC 2676 expressly says “ark of the covenant”; the explanation no longer attributes the exact phrase “Ark of the new covenant” to that paragraph. The tabernacle cloud wording follows this WEB edition.
- Isaac: Augustine directly supports the wood/cross comparison. Jerusalem’s Temple/Moriah association is distinguished from any unsupported identification with the Crucifixion hill.
- Jonah: rescue from the depths does not become a claim that Jonah literally died and rose.
- Matthew’s return from Egypt, Isaiah’s announcement of liberty, and the manna gathering instructions have directly inspectable linked ranges.
- Footwashing/Eucharist wording no longer implies a proven literary substitution by John. An unnecessary repeated Last Supper endpoint was removed.
- Overlapping New Testament and Sirach forgiveness explanations were merged, retaining the useful connected passages.
- Deuteronomy, the Pastoral Letters, Song of Songs and the prophetic river have more precisely targeted source evidence.

## Maintaining the collection

Keep all substantive edits in `data/study.json`. Validate every linked range against `data/bible.json`, including this edition’s numbering. Update the corresponding source evidence and item fingerprint after a fresh editorial review; do not mechanically refresh fingerprints to silence a stale-review failure.

`npm test` checks structural validity, source-review coverage, stable sharing links, copying selections, search generation and all existing commentary highlights. `npm run build` validates the canonical ranges and regenerates the complete database, including the connected-passage indexes and commentary search.

Run `node scripts/study-review.cjs` to check recorded evidence and content fingerprints. Supplying the original research cache path additionally checks every excerpt against its hash-verified source HTML. The cache is a research workspace artifact, not a deployment dependency.

## Release verification

The 31 automated tests and production build passed. Browser checks covered native copying and the explicit copy button, exact partial-word selections across note markup, multi-verse selections, reopened highlights, Back navigation, note/connection search, locally remembered passages, disabled-storage browsing, keyboard dialogs, chapter boundaries, and 320px dark-mode layout. API results matched the reviewed JSON for 221 book/chapter combinations, covering all 223 linked passage entries and all 73 introductions. The Bible text and the original 1,054 note bodies were unchanged.
