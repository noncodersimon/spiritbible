const { isSourceURL } = require('./source-policy.cjs');
const { JSDOM } = require('jsdom');
const kinds = new Set(['quotation', 'fulfilment', 'echo', 'typology', 'theme']);
const words = text => text.trim().split(/\s+/u).length;
function sourceLinks(sources, id) {
  if (!Array.isArray(sources) || !sources.length) throw Error(`Missing study sources: ${id}`);
  for (const source of sources) {
    const u = new URL(source.url);
    if (!source.label?.trim() || !isSourceURL(u)) throw Error(`Invalid study source: ${id}`);
  }
}
function prose(text, min, max, id) {
  if (typeof text !== 'string' || /[<>]/.test(text) || words(text) < min || words(text) > max) throw Error(`Invalid study prose: ${id}`);
}
function validateStudy(study, verses) {
  if (study?.version !== 1 || !Array.isArray(study.connections) || !Array.isArray(study.introductions)) throw Error('Invalid study.json structure');
  const texts = new Map(verses.map(v => [`${v.book}|${v.chapter}|${v.verse}`, v.text]));
  const books = new Set(verses.map(v => v.book)), ids = new Set(), introduced = new Set(), summaries = new Set();
  for (const c of study.connections) {
    if (!/^[a-z0-9-]{1,100}$/.test(c.id) || ids.has(c.id) || !c.title?.trim() || !kinds.has(c.kind)) throw Error(`Invalid study connection: ${c.id}`);
    if (c.significance != null && !['fundamental', 'interest'].includes(c.significance)) throw Error(`Invalid study significance: ${c.id}`);
    ids.add(c.id); prose(c.summary, 35, 200, c.id); sourceLinks(c.sources, c.id);
    if (summaries.has(c.summary)) throw Error(`Duplicate study explanation: ${c.id}`);
    summaries.add(c.summary);
    if (!Array.isArray(c.passages) || c.passages.length < 2 || c.passages.length > 8) throw Error(`Invalid study passages: ${c.id}`);
    const seen = new Set();
    for (const p of c.passages) {
      const end = p.endVerse ?? p.verse;
      if (!p.label?.trim() || !Number.isSafeInteger(p.chapter) || !Number.isSafeInteger(p.verse) || !Number.isSafeInteger(end) ||
          p.chapter < 1 || p.verse < 1 || end < p.verse || end - p.verse > 40) throw Error(`Invalid study range: ${c.id}`);
      const key = `${p.book}|${p.chapter}|${p.verse}`;
      if (seen.has(key)) throw Error(`Duplicate study endpoint: ${c.id}`);
      seen.add(key);
      for (let v = p.verse; v <= end; v++) if (!texts.get(`${p.book}|${p.chapter}|${v}`)?.trim()) throw Error(`Missing/blank study verse: ${c.id} ${p.book} ${p.chapter}:${v}`);
    }
  }
  for (const intro of study.introductions) {
    if (!books.has(intro.book) || introduced.has(intro.book)) throw Error(`Invalid study introduction: ${intro.book}`);
    introduced.add(intro.book); prose(intro.summary, 80, 160, intro.book); sourceLinks(intro.sources, intro.book);
  }
  return study;
}
function noteProse(html) {
  const fragment = JSDOM.fragment(html);
  for (const el of fragment.querySelectorAll('.sources')) el.remove();
  return fragment.textContent.replace(/\s+/gu, ' ').trim();
}
function buildStudy(db, study, notes) {
  db.exec(`
    CREATE TABLE study_connection (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
    CREATE TABLE connection_passage (connection_id TEXT NOT NULL REFERENCES study_connection(id), book TEXT NOT NULL COLLATE NOCASE, chapter INTEGER NOT NULL, verse INTEGER NOT NULL, end_verse INTEGER NOT NULL, PRIMARY KEY(connection_id,book,chapter,verse));
    CREATE INDEX connection_chapter ON connection_passage(book,chapter);
    CREATE TABLE book_introduction (book TEXT PRIMARY KEY COLLATE NOCASE, payload TEXT NOT NULL);
    CREATE VIRTUAL TABLE commentary_fts USING fts5(title, text, book UNINDEXED, chapter UNINDEXED, verse UNINDEXED, note_id UNINDEXED, connection_id UNINDEXED);
  `);
  const connection = db.prepare('INSERT INTO study_connection VALUES (?,?)');
  const endpoint = db.prepare('INSERT INTO connection_passage VALUES (?,?,?,?,?)');
  const introduction = db.prepare('INSERT INTO book_introduction VALUES (?,?)');
  const search = db.prepare('INSERT INTO commentary_fts (title,text,book,chapter,verse,note_id,connection_id) VALUES (?,?,?,?,?,?,?)');
  for (const c of study.connections) {
    connection.run(c.id, JSON.stringify(c));
    for (const p of c.passages) endpoint.run(c.id, p.book, p.chapter, p.verse, p.endVerse ?? p.verse);
    const p = c.passages[0];
    search.run(c.title, c.summary, p.book, p.chapter, p.verse, null, c.id);
  }
  for (const intro of study.introductions) introduction.run(intro.book, JSON.stringify(intro));
  for (const [i, n] of notes.entries()) search.run(n.phrase || `${n.book} ${n.chapter}:${n.verse}`, noteProse(n.body), n.book, n.chapter, n.verse, i + 1, null);
}
module.exports = { validateStudy, buildStudy };
