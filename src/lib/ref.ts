import books from "./books.json";

export type Ref = { book: string; chapter: number; verse?: number; endVerse?: number };
const key = (value: string) => value.trim()
  .replace(/^(III|II|I)\s+(?=[A-Za-z])/i, (_, roman: string) => `${roman.length} `)
  .toLowerCase().replace(/[.\s]/g, "");
const aliases: Record<string, string> = Object.fromEntries(
  books.flatMap(book => [[key(book.name), book.name], [key(book.code), book.name]])
);
const commonAliases: Record<string, string[]> = {
  Genesis: ["Ge", "Gn"], Exodus: ["Ex", "Exod"], Leviticus: ["Lev", "Lv"],
  Numbers: ["Num", "Nu", "Nm", "Nb"], Deuteronomy: ["Deut", "Dt"],
  Joshua: ["Josh", "Jos"], Judges: ["Judg", "Jgs"], Ruth: ["Ru", "Rt"],
  "1 Samuel": ["1 Sam", "1 Sm"], "2 Samuel": ["2 Sam", "2 Sm"],
  "1 Kings": ["1 Kgs", "1 Ki"], "2 Kings": ["2 Kgs", "2 Ki"],
  "1 Chronicles": ["1 Chr", "1 Chron", "1 Ch"], "2 Chronicles": ["2 Chr", "2 Chron", "2 Ch"],
  Ezra: ["Ezr"], Nehemiah: ["Neh", "Ne"], Tobit: ["Tob", "Tb"], Judith: ["Jdt", "Jth"],
  Esther: ["Est", "Esth"], "1 Maccabees": ["1 Macc", "1 Mac", "1 Mc"],
  "2 Maccabees": ["2 Macc", "2 Mac", "2 Mc"], Job: ["Jb"],
  Psalms: ["Ps", "Pss", "Psalm"], Proverbs: ["Prov", "Prv", "Pr"],
  Ecclesiastes: ["Eccl", "Eccles", "Qoh", "Qoheleth"],
  "Song of Songs": ["Song", "Songs", "Song of Solomon", "Cant", "Canticles", "Sg"],
  Wisdom: ["Wis", "Wisd", "Ws"], Sirach: ["Sir", "Ecclus", "Ecclesiasticus"],
  Isaiah: ["Isa", "Is"], Jeremiah: ["Jer", "Jr"], Lamentations: ["Lam", "Lm"],
  Baruch: ["Bar", "Br"], Ezekiel: ["Ezek", "Eze", "Ez"], Daniel: ["Dan", "Dn"],
  Hosea: ["Hos", "Ho"], Joel: ["Jl"], Amos: ["Am"], Obadiah: ["Obad", "Ob"],
  Jonah: ["Jon"], Micah: ["Mic", "Mi"], Nahum: ["Nah", "Na"],
  Habakkuk: ["Hab"], Zephaniah: ["Zeph", "Zep", "Zp"],
  Haggai: ["Hag", "Hg"], Zechariah: ["Zech", "Zec", "Zc"], Malachi: ["Mal", "Ml"],
  Matthew: ["Matt", "Mt"], Mark: ["Mk", "Mr"], Luke: ["Lk", "Lu"], John: ["Jn", "Joh"],
  Acts: ["Ac"], Romans: ["Rom", "Rm", "Ro"],
  "1 Corinthians": ["1 Cor", "1 Co"], "2 Corinthians": ["2 Cor", "2 Co"],
  Galatians: ["Gal", "Ga"], Ephesians: ["Eph", "Ep"], Philippians: ["Phil", "Php"],
  Colossians: ["Col"], "1 Thessalonians": ["1 Thess", "1 Thes", "1 Th"],
  "2 Thessalonians": ["2 Thess", "2 Thes", "2 Th"],
  "1 Timothy": ["1 Tim", "1 Tm"], "2 Timothy": ["2 Tim", "2 Tm"],
  Titus: ["Tit", "Ti"], Philemon: ["Philem", "Phlm", "Phm"],
  Hebrews: ["Heb"], James: ["Jas", "Jm"], "1 Peter": ["1 Pet", "1 Pt", "1 Pe"],
  "2 Peter": ["2 Pet", "2 Pt", "2 Pe"], "1 John": ["1 Jn", "1 Joh"],
  "2 John": ["2 Jn", "2 Joh"], "3 John": ["3 Jn", "3 Joh"], Jude: ["Jude"],
  Revelation: ["Rev", "Rv", "Re", "Apocalypse", "Apoc"],
};
// Hb is used for both Habakkuk and Hebrews; require Hab or Heb rather than guess.
for (const [book, names] of Object.entries(commonAliases)) {
  for (const name of names) if (name) aliases[key(name)] = book;
}
const referencePattern = /^(.+?)\s*(\d+)\s*(?:[:.]\s*(\d+)\s*)?(?:[-–—]\s*(\d+))?$/;

export function isReferenceQuery(input: string): boolean {
  const match = input.trim().match(referencePattern);
  return !!match && !!aliases[key(match[1])];
}

export function parseRef(input: string): Ref | null {
  const match = input.trim().match(referencePattern);
  if (!match) return null;
  const book = aliases[key(match[1])];
  if (!book) return null;
  let chapter = Number(match[2]);
  let verse = match[3] ? Number(match[3]) : undefined;
  const endVerse = match[4] ? Number(match[4]) : undefined;
  const maximum = books.find(row => row.name === book)!.chapters;
  // A reference such as Jude5 or Phlm10–12 names verses in a one-chapter book.
  if (maximum === 1 && verse === undefined && (chapter > 1 || endVerse !== undefined)) {
    verse = chapter; chapter = 1;
  }
  if (!Number.isSafeInteger(chapter) || chapter < 1 || chapter > maximum ||
      (verse !== undefined && (!Number.isSafeInteger(verse) || verse < 1)) ||
      (endVerse !== undefined && (verse === undefined || !Number.isSafeInteger(endVerse) || endVerse < verse))) return null;
  return { book, chapter, verse, endVerse };
}
