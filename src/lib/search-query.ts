// Quote user words/phrases as literal FTS5 terms. Punctuation and quotes must
// never be interpreted as FTS operators or column names.
export function buildTextQuery(input: string): string | null {
  const query = input.replace(/[“”]/g, '"');
  const parts = query.match(/"[^"]*"|[^\s"]+/g) ?? [];
  const terms = parts.map(part => part.replace(/^"|"$/g, '').trim())
    .filter(part => /[\p{L}\p{N}]/u.test(part));
  return terms.length ? terms.map(term => `"${term.replace(/"/g, '""')}"`).join(' AND ') : null;
}
