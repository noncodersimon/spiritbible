// src/app/api/chapter/route.ts
import { NextResponse } from "next/server";
import { loadVerses } from "@/lib/queries";

export const runtime = "nodejs";
export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const book = searchParams.get("book") ?? "";
    const chapter = Number(searchParams.get("chapter") ?? "1");

    const verses = await loadVerses(book, chapter);

    return NextResponse.json({ ok: true, verses }, { headers: { "Cache-Control": "no-store" } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
