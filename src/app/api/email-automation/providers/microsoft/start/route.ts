/**
 * GET /api/email-automation/providers/microsoft/start
 *
 * Initiates the Outlook / Microsoft 365 OAuth 2.0 flow.
 *
 * Query params:
 *   returnTo   – client-provided return path (relative, no external redirects)
 *   reconnect  – optional provider ID to reconnect
 *
 * Uses the /common tenant to support both personal (Outlook.com) and
 * organizational (Microsoft 365 / Entra ID) accounts.
 */

import { NextResponse } from 'next/server';
import { getPublicAppUrl } from '@/lib/app-url';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const disabledAppUrl = getPublicAppUrl({ request });
  const fallback = `${disabledAppUrl}/dashboard/email-automation`;
  return NextResponse.redirect(
    `${fallback}?provider_error=${encodeURIComponent('Microsoft provider is no longer supported. Use Resend.')}`,
    302
  );
}
