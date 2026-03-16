/**
 * POST /api/organization/create – create a new business (organization) under the current user.
 * Body: { name?: string, business_name?: string }. Enforces max_businesses by plan.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUser } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { canCreateBusiness, getMaxBusinessesForUser } from '@/lib/entitlements';
import { CURRENT_ORG_COOKIE } from '@/lib/auth-server';
import { sanitizeText } from '@/lib/validation';

function slugFromName(name: string): string {
  const base = name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'business';
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createAdminClient();
    const { canCreate, max, ownedCount } = await getMaxBusinessesForUser(supabase, user.id, false);
    if (!canCreate) {
      return NextResponse.json(
        {
          error: 'Business limit reached',
          message: `You can have up to ${max} business${max === 1 ? '' : 'es'} on your current plan. Upgrade to add more.`,
          max,
          owned_count: ownedCount,
        },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const name = typeof body.name === 'string' ? sanitizeText(body.name, 120).trim() : '';
    const businessName = typeof body.business_name === 'string' ? sanitizeText(body.business_name, 120).trim() : null;
    const orgName = businessName || name || 'My Business';

    const slug = slugFromName(orgName);

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({ name: orgName, slug })
      .select('id')
      .single();

    if (orgError || !org) {
      console.error('[API] organization/create org', orgError);
      return NextResponse.json({ error: 'Failed to create business' }, { status: 500 });
    }

    const { error: memberError } = await supabase.from('organization_members').insert({
      organization_id: org.id,
      user_id: user.id,
      role: 'owner',
    });
    if (memberError) {
      console.error('[API] organization/create member', memberError);
      return NextResponse.json({ error: 'Failed to create business' }, { status: 500 });
    }

    const { error: businessSettingsError } = await supabase.from('business_settings').insert({
      organization_id: org.id,
      business_name: businessName ?? orgName,
    });
    if (businessSettingsError) {
      console.error('[API] organization/create business_settings', businessSettingsError);
    }

    const { error: widgetError } = await supabase
      .from('widgets')
      .insert({ organization_id: org.id, name: 'Chat' });
    if (widgetError) {
      console.error('[API] organization/create widget', widgetError);
    }

    const { error: subscriptionError } = await supabase.from('subscriptions').insert({
      organization_id: org.id,
      status: 'trialing',
      trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    });
    if (subscriptionError) {
      console.error('[API] organization/create subscription', subscriptionError);
    }

    const cookieStore = await cookies();
    cookieStore.set(CURRENT_ORG_COOKIE, org.id, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
    });

    return NextResponse.json({
      organization_id: org.id,
      name: orgName,
      message: 'Business created. Switch to it in Team or via the business switcher.',
    });
  } catch (err) {
    console.error('[API] organization/create', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
