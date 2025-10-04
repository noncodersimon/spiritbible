// src/app/api/books/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CANONICAL_OT, CANONICAL_NT } from "@/lib/canon";

export const runtime = "nodejs";
export const revalidate = 0;
export const dynamic = "force-dynamic";

type Row = { book: string; chapters: number };

export async function GET() {
  try {
    const rows = db
      .prepare(`
        SELECT book, MAX(chapter) AS chapters
        FROM verse
        GROUP BY book
      `)
      .all() as unknown as Row[];

    // case-insensitive lookup: "john" -> 21, etc.
    const countMap = new Map<string, number>(
      rows.map((r) => [r.book.toLowerCase(), r.chapters])
    );

    // Accept readonly arrays from the canon
    const mapList = (list: readonly string[]) =>
      list
        .map((book) => {
          const chapters = countMap.get(book.toLowerCase()) ?? 0;
          return { book, chapters };
        })
        // Keep only books that actually exist in the DB
        .filter((b) => b.chapters > 0);

    const ot = mapList(CANONICAL_OT);
    const nt = mapList(CANONICAL_NT);

    return NextResponse.json({ ok: true, ot, nt });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
