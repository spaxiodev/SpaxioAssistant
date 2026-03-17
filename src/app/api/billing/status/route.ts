/**
 * GET /api/billing/status – Subscription and usage summary for Simple Mode / client.
 * Returns plan name, status, usage in plain language. Auth required.
 */
import { NextResponse } from 'next/server';
import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { getOrganizationSubscriptionAccess } from '@/lib/billing/subscription-access';
import { handleApiError } from '@/lib/api-error';

export async function GET() {
  try {
    const organizationId = await getOrganizationId();
    if (!organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const supabase = createAdminClient();
    const adminAllowed = await isOrgAllowedByAdmin(supabase, organizationId);
    const access = await getOrganizationSubscriptionAccess(supabase, organizationId, adminAllowed);

    return NextResponse.json({
      planName: access.planName,
      planSlug: access.planSlug,
      status: access.billingStatus,
      isActive: access.isActive,
      isTrialing: access.isTrialing,
      trialEndsAt: access.trialEndsAt,
      currentPeriodEnd: access.currentPeriodEnd,
      usage: {
        messages: access.usage.message_count,
        messageLimit: access.usage.message_limit,
        messagesRemaining: access.usage.messages_remaining,
        aiActions: access.usage.ai_action_count,
        aiActionLimit: access.usage.ai_action_limit,
        aiActionsRemaining: access.usage.ai_actions_remaining,
        periodEnd: access.usage.period_end,
      },
      blockedReasons: access.blockedReasons,
      upgradeRecommendations: access.upgradeRecommendations,
    });
  } catch (err) {
    return handleApiError(err, 'billing/status');
  }
}
