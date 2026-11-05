# Architecture review — 5 November 2026

This records the baseline and first architecture pass. The subsequent [WEB source migration](translation-source.md) replaces the defective text, corrects book/reference mappings and chapter-count lookup, and introduces explicit note phrases. The baseline defects below are retained as historical findings, not a description of the migrated dataset.

## Repository and scope

The user confirmed `noncodersimon/spiritbible` is the current repository. Its starting checkout matched remote main at `7ef5c2a0838a42fe77f71c23fb9442129e6000a9`. The historical handover names `biblesite`, which was unavailable to this Git connection; the handover is background, not the current implementation specification.

This pass changes the data pipeline. It preserves the CSS, layout, main page, chapter-rendering component, Bible JSON, and notes JSON. No translation choice, editorial correction, deployment, or hosting migration is included.

## Decision: retain Next.js, SQLite, and Vercel

The app is primarily a reader with a small, immutable dataset. SQLite remains appropriate as a generated, read-only artifact packaged with the server functions. Vercel's ephemeral filesystem is not a problem when data is generated before deployment and no runtime writes are needed. Moving hosting would not resolve stale sources, incorrect book mappings, or annotation anchors.

The remote Vercel project settings were not accessible in this review. Verify its repository/branch and build command before deployment. `npm run vercel-build` now invokes the same pipeline as a local production build.

## One data-generation path

Previously the inline chapter API read JSON while standalone chapters, search, book lists, and notes read SQLite. The verse seeder appended rows without a unique reference constraint; note upserts retained notes removed from JSON. Rebuilding FTS alone could preserve outdated content. Packing also copied the database into publicly served files.

Now both JSON sources feed one fresh database, with unique verse references and note anchors, a rebuilt FTS index, integrity checks, and hashes of the exact source files. The complete artifact replaces the old one only after validation succeeds. Journal sidecars prevent unsafe replacement of a database with outstanding writes. Stop the server before rebuilding; existing SQLite connections and Next.js caches must be restarted. Production text changes require a complete Next.js build.

All readers use this artifact. The runtime opens it read-only, with no fallback to a potentially stale public copy. Startup through `npm start` verifies its source hashes. Legacy import entry points delegate to the same generator. The UK database-only patch script stops with instructions rather than silently creating a second edition of the text.

Source hashes establish which input files generated the artifact. They do not establish translation provenance, scholarly accuracy, or protection against arbitrary manual database edits.

## Editorial defects remain unresolved

The current source contains 35,953 verse records, 11 notes, and 156 blank verse records. Blank records are preserved with a build warning; some Bible editions intentionally leave reference slots empty, so they require individual review.

The canon list has 73 names, but the book-list endpoint finds only 69. `Psalm` and `Song of Solomon` differ from the navigation names `Psalms` and `Song of Songs`; `Sirach` and `1 Maccabees` are absent under those names. This is not simply missing content: sampled passages demonstrate misassigned book labels and questionable chapter boundaries:

- `Tobit` opens with Sirach and spans 52 chapters.
- `Judith` has only one verse, the opening of Baruch.
- `Baruch` opens with Judith.
- `2 Maccabees` opens with 1 Maccabees.
- `AddDan` opens with 2 Maccabees.
- `1 Esdras` opens with Wisdom.
- 72 verse records include the repeated phrase "brothers and sisters and sisters".

The samples suggest WEB-related text for much of the main canon and edited Douay–Rheims-related text for deuterocanonical material. Exact editions, downloads, and revision histories are not established. Do not label the whole dataset as an unmodified edition or automatically repair it by renaming books.

Before replacing text, choose a documented public-domain source, retain original downloads and licence statements, record source editions per book, and review Catholic canon coverage, additions, and numbering. WEB's deuterocanonical material is a candidate for comparison, not an approved substitution. The user's aim is dignified modern British English, with the NJB as a stylistic reference, without importing its copyrighted text.

## Next focused changes

1. Establish verified source texts and an explicit mapping of book identifiers and numbering; add completeness and representative-passage checks before importing them. Do not infer textual identity merely from the number of books.
2. Fix the case mismatch in `chapterCountFor`: it lowercases the lookup but `CHAPTERS` has title-case keys. Review navigation against actual available chapters and the selected numbering convention together.
3. Introduce explicit annotation phrases, optional surrounding context and an occurrence selector. Validate anchors against the chosen text and report ambiguous/missing matches. Preserve existing note bodies and popup behaviour; do not infer authoritative anchors from quoted prose automatically.
4. Add coverage for malformed search expressions, invalid references, and navigation boundaries. The current raw FTS syntax can raise errors for malformed input.
5. Repair the legacy/flat ESLint configuration, review the public debug endpoint, and verify the remote deployment configuration before release.

The annotation renderer currently combines offsets with the first quoted phrase in a note body. It can select the wrong quotation or retain an obsolete offset after text changes. Its overlap handling and styling are intentionally unchanged in this pass.

## Validation of this change

- Nine regression tests passed, covering repeated builds, source edits/deletions, FTS refresh, invalid input preservation, stale-source detection, blank records, public-output cleanup, and SQLite journals.
- `npm run vercel-build` passed, including TypeScript and all seven static pages.
- Production HTTP checks matched the first chapter of all 75 source book labels against JSON. All 11 notes across eight chapters matched, as did representative reference/full-text searches and standalone Genesis 1 / John 3 pages.
- A complete comparison confirmed every generated verse row matches the source JSON. The obsolete public database download is absent.
- Legacy-config ESLint passed with three existing warnings. Git checks confirmed no changes to styles, layout, main page, chapter renderer, Bible JSON, notes JSON, or dependency lockfile.

These are local validation results, not a production deployment or an editorial approval of the existing text.
