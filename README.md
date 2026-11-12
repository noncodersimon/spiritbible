# SpiritBible

A Next.js Bible reader with a local SQLite search index. The active repository is `noncodersimon/spiritbible`.

## Development

Use Node 26 and the committed npm lockfile:

```powershell
npm ci
npm run dev
```

`npm run dev` first regenerates the database from all JSON sources. After editing Bible text or notes, stop the server and run `npm run dev` again. Code and styling changes continue to use Next.js hot reload.

## Build and run

```powershell
npm test
npm run build
npm start
```

`npm run build` generates and validates the complete database before building Next.js. `npm start` checks that its source hashes match the JSON files. If production content changes, run the complete build again so prerendered pages also refresh.

Vercel can continue using `npm run vercel-build`, which calls the same build pipeline. A deployment or hosting migration is not required for these local changes. This repository does not contain the remote Vercel project's settings, so its deployed branch and current production release must be checked there.

## Search and navigation

Search accepts full book names and common abbreviations, including `Jn 3:16`, `Mt5:1–12`, `1 Cor 13`, `2 Macc 7` and `Ecclus 2:1`. Spaces before chapter numbers are optional; verse ranges may use hyphens or dashes. Single-chapter references such as `Jude 5` name a verse. Use quotation marks for an exact phrase, such as `"living water"`; ordinary word searches match all entered words and return up to 50 results ranked by relevance.

Recognised Bible references open their chapter directly, highlighting the requested words or verse range without verse boxes. Word searches show a results list; selecting a result opens its chapter and highlights the verse. Choose “Notes & connections” to search the explanations by word or theme. Previous/Next controls appear above and below the reader and advance one chapter at a time, continuing into the next book at book boundaries.

## Commentary

The collection contains 1,162 selected Catholic commentary notes across all 73 books. Each note is anchored to the current WEB text and ends with abbreviated source links. Sources include the Catechism, Catholic Encyclopedia, Church Fathers and selected primary spiritual classics from CCEL. The original collection is retained in [the commentary review archive](drafts/commentary/README.md); the selective expansion, source evidence and book-by-book audits are in [the deeper commentary review](drafts/deeper-commentary/README.md).

Production notes remain authoritative in `data/notes.json`; the archived review files are not runtime inputs or public routes. Future editorial changes must update the production notes and regenerate the database through the normal build pipeline.

## Linked passages and sharing

Teal ↔ buttons reveal sourced connections between passages; amber highlights retain the existing commentary. Every book has a collapsible introduction. Copying selected Bible words appends a reference and a link that highlights the same words when opened. The explicit copy button also supports copying a whole chapter. The reader remembers the last opened passage on this device.

See [linked reading and sharing](docs/linked-reading.md) for URL behaviour and [the editorial review](drafts/study/README.md) for the new collection and its source checks.

## Data ownership

- Edit `data/bible.json`, `data/notes.json` and `data/study.json` only through reviewed editorial changes.
- `npm run data:build` derives `data/bible.sqlite`, its notes and study tables, search indexes, and source hashes from those files. Stop the server before a manual rebuild and restart it afterwards.
- All reading endpoints, book lists, search, and notes read the same generated database. The app opens it read-only.
- `npm run data:check` detects whether the source files changed after generation.
- Rebuilds replace rather than append data: deleted notes and verses disappear, and repeated builds do not duplicate them.
- Structural failures leave the previous database intact. Blank verse records are preserved and reported for editorial review; a successful database build does not establish translation quality or a complete Catholic canon.
- The database is server-only and ignored by Git. The build removes the obsolete generated `public/data/bible.sqlite` copy.

The old migrate, seed, notes-seed, FTS-reset/rebuild, and pack scripts now delegate to the full generator for compatibility. Do not chain them: use `npm run data:build` once. Database-only UK spelling patches are retired; they would bypass the authoritative text. The legacy `build:ukmap` helper is not part of the content pipeline.

## Cloud environment

The prepared cloud environment has Node 26 at `/workspace/.tools/node26/bin`. Activate it in a Bash terminal:

```bash
export PATH=/workspace/.tools/node26/bin:$PATH
export NEXT_TELEMETRY_DISABLED=1
export NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1
```

The last setting lets Turbopack use the environment proxy's trusted system certificates. Keep TLS verification enabled. Font downloads require `fonts.googleapis.com` and `fonts.gstatic.com` in the environment network policy. This proxy setting is not normally needed on a personal machine or Vercel.

## Checks and remaining work

The [weekly maintenance routine](docs/weekly-maintenance.md) checks compatible dependency updates, tests the reader, deploys passing updates through Vercel and checks the live site. Routine success stays quiet; GitHub issues flag problems that need attention.

`npm test` exercises source preservation, repeat builds, changes/deletions, search refresh, invalid imports, stale-source detection, and generated-file handling. The production build also checks TypeScript.

The repository's default flat ESLint configuration has a pre-existing compatibility error. Its legacy configuration works with this PowerShell command:

```powershell
$env:ESLINT_USE_FLAT_CONFIG = "false"
npx eslint src
```

See [the architecture review](docs/architecture-review.md) for the original findings, and [translation sources](docs/translation-source.md) for the subsequent verified WEB import, Catholic book coverage, numbering, permissions, and note review items. The import preserves CSS and layout and keeps all editorial note bodies. The chapter renderer now uses explicit annotation phrases.
