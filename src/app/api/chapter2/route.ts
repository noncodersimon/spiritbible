// src/app/api/chapter/route.ts
import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";
export const revalidate = 0;
export const dynamic = "force-dynamic";

type Row = { book: string; chapter: number; verse: number; text: string };

async function readBible(): Promise<Row[]> {
  const file = path.join(process.cwd(), "data", "bible.json");
  const raw = await fs.readFile(file, "utf8");
  return JSON.parse(raw);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const book = searchParams.get("book") ?? "";
    const chapter = Number(searchParams.get("chapter") ?? "1");

    const bible = await readBible();
    const verses = bible
      .filter(
        (r) => r.book.toLowerCase() === book.toLowerCase() && r.chapter === chapter
      )
      .sort((a, b) => a.verse - b.verse)
      .map(({ verse, text }) => ({ verse, text }));

    return NextResponse.json({ ok: true, verses }, { headers: { "Cache-Control": "no-store" } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
