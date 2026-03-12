import { createAdminClient } from '@/lib/supabase/admin';
import { getOrganizationId } from '@/lib/auth-server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { isUuid, normalizeUuid } from '@/lib/validation';
import { handleApiError } from '@/lib/api-error';

export async function POST(request: Request) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) return NextResponse.json({ error: 'Billing not configured' }, { status: 503 });

    const userOrgId = await getOrganizationId();
    if (!userOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const formData = await request.formData().catch(() => new FormData());
    const rawOrgId = formData.get('organizationId') as string | null;
    const organizationId = rawOrgId ? normalizeUuid(String(rawOrgId)) : userOrgId;
    if (!isUuid(organizationId)) {
      return NextResponse.json({ error: 'Invalid organizationId' }, { status: 400 });
    }
    if (organizationId !== userOrgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const stripe = new Stripe(secretKey);
    const supabase = createAdminClient();
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('organization_id', organizationId)
      .single();

    if (!sub?.stripe_customer_id) {
      return NextResponse.json({ error: 'No billing customer' }, { status: 400 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/billing`,
    });

    return NextResponse.redirect(session.url);
  } catch (err) {
    const res = handleApiError(err, 'billing/portal');
    return res;
  }
}
