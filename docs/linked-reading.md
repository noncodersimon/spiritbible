# Linked reading and sharing

Amber highlights open the existing commentary. Teal ↔ buttons open connected-passage explanations, with underlined teal links to the relevant text. A connection appears at the first verse of every linked range; following a link highlights the destination range. Browser Back returns to the previous passage. The original text and its styling remain authoritative.

Book introductions are collapsed by default. Search can target either Bible text or notes and connections. The last successfully opened passage is stored locally on the device; explicit passage links take precedence. The app works when local storage is unavailable.

Selecting Bible words and using the device’s normal Copy command appends the reference, translation name and a website URL. The explicit copy button copies the selection or, without a selection, the chapter. Copying outside the Bible text is unchanged. The native copy handler does not require clipboard-read permission. The explicit button uses the browser’s clipboard-write facility and gives manual-copy guidance if it is unavailable.

Share URLs use `/?ref=John+3%3A16` or a verse range. Optional `start` and `end` are zero-based UTF-16 text offsets in the first and last verse, with the end exclusive. They address canonical verse text, excluding numbers and controls. This allows selection across commentary markup without changing the copied words. Links without offsets highlight whole verses. Exact selections depend on the current immutable WEB text; a future translation migration must preserve or migrate these offsets.

`data/study.json` joins the Bible and note JSON in the single validated SQLite build. Its hash participates in startup freshness checks. The generated tables contain connection payloads, indexed passage endpoints, book introductions and a search index for notes/connections. No new service or hosting migration is required.
