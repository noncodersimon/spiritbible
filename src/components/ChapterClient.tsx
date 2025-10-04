'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Verse } from "@/types/bible";
import { prevChapter, nextChapter } from "@/lib/canon";
import DOMPurify from "isomorphic-dompurify";


type Note = {
  id: number;
  book: string;
  chapter: number;
  verse: number;
  start: number;
  end: number;
  body: string;
};

export default function ChapterClient({
  book,
  chapter,
  verses,
}: {
  book: string;
  chapter: number;
  verses: Verse[];
}) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);

  // compute nav locally (avoid prop name conflicts)
  const prevNav = prevChapter(book, chapter);
  const nextNav = nextChapter(book, chapter);

  const START_BIAS = 0;
  const END_BIAS = 0;

   // helper for external links
function sanitizeNoteHTML(raw: string) {
  // 1) Sanitize (allowing target/rel so we can keep them if already present)
  const clean = DOMPurify.sanitize(raw ?? "", {
    ADD_ATTR: ["target", "rel"],
  });

  // 2) Ensure http/https links open safely in a new tab
  //    - add target and rel if they’re missing
  return clean.replace(
    /<a\b([^>]*\bhref="https?:[^"]*"[^>]*)>/gi,
    (full, attrs) => {
      let a = attrs;
      if (!/\btarget\s*=/.test(a)) a += ' target="_blank"';
      if (!/\brel\s*=/.test(a)) a += ' rel="noopener noreferrer nofollow"';
      return `<a${a}>`;
    }
  );
}


  // --- helpers for note highlighting ---
  function extractQuotedPhrase(body: string): string | null {
    const m = body.match(/[“"']([^“"']+)[”"']/);
    return m ? m[1] : null;
  }
  function findPhraseInText(text: string, phrase: string): { s: number; e: number } | null {
    const t = text.toLowerCase(), p = phrase.toLowerCase();
    const idx = t.indexOf(p);
    return idx < 0 ? null : { s: idx, e: idx + phrase.length };
  }
  function snapToWord(text: string, s: number, e: number) {
    while (s < e && /[^A-Za-z0-9]/.test(text[s])) s++;
    while (e > s && /[^A-Za-z0-9]/.test(text[e - 1])) e--;
    if (e < text.length && /[A-Za-z0-9]/.test(text[e]) && /[A-Za-z0-9]/.test(text[e - 1])) {
      while (e > s && /[A-Za-z0-9]/.test(text[e - 1])) e--;
    }
    if (s > 0 && /[A-Za-z0-9]/.test(text[s]) && /[A-Za-z0-9]/.test(text[s - 1])) {
      while (s < e && /[A-Za-z0-9]/.test(text[s])) s++;
      while (s < e && /[^A-Za-z0-9]/.test(text[s])) s++;
    }
    return { s, e };
  }

  // fetch notes for this chapter
  useEffect(() => {
    setNotes([]);
    setActiveNote(null);
    fetch(`/api/notes?book=${encodeURIComponent(book)}&chapter=${chapter}`)
      .then((r) => r.json())
      .then((d) => setNotes(d.notes ?? []))
      .catch(() => setNotes([]));
  }, [book, chapter]);

  // close popup on Esc
  useEffect(() => {
    if (!activeNote) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveNote(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeNote]);

  // renderer with highlighting
// renderer with highlighting (de-duplicates/merges overlaps)
const renderVerse = (v: Verse) => {
  // sort by start so we handle in reading order
  const ns = notes
    .filter((n) => n.verse === v.verse)
    .sort((a, b) => a.start - b.start);

  if (!ns.length) return v.text;

  const segs: Array<{ text: string; note?: Note }> = [];
  let cur = 0; // how far we've already emitted (in v.text)

  for (const n of ns) {
    // 1) compute [s, e) for this note
    let s: number, e: number;

    const phrase = extractQuotedPhrase(n.body || "");
    const hit = phrase ? findPhraseInText(v.text, phrase) : null;

    if (hit) {
      ({ s, e } = hit);
    } else {
      s = Math.max(0, Math.min(n.start + START_BIAS, v.text.length));
      e = Math.max(s, Math.min(n.end + 1 + END_BIAS, v.text.length));
    }

    // word-snap and then trim to avoid overlaps with what we've already emitted
    ({ s, e } = snapToWord(v.text, s, e));

    // if this segment ends at/before what we've already emitted, skip it
    if (e <= cur) continue;

    // if the start is inside already-emitted text, trim start forward
    if (s < cur) s = cur;

    // 2) emit plain text between cur and s (if any)
    if (cur < s) segs.push({ text: v.text.slice(cur, s) });

    // 3) emit highlighted segment
    segs.push({ text: v.text.slice(s, e), note: n });

    // 4) advance cursor
    cur = e;
  }

  // 5) emit tail
  if (cur < v.text.length) segs.push({ text: v.text.slice(cur) });

  return segs.map((seg, i) =>
    seg.note ? (
      <mark
        key={i}
        onClick={() => setActiveNote(seg.note!)}
        style={{
          background: "rgba(255,230,150,.9)",
          borderRadius: 4,
          padding: "0 2px",
          cursor: "pointer",
        }}
      >
        {seg.text}
      </mark>
    ) : (
      <span key={i}>{seg.text}</span>
    )
  );
};

  return (
    <>
      {verses.map((v) => (
        <p key={v.verse} id={`v${v.verse}`}>
          <sup style={{ userSelect: "none" }}>{v.verse}</sup>{" "}
          {renderVerse(v)}
        </p>
      ))}



      {activeNote && (
        <div
          aria-modal="true"
          role="dialog"
          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center"
          onClick={() => setActiveNote(null)} // click-outside closes
        >
          {/* backdrop */}
          <div className="absolute inset-0 bg-black/40" />

          {/* card */}
          <div
            className="relative m-3 w-full max-w-xl rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900"
            onClick={(e) => e.stopPropagation()} // prevent outside-close
          >
            <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
              {activeNote.book} {activeNote.chapter}:{activeNote.verse}
            </div>

		<div
		  className="note-popup text-neutral-900 dark:text-neutral-100"
		  dangerouslySetInnerHTML={{
			__html: sanitizeNoteHTML(activeNote?.body ?? ""),
		  }}
		/>


            <div className="mt-3 text-right">
              <button
                onClick={() => setActiveNote(null)}
                className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
