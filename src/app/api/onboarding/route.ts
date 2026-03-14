import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getOrganizationId } from '@/lib/auth-server';
import { handleApiError } from '@/lib/api-error';
import { sanitizeText } from '@/lib/validation';

/**
 * POST /api/onboarding
 * Body: { fullName?: string, businessName?: string, industry?: string }
 * Updates profile (full_name) and business_settings (business_name, industry) for the current user/org.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const orgId = await getOrganizationId(user);
    if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const fullName = typeof body.fullName === 'string' ? sanitizeText(body.fullName, 200) || null : null;
    const businessName = typeof body.businessName === 'string' ? sanitizeText(body.businessName, 500) || null : null;
    const industry = typeof body.industry === 'string' ? sanitizeText(body.industry, 200) || null : null;

    const admin = createAdminClient();

    if (fullName !== null) {
      await admin
        .from('profiles')
        .upsert(
          { id: user.id, full_name: fullName, updated_at: new Date().toISOString() },
          { onConflict: 'id' }
        );
    }

    if (businessName !== null || industry !== null) {
      const updates: { business_name?: string | null; industry?: string | null } = {};
      if (businessName !== null) updates.business_name = businessName;
      if (industry !== null) updates.industry = industry;
      await admin
        .from('business_settings')
        .update(updates)
        .eq('organization_id', orgId);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err, 'onboarding/POST');
  }
}
