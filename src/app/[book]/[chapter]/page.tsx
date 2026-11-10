// src/app/[book]/[chapter]/page.tsx
import { redirect } from "next/navigation";
import { loadVerses } from "@/lib/queries";
import { prevChapter, nextChapter } from "@/lib/canon";
import ChapterClient from "@/components/ChapterClient";
import { socialMetadata, socialPassage } from "@/lib/social";

type RouteParams = { book: string; chapter: string };

export async function generateMetadata({ params }: { params: Promise<RouteParams> }) {
  const { book, chapter } = await params;
  return socialMetadata(await socialPassage(new URLSearchParams({ ref: `${book} ${chapter}` })));
}

export default async function ChapterPage({
  params,
}: {
  params: Promise<RouteParams>; // Next.js RSC: params is a Promise
}) {
  // Always await params once, then use the values
  const { book: rawBook, chapter: rawChapter } = await params;

  const book = decodeURIComponent(rawBook);
  const raw = Number(rawChapter);
  if (!Number.isFinite(raw) || raw < 1) {
    redirect(`/${encodeURIComponent(book)}/1`);
  }
  const chapter = raw;

  // Load verses for this chapter
  const verses = await loadVerses(book, chapter);

  // Compute adjacent chapter navigation
  const prev = prevChapter(book, chapter);
  const next = nextChapter(book, chapter);

  return (
    <main className="mx-auto max-w-3xl p-4">
      <h1 className="text-2xl mb-4">
        {book} {chapter}
      </h1>

      {/* ChapterClient renders the chapter and (optionally) the bottom arrows */}
      <ChapterClient book={book} chapter={chapter} verses={verses} />
    </main>
  );
}
