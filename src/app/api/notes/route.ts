import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const book = url.searchParams.get("book") ?? "";
    const chapter = Number(url.searchParams.get("chapter") ?? "0");
    if (!book || !chapter) return NextResponse.json({ notes: [] });

    const rows = db.prepare(`
      SELECT id, book, chapter, verse, start, end, body
      FROM note
      WHERE book = ? COLLATE NOCASE AND chapter = ?
      ORDER BY verse, start
    `).all(book, chapter);

    return NextResponse.json({ notes: rows });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ notes: [] }, { status: 500 });
  }
}
