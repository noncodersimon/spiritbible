# Reader significance and theme UI review — 6 November 2026

Implemented in ChapterClient.tsx, study.ts, ThemeToggle.tsx, layout.tsx and globals.css; focused interaction coverage in tests/reader-theme.test.cjs. No new dependencies or Bible text changes.

## Choices

- Notes and study connections accept optional `significance: 'fundamental' | 'interest'`. Missing values default to fundamental for compatibility with older API fixtures.
- Fundamental commentary uses a stronger background and semibold text. Of-interest commentary uses a lighter tint, normal text weight and a dotted underline. Light-mode colours remain amber. Dark-mode colours are purple: #563075 for fundamental and #2c203d for interest, with #ededed text; text opacity is never reduced.
- Related-passage markers and links retain teal. Fundamental markers have a fill and solid underline; interest markers are unfilled, normal weight, muted teal and dotted. Mixed groups use fundamental marker styling whenever any connection is fundamental.
- A compact two-line legend names commentary/related passages and explains bold versus subtle/dotted styling. No per-verse badges were added. Accessible labels and dialog headings explicitly name the importance. Each connection card has its own importance label and corresponding link style.
- The top-right circular theme button displays a monitor, sun or moon and opens System / Light / Dark. System follows OS changes; manual overrides persist in `spiritbible-theme`. Storage failures leave theme controls usable for the current visit. Cross-tab storage changes update the preference.
- A safe inline head script resolves stored/system mode before body rendering. CSS includes a system fallback for JavaScript-disabled browsing. The Tailwind dark variant follows the resolved `data-theme`, so manual light mode overrides a dark OS preference.
- The menu supports arrow navigation, Home/End, Escape with focus restoration, standard button activation, outside-pointer dismissal and blur dismissal. Current selection is exposed using menuitemradio / aria-checked. The icon has a readable accessible name.
- Existing verse strings, highlight anchors, selection/copy mechanics, passage href generation and ReaderDialog focus handling were left intact.

## Verification

- TypeScript: `node node_modules/typescript/bin/tsc --noEmit` passed.
- New focused DOM tests: `node --test tests/reader-theme.test.cjs` passed (three test scenarios within the test file). Covers pre-hydration resolution and blocked storage; theme persistence, OS changes, keyboard focus, listeners cleanup; both importance levels, missing-value compatibility, mixed markers, note body/verse text preservation and real passage URL targets.
- Existing exhaustive render test: `node --test tests/notes-render.test.cjs` passed during the initial combined run; all existing notes render exact verse text and popup content/links and close successfully. The new test initially assumed the wrong route shape; its assertion was corrected to the application's actual query-string target, then passed.
- `git diff --check` passed.
- Production build and real-browser checks are deferred to the root agent after data integration, including 320px layout, computed colours, selection/copy and actual initial-theme rendering.
