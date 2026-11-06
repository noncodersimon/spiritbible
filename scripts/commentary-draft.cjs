/* Offline editorial tooling. Never writes live data/notes.json or the live SQLite database. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const Module = require('node:module');
const { JSDOM } = Module.createRequire(require.resolve('isomorphic-dompurify'))('jsdom');
const { validateSources } = require('./build-data.cjs');
const { isSpiritualClassic, isSourceURL } = require('./source-policy.cjs');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'drafts/commentary');
const books = require('../src/lib/books.json');
const bible = require('../data/bible.json');
const key = n => `${n.book}|${n.chapter}|${n.verse}`;
const verses = new Map(bible.map(v => [key(v), v.text]));
const order = new Map(books.map((b,i) => [b.name,i]));
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const normal = s => s.replace(/\s+/gu,' ').trim();
const canonicalURL = s => { const u = new URL(s); u.hash = ''; return u.href; };
const allowedHosts = new Set(['www.vatican.va','www.newadvent.org','ccel.org']);
const types = new Set(['catechism','encyclopedia','fathers','spiritual-classic']);
const interpretations = new Set(['doctrine','patristic','spiritual','historical','language','mixed']);

function reviewFingerprint(n, context) {
  return sha(JSON.stringify({id:n.id,book:n.book,chapter:n.chapter,verse:n.verse,
    phrase:n.phrase,title:n.title,body:n.body,sources:n.sources,
    interpretation:n.interpretation,languageNote:n.languageNote,context}));
}

function extractSourceText(raw) {
  let html;
  try { html = new TextDecoder('utf-8', {fatal:true}).decode(raw); }
  catch { html = new TextDecoder('windows-1252').decode(raw); }
  const fragment = JSDOM.fragment(html), chunks = [];
  const blocks = new Set(['P','DIV','H1','H2','H3','H4','LI','BR','TR']);
  function visit(node) {
    if (node.nodeType === 3) { chunks.push(node.nodeValue); return; }
    if (node.nodeName === 'SCRIPT' || node.nodeName === 'STYLE') return;
    const block = blocks.has(node.nodeName);
    if (block) chunks.push('\n');
    for (const child of node.childNodes) visit(child);
    if (block) chunks.push('\n');
  }
  visit(fragment);
  return normal(chunks.join(''));
}

function inspectBody(body) {
  const fragment = JSDOM.fragment(body);
  for (const el of fragment.querySelectorAll('*')) {
    if (!['P','EM','STRONG','A'].includes(el.tagName)) throw Error(`Unexpected HTML element ${el.tagName}`);
    for (const a of el.attributes) {
      if (!(el.tagName === 'A' && ['href','target','rel'].includes(a.name)) &&
          !(el.tagName === 'P' && a.name === 'class' && a.value === 'sources')) {
        throw Error(`Unexpected HTML attribute ${a.name}`);
      }
    }
  }
  const links = [...fragment.querySelectorAll('a')].map(a => {
    const url = new URL(a.getAttribute('href'));
    if (!isSourceURL(url)) throw Error(`Unexpected source URL ${url.href}`);
    if (a.target !== '_blank' || !a.rel.split(/\s+/).includes('noopener') || !a.rel.split(/\s+/).includes('noreferrer')) throw Error('Source links must open safely');
    return { url: url.href, label: normal(a.textContent) };
  });
  if (!fragment.querySelector('p.sources')) throw Error('Missing sources paragraph');
  if (!fragment.lastElementChild?.matches('p.sources') || [...fragment.querySelectorAll('a')].some(a => !a.closest('p.sources'))) throw Error('Citations must be in the sources paragraph at the bottom');
  for (const el of fragment.querySelectorAll('p.sources')) el.remove();
  const prose = normal([...fragment.childNodes].map(node=>node.textContent).join(' '));
  return {links, prose, words: prose.split(/\s+/u).filter(Boolean).length};
}

function validateDraft(rows, { complete = true, cache } = {}) {
  if (!Array.isArray(rows)) throw Error('Draft must be an array');
  const errors = [], ids = new Set(), bodies = new Map(), occupied = new Map();
  const result = [], verifiedHTML = new Map();
  for (const raw of rows) {
    try {
      const n = {...raw};
      if (typeof n.id !== 'string' || !n.id || ids.has(n.id)) throw Error('Missing or duplicate ID');
      ids.add(n.id);
      if (!order.has(n.book)) throw Error('Unknown canonical book');
      const verse = verses.get(key(n));
      if (!verse) throw Error('Missing or empty verse');
      if (typeof n.phrase !== 'string' || !n.phrase) throw Error('Missing anchor phrase');
      const start = verse.indexOf(n.phrase), lower = verse.toLowerCase(), needle = n.phrase.toLowerCase();
      if (start < 0 || lower.indexOf(needle) !== start || lower.indexOf(needle,start+1) >= 0) throw Error('Anchor must be exact and unique ignoring case');
      const end = start+n.phrase.length-1;
      if (!/^[A-Za-z0-9]/.test(n.phrase) || !/[A-Za-z0-9]$/.test(n.phrase) ||
          (start && /[A-Za-z0-9]/.test(verse[start-1])) || (verse[end+1] && /[A-Za-z0-9]/.test(verse[end+1]))) throw Error('Anchor must have complete word boundaries without outer punctuation');
      if ((n.start != null && n.start !== start) || (n.end != null && n.end !== end)) throw Error('Supplied offsets disagree with phrase');
      n.start=start;n.end=end;
      const ranges = occupied.get(key(n)) || [];
      if (ranges.some(([s,e]) => start<=e && end>=s)) throw Error('Overlapping anchor in same verse');
      occupied.set(key(n),[...ranges,[start,end]]);
      if (!n.title?.trim() || !n.theme?.trim() || !interpretations.has(n.interpretation) || typeof n.languageNote !== 'boolean') throw Error('Missing editorial metadata');
      const html = inspectBody(n.body);
      if (html.words<100 || html.words>200) throw Error(`Prose length ${html.words}; expected100–200`);
      const previous = bodies.get(html.prose.toLowerCase());
      if (previous) throw Error(`Duplicate body also used by ${previous}`);
      bodies.set(html.prose.toLowerCase(),n.id);
      if (!Array.isArray(n.sources) || !n.sources.length) throw Error('Missing source records');
      const sourceURLs = n.sources.map(s=>canonicalURL(s.url));
      for (const link of html.links) if (!sourceURLs.includes(canonicalURL(link.url))) throw Error('Unrecorded citation link');
      n.sources = n.sources.map(s => {
        if (!types.has(s.type) || !s.label?.trim() || !s.locator?.trim() || !s.supports?.trim()) throw Error('Incomplete source metadata');
        const url=canonicalURL(s.url), u=new URL(url);
        if (u.protocol!=='https:' || !allowedHosts.has(u.hostname)) throw Error('Source is outside approved primary sources');
        if (!html.links.some(l=>canonicalURL(l.url)===url)) throw Error('Source absent from displayed citations');
        const correctCollection = s.type === 'spiritual-classic' ? isSpiritualClassic(u) : s.type === 'catechism' ? u.hostname === 'www.vatican.va' && (/^\/archive\/ENG0015\//.test(u.pathname) || /^\/content\/catechism\//.test(u.pathname)) : u.hostname === 'www.newadvent.org' && u.pathname.startsWith(s.type === 'fathers' ? '/fathers/' : '/cathen/');
        if (!correctCollection) throw Error('Source type does not match the requested collection');
        if (!cache) {
          if (!s.evidenceVerified || !/^[a-f0-9]{64}$/.test(s.retrievalSha256 || '') || !s.excerptHash) throw Error('Missing recorded provenance check');
          return s;
        }
        const stem=path.join(cache,sha(url).slice(0,20));
        const meta=JSON.parse(fs.readFileSync(stem+'.json','utf8'));
        const sourceText=fs.readFileSync(stem+'.txt','utf8');
        const rawHTML=fs.readFileSync(stem+'.html');
        if (canonicalURL(meta.url)!==url || sha(rawHTML)!==meta.sha256) throw Error('Cache URL or hash mismatch');
        if (typeof s.excerpt!=='string' || normal(s.excerpt).length<20 || !normal(sourceText).includes(normal(s.excerpt))) throw Error(`Evidence excerpt not found verbatim in extracted text for ${url}`);
        if (!verifiedHTML.has(meta.sha256)) verifiedHTML.set(meta.sha256, extractSourceText(rawHTML));
        if (!verifiedHTML.get(meta.sha256).includes(normal(s.excerpt))) throw Error(`Evidence excerpt not found in the hash-verified HTML for ${url}`);
        const {excerpt,...publicSource}=s;
        return {...publicSource,url,retrievalSha256:meta.sha256,excerptHash:sha(normal(excerpt)),evidenceVerified:true};
      });
      n.wordCount=html.words;
      result.push(n);
    } catch (e) { errors.push(`${raw?.id || '(no ID)'} ${raw?.book} ${raw?.chapter}:${raw?.verse}: ${e.message}`); }
  }
  if (complete) {
    if (rows.length<950 || rows.length>1100) errors.push(`Expected about1000notes(950–1100); found${rows.length}`);
    for (const b of books) if (!rows.some(n=>n.book===b.name)) errors.push(`No coverage: ${b.name}`);
  }
  if (errors.length) throw Error(errors.join('\n'));
  result.sort((a,b)=>order.get(a.book)-order.get(b.book)||a.chapter-b.chapter||a.verse-b.verse||a.start-b.start);
  validateSources(bible,result);
  return result;
}

function report(rows) {
  const counts=books.map(b=>({book:b.name,notes:rows.filter(n=>n.book===b.name).length}));
  const sourceCounts={}; const urls=new Set();
  for (const n of rows) for (const s of n.sources) { sourceCounts[s.type]=(sourceCounts[s.type]||0)+1;urls.add(s.url); }
  return {status:'draft—not published',notes:rows.length,books:counts.filter(b=>b.notes).length,
    totalProseWords:rows.reduce((s,n)=>s+n.wordCount,0),minimumWords:Math.min(...rows.map(n=>n.wordCount)),maximumWords:Math.max(...rows.map(n=>n.wordCount)),
    languageNotes:rows.filter(n=>n.languageNote).length,uniqueSourcePages:urls.size,sourceCitations:sourceCounts,coverage:counts,
    bibleSha256:sha(fs.readFileSync(path.join(root,'data/bible.json'))),liveNotesSha256:sha(fs.readFileSync(path.join(root,'data/notes.json'))),
    checks:['73-book coverage','100–200 prose words per note','Exact unique phrase anchors and UTF-16 offsets','No overlapping highlights','No identical prose bodies','Restricted safe HTML and source hosts','Citation links match structured sources','Supporting excerpts found in both extracted text and hash-verified fetched HTML'],
    limits:['Excerpt matching confirms provenance, not that every interpretation follows from its source.','AI-drafted commentary requires human editorial and theological review before publication.','Historical Encyclopedia scholarship and individual patristic interpretations are not equivalent to current Church teaching.']};
}

function assemble(research) {
  const allocation=JSON.parse(fs.readFileSync(path.join(research,'allocation.json'),'utf8'));
  const all=Object.keys(allocation).flatMap(group=>JSON.parse(fs.readFileSync(path.join(research,'drafts',group+'.json'),'utf8')));
  // Abbreviate displayed Encyclopedia references; preserve full research labels.
  for (const n of all) n.body=n.body.replace(/(<a\b[^>]*>)Catholic Encyclopedia/g, '$1CE').replace(/(<p class="sources">)\s*Sources:\s*/g, '$1');
  const rows=validateDraft(all,{cache:path.join(research,'cache')});
  fs.mkdirSync(out,{recursive:true});
  const write=(name,obj)=>fs.writeFileSync(path.join(out,name),JSON.stringify(obj,null,2)+'\n');
  write('editorial.json',rows);
  write('notes.json',rows.map(({book,chapter,verse,start,end,phrase,body})=>({book,chapter,verse,start,end,phrase,body})));
  write('coverage.json',report(rows));
  write('baseline.json',JSON.parse(fs.readFileSync(path.join(research,'baseline.json'),'utf8')));
  console.log(JSON.stringify(report(rows),null,2));
}

if (require.main===module) {
  try {
    const [action,arg]=process.argv.slice(2);
    if (action==='--assemble' && arg) assemble(path.resolve(arg));
    else if(action==='--check') { const rows=validateDraft(JSON.parse(fs.readFileSync(path.join(out,'editorial.json'),'utf8')));console.log(JSON.stringify(report(rows),null,2)); }
    else if(action==='--check-partial' && arg) { const rows=validateDraft(JSON.parse(fs.readFileSync(path.resolve(arg),'utf8')),{complete:false,cache:'/workspace/commentary-research/cache'});console.log(`Validated ${rows.length} draft notes`); }
    else throw Error('Usage: node scripts/commentary-draft.cjs --assemble RESEARCH_DIR | --check | --check-partial FILE');
  } catch(e) { console.error(e.message);process.exitCode=1; }
}
module.exports={validateDraft,inspectBody,report,reviewFingerprint,extractSourceText};
