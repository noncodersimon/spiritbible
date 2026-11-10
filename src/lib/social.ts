import type { Metadata } from 'next';
import { readPassage, passageHref, passageLabel } from './passage';
import { loadVerses } from './queries';
import type { PassageTarget } from '../types/study';

export const siteOrigin = 'https://spirit.digitelos.co.uk';
const description = 'Read the Bible with Catholic commentary and related passages.';

// Use the reader's reference parser and actual verse bounds; never put arbitrary
// query-string text into the public preview image or its title.
export async function socialPassage(params: URLSearchParams): Promise<PassageTarget | null> {
  const raw = params.get('ref');
  if (!raw || raw.length > 120) return null;
  const passage = readPassage(params.toString());
  if (!passage) return null;
  const verses = await loadVerses(passage.book, passage.chapter);
  if (!verses.length || (passage.verse && (!verses.some(v => v.verse === passage.verse) ||
      !verses.some(v => v.verse === (passage.endVerse ?? passage.verse))))) return null;
  return passage;
}

export function socialMetadata(passage: PassageTarget | null = null): Metadata {
  const label = passage ? passageLabel(passage) : null;
  const title = label ? `${label} | SpiritBible` : 'SpiritBible';
  const summary = label ? `Read ${label} on SpiritBible, with Catholic commentary and related passages.` : description;
  const image = new URL('/share-image', siteOrigin);
  if (label) image.searchParams.set('ref', label);
  const alt = label ? `SpiritBible — ${label}` : 'SpiritBible — Scripture with Catholic commentary';
  // Keep these URLs absolute and omit layout metadataBase: Next 15's resolver
  // otherwise drops query strings from root-path og:url values, losing the passage.
  return {
    title,
    description: summary,
    openGraph: {
      type: 'website', siteName: 'SpiritBible', locale: 'en_GB', title, description: summary,
      url: siteOrigin + (passage ? passageHref(passage) : '/'),
      images: [{ url: image.toString(), width: 1200, height: 630, type: 'image/png', alt }],
    },
    twitter: { card: 'summary_large_image', title, description: summary, images: [{ url: image.toString(), alt }] },
  };
}
