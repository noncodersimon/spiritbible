import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const book = p.get('book') ?? '', chapter = Number(p.get('chapter'));
  if (!book || !Number.isSafeInteger(chapter) || chapter < 1) return NextResponse.json({ introduction: null, connections: [] });
  const intro = db.prepare('SELECT payload FROM book_introduction WHERE book = ? COLLATE NOCASE').get(book) as { payload: string } | undefined;
  const rows = db.prepare(`SELECT DISTINCT c.payload FROM study_connection c
    JOIN connection_passage p ON p.connection_id = c.id
    WHERE p.book = ? COLLATE NOCASE AND p.chapter = ? ORDER BY c.id`).all(book, chapter) as { payload: string }[];
  return NextResponse.json({ introduction: intro ? JSON.parse(intro.payload) : null, connections: rows.map(r => JSON.parse(r.payload)) });
}
