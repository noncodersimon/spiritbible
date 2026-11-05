import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseRef, isReferenceQuery } from "@/lib/ref";
import { buildTextQuery } from "@/lib/search-query";

export const runtime = "nodejs";
export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ results: [] });

  if (q.length > 300) return NextResponse.json({ error: "Please use a shorter passage reference or search phrase." }, { status: 400 });

  if (searchParams.get('scope') === 'commentary') {
    const query = buildTextQuery(q);
    if (!query) return NextResponse.json({ results: [] });
    const results = db.prepare(`SELECT title, substr(text, 1, 260) AS text,
      book, CAST(chapter AS INTEGER) AS chapter, CAST(verse AS INTEGER) AS verse,
      note_id AS note, connection_id AS connection
      FROM commentary_fts WHERE commentary_fts MATCH ?
      ORDER BY bm25(commentary_fts), rowid LIMIT 50`).all(query);
    return NextResponse.json({ results });
  }

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

  if (isReferenceQuery(q)) {
    return NextResponse.json({ error: "That chapter or verse range is not valid. Try a reference such as Jn3:16 or 1 Cor13:4–7." }, { status: 400 });
  }
  const textQuery = buildTextQuery(q);
  if (!textQuery) return NextResponse.json({ results: [] });
  const results = db.prepare(`
    SELECT v.book, v.chapter, v.verse, v.text
    FROM verse v
    JOIN verse_fts f ON f.rowid = v.id
    WHERE verse_fts MATCH ?
    ORDER BY bm25(verse_fts), v.id
    LIMIT 50
  `).all(textQuery);

  return NextResponse.json({ results });
}
