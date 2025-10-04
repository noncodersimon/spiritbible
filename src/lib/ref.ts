export type Ref = { book: string; chapter: number; verse?: number; endVerse?: number };

const ALIASES: Record<string, string> = {
  gen: "Genesis", ge: "Genesis", gn: "Genesis",
  ex: "Exodus",
  jn: "John", joh: "John", john: "John",
  "1jn": "1 John", "2jn": "2 John", "3jn": "3 John",
};

export function parseRef(input: string): Ref | null {
  const s = input.trim().toLowerCase().replace(/\s+/g, " ");
  const m = s.match(/^([1-3]?\s?[a-z.]+)\s+(\d+)(?::(\d+)(?:[-–](\d+))?)?$/i);
  if (!m) return null;
  const rawBook = m[1].replace(/\./g, "").replace(/\s+/g, "");
  const book = ALIASES[rawBook] || (rawBook[0].toUpperCase() + rawBook.slice(1));
  return {
    book,
    chapter: parseInt(m[2], 10),
    verse: m[3] ? parseInt(m[3], 10) : undefined,
    endVerse: m[4] ? parseInt(m[4], 10) : undefined,
  };
}
