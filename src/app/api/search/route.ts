import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseRef } from "@/lib/ref";

export const runtime = "nodejs";
export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ results: [] });

  const ref = parseRef(q);
  if (ref) {
    if (ref.verse) {
      const end = ref.endVerse ?? ref.verse;
      const rows = db.prepare(
        `SELECT book, chapter, verse, text
         FROM verse
         WHERE book = ? AND chapter = ? AND verse BETWEEN ? AND ?
         ORDER BY verse`
      ).all(ref.book, ref.chapter, ref.verse, end);
      return NextResponse.json({ results: rows });
    } else {
      const rows = db.prepare(
        `SELECT book, chapter, verse, text
         FROM verse
         WHERE book = ? AND chapter = ?
         ORDER BY verse`
      ).all(ref.book, ref.chapter);
      return NextResponse.json({ results: rows });
    }
  }

  const results = db.prepare(`
    SELECT v.book, v.chapter, v.verse, v.text
    FROM verse v
    JOIN verse_fts f ON f.rowid = v.id
    WHERE verse_fts MATCH ?
    LIMIT 50
  `).all(q.replace(/\s+/g, " "));

  return NextResponse.json({ results });
}
