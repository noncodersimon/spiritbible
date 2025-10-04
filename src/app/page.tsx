'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ChapterClient from '@/components/ChapterClient';

// --- Types matching your APIs ---
type BookRow = { book: string; chapters: number };
type BooksResponse =
  | { ok: true; ot: BookRow[]; nt: BookRow[] }
  | { ok: false; error: string };

type Verse = { verse: number; text: string };

type SearchHit = {
  book: string;
  chapter: number;
  verse: number;
  text: string;
};

// Small reusable horizontal scroller for buttons
function HorizontalScroller<T>({
  items,
  getKey,
  getLabel,
  isActive,
  onClick,
}: {
  items: T[];
  getKey: (it: T) => string;
  getLabel: (it: T) => string | number;
  isActive: (it: T) => boolean;
  onClick: (it: T) => void;
}) {
  return (
    <div
      className="scroller"
      style={{
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        padding: '8px 0',
        WebkitOverflowScrolling: 'touch',
      }}
      aria-label="Scroller"
    >
      {items.map((it) => {
        const active = isActive(it);
        return (
          <button
            key={getKey(it)}
            onClick={() => onClick(it)}
            className={`chip ${active ? 'is-active' : ''}`}
            style={{
              // keep only layout/spacing inline; colours come from CSS
              whiteSpace: 'nowrap',
              borderRadius: 8,
              padding: '6px 10px',
              cursor: 'pointer',
            }}
          >
            {getLabel(it)}
          </button>
        );
      })}
    </div>
  );
}

// Bottom Inline Previous/Next nav
function InlineNav({
  prev,
  next,
  onGo,
  style,
}: {
  prev: { book: string; chapter: number } | null;
  next: { book: string; chapter: number } | null;
  onGo: (book: string, chapter: number) => void;
  style?: React.CSSProperties;
}) {
  return (
    <nav
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        ...style,
      }}
    >
      <button
        aria-label="Previous chapter"
        disabled={!prev}
        onClick={() => prev && onGo(prev.book, prev.chapter)}
        style={{
          border: '1px solid #ddd',
          background: prev ? '#f7f7f7' : '#eee',
          color: '#222',
          borderRadius: 6,
          padding: '8px 12px',
          cursor: prev ? 'pointer' : 'not-allowed',
        }}
      >
        ← Previous
      </button>

      <span style={{ opacity: 0.7 }} />

      <button
        aria-label="Next chapter"
        disabled={!next}
        onClick={() => next && onGo(next.book, next.chapter)}
        style={{
          border: '1px solid #ddd',
          background: next ? '#f7f7f7' : '#eee',
          color: '#222',
          borderRadius: 6,
          padding: '8px 12px',
          cursor: next ? 'pointer' : 'not-allowed',
        }}
      >
        Next →
      </button>
    </nav>
  );
}

export default function Home() {
// --- scrolling helpers ---
// scroll the actual H2 title into view so it's visible after Next/Prev
const titleRef = useRef<HTMLHeadingElement | null>(null);
function scrollToReaderTop() {
  titleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}


  // --- search state ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchHit[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchTried, setSearchTried] = useState(false);
  const [lastQuery, setLastQuery] = useState('');

  // --- browse state ---
  const [books, setBooks] = useState<BookRow[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [booksError, setBooksError] = useState<string | null>(null);

  const [selectedBook, setSelectedBook] = useState<BookRow | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [chapterVerses, setChapterVerses] = useState<Verse[]>([]);

  // Fetch books (OT + NT)
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingBooks(true);
      setBooksError(null);
      try {
        const res = await fetch('/api/books', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as BooksResponse;
        if (!data.ok) throw new Error(data.error ?? 'Unknown error');
        const flat = [...data.ot, ...data.nt];
        if (alive) {
          setBooks(flat);
          if (!selectedBook && flat.length > 0) {
            const b = flat[0];
            setSelectedBook(b);
            setSelectedChapter(1);
          }
        }
      } catch (err: any) {
        if (alive) setBooksError(err.message ?? String(err));
      } finally {
        if (alive) setLoadingBooks(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []); // once

  // Chapters array for slider
  const chapters = useMemo<number[]>(() => {
    if (!selectedBook) return [];
    const total = Math.max(1, Number(selectedBook.chapters || 1));
    return Array.from({ length: total }, (_, i) => i + 1);
  }, [selectedBook]);

  // Load a chapter’s verses for the inline reader
  const loadChapter = useCallback(async (book: string, ch: number) => {
    const res = await fetch(
      `/api/chapter2?book=${encodeURIComponent(book)}&chapter=${ch}`,
      { cache: 'no-store' }
    );
    if (!res.ok) {
      setChapterVerses([]);
      return;
    }
    const data = (await res.json()) as { verses: Verse[] };
    setChapterVerses(data.verses ?? []);
  }, []);

  // Auto-load when selection changes
  useEffect(() => {
    if (selectedBook && selectedChapter) {
      loadChapter(selectedBook.book, selectedChapter);
    }
  }, [selectedBook, selectedChapter, loadChapter]);

  // Prev / Next across books
  const prevNav = useMemo(() => {
    if (!books.length || !selectedBook || !selectedChapter) return null;
    if (selectedChapter > 1) {
      return { book: selectedBook.book, chapter: selectedChapter - 1 };
    }
    const idx = books.findIndex((b) => b.book === selectedBook.book);
    if (idx > 0) {
      const prevBook = books[idx - 1];
      return { book: prevBook.book, chapter: prevBook.chapters };
    }
    return null;
  }, [books, selectedBook, selectedChapter]);

  const nextNav = useMemo(() => {
    if (!books.length || !selectedBook || !selectedChapter) return null;
    if (selectedChapter < (selectedBook?.chapters ?? 1)) {
      return { book: selectedBook.book, chapter: selectedChapter + 1 };
    }
    const idx = books.findIndex((b) => b.book === selectedBook.book);
    if (idx >= 0 && idx < books.length - 1) {
      const nextBook = books[idx + 1];
      return { book: nextBook.book, chapter: 1 };
    }
    return null;
  }, [books, selectedBook, selectedChapter]);

  // Pick book / chapter (inline) — NO SCROLL here
  const onPickBook = (b: BookRow) => {
    setSearchResults([]); // hide search when browsing
    setSelectedBook(b);
    setSelectedChapter(1);
    loadChapter(b.book, 1); // no scroll
  };

  const onPickChapter = (ch: number) => {
    setSearchResults([]); // hide search when browsing
    setSelectedChapter(ch);
    if (selectedBook) {
      loadChapter(selectedBook.book, ch); // no scroll
    }
  };

  // Inline go func for bottom arrows — SCROLL here
  const inlineGoToChapter = useCallback(
    (b: string, ch: number) => {
      setSearchResults([]); // hide search when navigating
      const found = books.find(
        (x) => x.book.toLowerCase() === b.toLowerCase()
      );
      if (found) setSelectedBook(found);
      setSelectedChapter(ch);
      loadChapter(b, ch).then(scrollToReaderTop);
    },
    [books, loadChapter]
  );

  // Search: replaces the chapter view; user clicks a hit to open it
  const doSearch = useCallback(async () => {
    const q = searchQuery.trim();
    setLastQuery(q);
    setSearchTried(true);

    if (!q) {
      setSearchResults([]);
      return;
    }

    // Hide the chapter panel so results become the main view
    setSelectedChapter(null);

    setSearchLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
        cache: 'no-store',
      });

      if (!res.ok) {
        console.error('Search HTTP error', res.status);
        setSearchResults([]);
        return;
      }

      const data: any = await res.json();

      // Accept both shapes: {hits: [...] } or {results: [...] }
      const hits: SearchHit[] =
        (Array.isArray(data?.hits) && data.hits) ||
        (Array.isArray(data?.results) && data.results) ||
        [];

      setSearchResults(hits);
    } catch (e) {
      console.error('Search failed', e);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [searchQuery]);

  // open any clicked search hit (no scroll here; opening via list is a top action)
  const openHit = useCallback(
    async (hit: SearchHit) => {
      const found = books.find(
        (b) => b.book.toLowerCase() === hit.book.toLowerCase()
      );
      if (!found) return;

      setSelectedBook(found);
      setSelectedChapter(hit.chapter);
      await loadChapter(found.book, hit.chapter);

      // exit search mode
      setSearchResults([]);
      setSearchTried(false);
      setLastQuery('');
      setSearchQuery('');
      // do not scroll (top action)
    },
    [books, loadChapter]
  );

  return (
    <main className="mx-auto max-w-3xl p-4">
      {/* Search */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          doSearch();
        }}
        style={{ display: 'flex', gap: 8, marginBottom: 16 }}
      >
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder='Try: John 3:16 or "festival"'
          style={{
            flex: 1,
            border: '1px solid #ccc',
            borderRadius: 8,
            padding: '10px 12px',
          }}
        />
        <button
          type="submit"
          style={{
            border: '1px solid #444',
            background: '#111',
            color: '#fff',
            borderRadius: 8,
            padding: '10px 14px',
            cursor: 'pointer',
          }}
        >
          Search
        </button>
      </form>

      {/* Books scroller */}
      <HorizontalScroller<BookRow>
        items={books}
        getKey={(b) => b.book}
        getLabel={(b) => b.book}
        isActive={(b) =>
          !!selectedBook &&
          b.book.toLowerCase() === selectedBook!.book.toLowerCase()
        }
        onClick={(b) => onPickBook(b)}
      />

      {/* Chapter scroller */}
      {selectedBook && (
        <section style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <HorizontalScroller<number>
                items={chapters}
                getKey={(ch) => String(ch)}
                getLabel={(ch) => ch}
                isActive={(ch) => ch === selectedChapter}
                onClick={(ch) => onPickChapter(ch)}
              />
            </div>
          </div>
        </section>
      )}

      {/* Results list OR inline reader */}
      {searchLoading && <p>Searching…</p>}

      {searchResults.length > 0 ? (
        <>
          <h2 style={{ fontSize: 18, margin: '8px 0' }}>
            Results ({searchResults.length})
          </h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {searchResults.map((r, i) => (
              <li
                key={`${r.book}-${r.chapter}-${r.verse}-${i}`}
                style={{ padding: '10px 0', borderBottom: '1px solid #eee' }}
              >
                <button
                  onClick={() => openHit(r)}
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    display: 'block',
                    width: '100%',
                  }}
                  aria-label={`Open ${r.book} ${r.chapter}:${r.verse}`}
                >
                  <strong>
                    {r.book} {r.chapter}:{r.verse}
                  </strong>
                  <div style={{ marginTop: 4 }}>{r.text}</div>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : selectedBook && selectedChapter ? (
        // ✅ reader takes precedence
        <>
          {/* scroll target just above the title for Next/Prev */}
<h2
  ref={titleRef}
  style={{
    fontSize: 22,
    margin: '12px 0',
    // keeps the title visible if the browser uses anchor snapping
    scrollMarginTop: 72,
  }}
>
  {selectedBook.book} {selectedChapter}
</h2>

          <ChapterClient
            book={selectedBook.book}
            chapter={selectedChapter}
            verses={chapterVerses}
          />
          {/* Bottom inline nav — this calls inlineGoToChapter which scrolls */}
          <InlineNav
            prev={prevNav}
            next={nextNav}
            onGo={inlineGoToChapter}
            style={{ marginTop: 16 }}
          />
        </>
      ) : searchTried && !searchLoading ? (
        lastQuery ? <p>No results for “{lastQuery}”.</p> : null
      ) : null}
    </main>
  );
}
