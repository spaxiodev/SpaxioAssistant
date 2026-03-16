/**
 * POST /api/organization/switch – set current organization (Stripe-style business switcher).
 * Body: { organization_id: string }. Validates membership and sets cookie.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUser } from '@/lib/auth-server';
import { createClient } from '@/lib/supabase/server';
import { CURRENT_ORG_COOKIE } from '@/lib/auth-server';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const organizationId = typeof body.organization_id === 'string' ? body.organization_id.trim() : '';
    if (!organizationId || !UUID_REGEX.test(organizationId)) {
      return NextResponse.json({ error: 'Invalid organization id' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!member) {
      return NextResponse.json({ error: 'You do not have access to this organization' }, { status: 403 });
    }

    const cookieStore = await cookies();
    cookieStore.set(CURRENT_ORG_COOKIE, organizationId, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
    });

    return NextResponse.json({ ok: true, organization_id: organizationId });
  } catch (err) {
    console.error('[API] organization/switch', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
