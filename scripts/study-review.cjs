const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {extractSourceText} = require('./commentary-draft.cjs');
const sha = value => createHash('sha256').update(value).digest('hex');
const normal = value => value.replace(/\s+/gu,' ').trim();
const canonical = value => { const url = new URL(value); url.hash = ''; return url.href; };
function validateStudyReview(study, review, cache) {
  const items = [...study.connections.map(c=>[c.id,c]), ...study.introductions.map(i=>['intro:'+i.book,i])];
  const records = new Map(review.items.map(r=>[r.id,r]));
  if (records.size !== items.length || records.size !== review.items.length) throw Error('Study review coverage mismatch');
  const pages = new Map();
  for (const [id, item] of items) {
    const record = records.get(id);
    if (!record || record.itemSha256 !== sha(JSON.stringify(item))) throw Error(`Study review is stale: ${id}`);
    for (const source of item.sources) {
      const url = canonical(source.url);
      const evidence = record.evidence.filter(e=>canonical(e.url)===url);
      if (!evidence.length) throw Error(`No source evidence: ${id} ${url}`);
      for (const e of evidence) {
        if (!e.supports?.trim() || !e.excerpt?.trim() || e.excerptSha256 !== sha(normal(e.excerpt)) || !/^[a-f0-9]{64}$/.test(e.sha256)) throw Error(`Invalid source evidence: ${id}`);
        if (cache) {
          if (!pages.has(url)) {
            const raw = fs.readFileSync(path.join(cache,sha(url).slice(0,20)+'.html'));
            pages.set(url,{hash:sha(raw),text:extractSourceText(raw)});
          }
          const page = pages.get(url);
          if (page.hash !== e.sha256 || !page.text.includes(normal(e.excerpt))) throw Error(`Source evidence does not match cached page: ${id} ${url}`);
        }
      }
    }
  }
  return {connections:study.connections.length,introductions:study.introductions.length,reviewedItems:items.length,checkedPages:pages.size};
}
if (require.main === module) {
  try {
    const root=path.resolve(__dirname,'..');
    console.log(validateStudyReview(JSON.parse(fs.readFileSync(path.join(root,'data/study.json'))),JSON.parse(fs.readFileSync(path.join(root,'drafts/study/review.json'))),process.argv[2]));
  } catch(error) { console.error(error.message);process.exitCode=1; }
}
module.exports={validateStudyReview};
