import books from "./books.json";

export type Ref = { book: string; chapter: number; verse?: number; endVerse?: number };
const key = (value: string) => value.toLowerCase().replace(/[.\s]/g, "");
const aliases: Record<string, string> = Object.fromEntries(
  books.flatMap(book => [[key(book.name), book.name], [key(book.code), book.name]])
);
Object.assign(aliases, {
  ge: "Genesis", gn: "Genesis", ex: "Exodus", jn: "John", joh: "John",
  "1jn": "1 John", "2jn": "2 John", "3jn": "3 John",
  ps: "Psalms", psalm: "Psalms", songofsolomon: "Song of Songs",
  ecclesiasticus: "Sirach", canticles: "Song of Songs",
});

export function parseRef(input: string): Ref | null {
  const match = input.trim().match(/^(.+?)\s+(\d+)(?::(\d+)(?:[-–](\d+))?)?$/);
  if (!match) return null;
  const book = aliases[key(match[1])];
  if (!book) return null;
  const chapter = Number(match[2]);
  const verse = match[3] ? Number(match[3]) : undefined;
  const endVerse = match[4] ? Number(match[4]) : undefined;
  const maximum = books.find(row => row.name === book)!.chapters;
  if (!Number.isSafeInteger(chapter) || chapter < 1 || chapter > maximum ||
      (verse !== undefined && (!Number.isSafeInteger(verse) || verse < 1)) ||
      (endVerse !== undefined && (!Number.isSafeInteger(endVerse) || endVerse < verse!))) return null;
  return { book, chapter, verse, endVerse };
}
