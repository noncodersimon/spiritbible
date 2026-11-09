import { parseRef } from './ref';
import type { Passage, PassageTarget } from '../types/study';

export function passageLabel(p: Passage): string {
  return `${p.book} ${p.chapter}${p.verse ? `:${p.verse}${p.endVerse && p.endVerse !== p.verse ? `–${p.endVerse}` : ''}` : ''}`;
}

export function passageHref(p: PassageTarget): string {
  const params = new URLSearchParams({ ref: passageLabel(p) });
  if (p.verse && p.start !== undefined && p.end !== undefined) {
    params.set('start', String(p.start)); params.set('end', String(p.end));
  }
  if (p.note) params.set('note', String(p.note));
  if (p.connection) params.set('connection', p.connection);
  return `/?${params}`;
}

export function readPassage(search: string): PassageTarget | null {
  const params = new URLSearchParams(search), ref = params.get('ref');
  if (!ref) return null;
  const parsed = parseRef(ref);
  if (!parsed) return null;
  const target: PassageTarget = { ...parsed };
  const start = params.get('start'), end = params.get('end');
  if (parsed.verse && start !== null && end !== null && /^\d+$/.test(start) && /^\d+$/.test(end)) {
    const a = Number(start), b = Number(end);
    if (Number.isSafeInteger(a) && Number.isSafeInteger(b) && a <= 10000 && b <= 10000 &&
        ((parsed.endVerse ?? parsed.verse) > parsed.verse || b > a)) {
      target.start = a; target.end = b;
    }
  }
  const note = Number(params.get('note'));
  if (Number.isSafeInteger(note) && note > 0) target.note = note;
  const connection = params.get('connection');
  if (connection && /^[a-z0-9-]{1,100}$/.test(connection)) target.connection = connection;
  return target;
}

// Offsets address the unchanged WEB text, excluding verse numbers and controls.
export function selectedPassage(root: HTMLElement, selection: Selection | null, book: string, chapter: number): { target: PassageTarget; text: string } | null {
  if (!selection || selection.isCollapsed || selection.rangeCount !== 1) return null;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;
  const parts: { verse: number; start: number; end: number; text: string }[] = [];
  for (const element of root.querySelectorAll<HTMLElement>('[data-verse-text]')) {
    if (!range.intersectsNode(element)) continue;
    const contents = document.createRange(); contents.selectNodeContents(element);
    const clipped = range.cloneRange();
    if (range.compareBoundaryPoints(0, contents) < 0) clipped.setStart(contents.startContainer, contents.startOffset);
    if (range.compareBoundaryPoints(2, contents) > 0) clipped.setEnd(contents.endContainer, contents.endOffset);
    const text = clipped.toString();
    if (!text) continue;
    const before = document.createRange(); before.selectNodeContents(element); before.setEnd(clipped.startContainer, clipped.startOffset);
    const start = before.toString().length;
    parts.push({ verse: Number(element.dataset.verseText), start, end: start + text.length, text });
  }
  if (!parts.length || !parts.some(p => p.text.trim())) return null;
  const first = parts[0], last = parts[parts.length - 1];
  return { target: { book, chapter, verse: first.verse, endVerse: last.verse, start: first.start, end: last.end }, text: parts.map(p => p.text).join('\n') };
}

function quotePassage(text: string): string {
  const passage = text.trim();
  if (!passage) return passage;
  // Reuse speech that spans the selection, including speech continued across verses.
  for (const [open, close] of [['“', '”'], ['"', '"'], ['‘', '’']]) {
    if (passage.startsWith(open)) {
      let end = passage.indexOf(close, 1);
      // A contraction inside single-quoted speech is not its closing quotation mark.
      while (close === '’' && end > 0 && /[\p{L}\p{N}]/u.test(passage[end - 1]) && /[\p{L}\p{N}]/u.test(passage[end + 1] ?? '')) end = passage.indexOf(close, end + 1);
      if (end === -1) return passage + close;
      if (end === passage.length - 1) return passage;
    }
    if (close !== '’' && passage.endsWith(close) && !passage.slice(0, -1).includes(open) && !passage.slice(0, -1).includes(close)) return open + passage;
  }
  // Close speech cut off by the selection, without rewriting the words or internal punctuation.
  if (/[“”]/.test(passage)) {
    let speaking = false, needsOpening = false;
    for (const character of passage) {
      if (character === '“') speaking = true; // Paragraphs can repeat an opening mark.
      if (character === '”') { if (!speaking) needsOpening = true; speaking = false; }
    }
    return `‘${needsOpening ? '“' : ''}${passage}${speaking ? '”' : ''}’`;
  }
  return passage.includes('"') ? `‘${passage}’` : `“${passage}”`;
}

export function copyText(text: string, target: PassageTarget, origin: string): string {
  return `${quotePassage(text)}\n\n${passageLabel(target)}\n${origin}${passageHref(target)}`;
}
