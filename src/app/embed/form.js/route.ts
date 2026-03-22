/**
 * Serves the Spaxio Embedded Form loader script at /embed/form.js
 * Injects the base URL so the script can call back to the correct API host.
 */

import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getPublicAppUrl } from '@/lib/app-url';

function getScript(baseUrl: string): string {
  const path = join(process.cwd(), 'src', 'app', 'embed', 'form.js', 'embed-form.in.js');
  const raw = readFileSync(path, 'utf8');
  const escaped = baseUrl.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return raw.replace('__SPAXIO_BASE_URL__', escaped).trim();
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export function GET(request: Request) {
  const baseUrl = getPublicAppUrl({ request });
  const script = getScript(baseUrl);
  const isDev = process.env.NODE_ENV !== 'production';
  return new NextResponse(script, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': isDev ? 'no-store, no-cache' : 'public, max-age=300, s-maxage=300',
      ...corsHeaders,
    },
  });
}
