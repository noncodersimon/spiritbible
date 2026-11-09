import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'SpiritBible',
    short_name: 'SpiritBible',
    description: 'Read the Bible with Catholic commentary and related passages.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#fbfaf6',
    theme_color: '#15151c',
    icons: [
      { src: '/icons/spiritbible-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/spiritbible-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
