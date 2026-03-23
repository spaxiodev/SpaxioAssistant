/**
 * Google OAuth callback route is intentionally disabled.
 * Users are redirected back to Email Automation with guidance to use Resend.
 */
import { NextResponse } from 'next/server';
import { getPublicAppUrl } from '@/lib/app-url';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const appUrl = getPublicAppUrl({ request });
  const fallback = `${appUrl}/dashboard/email-automation`;
  return NextResponse.redirect(
    `${fallback}?provider_error=${encodeURIComponent('Google provider is no longer supported. Use Resend.')}`,
    302
  );
}
