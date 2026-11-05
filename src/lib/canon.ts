import books from "./books.json";

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



/** Chapter counts from the pinned WEB source, including Greek Esther and Daniel. */
export const CHAPTERS: Record<string, number> = Object.fromEntries(
  books.map(book => [book.name, book.chapters])
);

// src/lib/canon.ts (excerpt)

// Normalise any incoming book name to a lower-case key
const toKey = (s?: string | null) => (s ?? "").trim().toLowerCase();

// ONE canonical chapter-count helper
export function chapterCountFor(book?: string | null): number {
  const key = toKey(book);
  if (!key) return 0;
  return books.find(book => toKey(book.name) === key)?.chapters ?? 0;
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

