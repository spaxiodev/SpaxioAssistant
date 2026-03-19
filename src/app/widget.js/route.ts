import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getPublicAppUrl } from '@/lib/app-url';

function getScript(baseUrl: string): string {
  const path = join(process.cwd(), 'src', 'app', 'widget.js', 'embed.in.js');
  const raw = readFileSync(path, 'utf8');
  const escaped = baseUrl.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return raw.replace('__SPAXIO_BASE_URL__', escaped).trim();
}

export function GET(request: Request) {
  const baseUrl = getPublicAppUrl({ request });
  const script = getScript(baseUrl);
  const isDev = process.env.NODE_ENV !== 'production';
  return new NextResponse(script, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      // Ensure widget.js layout updates reach existing clients quickly.
      // (Clients often embed this script without a cache-buster.)
      'Cache-Control': isDev ? 'no-store, no-cache' : 'no-store, no-cache, must-revalidate, proxy-revalidate',
    },
  });
}
