# Translation source and migration

## Edition and permission

SpiritBible uses the **World English Bible British Edition**, selecting the 73 books present in the publisher's Catholic edition and arranging them in Catholic order. This is a Catholic book selection from WEBBE, not a claim that eBible.org publishes a separately named British Catholic edition or that this app has an imprimatur.

- British edition: https://ebible.org/find/details.php?id=eng-webbe
- Catholic edition and book selection: https://ebible.org/find/details.php?id=eng-web-c
- Catholic edition's public-domain notice: https://ebible.org/eng-web-c/copyright.htm

The publisher dedicates the text to the public domain; no licence fee or copyright approval is required. “World English Bible” is a trademark. The publisher asks that altered wording not be presented under that name. The import makes no spelling, gender-language, theological, or stylistic substitutions. It selects books, maps their names to the app's canonical names, and trims surrounding whitespace in each source verse. The American Catholic edition is used to verify the selection and reference coverage; its verse text is not mixed into the British text.

The source edition retains its own wording. It is not a reproduction or adaptation of NJB or NIV prose. Source footnotes, introductions, and layout are not included in the publisher's verse-only export; these remain available from the publisher. The app's existing Catholic explanatory notes are separate editorial material.

## Reproducible source

The official VPL ZIP archives downloaded on 5 November 2026 are pinned under `data/sources/web/`. The publisher dates both exports 30 October 2026. `manifest.json` records exact URLs, archive SHA-256 hashes, book mappings, and the signing-key fingerprint. Original permission notices and the publisher's public keys are retained alongside the archives.

Both archive checksum manifests passed GPG verification against the WEB editors' key obtained from the publisher's HTTPS USFX archive. Every listed member's SHA-256 checksum was checked. The key is identified by fingerprint, not by an independently certified web of trust. No TLS or signature checks were disabled.

The importer uses Python 3's standard library and performs no downloads:

```powershell
python scripts/import-web.py --check
```

To deliberately regenerate the text and chapter metadata from those pinned archives:

```powershell
python scripts/import-web.py
npm test
npm run build
```

Python is needed only for this source-maintenance step, not to build or run the site normally. Imports verify archive hashes and the publisher's member checksums, reject missing Catholic references, check book mappings and duplicate references, and compare every imported reference with the Catholic source set. They do not modify `notes.json`; changed note anchors must be reviewed and validated before rebuilding.

## Canon and numbering

There are 46 Old Testament books and 27 New Testament books. The full Greek Esther (`ESG`) and Greek Daniel (`DAG`) are used, matching the Catholic edition; the shorter `EST`/`DAN` books and extra non-Catholic books are not imported. Baruch includes chapter 6, the Letter of Jeremiah. `SNG` is displayed as Song of Songs; `PSA` as Psalms.

The app follows the publisher's reference numbering, including **Esther 1–10, Daniel 1–14, Joel 1–3, and Malachi 1–4**. Esther's additions are integrated within its ten chapters, including a lengthy opening dream narrative; ten chapters does not indicate omission of the additions. Daniel includes the prayer/song in chapter 3, Susanna in chapter 13, and Bel and the Dragon in chapter 14. This numbering differs from some Catholic print editions. Chapter navigation is generated from this source rather than an unrelated fixed table.

The Catholic VPL contains 35,408 records. Five empty Sirach verse ranges are expanded into their individual numbered slots without inventing text, giving **35,420 verse slots** in the app. **41 slots are blank in the official source** after expansion. These are preserved; the build reports them and the importer verifies them against the publisher's data. No blank is filled from a different translation.

## Existing notes

All 11 explanatory note bodies are unchanged. Each now has an explicit `phrase` and corrected inclusive start/end offsets, validated against the new text at build time. The renderer prefers that explicit phrase over quotations extracted from the explanation. The popup layout, styles, sanitisation, closing behaviour, and overlap handling remain unchanged.

Editorial review is still appropriate for:

- **John 3:16:** the explanation quotes “one and only”; the new verse and anchor read “only born Son”.
- **John 1:14:** the explanation quotes “one and only Son of the Father”; the new anchor reads “only born Son of the Father”.
- **Genesis 1:1:** the quotation in the explanation lacks the new source's comma after “beginning”.
- **John 6:53:** the explanatory quotation uses an ellipsis; the explicit anchor spans the corresponding full phrase.
- **Matthew 28:19:** the explanation starts with capitalised “Baptising”; the source has lowercase “baptising” within the sentence.

Those explanations have not been silently rewritten. A preserved pre-import copy of both JSON files is at `/workspace/.setup/pre-web-import/` in this workspace; the original committed text also remains in Git history until a deliberate commit is made.

## Verification

Regression tests cover the 73-book set/order, deuterocanonical book identities and chapter coverage, Greek Esther/Daniel additions, reference search names, navigation across book boundaries, and all annotation phrase offsets. `python scripts/import-web.py --check` compares the entire imported JSON and chapter manifest with the pinned official sources.

The production build and all 15 regression tests passed, including rendering all 11 highlights and opening/closing their popups without duplicating verse text. HTTP checks passed for the first and final chapters and reference searches of every book, representative standalone deuterocanonical/addition pages, and the updated note anchors. Styling files and the layout/main-page components remain unchanged. These are local checks; the migration has not been deployed.
