/**
 * GET /api/analytics/overview – Org-scoped metrics for dashboard cards.
 * Returns counts for actions, inbox, escalations, bookings, voice. Auth required.
 */
import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error';
import { requireOrg } from '@/lib/api-org-auth';
import {
  canUseInbox,
  canUseAiActions,
  canUseBookings,
  canUseVoice,
} from '@/lib/entitlements';
import { getAnalyticsOverview } from '@/lib/analytics-overview';

export async function GET() {
  try {
    const auth = await requireOrg();
    if (!auth.ok) return auth.response;
    const { organizationId, supabase, adminAllowed } = auth;

    const [inboxEnabled, actionsEnabled, bookingsEnabled, voiceEnabled] = await Promise.all([
      canUseInbox(supabase, organizationId, adminAllowed),
      canUseAiActions(supabase, organizationId, adminAllowed),
      canUseBookings(supabase, organizationId, adminAllowed),
      canUseVoice(supabase, organizationId, adminAllowed),
    ]);

    const overview = await getAnalyticsOverview(supabase, organizationId, {
      inboxEnabled: inboxEnabled || adminAllowed,
      actionsEnabled: actionsEnabled || adminAllowed,
      bookingsEnabled: bookingsEnabled || adminAllowed,
      voiceEnabled: voiceEnabled || adminAllowed,
    });

    return NextResponse.json(overview);
  } catch (err) {
    return handleApiError(err, 'analytics/overview');
  }
}
