# Approved commentary release — 5 November 2026

The user reviewed the draft and explicitly requested publication. The approved 1,054-note payload replaces the eleven samples in `data/notes.json`, covering every book of the Catholic canon. Its SHA-256 is `a3e3b053cc311b0674b78629bd5ba684a2ad13fe911c12c7517070ef61133802`.

Scripture text and the book selector are unchanged. The reader changes allow long popups to scroll and make the abbreviated source references visibly clickable using the existing theme colours.

The surrounding files are the retained pre-publication review record. Their draft status, original eleven-note baseline and statements about awaiting publication describe that earlier review stage. The review HTML remains a separate editorial tool; production reads `data/notes.json` through the generated SQLite database.

Future changes should be made to the production notes through a reviewed editorial change, followed by the normal test/build/deployment workflow. Re-running the offline review assembler does not publish changes.
