// Build a self-contained, local review document; this is not an application route.
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const dir=path.join(root,'drafts/commentary');
const rows=require(path.join(dir,'editorial.json'));
const bible=require('../data/bible.json');
const {validateDraft,reviewFingerprint}=require('./commentary-draft.cjs');
validateDraft(rows);
const byChapter=new Map();
for(const v of bible){const key=v.book+'|'+v.chapter;if(!byChapter.has(key))byChapter.set(key,[]);byChapter.get(key).push(v);}
const payload=rows.map(n=>{
 const context=byChapter.get(n.book+'|'+n.chapter).filter(v=>Math.abs(v.verse-n.verse)<=1);
 return {...n,context,fingerprint:reviewFingerprint(n,context)};
});
const json=JSON.stringify(payload).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
const html=`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SpiritBible · Commentary review</title>
<style>
:root{color-scheme:light;--ink:#233b35;--muted:#5d6b65;--paper:#faf9f5;--line:#d7ddd6;--accent:#325c4e}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.6 system-ui,sans-serif}header{padding:28px max(24px,calc((100vw - 1260px)/2));border-bottom:1px solid var(--line);background:#eef2eb}h1{margin:0;font:600 30px/1.25 Georgia,serif}header p{margin:9px 0 0;max-width:850px}.eyebrow{font-size:12px;text-transform:uppercase;letter-spacing:.14em;color:var(--muted);margin:0 0 8px}main{max-width:1308px;margin:auto;padding:24px;display:grid;grid-template-columns:300px 1fr;gap:32px}label{display:block;font-size:13px;font-weight:600;margin:10px 0 5px}select,input,textarea,button{font:inherit}select,input,textarea{width:100%;padding:9px;border:1px solid #abb9ad;background:white;border-radius:6px;color:var(--ink)}button{cursor:pointer;border:1px solid #b6c3b9;border-radius:6px;background:white;color:var(--ink);padding:8px 12px}button:hover{background:#e8eee5}button:disabled{opacity:.4;cursor:default}button[aria-pressed=true]{background:var(--accent);color:white}a{color:#285e76;text-underline-offset:3px}.toolbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.count{font-size:13px;color:var(--muted)}#matches{list-style:none;padding:0;margin:16px 0}#matches button{width:100%;text-align:left;margin:0 0 6px;padding:9px 12px;font-size:14px}#matches strong{display:block;font-size:12px}article{background:white;border:1px solid var(--line);padding:30px;border-radius:12px}h2{font:600 29px/1.3 Georgia,serif;margin:8px 0 20px}h3{font-size:14px;margin:20px 0 8px}.scripture{border-left:3px solid #bbcab7;padding:8px 18px;margin:20px 0;background:#f6f8f3;font:18px/1.75 Georgia,serif}.scripture p{margin:7px 0}.scripture sup{font:11px system-ui;color:var(--muted);margin-right:5px}.scripture .neighbour{color:#718076;font-size:16px}mark{background:#f4e7b8;color:inherit;border-radius:2px}.note{font-size:18px;line-height:1.8}.note .sources{font-size:14px;border-top:1px solid var(--line);padding-top:14px}details{font-size:14px;border-top:1px solid var(--line);margin-top:22px;padding-top:12px}summary{cursor:pointer;font-weight:600}.review{border-top:1px solid var(--line);margin-top:24px;padding-top:16px}.review textarea{min-height:90px}.feedback{font-size:13px;color:var(--muted)}.hidden{display:none}#page-nav{justify-content:space-between}.tag{font-size:12px;padding:3px 8px;border-radius:20px;background:#eef2eb}.footer{margin:14px 0;font-size:12px;color:var(--muted)}:focus-visible{outline:3px solid #b18c26;outline-offset:3px}@media(max-width:800px){main{grid-template-columns:1fr;padding:16px;gap:16px}article{padding:20px}#matches{max-height:230px;overflow:auto}h1{font-size:25px}h2{font-size:25px}}
</style></head><body>
<header><div class="eyebrow">SpiritBible · Editorial draft</div><h1>A deeper reading of Scripture</h1><p>Review ${rows.length.toLocaleString('en-GB')} proposed notes across all 73 books. This document is separate from the live website. The notes are drafts, with source links and research records for checking.</p></header>
<main><aside aria-label="Find a note"><label for="book">Book</label><select id="book"><option value="">All books</option></select><label for="search">Search notes</label><input id="search" type="search" placeholder="Try resurrection, freedom, wisdom…"><label for="kind">Focus</label><select id="kind"><option value="">All notes</option><option value="language">Original-language insights</option><option value="fathers">Cites a Church Father</option><option value="encyclopedia">Cites the Encyclopedia</option><option value="unreviewed">Not yet reviewed</option><option value="revise">Marked for revision</option></select><p id="count" class="count" aria-live="polite"></p><ul id="matches"></ul><div class="toolbar" id="page-nav"><button id="prev-page">Previous list</button><button id="next-page">Next list</button></div><p class="footer">Showing up to 15 notes per list.</p><button id="export">Export review decisions</button><p class="footer" id="storage-status">Your marks are saved in this browser where local storage is available. Export them to share or keep a copy.</p></aside>
<section><div class="toolbar" style="margin-bottom:14px"><button id="prev">← Previous note</button><button id="next">Next note →</button><span id="position" class="count"></span></div><article id="article"><div id="reference" class="eyebrow"></div><h2 id="title"></h2><div class="toolbar"><span class="tag" id="interpretation"></span><span class="count" id="length"></span></div><div id="scripture" class="scripture"></div><div id="body" class="note"></div><details><summary>Why these sources are cited</summary><div id="evidence"></div><p>These records identify the source support used in drafting. Matching evidence was found in the retrieved pages; this is a provenance check, not a theological approval.</p></details><section class="review" aria-label="Your review"><h3>Your review</h3><div class="toolbar"><button data-decision="reviewed">Reviewed</button><button data-decision="revise">Needs revision</button><button data-decision="unreviewed">Clear mark</button></div><label for="comment">Review comment</label><textarea id="comment" placeholder="What would you change or check?"></textarea><p class="feedback" id="feedback"></p></section></article><p id="empty" class="hidden">No notes match these filters.</p></section></main>
<script id="data" type="application/json">${json}</script>
<script>
'use strict';
const rows=JSON.parse(document.getElementById('data').textContent),$=id=>document.getElementById(id),pageSize=15;let filtered=rows,index=0,page=0,decisions={},storageOK=true;
const storeKey='spiritbible-commentary-review-v1';
try{decisions=JSON.parse(localStorage.getItem(storeKey)||'{}');if(!decisions||Array.isArray(decisions)||typeof decisions!=='object')decisions={};}catch{storageOK=false;}
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const current=()=>filtered[index];const saved=n=>{const d=decisions[n.id];return d&&d.fingerprint===n.fingerprint?d:{decision:'unreviewed',comment:''};};
const bookCounts=new Map();for(const n of rows)bookCounts.set(n.book,(bookCounts.get(n.book)||0)+1);for(const [b,c]of bookCounts){const o=document.createElement('option');o.value=b;o.textContent=b+' ('+c+')';$('book').append(o);}
const plainBody=body=>{const t=document.createElement('template');t.innerHTML=body;return t.content.textContent;};
const searchable=new Map(rows.map(n=>[n.id,[n.title,n.book,n.theme,n.phrase,plainBody(n.body),n.chapter+':'+n.verse].join(' ').toLocaleLowerCase()]));
function persist(){try{localStorage.setItem(storeKey,JSON.stringify(decisions));}catch{storageOK=false;}$('storage-status').textContent=storageOK?'Your marks are saved in this browser. Export them to share or keep a copy.':'Browser storage is unavailable. Export your decisions before closing this page.';}
function applyFilters(keepPosition=false){const oldIndex=index;const q=$('search').value.toLocaleLowerCase().trim(),book=$('book').value,kind=$('kind').value;filtered=rows.filter(n=>(!book||n.book===book)&&(!q||searchable.get(n.id).includes(q))&&(!kind||(kind==='language'&&n.languageNote)||(kind==='fathers'&&n.sources.some(s=>s.type==='fathers'))||(kind==='encyclopedia'&&n.sources.some(s=>s.type==='encyclopedia'))||(kind==='unreviewed'&&saved(n).decision==='unreviewed')||(kind==='revise'&&saved(n).decision==='revise')));index=keepPosition?Math.max(0,Math.min(oldIndex,filtered.length-1)):0;page=Math.floor(index/pageSize);renderList();renderNote();}
function renderList(){$('count').textContent=filtered.length+' matching notes';$('matches').replaceChildren();for(let i=page*pageSize;i<Math.min((page+1)*pageSize,filtered.length);i++){const n=filtered[i],li=document.createElement('li'),b=document.createElement('button');b.innerHTML='<strong>'+escape(n.book+' '+n.chapter+':'+n.verse)+'</strong>'+escape(n.title);b.setAttribute('aria-pressed',String(i===index));b.onclick=()=>{index=i;renderList();renderNote();};li.append(b);$('matches').append(li);}$('prev-page').disabled=page===0;$('next-page').disabled=(page+1)*pageSize>=filtered.length;}
function renderNote(){const n=current();$('article').classList.toggle('hidden',!n);$('empty').classList.toggle('hidden',!!n);$('prev').disabled=!n||index===0;$('next').disabled=!n||index===filtered.length-1;$('position').textContent=n?(index+1)+' / '+filtered.length:'';if(!n)return;$('reference').textContent=n.book+' '+n.chapter+':'+n.verse+' · '+n.id;$('title').textContent=n.title;$('interpretation').textContent=({doctrine:'Church teaching',patristic:'A Church Father’s reading',spiritual:'Spiritual interpretation',historical:'Historical context',language:'Language insight',mixed:'Context and interpretation'})[n.interpretation];$('length').textContent=n.wordCount+' words'+(n.languageNote?' · Language insight':'');$('scripture').innerHTML=n.context.map(v=>'<p class="'+(v.verse===n.verse?'':'neighbour')+'"><sup>'+v.verse+'</sup>'+(v.verse===n.verse?escape(v.text.slice(0,n.start))+'<mark>'+escape(n.phrase)+'</mark>'+escape(v.text.slice(n.end+1)):escape(v.text))+'</p>').join('');$('body').innerHTML=n.body;$('evidence').innerHTML=n.sources.map(s=>'<h3><a href="'+escape(s.url)+'" target="_blank" rel="noopener noreferrer">'+escape(s.label)+'</a></h3><p>'+escape(s.locator)+'</p><p>'+escape(s.supports)+'</p>').join('');const d=saved(n);$('comment').value=d.comment||'';document.querySelectorAll('[data-decision]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.decision===d.decision)));$('feedback').textContent=d.decision==='unreviewed'?'No review mark yet.':d.decision==='revise'?'Marked for revision.':'Marked as reviewed.';}
function changeIndex(delta){if(!current())return;index=Math.max(0,Math.min(filtered.length-1,index+delta));page=Math.floor(index/pageSize);renderList();renderNote();}
$('prev').onclick=()=>changeIndex(-1);$('next').onclick=()=>changeIndex(1);$('prev-page').onclick=()=>{page--;index=page*pageSize;renderList();renderNote();};$('next-page').onclick=()=>{page++;index=page*pageSize;renderList();renderNote();};
for(const id of ['book','kind'])$(id).onchange=()=>applyFilters();$('search').oninput=()=>applyFilters();
document.querySelectorAll('[data-decision]').forEach(b=>b.onclick=()=>{const n=current();if(!n)return;decisions[n.id]={...saved(n),fingerprint:n.fingerprint,decision:b.dataset.decision,comment:$('comment').value};persist();if(['unreviewed','revise'].includes($('kind').value))applyFilters(true);else renderNote();});
$('comment').oninput=()=>{const n=current();if(!n)return;decisions[n.id]={...saved(n),fingerprint:n.fingerprint,comment:$('comment').value};persist();};
$('export').onclick=()=>{const output={project:'SpiritBible',exportedAt:new Date().toISOString(),decisions:rows.filter(n=>decisions[n.id]&&decisions[n.id].fingerprint===n.fingerprint).map(n=>({id:n.id,book:n.book,chapter:n.chapter,verse:n.verse,...saved(n)}))};const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(output,null,2)],{type:'application/json'}));a.href=url;a.download='spiritbible-commentary-review.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
persist();applyFilters();
</script></body></html>`;
fs.writeFileSync(path.join(dir,'review.html'),html);
console.log(`Wrote standalone review for ${rows.length} notes: ${path.join(dir,'review.html')}`);

const coverage=JSON.parse(fs.readFileSync(path.join(dir,'coverage.json'),'utf8'));
fs.writeFileSync(path.join(dir,'coverage.md'),[
 '# Commentary coverage — draft',
 '',
 `${coverage.notes.toLocaleString('en-GB')} notes across ${coverage.books} books; ${coverage.totalProseWords.toLocaleString('en-GB')} words of explanatory prose. Notes range from ${coverage.minimumWords} to ${coverage.maximumWords} words, excluding references.`,
 '',
 `${coverage.languageNotes} notes are marked as original-language insights. Citations link to ${coverage.uniqueSourcePages} distinct source pages.`,
 '',
 '| Source collection | Citations |','| --- | ---: |',
 ...Object.entries(coverage.sourceCitations).map(([type,n])=>`| ${{catechism:'Catechism',encyclopedia:'Catholic Encyclopedia',fathers:'Church Fathers'}[type]} | ${n} |`),
 '',
 'Citation totals count individual source records; a note can cite more than one source or more than one section on a page.',
 '',
 '| Book | Notes |','| --- | ---: |',
 ...coverage.coverage.map(b=>`| ${b.book} | ${b.notes} |`),
 '',
 'The draft uses the current WEB verse text and numbering. Source editions sometimes number Psalms or deuterocanonical passages differently. The note belongs to the local verse shown in the review document.',
 '',
 'For the distinction between automated checks and content review, see README.md and REVIEW-NOTES.md.',
 '',
].join('\n'));

const sampleRefs=[['Genesis',1,1],['Exodus',3,14],['Judges',11,31],['Tobit',12,8],['2 Maccabees',12,45],['Job',13,15],['Psalms',137,9],['Wisdom',7,25],['Isaiah',7,14],['Matthew',6,11],['Luke',1,43],['John',1,1],['Romans',8,22],['Ephesians',2,8],['Hebrews',4,15],['Revelation',21,4]];
const {JSDOM}=require('node:module').createRequire(require.resolve('isomorphic-dompurify'))('jsdom');
const samples=sampleRefs.map(([book,chapter,verse])=>rows.find(n=>n.book===book&&n.chapter===chapter&&n.verse===verse)||rows.find(n=>n.book===book&&n.chapter===chapter)||rows.find(n=>n.book===book));
fs.writeFileSync(path.join(dir,'samples.md'),[
 '# Representative commentary notes',
 '',
 'These samples introduce the style and some of the questions worth checking before reviewing the whole collection. They include philosophy, difficult narratives, deuterocanonical books, Christian spiritual interpretation and language insights. The complete collection remains a draft.',
 '',
 ...samples.flatMap(n=>{
  const f=JSDOM.fragment(n.body),prose=[...f.querySelectorAll('p:not(.sources)')].map(p=>p.textContent),links=[...f.querySelectorAll('p.sources a')].map(a=>`[${a.textContent}](${a.href})`);
  return [`## ${n.book} ${n.chapter}:${n.verse} — ${n.title}`,'',`Anchor: **${n.phrase}**`,'',...prose.flatMap(p=>[p,'']),`Sources: ${links.join('; ')}.`,''];
 }),
].join('\n'));
