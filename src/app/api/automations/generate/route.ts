/**
 * POST /api/automations/generate – generate automation draft from plain-English instruction.
 * Body: { instruction: string }
 * Returns draft (name, trigger_type, steps, etc.). Client can then POST /api/automations and PUT steps to save.
 */

import { getOrganizationIdOrFromApiKey } from '@/lib/api-key-auth';
import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error';
import { canUseAutomation } from '@/lib/entitlements';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { getPlanForOrg } from '@/lib/entitlements';
import { normalizePlanSlug } from '@/lib/plan-config';
import { getUpgradePlanForFeature } from '@/lib/plan-config';
import { planUpgradeRequiredResponse } from '@/lib/api-plan-error';
import { generateAutomationFromInstruction } from '@/lib/automations/ai-workflow-generator';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const organizationId = await getOrganizationIdOrFromApiKey(request);
    if (!organizationId) return NextResponse.json({ error: 'Unauthorized', code: 'auth_required' }, { status: 403 });

    const supabase = createAdminClient();
    const adminAllowed = await isOrgAllowedByAdmin(supabase, organizationId);
    const allowed = await canUseAutomation(supabase, organizationId, adminAllowed);
    if (!allowed) {
      const plan = await getPlanForOrg(supabase, organizationId);
      const currentSlug = normalizePlanSlug(plan?.slug ?? 'free') ?? 'free';
      return planUpgradeRequiredResponse({
        message: 'Automations are not available on your current plan. Upgrade to create AI-generated workflows.',
        currentPlan: currentSlug,
        requiredPlan: getUpgradePlanForFeature('automations'),
        feature: 'automations',
      });
    }

    const body = await request.json().catch(() => ({}));
    const instruction = typeof body.instruction === 'string' ? body.instruction.trim().slice(0, 2000) : '';
    if (!instruction) {
      return NextResponse.json({ error: 'instruction is required' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 503 });
    }

    const draft = await generateAutomationFromInstruction(instruction);
    return NextResponse.json({ draft });
  } catch (err) {
    return handleApiError(err, 'automations/generate');
  }
}
