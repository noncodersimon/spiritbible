import BibleReader from '@/components/BibleReader';
import { socialMetadata, socialPassage } from '@/lib/social';

type SearchParams = Record<string, string | string[] | undefined>;

export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const values = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (typeof value === 'string') params.set(key, value);
    else if (Array.isArray(value) && value.length) params.set(key, value[0]);
  }
  return socialMetadata(await socialPassage(params));
}

export default function Home() {
  return <BibleReader />;
}
