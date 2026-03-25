/**
 * GET /api/email-automation/providers/google/start
 *
 * Initiates the Gmail / Google Workspace OAuth 2.0 flow.
 *
 * Query params:
 *   returnTo   – client-provided return path (must start with "/", no external redirects)
 *   reconnect  – optional provider ID to reconnect (updates existing record vs creating new)
 *
 * Flow:
 *   1. Authenticate the request (must be a logged-in org member).
 *   2. Generate a random CSRF state.
 *   3. Create (or update) an email_providers row in "connecting" status with the state embedded.
 *   4. Redirect to Google's OAuth consent screen.
 */

import { NextResponse } from 'next/server';
import { getPublicAppUrl } from '@/lib/app-url';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const disabledAppUrl = getPublicAppUrl({ request });
  const fallback = `${disabledAppUrl}/dashboard/email-automation`;
  return NextResponse.redirect(
    `${fallback}?provider_error=${encodeURIComponent('Google provider is no longer supported. Use Resend.')}`,
    302
  );
}
