const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
const bible = require('../data/bible.json');
const notes = require('../data/notes.json');
const books = require('../src/lib/books.json');
const { validateSources } = require('../scripts/build-data.cjs');

function loadTS(relative) {
  const filename = path.resolve(__dirname, relative);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const instance = new Module(filename, module);
  instance.filename = filename;
  instance.paths = Module._nodeModulePaths(path.dirname(filename));
  instance._compile(compiled, filename);
  return instance.exports;
}
const canon = loadTS('../src/lib/canon.ts');
const { parseRef } = loadTS('../src/lib/ref.ts');
const verse = (book, chapter, number) => bible.find(v => v.book === book && v.chapter === chapter && v.verse === number)?.text;

test('all 73 Catholic books are present once, in canonical order', () => {
  assert.equal(books.length, 73);
  assert.equal(canon.CANONICAL_OT.length, 46);
  assert.equal(canon.CANONICAL_NT.length, 27);
  assert.deepEqual([...new Set(bible.map(v => v.book))], canon.CANONICAL_ALL);
  assert.deepEqual(books.map(b => b.name), canon.CANONICAL_ALL);
  assert.equal(bible.length, 35420);
  assert.doesNotThrow(() => validateSources(bible, notes));
});

test('deuterocanonical books contain their own openings and complete source chapter counts', () => {
  const cases = [
    ['Tobit',14,/words of Tobit/], ['Judith',16,/Arphaxad/],
    ['Wisdom',19,/Love righteousness/], ['Sirach',51,/All wisdom comes from the Lord/],
    ['Baruch',6,/Baruch the son of Nerias/],
    ['1 Maccabees',16,/Alexander the Macedonian/], ['2 Maccabees',15,/send greetings and good peace/],
  ];
  for (const [book, chapters, opening] of cases) {
    assert.match(verse(book,1,1), opening);
    assert.equal(canon.chapterCountFor(book.toLowerCase()), chapters);
    assert.equal(new Set(bible.filter(v => v.book === book).map(v => v.chapter)).size, chapters);
  }
});

test('Greek Esther and Daniel include the additions with publisher numbering', () => {
  assert.match(verse('Esther',1,1), /two great serpents/);
  assert.equal(canon.chapterCountFor('Esther'),10);
  assert.match(verse('Daniel',3,24), /praising God/);
  assert.match(verse('Daniel',13,1), /Joakim/);
  assert.match(verse('Daniel',14,1), /Cyrus/);
  assert.equal(canon.chapterCountFor('Daniel'),14);
});

test('navigation and references follow source numbering and multiword book names', () => {
  assert.deepEqual(canon.nextChapter('Esther',10),{book:'1 Maccabees',chapter:1});
  assert.deepEqual(canon.prevChapter('Judith',1),{book:'Tobit',chapter:14});
  assert.deepEqual(canon.nextChapter('Joel',3),{book:'Amos',chapter:1});
  assert.deepEqual(canon.nextChapter('Malachi',3),{book:'Malachi',chapter:4});
  for (const [input, book] of [['1 Maccabees 1:1','1 Maccabees'],['Song of Songs 1:1','Song of Songs'],['Song of Solomon 1:1','Song of Songs'],['Sirach 1:1','Sirach'],['Psalm 23:1','Psalms']]) {
    assert.equal(parseRef(input)?.book, book);
  }
  assert.equal(parseRef('Esther 16:1'),null);
  assert.equal(parseRef('John 3:16-15'),null);
});

test('every preserved note has an explicit exact phrase at its inclusive offsets', () => {
  assert.equal(notes.length,11);
  for (const note of notes) {
    const text = verse(note.book,note.chapter,note.verse);
    assert(note.phrase);
    assert.equal(text.slice(note.start,note.end+1),note.phrase);
  }
  assert.throws(() => validateSources(bible,[{...notes[0],phrase:'obsolete wording'}]),/phrase does not match/);
});
