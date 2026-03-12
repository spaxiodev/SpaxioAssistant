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

    const body = await request.json().catch(() => ({}));
    const userOrgId = await getOrganizationId();
    if (!userOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const rawOrgId = body.organizationId as string | undefined;
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

    let customerId = sub?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { organization_id: organizationId },
      });
      customerId = customer.id;
      await supabase
        .from('subscriptions')
        .update({ stripe_customer_id: customerId })
        .eq('organization_id', organizationId);
    }

    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId) return NextResponse.json({ error: 'Billing not configured' }, { status: 503 });

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/billing?success=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/billing`,
      subscription_data: {
        trial_period_days: 7,
        metadata: { organization_id: organizationId },
      },
      metadata: { organization_id: organizationId },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    return handleApiError(err, 'billing/checkout');
  }
}
