import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { socialPassage } from '@/lib/social';
import { passageLabel } from '@/lib/passage';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const passage = await socialPassage(new URL(request.url).searchParams);
  const label = passage ? passageLabel(passage) : 'Scripture with Catholic commentary';
  const logo = await readFile(join(process.cwd(), 'public/icons/spiritbible-192.png'));
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      background: '#fbfaf6', color: '#15151c', padding: '64px 80px', borderBottom: '12px solid #2b57db' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
        <img src={`data:image/png;base64,${logo.toString('base64')}`} width="96" height="96" alt="" />
        <span style={{ fontSize: 48, fontWeight: 700 }}>SpiritBible</span>
      </div>
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', fontSize: label.length > 28 ? 60 : 76,
        fontWeight: 700, lineHeight: 1.2, letterSpacing: '-1.5px' }}>{label}</div>
      <div style={{ display: 'flex', fontSize: 25, color: '#555765' }}>spirit.digitelos.co.uk</div>
    </div>,
    { width: 1200, height: 630, headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=604800' } },
  );
}
