import { db } from "@/lib/db";
import type { Verse } from "@/types/bible";

export async function loadVerses(book: string, chapter: number): Promise<Verse[]> {
  const rows = db
    .prepare(
      `
      SELECT verse, text
      FROM verse
      WHERE lower(book) = lower(?) AND chapter = ?
      ORDER BY verse
      `
    )
    .all(book, chapter) as { verse: number; text: string }[];

  return rows;
}
