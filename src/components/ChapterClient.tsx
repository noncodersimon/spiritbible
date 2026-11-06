'use client';

import { useEffect, useRef, useState } from 'react';
import type { Verse } from '@/types/bible';
import type { ChapterStudy, PassageTarget, SourceLink, StudyConnection, StudySignificance } from '@/types/study';
import { copyText, passageHref, passageLabel, selectedPassage } from '@/lib/passage';
import ReaderDialog from '@/components/ReaderDialog';
import DOMPurify from 'isomorphic-dompurify';

type Note = { significance?: StudySignificance; id: number; book: string; chapter: number; verse: number; start: number; end: number; body: string; phrase?: string | null };
const significanceOf = (item: { significance?: StudySignificance }) => item.significance === 'interest' ? 'interest' : 'fundamental';
const significanceLabel = (item: { significance?: StudySignificance }) => significanceOf(item) === 'fundamental' ? 'Fundamental' : 'Of interest';
const kindLabels = { quotation: 'Biblical quotation', fulfilment: 'Fulfilment in Scripture', echo: 'Literary echo', typology: 'Catholic reading', theme: 'Shared theme' };
function Sources({ sources }: { sources: SourceLink[] }) {
  return <p className="sources">{sources.map((s, i) => <span key={s.url}>{i > 0 && ' · '}<a href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a></span>)}</p>;
}
function sanitizeNoteHTML(raw: string) {
  return DOMPurify.sanitize(raw, { ADD_ATTR: ['target', 'rel'] }).replace(/<a\b([^>]*\bhref="https?:[^"]*"[^>]*)>/gi, (full, attrs) => {
    if (!/\btarget\s*=/.test(attrs)) attrs += ' target="_blank"';
    if (!/\brel\s*=/.test(attrs)) attrs += ' rel="noopener noreferrer nofollow"';
    return `<a${attrs}>`;
  });
}

export default function ChapterClient({ book, chapter, verses, highlightVerse, target, onNavigate }: {
  book: string; chapter: number; verses: Verse[]; highlightVerse?: number; target?: PassageTarget;
  onNavigate?: (target: PassageTarget) => void;
}) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [study, setStudy] = useState<ChapterStudy>({ introduction: null, connections: [] });
  const [studyFailed, setStudyFailed] = useState(false);
  const [readerReady, setReaderReady] = useState(false);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [activeConnections, setActiveConnections] = useState<StudyConnection[] | null>(null);
  const [selection, setSelection] = useState<ReturnType<typeof selectedPassage>>(null);
  const [copyStatus, setCopyStatus] = useState('');
  const textRoot = useRef<HTMLDivElement>(null);
  const first = target?.verse ?? highlightVerse, last = target?.endVerse ?? first;
  const partial = target?.start !== undefined && target?.end !== undefined;

  useEffect(() => {
    let alive = true, remaining = 2;
    const ready = () => { if (--remaining === 0 && alive) setReaderReady(true); };
    setReaderReady(false);
    setNotes([]); setStudy({ introduction: null, connections: [] }); setStudyFailed(false);
    setActiveNote(null); setActiveConnections(null); setCopyStatus('');
    fetch(`/api/notes?book=${encodeURIComponent(book)}&chapter=${chapter}`)
      .then(r => r.json()).then(d => { if (alive) setNotes(d.notes ?? []); }).catch(() => {}).finally(ready);
    fetch(`/api/study?book=${encodeURIComponent(book)}&chapter=${chapter}`)
      .then(r => { if (r.ok === false) throw Error('Study unavailable'); return r.json(); })
      .then(d => { if (alive) setStudy({ introduction: d.introduction ?? null, connections: d.connections ?? [] }); })
      .catch(() => { if (alive) setStudyFailed(true); }).finally(ready);
    return () => { alive = false; };
  }, [book, chapter]);

  useEffect(() => {
    if (!readerReady || first === undefined) return;
    const frame = requestAnimationFrame(() => {
      const verse = document.getElementById(`v${first}`);
      if (!target?.note && !target?.connection) verse?.focus({ preventScroll: true });
      const selected = verse?.querySelector('.passage-highlight') ?? verse;
      selected?.scrollIntoView({ behavior: 'instant', block: 'center' });
    });
    return () => cancelAnimationFrame(frame);
  }, [readerReady, target, highlightVerse, first]);

  useEffect(() => {
    if (target?.note) setActiveNote(notes.find(n => n.id === target.note) ?? null);
  }, [notes, target?.note]);
  useEffect(() => {
    if (target?.connection) {
      const found = study.connections.find(c => c.id === target.connection);
      if (found) setActiveConnections([found]);
    }
  }, [study.connections, target?.connection]);
  useEffect(() => {
    function changed() {
      setSelection(textRoot.current ? selectedPassage(textRoot.current, window.getSelection(), book, chapter) : null);
      setCopyStatus('');
    }
    document.addEventListener('selectionchange', changed);
    return () => document.removeEventListener('selectionchange', changed);
  }, [book, chapter]);

  function inRange(verse: number) { return first !== undefined && last !== undefined && verse >= first && verse <= last; }
  function highlight(text: string, offset: number, v: Verse) {
    if (!inRange(v.verse)) return text;
    const start = partial && v.verse === first ? Math.min(target!.start!, v.text.length) : 0;
    const end = partial && v.verse === last ? Math.min(target!.end!, v.text.length) : v.text.length;
    const a = Math.max(0, start - offset), b = Math.min(text.length, end - offset);
    if (a >= b) return text;
    return <>{text.slice(0, a)}<span className="passage-highlight">{text.slice(a, b)}</span>{text.slice(b)}</>;
  }
  function renderVerse(v: Verse) {
    const segments: { text: string; offset: number; note?: Note }[] = [];
    let cursor = 0;
    for (const n of notes.filter(n => n.verse === v.verse).sort((a, b) => a.start - b.start)) {
      const start = n.phrase ? v.text.indexOf(n.phrase) : n.start;
      const end = n.phrase ? start + n.phrase.length : n.end + 1;
      // Explicit anchors may never fall back to obsolete offsets.
      if (start < cursor || start < 0 || end <= start || end > v.text.length) continue;
      if (start > cursor) segments.push({ text: v.text.slice(cursor, start), offset: cursor });
      segments.push({ text: v.text.slice(start, end), offset: start, note: n }); cursor = end;
    }
    if (cursor < v.text.length) segments.push({ text: v.text.slice(cursor), offset: cursor });
    return segments.map((s, i) => s.note ? <mark key={i} role="button" tabIndex={0}
      aria-label={`${significanceLabel(s.note)} commentary on ${s.text}`}
      onClick={() => { if (!window.getSelection()?.toString()) setActiveNote(s.note!); }}
      onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setActiveNote(s.note!); } }}
      className={`commentary-mark significance-${significanceOf(s.note)}`}>{highlight(s.text, s.offset, v)}</mark> : <span key={i}>{highlight(s.text, s.offset, v)}</span>);
  }
  function shareSelection(event: React.ClipboardEvent<HTMLDivElement>) {
    const selected = textRoot.current && selectedPassage(textRoot.current, window.getSelection(), book, chapter);
    if (!selected) return;
    event.clipboardData.setData('text/plain', copyText(selected.text, selected.target, window.location.origin));
    event.preventDefault();
    setCopyStatus('Copied with a link to this passage.');
  }
  async function copyPassage() {
    if (!verses.length) return;
    const selected = selection ?? { text: verses.map(v => v.text).join('\n'), target: { book, chapter, verse: verses[0].verse, endVerse: verses[verses.length - 1].verse } };
    const text = copyText(selected.text, selected.target, window.location.origin);
    try {
      if (!navigator.clipboard?.writeText) throw Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      setCopyStatus('Copied with a link to this passage.');
    } catch {
      setCopyStatus('Select the passage and use your device’s Copy command to include its link.');
    }
  }

  return <>
    {study.introduction && <details className="book-introduction" key={book}>
      <summary>About {book}</summary>
      <p>{study.introduction.summary}</p><Sources sources={study.introduction.sources} />
    </details>}
    <div className="reader-tools">
      <p className="reader-key"><span className="commentary-key">Commentary</span><span className="connection-key">↔ Related passages</span></p>
      <button className="copy-passage" onMouseDown={event => event.preventDefault()} onClick={copyPassage}>{selection ? 'Copy selection + link' : 'Copy chapter + link'}</button>
    </div>
    {copyStatus && <p role="status" className="copy-status">{copyStatus}</p>}
    {studyFailed && <p className="study-status">Related passages are temporarily unavailable. Reload to try again.</p>}
    <div ref={textRoot} className="bible-reader" onCopy={shareSelection}>
      {verses.map(v => {
        const related = study.connections.filter(c => c.passages.some(p => p.book === book && p.chapter === chapter && p.verse === v.verse));
        return <p key={v.verse} id={`v${v.verse}`} className={inRange(v.verse) ? 'passage-target' : undefined} tabIndex={inRange(v.verse) ? -1 : undefined}>
          <sup style={{ userSelect: 'none' }}>{v.verse}</sup>{' '}<span data-verse-text={v.verse}>{renderVerse(v)}</span>
          {related.length > 0 && <button className={`connection-marker significance-${related.some(c => significanceOf(c) === 'fundamental') ? 'fundamental' : 'interest'}`} aria-label={`Related passages for ${book} ${chapter}:${v.verse} — ${related.some(c => significanceOf(c) === 'fundamental') ? 'includes fundamental connections' : 'of interest'}`} title="Explore related passages" onClick={() => setActiveConnections(related)} />}
        </p>;
      })}
    </div>
    {activeNote && <ReaderDialog title={passageLabel(activeNote)} onClose={() => setActiveNote(null)}>
      <div className="note-popup" dangerouslySetInnerHTML={{ __html: sanitizeNoteHTML(activeNote.body) }} />
    </ReaderDialog>}
    {activeConnections && <ReaderDialog title="Related passages" onClose={() => setActiveConnections(null)}>
      {activeConnections.map(c => <article className={`connection-card significance-${significanceOf(c)}`} key={c.id}>
        <p className="connection-kind">{kindLabels[c.kind]}</p>
        <h4>{c.title}</h4><p>{c.summary}</p>
        <ul className="passage-links">{c.passages.map(p => <li key={passageHref(p)}>
          <a href={passageHref(p)} onClick={event => {
            if (!onNavigate || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
            event.preventDefault(); setActiveConnections(null); window.getSelection()?.removeAllRanges(); onNavigate(p);
          }}>{passageLabel(p)}</a><span> — {p.label}</span>
        </li>)}</ul>
        <Sources sources={c.sources} />
      </article>)}
    </ReaderDialog>}
  </>;
}
