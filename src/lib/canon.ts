// src/lib/canon.ts
// Catholic canon (73 books) with fixed chapter counts.
// Order: canonical OT (incl. deuterocanon) then NT.

export const CANONICAL_OT = [
  "Genesis","Exodus","Leviticus","Numbers","Deuteronomy",
  "Joshua","Judges","Ruth",
  "1 Samuel","2 Samuel","1 Kings","2 Kings",
  "1 Chronicles","2 Chronicles","Ezra","Nehemiah",
  "Tobit","Judith","Esther",
  "1 Maccabees","2 Maccabees",
  "Job","Psalms","Proverbs","Ecclesiastes","Song of Songs",
  "Wisdom","Sirach",
  "Isaiah","Jeremiah","Lamentations","Baruch","Ezekiel","Daniel",
  "Hosea","Joel","Amos","Obadiah","Jonah","Micah","Nahum",
  "Habakkuk","Zephaniah","Haggai","Zechariah","Malachi",
] as const;

export const CANONICAL_NT = [
  "Matthew","Mark","Luke","John","Acts",
  "Romans","1 Corinthians","2 Corinthians","Galatians","Ephesians","Philippians","Colossians",
  "1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon",
  "Hebrews","James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation",
] as const;

export const CANONICAL_ALL = [...CANONICAL_OT, ...CANONICAL_NT] as const;

// --- Normalisation helpers ---
export function bookNameOf(name: string) {
  return name.trim().toLowerCase();
}
export function bookDisplayOf(name: string) {
  // capitalise each word; tweak if you need special-casing
  return name
    .split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}



/** Fixed chapter counts for each book (Catholic canon). */
export const CHAPTERS: Record<string, number> = {
  // Pentateuch
  Genesis: 50, Exodus: 40, Leviticus: 27, Numbers: 36, Deuteronomy: 34,
  // Historical (pre-exilic)
  Joshua: 24, Judges: 21, Ruth: 4,
  "1 Samuel": 31, "2 Samuel": 24, "1 Kings": 22, "2 Kings": 25,
  "1 Chronicles": 29, "2 Chronicles": 36, Ezra: 10, Nehemiah: 13,
  // Deuterocanon (hist.)
  Tobit: 14, Judith: 16, Esther: 16, "1 Maccabees": 16, "2 Maccabees": 15,
  // Wisdom / Poetry
  Job: 42, Psalms: 150, Proverbs: 31, Ecclesiastes: 12, "Song of Songs": 8,
  Wisdom: 19, Sirach: 51,
  // Major prophets (+ Baruch, Daniel with additions)
  Isaiah: 66, Jeremiah: 52, Lamentations: 5, Baruch: 6, Ezekiel: 48, Daniel: 14,
  // Minor prophets (Vulgate/NJB numbering: Joel 4, Malachi 3)
  Hosea: 14, Joel: 4, Amos: 9, Obadiah: 1, Jonah: 4, Micah: 7, Nahum: 3,
  Habakkuk: 3, Zephaniah: 3, Haggai: 2, Zechariah: 14, Malachi: 3,

  // New Testament
  Matthew: 28, Mark: 16, Luke: 24, John: 21, Acts: 28,
  Romans: 16, "1 Corinthians": 16, "2 Corinthians": 13,
  Galatians: 6, Ephesians: 6, Philippians: 4, Colossians: 4,
  "1 Thessalonians": 5, "2 Thessalonians": 3,
  "1 Timothy": 6, "2 Timothy": 4, Titus: 3, Philemon: 1,
  Hebrews: 13, James: 5, "1 Peter": 5, "2 Peter": 3,
  "1 John": 5, "2 John": 1, "3 John": 1, Jude: 1, Revelation: 22,
};

// src/lib/canon.ts (excerpt)

// Normalise any incoming book name to a lower-case key
const toKey = (s?: string | null) => (s ?? "").trim().toLowerCase();

// ONE canonical chapter-count helper
export function chapterCountFor(book?: string | null): number {
  const key = toKey(book);
  if (!key) return 0;
  return CHAPTERS[key] ?? 0;   // CHAPTERS keys must be lower-case
}

// Use the same normalisation in prev/next so matching is robust
export function prevChapter(book: string, chapter: number) {
  const key = toKey(book);
  const idx = CANONICAL_ALL.findIndex(b => toKey(b) === key);
  if (idx < 0) return null;

  if (chapter > 1) {
    return { book: CANONICAL_ALL[idx], chapter: chapter - 1 };
  }
  if (idx > 0) {
    const prevBook = CANONICAL_ALL[idx - 1];
    return { book: prevBook, chapter: chapterCountFor(prevBook) };
  }
  return null;
}

export function nextChapter(book: string, chapter: number) {
  const key = toKey(book);
  const idx = CANONICAL_ALL.findIndex(b => toKey(b) === key);
  if (idx < 0) return null;

  const max = chapterCountFor(CANONICAL_ALL[idx]);
  if (chapter < max) {
    return { book: CANONICAL_ALL[idx], chapter: chapter + 1 };
  }
  if (idx < CANONICAL_ALL.length - 1) {
    const nextBook = CANONICAL_ALL[idx + 1];
    return { book: nextBook, chapter: 1 };
  }
  return null;
}

