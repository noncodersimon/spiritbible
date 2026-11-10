'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ChapterClient from '@/components/ChapterClient';
import { passageHref, readPassage } from '@/lib/passage';
import type { PassageTarget } from '@/types/study';

// --- Types matching your APIs ---
type BookRow = { book: string; chapters: number };
type BooksResponse =
  | { ok: true; ot: BookRow[]; nt: BookRow[] }
  | { ok: false; error: string };

type Verse = { verse: number; text: string };

type SearchHit = {
  title?: string;
  note?: number;
  connection?: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
};

// Small reusable horizontal scroller for buttons
function HorizontalScroller<T>({
  label,
  items,
  getKey,
  getLabel,
  isActive,
  onClick,
  getDataAttrs, // <-- NEW (optional)
}: {
  label: string;
  items: T[];
  getKey: (it: T) => string;
  getLabel: (it: T) => string | number;
  isActive: (it: T) => boolean;
  onClick: (it: T) => void;
  getDataAttrs?: (it: T) => Record<string, string | number>; // <-- NEW
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
      role="group"
      aria-label={label}
    >
      {items.map((it) => {
        const active = isActive(it);
        const extra = getDataAttrs ? getDataAttrs(it) : undefined; // <-- NEW
        return (
          <button
            key={getKey(it)}
            type="button"
            aria-pressed={active}
            onClick={() => onClick(it)}
            className={`chip ${active ? 'is-active' : ''}`}
            style={{
              whiteSpace: 'nowrap',
              borderRadius: 8,
              padding: '6px 10px',
              cursor: 'pointer',
            }}
            {...extra} // <-- NEW: safely applies data attributes
          >
            {getLabel(it)}
          </button>
        );
      })}
    </div>
  );
}


// Shared Previous/Next navigation above and below the reader.
function InlineNav({
  label,
  prev,
  next,
  onGo,
  style,
}: {
  label: string;
  prev: { book: string; chapter: number } | null;
  next: { book: string; chapter: number } | null;
  onGo: (book: string, chapter: number) => void;
  style?: React.CSSProperties;
}) {
  return (
    <nav
      aria-label={label}
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
        className="chip"
        style={{ padding: '8px 12px' }}
      >
        ← Previous
      </button>

      <span style={{ opacity: 0.7 }} />

      <button
        aria-label="Next chapter"
        disabled={!next}
        onClick={() => next && onGo(next.book, next.chapter)}
        className="chip"
        style={{ padding: '8px 12px' }}
      >
        Next →
      </button>
    </nav>
  );
}

export default function Home() {
// --- scrolling helpers ---
// Keep the top navigation and chapter title visible after changing chapters.
const readerTopRef = useRef<HTMLDivElement | null>(null);
function scrollToReaderTop() {
  readerTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}


  // --- search state ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchScope, setSearchScope] = useState('bible');
  const searchRequest = useRef(0);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchHit[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchTried, setSearchTried] = useState(false);
  const [lastQuery, setLastQuery] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);

  // --- browse state ---
  const [bookGroups, setBookGroups] = useState<{ ot: BookRow[]; nt: BookRow[] }>({ ot: [], nt: [] });
  const books = useMemo(() => [...bookGroups.ot, ...bookGroups.nt], [bookGroups]);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [booksError, setBooksError] = useState<string | null>(null);

  const [selectedBook, setSelectedBook] = useState<BookRow | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [chapterVerses, setChapterVerses] = useState<Verse[]>([]);
  const [loadedChapterKey, setLoadedChapterKey] = useState<string | null>(null);
  const [chapterError, setChapterError] = useState<string | null>(null);
  const chapterRequest = useRef(0);
  const [searchTarget, setSearchTarget] = useState<PassageTarget | null>(null);

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
          setBookGroups({ ot: data.ot, nt: data.nt });
          if (flat.length > 0) {
            let target = readPassage(window.location.search);
            const hasReference = new URLSearchParams(window.location.search).has('ref');
            if (hasReference && !target) setLinkError('This passage link is not valid. Please choose a book or search for a reference.');
            if (!hasReference) {
              try { target = readPassage(localStorage.getItem('spiritbible:last-passage') ?? ''); } catch { /* Storage can be disabled. */ }
            }
            const chosen = flat.find(b => b.book === target?.book) ?? flat[0];
            setSelectedBook(chosen);
            setSelectedChapter(target?.chapter ?? 1);
            setSearchTarget(target);
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

  const navigate = useCallback((target: PassageTarget, history: 'push' | 'none' = 'push') => {
    const found = books.find(b => b.book === target.book);
    if (!found || target.chapter < 1 || target.chapter > found.chapters) return;
    searchRequest.current++;
    setSearchLoading(false); setSearchResults([]); setSearchTried(false); setSearchError(null); setLinkError(null);
    setSelectedBook(found); setSelectedChapter(target.chapter); setSearchTarget(target);
    if (history === 'push') window.history.pushState(null, '', passageHref(target));

  }, [books]);

  useEffect(() => {
    if (!books.length) return;
    function restored() {
      const target = readPassage(window.location.search);
      navigate(target ?? { book: books[0].book, chapter: 1 }, 'none');
    }
    window.addEventListener('popstate', restored);
    return () => window.removeEventListener('popstate', restored);
  }, [books, navigate]);

  useEffect(() => {
    if (!selectedBook) return;
    const button = document.querySelector<HTMLButtonElement>(`[data-bk="${CSS.escape(selectedBook.book)}"]`);
    const scroller = button?.parentElement;
    if (button && scroller) scroller.scrollLeft = button.offsetLeft - scroller.offsetLeft - scroller.clientWidth / 2 + button.clientWidth / 2;
  }, [selectedBook]);

  // Chapters array for slider
  const chapters = useMemo<number[]>(() => {
    if (!selectedBook) return [];
    const total = Math.max(1, Number(selectedBook.chapters || 1));
    return Array.from({ length: total }, (_, i) => i + 1);
  }, [selectedBook]);

  // Only the latest chapter request may update the reader.
  const loadChapter = useCallback(async (book: string, ch: number) => {
    const request = ++chapterRequest.current;
    setChapterError(null);
    try {
      const res = await fetch(
        `/api/chapter2?book=${encodeURIComponent(book)}&chapter=${ch}`,
        { cache: 'no-store' }
      );
      if (!res.ok) throw new Error('The chapter could not be loaded. Please try again.');
      const data = (await res.json()) as { verses: Verse[] };
      if (request !== chapterRequest.current) return;
      setChapterVerses(data.verses ?? []);
      setLoadedChapterKey(`${book}|${ch}`);
    } catch (error) {
      if (request !== chapterRequest.current) return;
      setChapterError(error instanceof Error ? error.message : 'The chapter could not be loaded.');
      setLoadedChapterKey(null);
    }
  }, []);

  useEffect(() => {
    if (selectedBook && selectedChapter) loadChapter(selectedBook.book, selectedChapter);
    return () => { chapterRequest.current++; };
  }, [selectedBook, selectedChapter, loadChapter]);

  useEffect(() => {
    if (!searchTarget?.verse || loadedChapterKey !== `${searchTarget.book}|${searchTarget.chapter}`) return;
    const first = chapterVerses.find(v => v.verse === searchTarget.verse);
    const last = chapterVerses.find(v => v.verse === (searchTarget.endVerse ?? searchTarget.verse));
    if (!first || !last) {
      setLinkError('That verse range is not available in this edition. The chapter is shown below.');
      return;
    }

  }, [searchTarget, loadedChapterKey, chapterVerses]);

  useEffect(() => {
    if (!selectedBook || !selectedChapter || loadedChapterKey !== `${selectedBook.book}|${selectedChapter}`) return;
    try {
      localStorage.setItem('spiritbible:last-passage', passageHref({ book: selectedBook.book, chapter: selectedChapter,
        ...(searchTarget?.verse ? { verse: searchTarget.verse, endVerse: searchTarget.endVerse } : {}) }).slice(2));
    } catch { /* Storage is optional. */ }
  }, [selectedBook, selectedChapter, loadedChapterKey, searchTarget]);

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

  const onPickBook = (b: BookRow) => navigate({ book: b.book, chapter: 1 });
  const onPickChapter = (chapter: number) => { if (selectedBook) navigate({ book: selectedBook.book, chapter }); };
  const inlineGoToChapter = (book: string, chapter: number) => {
    navigate({ book, chapter });
    requestAnimationFrame(scrollToReaderTop);
  };

  // References open directly; word searches show a list of matching passages.
  const doSearch = useCallback(async () => {
    const request = ++searchRequest.current;
    const q = searchQuery.trim();
    setLastQuery(q);
    setSearchTried(true);
    setSearchError(null);

    if (!q) {
      setSearchResults([]);
      return;
    }

    // Hide the chapter panel so results become the main view
    setSelectedChapter(null);

    setSearchLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&scope=${searchScope}`, {
        cache: 'no-store',
      });

      const data: any = await res.json();
      if (request !== searchRequest.current) return;
      if (!res.ok) throw new Error(data.error || 'Search is temporarily unavailable. Please try again.');

      if (data.reference) {
        navigate(data.reference);
        return;
      }

      // Accept both shapes: {hits: [...] } or {results: [...] }
      const hits: SearchHit[] =
        (Array.isArray(data?.hits) && data.hits) ||
        (Array.isArray(data?.results) && data.results) ||
        [];

      setSearchResults(hits);
    } catch (e) {
      if (request !== searchRequest.current) return;
      setSearchError(e instanceof Error ? e.message : 'Search is temporarily unavailable. Please try again.');
      setSearchResults([]);
    } finally {
      if (request === searchRequest.current) setSearchLoading(false);
    }
  }, [searchQuery, searchScope, navigate]);

  const openHit = (hit: SearchHit) => navigate({ book: hit.book, chapter: hit.chapter, verse: hit.verse,
    ...(hit.note ? { note: Number(hit.note) } : {}), ...(hit.connection ? { connection: hit.connection } : {}) });

  return (
    <main className="mx-auto max-w-3xl p-4">
      {/* Search */}
      <div className="search-toolbar">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            doSearch();
          }}
          className="search-form"
        >
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            type="search"
            aria-label="Search the Bible"
            aria-describedby="search-help"
            placeholder='Passage, word or phrase'
            className="text-input"
          />
          <button type="submit" className="btn-primary">
            Search
          </button>
        </form>
      </div>
      <div className="search-options">
        <label>Search in <select aria-label="Search in" value={searchScope} onChange={e => setSearchScope(e.target.value)}>
          <option value="bible">Bible text</option><option value="commentary">Notes &amp; connections</option>
        </select></label>
        <p id="search-help">{searchScope === 'bible' ? 'Try Jn3:16, 1 Cor13:4–7 or “living water”.' : 'Try resurrection, covenant or forgiveness.'}</p>
      </div>

      {/* Both rows share selectedBook; the combined list still drives navigation. */}
      {([
        { id: 'old-testament', label: 'Old Testament', items: bookGroups.ot },
        { id: 'new-testament', label: 'New Testament', items: bookGroups.nt },
      ]).map(({ id, label, items }) => (
        <section key={id} aria-label={label}>
          <HorizontalScroller<BookRow>
            label={`${label} books`}
            items={items}
            getKey={(b) => b.book}
            getLabel={(b) => b.book}
            isActive={(b) => b.book === selectedBook?.book}
            onClick={onPickBook}
            getDataAttrs={(b) => ({ 'data-bk': b.book })}
          />
        </section>
      ))}

      {/* Chapter scroller */}
      {selectedBook && (
        <section style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <HorizontalScroller<number>
                label="Chapters"
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
      {searchLoading && <p role="status">Searching…</p>}
      {searchError && <p role="alert">{searchError}</p>}
      {linkError && <p role="alert">{linkError}</p>}

      {searchResults.length > 0 ? (
        <>
          <h2 style={{ fontSize: 18, margin: '8px 0' }}>
            Results ({searchResults.length})
          </h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {searchResults.map((r, i) => (
              <li
                key={`${r.book}-${r.chapter}-${r.verse}-${i}`}
                style={{ padding: '10px 0', borderBottom: '1px solid var(--border-soft)' }}
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
                    {r.title ? `${r.title} — ` : ''}{r.book} {r.chapter}:{r.verse}
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
          <div ref={readerTopRef} style={{ scrollMarginTop: 96 }}>
            <InlineNav
              label="Chapter navigation above the text"
              prev={prevNav}
              next={nextNav}
              onGo={inlineGoToChapter}
              style={{ marginTop: 12 }}
            />
            <h2 style={{ fontSize: 22, margin: '12px 0' }}>
              {selectedBook.book} {selectedChapter}
            </h2>
          </div>

          {loadedChapterKey === `${selectedBook.book}|${selectedChapter}` ? (
            <ChapterClient
              key={`${selectedBook.book}|${selectedChapter}`}
              book={selectedBook.book}
              chapter={selectedChapter}
              verses={chapterVerses}
              target={searchTarget?.book === selectedBook.book && searchTarget.chapter === selectedChapter ? searchTarget : undefined}
              onNavigate={navigate}
            />
          ) : chapterError ? (
            <p role="alert">{chapterError} <button className="chip" onClick={() => loadChapter(selectedBook.book, selectedChapter)}>Retry</button></p>
          ) : <p role="status">Loading chapter…</p>}
          <InlineNav
            label="Chapter navigation below the text"
            prev={prevNav}
            next={nextNav}
            onGo={inlineGoToChapter}
            style={{ marginTop: 16 }}
          />
        </>
      ) : searchTried && !searchLoading && !searchError ? (
        lastQuery ? <p>No results for “{lastQuery}”.</p> : null
      ) : null}
    </main>
  );
}
